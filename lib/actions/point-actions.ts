"use server";

/**
 * point-actions.ts
 * Phase 3: 포인트 시스템 서버 액션
 *
 * - initializeClientPoints: 가입 시 포인트 초기화
 * - checkPointBalance: 잔액 확인
 * - spendPoints: 콘텐츠 생성 시 포인트 차감
 * - grantPoints: 관리자 수동 부여
 * - revokePoints: 관리자 회수
 * - canGenerateContent: 역할별 콘텐츠 생성 권한 체크
 * - getPointSettings: 포인트 설정 조회
 * - updatePointSettings: 포인트 설정 변경
 * - getClientPointsList: 고객별 잔액 목록
 * - getPointTransactions: 거래 이력
 */

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface PointBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  canGenerate: boolean;
  costPerContent: number;
}

export interface PointTransaction {
  id: string;
  client_id: string;
  client_name?: string;
  amount: number;
  type: "grant" | "spend" | "revoke" | "signup_bonus" | "refund";
  description: string | null;
  content_id: string | null;
  granted_by: string | null;
  granted_by_name?: string;
  created_at: string;
}

export interface ClientPointSummary {
  client_id: string;
  client_name: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  last_used_at: string | null;
}

// ═══════════════════════════════════════════
// 포인트 설정 조회
// ═══════════════════════════════════════════

async function getCostPerContent(): Promise<number> {
  const db = createAdminClient();
  const { data } = await db
    .from("point_settings")
    .select("setting_value")
    .eq("setting_key", "cost_per_content")
    .maybeSingle();
  return data?.setting_value ?? 1;
}

async function getSignupBonus(): Promise<number> {
  const db = createAdminClient();
  const { data } = await db
    .from("point_settings")
    .select("setting_value")
    .eq("setting_key", "signup_bonus")
    .maybeSingle();
  return data?.setting_value ?? 3;
}

// ═══════════════════════════════════════════
// 2-1. 포인트 초기화 (가입 시)
// ═══════════════════════════════════════════

