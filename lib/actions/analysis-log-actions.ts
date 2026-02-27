"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

const LEAD_STATUSES = ["new", "contacted", "consulting", "contracted", "active", "churned"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface AnalysisLogFilters {
  salesRef?: string;
  leadStatus?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface AnalysisLogItem {
  id: string;
  place_name: string;
  category: string;
  lead_status: string;
  sales_ref: string | null;
  sales_agent_name: string | null;
  client_id: string | null;
  client_name: string | null;
  marketing_score: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes_count: number;
  has_consultation: boolean;
  created_at: string;
  analyzed_at: string | null;
  last_activity_at: string;
}

export interface AnalysisNote {
  id: string;
  type?: "comment" | "system" | "consultation" | "status_change";
  author: string;
  text: string;
  created_at: string;
}

export interface AnalysisLogDetail {
  id: string;
  place_id: string | null;
  input_url: string;
  place_name: string;
  category: string;
  address: string;
  region: string;
  lead_status: string;
  status: string;
  sales_ref: string | null;
  sales_agent_name: string | null;
  marketing_score: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  client_id: string | null;
  view_count: number;
  created_at: string;
  analyzed_at: string | null;
  last_activity_at: string;
  // JSONB fields
  basic_info: Record<string, unknown> | null;
  keyword_analysis: Record<string, unknown> | null;
  content_strategy: Record<string, unknown> | null;
  image_analysis: Record<string, unknown> | null;
  seo_audit: Record<string, unknown> | null;
  keyword_rankings: Array<Record<string, unknown>> | null;
  notes: AnalysisNote[];
  consultations: Array<{
    id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    message: string | null;
    created_at: string;
  }>;
}

export interface AnalysisStats {
  total: number;
  byStatus: Record<string, number>;
  bySalesAgent: Array<{
    ref_code: string;
    name: string;
    total: number;
    consulting: number;
    contracted: number;
  }>;
  recentCount: number;
  consultationRate: number;
}

// ═══════════════════════════════════════════
// 2-1. 분석 로그 목록
// ═══════════════════════════════════════════

export async function getAnalysisLogs(filters: AnalysisLogFilters = {}): Promise<{
  data: AnalysisLogItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const db = createAdminClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("brand_analyses")
    .select("id, status, lead_status, sales_ref, client_id, marketing_score, contact_name, contact_phone, notes, basic_info, created_at, analyzed_at, last_activity_at, view_count", { count: "exact" })
    .eq("status", "completed")
    .order("last_activity_at", { ascending: false });

  if (filters.salesRef) {
    query = query.eq("sales_ref", filters.salesRef);
  }
  if (filters.leadStatus) {
    query = query.eq("lead_status", filters.leadStatus);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo + "T23:59:59");
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data: rows, count, error } = await query;
  if (error) {
    console.error("getAnalysisLogs error:", error);
    return { data: [], total: 0, page, pageSize };
  }

  // 영업사원 이름 매핑
  const salesRefs = [...new Set((rows ?? []).map((r: { sales_ref: string | null }) => r.sales_ref).filter(Boolean))] as string[];
  let agentMap: Record<string, string> = {};
  if (salesRefs.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agents } = await (db as any)
      .from("sales_agents")
      .select("ref_code, name")
      .in("ref_code", salesRefs);
    if (agents) {
      agentMap = Object.fromEntries(agents.map((a: { ref_code: string; name: string }) => [a.ref_code, a.name]));
    }
  }

  // 상담 신청 존재 여부 체크
  const ids = (rows ?? []).map((r: { id: string }) => r.id);
  let consultationSet = new Set<string>();
  if (ids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cons } = await (db as any)
      .from("consultation_requests")
      .select("analysis_id")
      .in("analysis_id", ids);
    if (cons) {
      consultationSet = new Set(cons.map((c: { analysis_id: string }) => c.analysis_id));
    }
  }

  // 클라이언트 이름 매핑
  const clientIds = [...new Set((rows ?? []).map((r: { client_id: string | null }) => r.client_id).filter(Boolean))] as string[];
  let clientMap: Record<string, string> = {};
  if (clientIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clients } = await (db as any)
      .from("clients")
      .select("id, brand_name")
      .in("id", clientIds);
    if (clients) {
      clientMap = Object.fromEntries(clients.map((c: { id: string; brand_name: string }) => [c.id, c.brand_name]));
    }
  }

  // 검색 필터 (클라이언트 사이드 — basic_info JSONB 내부 검색은 서버에서)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let filteredRows = rows ?? [] as any[];
  if (filters.search) {
    const s = filters.search.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredRows = filteredRows.filter((r: any) => {
      const name = (r.basic_info?.name ?? "").toLowerCase();
      const category = (r.basic_info?.category ?? "").toLowerCase();
      return name.includes(s) || category.includes(s);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: AnalysisLogItem[] = filteredRows.map((r: any) => ({
    id: r.id,
    place_name: r.basic_info?.name ?? "알 수 없음",
    category: r.basic_info?.category ?? "",
    lead_status: r.lead_status ?? "new",
    sales_ref: r.sales_ref,
    sales_agent_name: r.sales_ref ? (agentMap[r.sales_ref] ?? r.sales_ref) : null,
    client_id: r.client_id ?? null,
    client_name: r.client_id ? (clientMap[r.client_id] ?? null) : null,
    marketing_score: r.marketing_score,
    contact_name: r.contact_name,
    contact_phone: r.contact_phone,
    notes_count: Array.isArray(r.notes) ? r.notes.length : 0,
    has_consultation: consultationSet.has(r.id),
    created_at: r.created_at,
    analyzed_at: r.analyzed_at,
    last_activity_at: r.last_activity_at ?? r.created_at,
  }));

  return { data, total: count ?? 0, page, pageSize };
}

// ═══════════════════════════════════════════
// 2-2. 분석 상세 조회
// ═══════════════════════════════════════════

export async function getAnalysisLogDetail(id: string): Promise<AnalysisLogDetail | null> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("brand_analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  // 영업사원 이름
  let salesAgentName: string | null = null;
  if (data.sales_ref) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agent } = await (db as any)
      .from("sales_agents")
      .select("name")
      .eq("ref_code", data.sales_ref)
      .maybeSingle();
    salesAgentName = agent?.name ?? data.sales_ref;
  }

  // 상담 신청 이력
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: consultations } = await (db as any)
    .from("consultation_requests")
    .select("id, contact_name, contact_phone, contact_email, message, created_at")
    .eq("analysis_id", id)
    .order("created_at", { ascending: false });

  const bi = data.basic_info ?? {};

  return {
    id: data.id,
    place_id: data.place_id,
    input_url: data.input_url,
    place_name: bi.name ?? "알 수 없음",
    category: bi.category ?? "",
    address: bi.address ?? "",
    region: bi.region ?? "",
    lead_status: data.lead_status ?? "new",
    status: data.status,
    sales_ref: data.sales_ref,
    sales_agent_name: salesAgentName,
    marketing_score: data.marketing_score,
    contact_name: data.contact_name,
    contact_phone: data.contact_phone,
    contact_email: data.contact_email,
    client_id: data.client_id,
    view_count: data.view_count ?? 0,
    created_at: data.created_at,
    analyzed_at: data.analyzed_at,
    last_activity_at: data.last_activity_at ?? data.created_at,
    basic_info: data.basic_info,
    keyword_analysis: data.keyword_analysis,
    content_strategy: data.content_strategy,
    image_analysis: data.image_analysis,
    seo_audit: data.seo_audit,
    keyword_rankings: data.keyword_rankings,
    notes: Array.isArray(data.notes) ? data.notes : [],
    consultations: consultations ?? [],
  };
}

