"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// Validation schemas
const AuthSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
});

const SignupSchema = AuthSchema.extend({
  fullName: z.string().min(2, "이름은 최소 2자 이상이어야 합니다.").optional(),
});

export type AuthState = {
  success: boolean;
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
    fullName?: string[];
  };
};

/**
 * Sign in with email and password
 */
export async function login(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // Validate input
  const validatedFields = AuthSchema.safeParse(rawData);
  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[Auth] Login error:", error.message);
      
      // Handle specific error messages
      if (error.message.includes("Invalid login credentials")) {
        return {
          success: false,
          error: "이메일 또는 비밀번호가 올바르지 않습니다.",
        };
      }
      
      if (error.message.includes("Email not confirmed")) {
        return {
          success: false,
          error: "이메일 인증이 필요합니다. 이메일을 확인해주세요.",
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }

    console.log("[Auth] ✅ User logged in:", data.user?.email);
  } catch (error) {
    console.error("[Auth] Unexpected login error:", error);
    return {
      success: false,
      error: "로그인 중 오류가 발생했습니다.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Sign up with email and password
 */
export async function signup(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    fullName: formData.get("fullName") as string || undefined,
  };

  // Validate input
  const validatedFields = SignupSchema.safeParse(rawData);
  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password, fullName } = validatedFields.data;

  try {
    const supabase = await createClient();

    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      console.error("[Auth] Signup error:", error.message);

      if (error.message.includes("already registered")) {
        return {
          success: false,
          error: "이미 가입된 이메일입니다. 로그인해주세요.",
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      return {
        success: true,
        error: "이메일로 인증 링크를 보냈습니다. 이메일을 확인해주세요.",
      };
    }

    // If user is confirmed (e.g., email confirmation disabled in Supabase)
    if (data.user && data.session) {
      const now = new Date().toISOString();
      
      // Create user record in users table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: userError } = await (supabase as any).from("users").upsert(
        {
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName || email.split("@")[0],
          updated_at: now,
        },
        { onConflict: "id" }
      );

      if (userError) {
        console.error("[Auth] User record creation error:", userError);
        // Don't fail signup, just log it
      }

      // Create default workspace (without owner_id - use workspace_members for ownership)
      const workspaceSlug = `workspace-${data.user.id.slice(0, 8)}-${Date.now()}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: workspace, error: workspaceError } = await (supabase as any)
        .from("workspaces")
        .insert({
          name: "My Workspace",
          slug: workspaceSlug,
          subscription_tier: "FREE",
          updated_at: now,
        })
        .select("id")
        .single();

      if (!workspaceError && workspace) {
        // Add user as workspace member
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("workspace_members").insert({
          workspace_id: workspace.id,
          user_id: data.user.id,
          role: "OWNER",
        });
      }

      console.log("[Auth] ✅ User signed up:", data.user.email);
    }
  } catch (error) {
    console.error("[Auth] Unexpected signup error:", error);
    return {
      success: false,
      error: "회원가입 중 오류가 발생했습니다.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[Auth] Signout error:", error.message);
  }

  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Get the current authenticated user
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get current user with workspace info
 */
export async function getAuthUserWithWorkspace() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, workspace: null, workspaceId: null };
  }

  // Get user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any)
    .from("workspace_members")
    .select("workspace_id, workspaces(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const typedMembership = membership as { workspace_id: string; workspaces: unknown } | null;

  return {
    user,
    workspace: typedMembership?.workspaces || null,
    workspaceId: typedMembership?.workspace_id || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase E-1: 고객 포털 + 역할 기반 인증
// ═══════════════════════════════════════════════════════════════════════════

import { createAdminClient } from "@/lib/supabase/service";
import type { UserRole } from "@/lib/auth";

/**
 * 고객/어드민 통합 로그인 (Supabase Auth + users 테이블 역할 체크)
 * 기존 login()은 어드민 전용 폴백으로 유지
 */
export async function portalSignIn(email: string, password: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { success: false as const, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { success: false as const, error: "이메일 인증이 필요합니다. 이메일을 확인해주세요." };
    }
    return { success: false as const, error: error.message };
  }

  const db = createAdminClient();

  // users 테이블에서 역할 확인
  const { data: user } = await db
    .from("users")
    .select("role, client_id, is_active")
    .eq("auth_id", data.user.id)
    .single();

  if (!user) {
    return { success: false as const, error: "사용자 정보를 찾을 수 없습니다. 관리자에게 문의하세요." };
  }

  if (!user.is_active) {
    await supabase.auth.signOut();
    return { success: false as const, error: "비활성화된 계정입니다." };
  }

  // 마지막 로그인 시간 업데이트
  await db
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("auth_id", data.user.id);

  // 고객이면 last_portal_login도 업데이트
  if (user.client_id) {
    await db
      .from("clients")
      .update({ last_portal_login: new Date().toISOString() })
      .eq("id", user.client_id);
  }

  return {
    success: true as const,
    role: user.role as UserRole,
    clientId: user.client_id as string | null,
  };
}

/**
 * 고객 회원가입 (초대 토큰 기반)
 */
export async function portalSignUp(
  email: string,
  password: string,
  name: string,
  phone?: string,
  inviteToken?: string,
) {
  const supabase = await createClient();
  const db = createAdminClient();

  // 1. 초대 토큰 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let invitation: any = null;
  if (inviteToken) {
    const { data } = await db
      .from("invitations")
      .select("*")
      .eq("token", inviteToken)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();
    invitation = data;
  }

  // 2. Supabase Auth 가입
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { success: false as const, error: "이미 가입된 이메일입니다. 로그인해주세요." };
    }
    return { success: false as const, error: authError.message };
  }

  // 3. users 테이블에 레코드 생성
  const role: UserRole = (invitation?.role as UserRole) || "client_owner";
  const clientId: string | null = invitation?.client_id || null;

  const { error: userError } = await db.from("users").insert({
    auth_id: authData.user?.id,
    email,
    name,
    phone: phone || null,
    role,
    client_id: clientId,
    is_active: true,
  });

  if (userError) return { success: false as const, error: userError.message };

  // 4. 초대 수락 처리
  if (invitation) {
    await db
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);
  }

  // 이메일 인증 대기 여부 체크
  if (authData.user && !authData.session) {
    return { success: true as const, needsEmailConfirm: true, role };
  }

  return { success: true as const, needsEmailConfirm: false, role };
}

/**
 * Supabase Auth 로그아웃
 */
export async function portalSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

/**
 * 초대 정보 조회
 */
export async function getInvitationByToken(token: string) {
  const db = createAdminClient();

  const { data } = await db
    .from("invitations")
    .select("id, email, role, client_id, expires_at")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!data) return null;

  // 클라이언트 이름 조회
  let clientName = "";
  if (data.client_id) {
    const { data: client } = await db
      .from("clients")
      .select("brand_name:name")
      .eq("id", data.client_id)
      .single();
    clientName = client?.brand_name || "";
  }

  return { ...data, client_name: clientName };
}

/**
 * 어드민이 고객을 초대
 */
export async function inviteUser(
  email: string,
  role: UserRole,
  clientId?: string,
) {
  const db = createAdminClient();

  const { data, error } = await db
    .from("invitations")
    .insert({
      email,
      role,
      client_id: clientId || null,
    })
    .select("token")
    .single();

  if (error) return { success: false as const, error: error.message };

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://web-five-gold-12.vercel.app";
  const inviteUrl = `${baseUrl}/signup?invite=${data.token}`;

  return { success: true as const, inviteUrl };
}

/**
 * 클라이언트별 사용자/초대 목록
 */
export async function getClientUsers(clientId: string) {
  const db = createAdminClient();

  const { data: users } = await db
    .from("users")
    .select("id, email, name, role, is_active, created_at, last_login_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  const { data: invitations } = await db
    .from("invitations")
    .select("id, email, role, token, expires_at, accepted_at, created_at")
    .eq("client_id", clientId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  return {
    users: users || [],
    pendingInvitations: invitations || [],
  };
}

/**
 * 포털 사용자 프로필 업데이트
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; phone?: string },
) {
  const db = createAdminClient();

  const { error } = await db
    .from("users")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { success: false as const, error: error.message };

  revalidatePath("/portal/settings");
  return { success: true as const };
}

/**
 * 포털 비밀번호 변경
 */
export async function changeUserPassword(newPassword: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}
