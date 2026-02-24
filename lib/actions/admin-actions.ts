"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import {
  createSessionToken,
  getAdminSession,
  requireAdminSession,
  requireSuperAdmin,
  COOKIE_NAME,
  MAX_AGE,
} from "@/lib/auth/admin-session";
import type { AdminPayload } from "@/lib/auth/admin-session";

export type AdminLoginState = {
  error?: string;
};

// ── 로그인 ────────────────────────────────────────────────────
export async function adminLogin(
  prevState: AdminLoginState | null,
  formData: FormData
): Promise<AdminLoginState> {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "아이디와 비밀번호를 입력해주세요." };
  }

  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (db as any)
    .from("admin_users")
    .select("id, username, display_name, role, password_hash, is_active")
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !rows) {
    return { error: "아이디 또는 비밀번호가 잘못되었습니다." };
  }

  const passwordMatch = await bcrypt.compare(password, rows.password_hash as string);
  if (!passwordMatch) {
    return { error: "아이디 또는 비밀번호가 잘못되었습니다." };
  }

  // last_login_at 갱신 (non-blocking)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db as any)
    .from("admin_users")
    .update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", rows.id)
    .then(() => {});

  const admin = {
    id: rows.id as string,
    username: rows.username as string,
    display_name: (rows.display_name as string) || (rows.username as string),
    role: rows.role as string,
  };

  const token = createSessionToken({
    id: admin.id,
    username: admin.username,
    role: admin.role as AdminPayload["role"],
    displayName: admin.display_name || admin.username,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax",
  });

  redirect("/dashboard");
}

// ── 로그아웃 ──────────────────────────────────────────────────
export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}

// ── 현재 어드민 정보 ──────────────────────────────────────────
export async function getAdminInfo(): Promise<AdminPayload | null> {
  return getAdminSession();
}

// ── 비밀번호 변경 ─────────────────────────────────────────────
export async function changePassword(payload: {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdminSession();

  if (payload.newPassword !== payload.confirmPassword) {
    return { success: false, error: "새 비밀번호가 일치하지 않습니다." };
  }
  if (payload.newPassword.length < 8) {
    return { success: false, error: "비밀번호는 8자 이상이어야 합니다." };
  }

  const db = createAdminClient();
  // 현재 비밀번호 검증
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: fetchErr } = await (db as any)
    .from("admin_users")
    .select("password_hash")
    .eq("id", session.id)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchErr || !row) return { success: false, error: "사용자를 찾을 수 없습니다." };

  const oldPasswordMatch = await bcrypt.compare(payload.oldPassword, row.password_hash as string);
  if (!oldPasswordMatch) return { success: false, error: "현재 비밀번호가 틀렸습니다." };

  // 새 비밀번호 해싱 후 저장
  const newHash = await bcrypt.hash(payload.newPassword, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (db as any)
    .from("admin_users")
    .update({ password_hash: newHash, updated_at: new Date().toISOString() })
    .eq("id", session.id);

  if (updateErr) return { success: false, error: updateErr.message };
  return { success: true };
}

// ── 어드민 목록 조회 (super_admin만) ─────────────────────────
export interface AdminUser {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export async function getAdmins(): Promise<AdminUser[]> {
  await requireSuperAdmin();
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("admin_users")
    .select("id, username, display_name, role, is_active, last_login_at, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin-actions] getAdmins:", error);
    return [];
  }
  return (data ?? []) as AdminUser[];
}

// ── 어드민 생성 (super_admin만) ───────────────────────────────
export async function createAdminUser(payload: {
  username: string;
  password: string;
  displayName?: string;
  role: "admin" | "viewer";
}): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  if (!payload.username.trim() || !payload.password) {
    return { success: false, error: "아이디와 비밀번호는 필수입니다." };
  }
  if (payload.password.length < 8) {
    return { success: false, error: "비밀번호는 8자 이상이어야 합니다." };
  }

  const db = createAdminClient();

  // bcryptjs로 비밀번호 해시 생성 (cost factor 10)
  const passwordHash = await bcrypt.hash(payload.password, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (db as any)
    .from("admin_users")
    .insert({
      username:      payload.username.trim(),
      password_hash: passwordHash,
      display_name:  payload.displayName?.trim() || null,
      role:          payload.role,
    });

  if (insertError) {
    if (insertError.code === "23505") return { success: false, error: "이미 사용 중인 아이디입니다." };
    return { success: false, error: insertError.message };
  }

  revalidatePath("/settings/admins");
  return { success: true };
}

// ── 어드민 활성/비활성 토글 (super_admin만) ──────────────────
export async function toggleAdminStatus(
  adminId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const me = await requireSuperAdmin();
  if (me.id === adminId) {
    return { success: false, error: "자기 자신의 계정은 비활성화할 수 없습니다." };
  }

  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("admin_users")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", adminId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/settings/admins");
  return { success: true };
}

// ── 어드민 역할 변경 (super_admin만) ─────────────────────────
export async function updateAdminRole(
  adminId: string,
  role: "super_admin" | "admin" | "viewer"
): Promise<{ success: boolean; error?: string }> {
  const me = await requireSuperAdmin();
  if (me.id === adminId) {
    return { success: false, error: "자기 자신의 역할은 변경할 수 없습니다." };
  }

  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("admin_users")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", adminId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/settings/admins");
  return { success: true };
}

// ── 어드민 삭제 (super_admin만) ───────────────────────────────
export async function deleteAdminUser(
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const me = await requireSuperAdmin();
  if (me.id === adminId) {
    return { success: false, error: "자기 자신의 계정은 삭제할 수 없습니다." };
  }

  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("admin_users")
    .delete()
    .eq("id", adminId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/settings/admins");
  return { success: true };
}