export async function initializeClientPoints(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();

    // 이미 존재하는지 확인
    const { data: existing } = await db
      .from("client_points")
      .select("id")
      .eq("client_id", clientId)
      .maybeSingle();

    if (existing) {
      return { success: true }; // 이미 초기화됨
    }

    const signupBonus = await getSignupBonus();
    const now = new Date().toISOString();

    // client_points INSERT
    const { error: pointErr } = await db.from("client_points").insert({
      client_id: clientId,
      balance: signupBonus,
      total_earned: signupBonus,
      total_spent: 0,
      created_at: now,
      updated_at: now,
    });

    if (pointErr) {
      return { success: false, error: pointErr.message };
    }

    // point_transactions INSERT
    await db.from("point_transactions").insert({
      client_id: clientId,
      amount: signupBonus,
      type: "signup_bonus",
      description: `가입 보너스 ${signupBonus}건`,
      created_at: now,
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ═══════════════════════════════════════════
// 2-2. 포인트 잔액 확인
// ═══════════════════════════════════════════

export async function checkPointBalance(
  clientId: string
): Promise<PointBalance> {
  const db = createAdminClient();
  const costPerContent = await getCostPerContent();

  const { data } = await db
    .from("client_points")
    .select("balance, total_earned, total_spent")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!data) {
    // 자동 생성 (기존 클라이언트 fallback, balance=0)
    await db.from("client_points").insert({
      client_id: clientId,
      balance: 0,
      total_earned: 0,
      total_spent: 0,
    });

    return {
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      canGenerate: false,
      costPerContent,
    };
  }

  return {
    balance: data.balance,
    totalEarned: data.total_earned,
    totalSpent: data.total_spent,
    canGenerate: data.balance >= costPerContent,
    costPerContent,
  };
}

// ═══════════════════════════════════════════
// 2-3. 포인트 차감 (콘텐츠 생성 시)
// ═══════════════════════════════════════════

export async function spendPoints(
  clientId: string,
  contentId: string | null,
  amount?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    const costPerContent = amount ?? (await getCostPerContent());
    const now = new Date().toISOString();

    // 잔액 확인
    const balance = await checkPointBalance(clientId);
    if (balance.balance < costPerContent) {
      return {
        success: false,
        error: `포인트가 부족합니다. 현재 잔액: ${balance.balance}, 필요: ${costPerContent}`,
      };
    }

    // client_points UPDATE
    const { error: updateErr } = await db
      .from("client_points")
      .update({
        balance: balance.balance - costPerContent,
        total_spent: balance.totalSpent + costPerContent,
        updated_at: now,
      })
      .eq("client_id", clientId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // point_transactions INSERT
    await db.from("point_transactions").insert({
      client_id: clientId,
      amount: -costPerContent,
      type: "spend",
      description: "콘텐츠 생성",
      content_id: contentId,
      created_at: now,
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ═══════════════════════════════════════════
// 2-3-1. 포인트 환불 (콘텐츠 생성 실패 시 자동)
// ═══════════════════════════════════════════

export async function refundPoints(
  clientId: string,
  contentId: string | null,
  amount?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    const costPerContent = amount ?? (await getCostPerContent());
    const now = new Date().toISOString();

    // 현재 잔액 조회
    const balance = await checkPointBalance(clientId);

    // client_points UPDATE (잔액 복구)
    const { error: updateErr } = await db
      .from("client_points")
      .update({
        balance: balance.balance + costPerContent,
        total_spent: Math.max(0, balance.totalSpent - costPerContent),
        updated_at: now,
      })
      .eq("client_id", clientId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // point_transactions INSERT (refund)
    await db.from("point_transactions").insert({
      client_id: clientId,
      amount: costPerContent,
      type: "refund",
      description: "콘텐츠 생성 실패 — 포인트 자동 환불",
      content_id: contentId,
      created_at: now,
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ═══════════════════════════════════════════
// 2-4. 포인트 부여 (관리자)
// ═══════════════════════════════════════════

export async function grantPoints(
  clientId: string,
  amount: number,
  description: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    const now = new Date().toISOString();

    // 현재 잔액 조회
    const balance = await checkPointBalance(clientId);

    // client_points UPDATE
    const { error: updateErr } = await db
      .from("client_points")
      .update({
        balance: balance.balance + amount,
        total_earned: balance.totalEarned + amount,
        updated_at: now,
      })
      .eq("client_id", clientId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // point_transactions INSERT
    await db.from("point_transactions").insert({
      client_id: clientId,
      amount: amount,
      type: "grant",
      description,
      granted_by: adminUserId,
      created_at: now,
    });

    revalidatePath("/ops/points");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ═══════════════════════════════════════════
// 2-5. 포인트 회수 (관리자)
// ═══════════════════════════════════════════

export async function revokePoints(
  clientId: string,
  amount: number,
  description: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    const now = new Date().toISOString();

    const balance = await checkPointBalance(clientId);

    // client_points UPDATE
    const { error: updateErr } = await db
      .from("client_points")
      .update({
        balance: balance.balance - amount,
        updated_at: now,
      })
      .eq("client_id", clientId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // point_transactions INSERT
    await db.from("point_transactions").insert({
      client_id: clientId,
      amount: -amount,
      type: "revoke",
      description,
      granted_by: adminUserId,
      created_at: now,
    });

    revalidatePath("/ops/points");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ═══════════════════════════════════════════
// 2-6. 역할별 콘텐츠 생성 권한 체크
// ═══════════════════════════════════════════

export async function canGenerateContent(
  role: string,
  clientId: string
): Promise<{
  allowed: boolean;
  balance?: number;
  costPerContent?: number;
  error?: string;
}> {
  // admin/super_admin → 무료 무제한
  if (role === "super_admin" || role === "admin") {
    return { allowed: true };
  }

  // sales/client_owner/client_member → 포인트 체크
  const balance = await checkPointBalance(clientId);
  if (balance.canGenerate) {
    return {
      allowed: true,
      balance: balance.balance,
      costPerContent: balance.costPerContent,
    };
  }

  return {
    allowed: false,
    balance: balance.balance,
    costPerContent: balance.costPerContent,
    error: `포인트가 부족합니다. 현재 잔액: ${balance.balance}, 필요: ${balance.costPerContent}`,
  };
}

// ═══════════════════════════════════════════
// 포인트 설정 조회/수정
// ═══════════════════════════════════════════

export async function getPointSettings(): Promise<
  Array<{
    id: string;
    setting_key: string;
    setting_value: number;
    description: string | null;
  }>
> {
  const db = createAdminClient();
  const { data } = await db
    .from("point_settings")
    .select("id, setting_key, setting_value, description")
    .order("setting_key");
  return (data ?? []) as Array<{
    id: string;
    setting_key: string;
    setting_value: number;
    description: string | null;
  }>;
}

export async function updatePointSettings(
  settings: Array<{ key: string; value: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    const now = new Date().toISOString();

    for (const s of settings) {
      await db
        .from("point_settings")
        .update({ setting_value: s.value, updated_at: now })
        .eq("setting_key", s.key);
    }

    revalidatePath("/ops/points");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ═══════════════════════════════════════════
// 고객별 잔액 목록
// ═══════════════════════════════════════════

export async function getClientPointsList(): Promise<ClientPointSummary[]> {
  const db = createAdminClient();

  // client_points + clients JOIN
  const { data: points } = await db
    .from("client_points")
    .select("client_id, balance, total_earned, total_spent, updated_at")
    .order("updated_at", { ascending: false });

  if (!points || points.length === 0) return [];

  // 클라이언트 이름 조회
  const clientIds = points.map((p: { client_id: string }) => p.client_id);
  const { data: clients } = await db
    .from("clients")
    .select("id, name")
    .in("id", clientIds);

  const nameMap: Record<string, string> = {};
  for (const c of (clients ?? []) as Array<{ id: string; name: string }>) {
    nameMap[c.id] = c.name;
  }

  // 마지막 사용일 조회
  const { data: lastSpend } = await db
    .from("point_transactions")
    .select("client_id, created_at")
    .eq("type", "spend")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  const lastUsedMap: Record<string, string> = {};
  for (const tx of (lastSpend ?? []) as Array<{
    client_id: string;
    created_at: string;
  }>) {
    if (!lastUsedMap[tx.client_id]) {
      lastUsedMap[tx.client_id] = tx.created_at;
    }
  }

  return (
    points as Array<{
      client_id: string;
      balance: number;
      total_earned: number;
      total_spent: number;
    }>
  ).map((p) => ({
    client_id: p.client_id,
    client_name: nameMap[p.client_id] || "알 수 없음",
    balance: p.balance,
    total_earned: p.total_earned,
    total_spent: p.total_spent,
    last_used_at: lastUsedMap[p.client_id] || null,
  }));
}

// ═══════════════════════════════════════════
// 거래 이력
// ═══════════════════════════════════════════

export async function getPointTransactions(filters?: {
  type?: string;
  clientId?: string;
}): Promise<PointTransaction[]> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = db
    .from("point_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }

  const { data } = await query;
  if (!data || data.length === 0) return [];

  // 클라이언트 이름 조회
  const clientIds = [
    ...new Set(
      (data as Array<{ client_id: string }>).map((d) => d.client_id)
    ),
  ];
  const { data: clients } = await db
    .from("clients")
    .select("id, name")
    .in("id", clientIds);

  const nameMap: Record<string, string> = {};
  for (const c of (clients ?? []) as Array<{ id: string; name: string }>) {
    nameMap[c.id] = c.name;
  }

  // 관리자 이름 조회
  const adminIds = [
    ...new Set(
      (data as Array<{ granted_by: string | null }>)
        .map((d) => d.granted_by)
        .filter(Boolean) as string[]
    ),
  ];
  const adminNameMap: Record<string, string> = {};
  if (adminIds.length > 0) {
    const { data: admins } = await db
      .from("admin_users")
      .select("id, display_name, username")
      .in("id", adminIds);
    for (const a of (admins ?? []) as Array<{
      id: string;
      display_name: string | null;
      username: string;
    }>) {
      adminNameMap[a.id] = a.display_name || a.username;
    }
  }

  return (
    data as Array<{
      id: string;
      client_id: string;
      amount: number;
      type: "grant" | "spend" | "revoke" | "signup_bonus" | "refund";
      description: string | null;
      content_id: string | null;
      granted_by: string | null;
      created_at: string;
    }>
  ).map((tx) => ({
    ...tx,
    client_name: nameMap[tx.client_id] || "알 수 없음",
    granted_by_name: tx.granted_by
      ? adminNameMap[tx.granted_by] || "시스템"
      : undefined,
  }));
}
