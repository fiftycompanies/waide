"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ManagedUser {
  id: string;
  auth_id: string | null;
  email: string;
  name: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  client_id: string | null;
  client_name: string | null;
}

export interface UserListResult {
  users: ManagedUser[];
  total: number;
}

// ── 전체 유저 목록 조회 ──────────────────────────────────────────────────

export async function getAllUsers(params?: {
  roleFilter?: string;
  search?: string;
}): Promise<UserListResult> {
  const session = await requireAdminSession();
  if (!["super_admin", "admin"].includes(session.role)) {
    return { users: [], total: 0 };
  }

  const db = createAdminClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db as any)
      .from("users")
      .select("id, auth_id, email, name, full_name, role, is_active, created_at, last_login_at, client_id", { count: "exact" })
      .order("created_at", { ascending: false });

    if (params?.roleFilter && params.roleFilter !== "all") {
      query = query.eq("role", params.roleFilter);
    }

    if (params?.search) {
      const s = params.search.trim();
      query = query.or(`email.ilike.%${s}%,name.ilike.%${s}%,full_name.ilike.%${s}%`);
    }

    const { data, error, count } = await query.limit(200);

    if (error) {
      console.error("[user-management] getAllUsers:", error);
      return { users: [], total: 0 };
    }

    if (!data || data.length === 0) {
      return { users: [], total: count ?? 0 };
    }

    // client_id들로 고객사 이름 조회
    const clientIds = [...new Set(data.filter((u: { client_id: string | null }) => u.client_id).map((u: { client_id: string }) => u.client_id))];

    let clientMap: Record<string, string> = {};
    if (clientIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clients } = await (db as any)
        .from("clients")
        .select("id, name")
        .in("id", clientIds);

      if (clients) {
        clientMap = Object.fromEntries(clients.map((c: { id: string; name: string }) => [c.id, c.name]));
      }
    }

    const users: ManagedUser[] = data.map((u: Record<string, unknown>) => ({
      id: u.id as string,
      auth_id: (u.auth_id as string) || null,
      email: u.email as string,
      name: (u.name as string) || null,
      full_name: (u.full_name as string) || null,
      role: u.role as string,
      is_active: u.is_active !== false,
      created_at: u.created_at as string,
      last_login_at: (u.last_login_at as string) || null,
      client_id: (u.client_id as string) || null,
      client_name: u.client_id ? (clientMap[u.client_id as string] || null) : null,
    }));

    return { users, total: count ?? users.length };
  } catch (err) {
    console.error("[user-management] getAllUsers unexpected:", err);
    return { users: [], total: 0 };
  }
}

// ── 비밀번호 초기화 이메일 발송 ────────────────────────────────────────

export async function resetUserPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!["super_admin", "admin"].includes(session.role)) {
    return { success: false, error: "권한이 없습니다." };
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return { success: false, error: "Supabase 설정이 누락되었습니다." };
    }

    const adminAuth = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://web-five-gold-12.vercel.app";

    const { error } = await adminAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/login?reset=true`,
    });

    if (error) {
      console.error("[user-management] resetPassword:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[user-management] resetPassword unexpected:", err);
    return { success: false, error: "비밀번호 초기화 실패" };
  }
}

// ── 계정 활성/비활성 토글 ──────────────────────────────────────────────

export async function updateUserStatus(
  userId: string,
  disabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!["super_admin", "admin"].includes(session.role)) {
    return { success: false, error: "권한이 없습니다." };
  }

  try {
    const db = createAdminClient();

    // users 테이블 is_active 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("users")
      .update({
        is_active: !disabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("[user-management] updateUserStatus:", error);
      return { success: false, error: error.message };
    }

    // Supabase Auth에서도 ban 처리 (auth_id가 있는 경우)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: user } = await (db as any)
      .from("users")
      .select("auth_id")
      .eq("id", userId)
      .maybeSingle();

    if (user?.auth_id) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
      const adminAuth = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      if (disabled) {
        await adminAuth.auth.admin.updateUserById(user.auth_id, {
          ban_duration: "876600h", // ~100년
        });
      } else {
        await adminAuth.auth.admin.updateUserById(user.auth_id, {
          ban_duration: "none",
        });
      }
    }

    revalidatePath("/ops/accounts-management");
    return { success: true };
  } catch (err) {
    console.error("[user-management] updateUserStatus unexpected:", err);
    return { success: false, error: "상태 변경 실패" };
  }
}

// ── 개별 유저 상세 조회 ──────────────────────────────────────────────────

export interface UserDetail extends ManagedUser {
  phone: string | null;
}

export async function getUserById(
  userId: string
): Promise<{ user: UserDetail | null; error?: string }> {
  const session = await requireAdminSession();
  if (!["super_admin", "admin"].includes(session.role)) {
    return { user: null, error: "권한이 없습니다." };
  }

  const db = createAdminClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from("users")
      .select("id, auth_id, email, name, full_name, role, is_active, created_at, last_login_at, client_id, phone")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return { user: null, error: error?.message || "사용자를 찾을 수 없습니다." };
    }

    let clientName: string | null = null;
    if (data.client_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: client } = await (db as any)
        .from("clients")
        .select("name")
        .eq("id", data.client_id)
        .maybeSingle();
      clientName = client?.name || null;
    }

    return {
      user: {
        id: data.id,
        auth_id: data.auth_id || null,
        email: data.email,
        name: data.name || null,
        full_name: data.full_name || null,
        role: data.role,
        is_active: data.is_active !== false,
        created_at: data.created_at,
        last_login_at: data.last_login_at || null,
        client_id: data.client_id || null,
        client_name: clientName,
        phone: data.phone || null,
      },
    };
  } catch (err) {
    console.error("[user-management] getUserById unexpected:", err);
    return { user: null, error: "사용자 조회 실패" };
  }
}

// ── 유저 정보 수정 (이름, 역할, 고객사 연결) ───────────────────────────

export async function updateUser(
  userId: string,
  updates: {
    full_name?: string;
    role?: string;
    client_id?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!["super_admin", "admin"].includes(session.role)) {
    return { success: false, error: "권한이 없습니다." };
  }

  const db = createAdminClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.client_id !== undefined) updateData.client_id = updates.client_id || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error("[user-management] updateUser:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/ops/accounts-management");
    revalidatePath(`/ops/accounts-management/${userId}`);
    return { success: true };
  } catch (err) {
    console.error("[user-management] updateUser unexpected:", err);
    return { success: false, error: "사용자 정보 수정 실패" };
  }
}

// ── 고객사 목록 조회 (연결용) ────────────────────────────────────────────

export async function getClientsForLinking(): Promise<
  Array<{ id: string; name: string }>
> {
  const session = await requireAdminSession();
  if (!["super_admin", "admin"].includes(session.role)) {
    return [];
  }

  const db = createAdminClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("clients")
      .select("id, name")
      .eq("status", "active")
      .order("name");

    return (data || []).map((c: { id: string; name: string }) => ({
      id: c.id,
      name: c.name,
    }));
  } catch {
    return [];
  }
}
