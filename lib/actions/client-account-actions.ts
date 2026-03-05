"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LinkedAccount {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

// ── 연결된 계정 조회 ──────────────────────────────────────────────────────

export async function getLinkedAccount(
  clientId: string
): Promise<LinkedAccount | null> {
  await requireAdminSession();
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("users")
    .select("id, email, name, role, created_at, last_login_at")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[client-account] getLinkedAccount:", error);
    return null;
  }

  return data as LinkedAccount | null;
}

// ── 계정 연결 ─────────────────────────────────────────────────────────────

export async function linkClientAccount(
  clientId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdminSession();
  const db = createAdminClient();

  // 이미 연결된 계정 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("users")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "이미 연결된 계정이 있습니다." };
  }

  // 해당 이메일의 유저 검색
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: user, error: findErr } = await (db as any)
    .from("users")
    .select("id, client_id")
    .eq("email", email.trim().toLowerCase())
    .eq("is_active", true)
    .maybeSingle();

  if (findErr || !user) {
    return {
      success: false,
      error: "해당 이메일의 계정이 없습니다. 초대를 먼저 발송해주세요.",
    };
  }

  if (user.client_id) {
    return {
      success: false,
      error: "이 계정은 이미 다른 고객에 연결되어 있습니다.",
    };
  }

  // client_id 연결
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (db as any)
    .from("users")
    .update({ client_id: clientId })
    .eq("id", user.id);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  revalidatePath(`/ops/clients/${clientId}`);
  return { success: true };
}

// ── 계정 연결 해제 ────────────────────────────────────────────────────────

export async function unlinkClientAccount(
  clientId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdminSession();
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("users")
    .update({ client_id: null })
    .eq("id", userId)
    .eq("client_id", clientId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/ops/clients/${clientId}`);
  return { success: true };
}

// ── 고객 초대 (기존 inviteUser 래핑) ──────────────────────────────────────

export async function inviteClientUser(
  clientId: string,
  email: string
): Promise<{ success: boolean; error?: string; inviteUrl?: string }> {
  await requireAdminSession();
  const db = createAdminClient();

  // 이미 연결된 계정 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("users")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "이미 연결된 계정이 있습니다." };
  }

  // 이메일 중복 체크
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingUser } = await (db as any)
    .from("users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (existingUser) {
    return {
      success: false,
      error: "이미 가입된 이메일입니다. 계정 연결을 사용해주세요.",
    };
  }

  // 초대 토큰 생성
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertErr } = await (db as any)
    .from("invitations")
    .insert({
      email: email.trim().toLowerCase(),
      role: "client_owner",
      client_id: clientId,
      token,
      expires_at: expiresAt,
    });

  if (insertErr) {
    return { success: false, error: insertErr.message };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://web-five-gold-12.vercel.app";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  revalidatePath(`/ops/clients/${clientId}`);
  return { success: true, inviteUrl };
}
