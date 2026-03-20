"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────────────────

export type HomepageRequestStatus = "pending" | "generating" | "completed" | "delivered" | "failed";

export interface HomepageRequest {
  id: string;
  client_id: string;
  template_name: string;
  status: HomepageRequestStatus;
  note: string | null;
  admin_note: string | null;
  project_id: string | null;
  requested_by: string | null;
  generated_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  client_name?: string;
  requester_name?: string;
}

// ── 포털: 제작 신청 ─────────────────────────────────────────────────────

export async function createHomepageRequest(payload: {
  clientId: string;
  templateName: string;
  note?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !user.client_id) {
    return { success: false, error: "로그인이 필요합니다." };
  }
  // 고객은 자신의 client_id로만 신청 가능
  if (user.client_id !== payload.clientId) {
    return { success: false, error: "권한이 없습니다." };
  }

  const db = createAdminClient();

  // 진행 중인 신청이 있는지 확인
  const { data: existing } = await db
    .from("homepage_requests")
    .select("id, status")
    .eq("client_id", payload.clientId)
    .in("status", ["pending", "generating"])
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "이미 진행 중인 제작 신청이 있습니다." };
  }

  const { data, error } = await db
    .from("homepage_requests")
    .insert({
      client_id: payload.clientId,
      template_name: payload.templateName,
      note: payload.note || null,
      requested_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/homepage");
  return { success: true, id: data.id };
}

// ── 포털: 내 신청 조회 ──────────────────────────────────────────────────

export async function getMyHomepageRequests(clientId: string): Promise<HomepageRequest[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("homepage_requests")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[homepage-request-actions] getMyHomepageRequests error:", error);
    return [];
  }

  return (data ?? []) as HomepageRequest[];
}

// ── 어드민: 전체 신청 목록 ──────────────────────────────────────────────

export async function getHomepageRequestList(filters?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: HomepageRequest[]; total: number }> {
  const session = await getAdminSession();
  if (!session) return { data: [], total: 0 };

  const db = createAdminClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from("homepage_requests")
    .select("*, clients(name), users!homepage_requests_requested_by_fkey(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[homepage-request-actions] getHomepageRequestList error:", error);
    return { data: [], total: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = ((data ?? []) as any[]).map((r: any) => ({
    ...r,
    client_name: r.clients?.name ?? null,
    requester_name: r.users?.full_name ?? null,
    clients: undefined,
    users: undefined,
  }));

  return { data: mapped, total: count ?? 0 };
}

// ── 어드민: 상태 업데이트 ───────────────────────────────────────────────

export async function updateHomepageRequestStatus(
  requestId: string,
  status: HomepageRequestStatus,
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "권한이 없습니다." };

  const db = createAdminClient();

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (adminNote !== undefined) updates.admin_note = adminNote;
  if (status === "delivered") updates.delivered_at = new Date().toISOString();
  if (status === "completed") updates.generated_at = new Date().toISOString();

  const { error } = await db
    .from("homepage_requests")
    .update(updates)
    .eq("id", requestId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/homepage-requests");
  revalidatePath("/homepage");
  return { success: true };
}

// ── 어드민: 생성 결과 연결 ──────────────────────────────────────────────

export async function linkHomepageRequestToProject(
  requestId: string,
  projectId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "권한이 없습니다." };

  const db = createAdminClient();

  const { error } = await db
    .from("homepage_requests")
    .update({
      project_id: projectId,
      status: "completed",
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/homepage-requests");
  return { success: true };
}

// ── 어드민: 신청 통계 ───────────────────────────────────────────────────

export interface HomepageRequestStats {
  total: number;
  pending: number;
  generating: number;
  completed: number;
  delivered: number;
  failed: number;
}

export async function getHomepageRequestStats(): Promise<HomepageRequestStats> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("homepage_requests")
    .select("status");

  if (error || !data) {
    return { total: 0, pending: 0, generating: 0, completed: 0, delivered: 0, failed: 0 };
  }

  return {
    total: data.length,
    pending: data.filter((r) => r.status === "pending").length,
    generating: data.filter((r) => r.status === "generating").length,
    completed: data.filter((r) => r.status === "completed").length,
    delivered: data.filter((r) => r.status === "delivered").length,
    failed: data.filter((r) => r.status === "failed").length,
  };
}
