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
      // Create user record in users table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: userError } = await (supabase as any).from("users").upsert(
        {
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName || email.split("@")[0],
        },
        { onConflict: "id" }
      );

      if (userError) {
        console.error("[Auth] User record creation error:", userError);
        // Don't fail signup, just log it
      }

      // Create default workspace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: workspace, error: workspaceError } = await (supabase as any)
        .from("workspaces")
        .insert({
          name: "My Workspace",
          owner_id: data.user.id,
        })
        .select("id")
        .single();

      if (!workspaceError && workspace) {
        // Add user as workspace member
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("workspace_members").insert({
          workspace_id: workspace.id,
          user_id: data.user.id,
          role: "owner",
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