// ═══════════════════════════════════════════
// 2-3. 상태 변경
// ═══════════════════════════════════════════

export async function updateLeadStatus(id: string, leadStatus: string): Promise<{ success: boolean }> {
  if (!LEAD_STATUSES.includes(leadStatus as LeadStatus)) {
    return { success: false };
  }
  const db = createAdminClient();
  const now = new Date().toISOString();
  const statusLabel = {
    new: "신규", contacted: "연락완료", consulting: "상담중",
    contracted: "계약완료", active: "관리중", churned: "이탈",
  }[leadStatus] ?? leadStatus;

  // 기존 notes 가져오기
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("brand_analyses")
    .select("notes")
    .eq("id", id)
    .single();

  const currentNotes = Array.isArray(existing?.notes) ? existing.notes : [];
  const systemNote = {
    id: crypto.randomUUID(),
    type: "status_change" as const,
    author: "시스템",
    text: `상태 변경: ${statusLabel}`,
    created_at: now,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("brand_analyses")
    .update({
      lead_status: leadStatus,
      notes: [systemNote, ...currentNotes],
      last_activity_at: now,
    })
    .eq("id", id);

  if (error) return { success: false };
  revalidatePath("/ops/analysis-logs");
  revalidatePath(`/ops/analysis-logs/${id}`);
  return { success: true };
}

// ═══════════════════════════════════════════
// 2-4. 코멘트 추가
// ═══════════════════════════════════════════

export async function addAnalysisNote(id: string, author: string, text: string): Promise<{ success: boolean }> {
  if (!text.trim()) return { success: false };

  const db = createAdminClient();
  const noteId = crypto.randomUUID();
  const now = new Date().toISOString();

  // 기존 notes 가져오기
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("brand_analyses")
    .select("notes")
    .eq("id", id)
    .single();

  const currentNotes = Array.isArray(existing?.notes) ? existing.notes : [];
  const newNote = { id: noteId, type: "comment" as const, author, text: text.trim(), created_at: now };
  const updatedNotes = [newNote, ...currentNotes];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("brand_analyses")
    .update({ notes: updatedNotes, last_activity_at: now })
    .eq("id", id);

  if (error) return { success: false };
  revalidatePath(`/ops/analysis-logs/${id}`);
  return { success: true };
}

// ═══════════════════════════════════════════
// 2-5. 연락처 수정
// ═══════════════════════════════════════════

export async function updateAnalysisContact(
  id: string,
  contact: { contact_name?: string; contact_phone?: string; contact_email?: string },
): Promise<{ success: boolean }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { last_activity_at: new Date().toISOString() };
  if (contact.contact_name !== undefined) update.contact_name = contact.contact_name;
  if (contact.contact_phone !== undefined) update.contact_phone = contact.contact_phone;
  if (contact.contact_email !== undefined) update.contact_email = contact.contact_email;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("brand_analyses")
    .update(update)
    .eq("id", id);

  if (error) return { success: false };
  revalidatePath(`/ops/analysis-logs/${id}`);
  return { success: true };
}

// ═══════════════════════════════════════════
// 2-6. 클라이언트 연결
// ═══════════════════════════════════════════

export async function linkAnalysisToClient(analysisId: string, clientId: string): Promise<{ success: boolean }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("brand_analyses")
    .update({
      client_id: clientId,
      lead_status: "contracted",
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", analysisId);

  if (error) return { success: false };
  revalidatePath("/ops/analysis-logs");
  return { success: true };
}

// ═══════════════════════════════════════════
// 2-7. 통계
// ═══════════════════════════════════════════

export async function getAnalysisStats(): Promise<AnalysisStats> {
  const db = createAdminClient();

  // 전체 완료된 분석 수 + 상태별
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: all } = await (db as any)
    .from("brand_analyses")
    .select("lead_status, sales_ref")
    .eq("status", "completed");

  const rows = all ?? [];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  for (const r of rows) {
    const s = r.lead_status ?? "new";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  // 최근 7일
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: recentCount } = await (db as any)
    .from("brand_analyses")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("created_at", sevenDaysAgo);

  // 상담 전환율
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: consultationCount } = await (db as any)
    .from("consultation_requests")
    .select("id", { count: "exact", head: true });

  const consultationRate = total > 0 ? Math.round(((consultationCount ?? 0) / total) * 1000) / 10 : 0;

  // 영업사원별 통계
  const salesMap: Record<string, { total: number; consulting: number; contracted: number }> = {};
  for (const r of rows) {
    if (!r.sales_ref) continue;
    if (!salesMap[r.sales_ref]) salesMap[r.sales_ref] = { total: 0, consulting: 0, contracted: 0 };
    salesMap[r.sales_ref].total++;
    if (r.lead_status === "consulting") salesMap[r.sales_ref].consulting++;
    if (r.lead_status === "contracted" || r.lead_status === "active") salesMap[r.sales_ref].contracted++;
  }

  // 영업사원 이름 조회
  const refs = Object.keys(salesMap);
  let agentNames: Record<string, string> = {};
  if (refs.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agents } = await (db as any)
      .from("sales_agents")
      .select("ref_code, name")
      .in("ref_code", refs);
    if (agents) {
      agentNames = Object.fromEntries(agents.map((a: { ref_code: string; name: string }) => [a.ref_code, a.name]));
    }
  }

  const bySalesAgent = Object.entries(salesMap).map(([ref, stats]) => ({
    ref_code: ref,
    name: agentNames[ref] ?? ref,
    ...stats,
  }));

  return {
    total,
    byStatus,
    bySalesAgent,
    recentCount: recentCount ?? 0,
    consultationRate,
  };
}

// ═══════════════════════════════════════════
// 2-8. 영업사원 배정
// ═══════════════════════════════════════════

export async function assignSalesAgent(analysisId: string, salesRef: string | null): Promise<{ success: boolean }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // 영업사원 이름 조회
  let agentName = salesRef;
  if (salesRef) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agent } = await (db as any)
      .from("sales_agents")
      .select("name")
      .eq("ref_code", salesRef)
      .maybeSingle();
    if (agent) agentName = agent.name;
  }

  // 기존 notes 가져오기
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("brand_analyses")
    .select("notes")
    .eq("id", analysisId)
    .single();

  const currentNotes = Array.isArray(existing?.notes) ? existing.notes : [];
  const systemNote = {
    id: crypto.randomUUID(),
    type: "system" as const,
    author: "시스템",
    text: salesRef ? `영업사원 배정: ${agentName} (${salesRef})` : "영업사원 배정 해제",
    created_at: now,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("brand_analyses")
    .update({
      sales_ref: salesRef,
      notes: [systemNote, ...currentNotes],
      last_activity_at: now,
    })
    .eq("id", analysisId);

  if (error) return { success: false };
  revalidatePath("/ops/analysis-logs");
  revalidatePath(`/ops/analysis-logs/${analysisId}`);
  return { success: true };
}

// ═══════════════════════════════════════════
// 2-9. 브랜드 계정 할당
// ═══════════════════════════════════════════

export async function assignToClient(analysisId: string, clientId: string | null): Promise<{ success: boolean }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // 브랜드 이름 조회
  let brandName = "";
  if (clientId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: client } = await (db as any)
      .from("clients")
      .select("brand_name")
      .eq("id", clientId)
      .maybeSingle();
    brandName = client?.brand_name ?? clientId;
  }

  // 기존 notes 가져오기
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("brand_analyses")
    .select("notes")
    .eq("id", analysisId)
    .single();

  const currentNotes = Array.isArray(existing?.notes) ? existing.notes : [];
  const systemNote = {
    id: crypto.randomUUID(),
    type: "system" as const,
    author: "시스템",
    text: clientId ? `브랜드 계정 연결: ${brandName}` : "브랜드 계정 연결 해제",
    created_at: now,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("brand_analyses")
    .update({
      client_id: clientId,
      notes: [systemNote, ...currentNotes],
      last_activity_at: now,
    })
    .eq("id", analysisId);

  if (error) return { success: false };
  revalidatePath("/ops/analysis-logs");
  revalidatePath(`/ops/analysis-logs/${analysisId}`);
  return { success: true };
}

// ═══════════════════════════════════════════
// 2-10. 클라이언트 목록 (드롭다운용)
// ═══════════════════════════════════════════

export async function getClientsList(): Promise<Array<{ id: string; brand_name: string; status: string }>> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("clients")
    .select("id, brand_name, status")
    .order("brand_name");
  return data ?? [];
}

// ═══════════════════════════════════════════
// 영업사원 목록 (필터 드롭다운용)
// ═══════════════════════════════════════════

export async function getSalesAgentsList(): Promise<Array<{ ref_code: string; name: string }>> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("sales_agents")
    .select("ref_code, name")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}
