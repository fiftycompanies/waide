"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

const CONSULT_STATUSES = ["pending", "contacted", "consulting", "contracted", "closed"] as const;
export type ConsultStatus = (typeof CONSULT_STATUSES)[number];

export interface ConsultationFilters {
  status?: string;
  assignedTo?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  channel?: string;
  page?: number;
  pageSize?: number;
}

export interface ConsultationListItem {
  id: string;
  brand_name: string | null;
  marketing_score: number | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  message: string | null;
  status: string;
  assigned_to: string | null;
  assigned_agent_name: string | null;
  interested_items: string[];
  channel: string;
  notes_count: number;
  follow_up_date: string | null;
  created_at: string;
  last_activity_at: string;
}

export interface ConsultationNote {
  id: string;
  type?: "comment" | "system" | "status_change" | "follow_up";
  author: string;
  text: string;
  created_at: string;
}

export interface ConsultationDetail {
  id: string;
  analysis_id: string | null;
  brand_name: string | null;
  marketing_score: number | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  message: string | null;
  status: string;
  assigned_to: string | null;
  assigned_agent_name: string | null;
  interested_items: string[];
  channel: string;
  notes: ConsultationNote[];
  follow_up_date: string | null;
  consultation_date: string | null;
  sales_ref: string | null;
  created_at: string;
  last_activity_at: string;
  // 분석 연결 정보
  analysis_place_name: string | null;
  analysis_url: string | null;
}

export interface ConsultationStats {
  total: number;
  byStatus: Record<string, number>;
  recentCount: number;
  avgResponseTime: number | null; // hours
}

// ═══════════════════════════════════════════
// 상태 라벨 (내부 전용 — "use server" 파일에서는 상수 export 금지)
// ═══════════════════════════════════════════

const CONSULT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "text-red-600" },
  contacted: { label: "연락완료", color: "text-orange-600" },
  consulting: { label: "상담중", color: "text-yellow-700" },
  contracted: { label: "계약", color: "text-green-600" },
  closed: { label: "종료", color: "text-gray-500" },
};

// ═══════════════════════════════════════════
// 1. 상담 목록 조회
// ═══════════════════════════════════════════

export async function getConsultationList(filters: ConsultationFilters = {}): Promise<{
  data: ConsultationListItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  try {
  const db = createAdminClient();
  const offset = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("consultation_requests")
    .select("id, analysis_id, brand_name, marketing_score, contact_name, contact_phone, contact_email, message, status, assigned_to, interested_items, channel, notes, follow_up_date, sales_ref, created_at, last_activity_at", { count: "exact" })
    .order("last_activity_at", { ascending: false, nullsFirst: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.assignedTo) {
    query = query.eq("assigned_to", filters.assignedTo);
  }
  if (filters.channel) {
    query = query.eq("channel", filters.channel);
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
    console.error("getConsultationList error:", error);
    return { data: [], total: 0, page, pageSize };
  }

  // 영업사원 이름 매핑
  const assignedRefs = [...new Set(
    (rows ?? [])
      .map((r: { assigned_to: string | null; sales_ref: string | null }) => r.assigned_to || r.sales_ref)
      .filter(Boolean)
  )] as string[];
  let agentMap: Record<string, string> = {};
  if (assignedRefs.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agents } = await (db as any)
      .from("sales_agents")
      .select("ref_code, name")
      .in("ref_code", assignedRefs);
    if (agents) {
      agentMap = Object.fromEntries(agents.map((a: { ref_code: string; name: string }) => [a.ref_code, a.name]));
    }
  }

  // 검색 필터 (클라이언트 사이드)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let filteredRows = rows ?? [] as any[];
  if (filters.search) {
    const s = filters.search.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredRows = filteredRows.filter((r: any) => {
      const name = (r.contact_name ?? "").toLowerCase();
      const phone = (r.contact_phone ?? "").toLowerCase();
      const brand = (r.brand_name ?? "").toLowerCase();
      return name.includes(s) || phone.includes(s) || brand.includes(s);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: ConsultationListItem[] = filteredRows.map((r: any) => {
    const agentRef = r.assigned_to || r.sales_ref;
    return {
      id: r.id,
      brand_name: r.brand_name,
      marketing_score: r.marketing_score,
      contact_name: r.contact_name,
      contact_phone: r.contact_phone,
      contact_email: r.contact_email,
      message: r.message,
      status: r.status ?? "pending",
      assigned_to: r.assigned_to,
      assigned_agent_name: agentRef ? (agentMap[agentRef] ?? agentRef) : null,
      interested_items: Array.isArray(r.interested_items) ? r.interested_items : [],
      channel: r.channel ?? "web",
      notes_count: Array.isArray(r.notes) ? r.notes.length : 0,
      follow_up_date: r.follow_up_date,
      created_at: r.created_at,
      last_activity_at: r.last_activity_at ?? r.created_at,
    };
  });

  return { data, total: count ?? 0, page, pageSize };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("getConsultationList exception:", msg);
    return { data: [], total: 0, page, pageSize, error: "getConsultationList: " + msg };
  }
}

// ═══════════════════════════════════════════
// 2. 상담 상세 조회
// ═══════════════════════════════════════════

export async function getConsultationDetail(id: string): Promise<ConsultationDetail | null> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("consultation_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  // 영업사원 이름
  let assignedAgentName: string | null = null;
  const agentRef = data.assigned_to || data.sales_ref;
  if (agentRef) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agent } = await (db as any)
      .from("sales_agents")
      .select("name")
      .eq("ref_code", agentRef)
      .maybeSingle();
    assignedAgentName = agent?.name ?? agentRef;
  }

  // 분석 정보
  let analysisPlaceName: string | null = null;
  let analysisUrl: string | null = null;
  if (data.analysis_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: analysis } = await (db as any)
      .from("brand_analyses")
      .select("basic_info, input_url")
      .eq("id", data.analysis_id)
      .maybeSingle();
    if (analysis) {
      analysisPlaceName = analysis.basic_info?.name ?? null;
      analysisUrl = analysis.input_url ?? null;
    }
  }

  return {
    id: data.id,
    analysis_id: data.analysis_id,
    brand_name: data.brand_name ?? analysisPlaceName,
    marketing_score: data.marketing_score,
    contact_name: data.contact_name,
    contact_phone: data.contact_phone,
    contact_email: data.contact_email,
    message: data.message,
    status: data.status ?? "pending",
    assigned_to: data.assigned_to,
    assigned_agent_name: assignedAgentName,
    interested_items: Array.isArray(data.interested_items) ? data.interested_items : [],
    channel: data.channel ?? "web",
    notes: Array.isArray(data.notes) ? data.notes : [],
    follow_up_date: data.follow_up_date,
    consultation_date: data.consultation_date,
    sales_ref: data.sales_ref,
    created_at: data.created_at,
    last_activity_at: data.last_activity_at ?? data.created_at,
    analysis_place_name: analysisPlaceName,
    analysis_url: analysisUrl,
  };
}

// ═══════════════════════════════════════════
// 3. 상태 변경
// ═══════════════════════════════════════════

export async function updateConsultationStatus(id: string, status: string): Promise<{ success: boolean }> {
  if (!CONSULT_STATUSES.includes(status as ConsultStatus)) {
    return { success: false };
  }
  const db = createAdminClient();
  const now = new Date().toISOString();
  const statusLabel = CONSULT_STATUS_CONFIG[status]?.label ?? status;

  // 기존 notes 가져오기
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("consultation_requests")
    .select("notes")
    .eq("id", id)
    .single();

  const currentNotes = Array.isArray(existing?.notes) ? existing.notes : [];
  const systemNote: ConsultationNote = {
    id: crypto.randomUUID(),
    type: "status_change",
    author: "시스템",
    text: `상태 변경: ${statusLabel}`,
    created_at: now,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("consultation_requests")
    .update({
      status,
      notes: [systemNote, ...currentNotes],
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (error) return { success: false };
  revalidatePath("/ops/consultations");
  revalidatePath(`/ops/consultations/${id}`);
  return { success: true };
}

// ═══════════════════════════════════════════
// 4. 메모 추가
// ═══════════════════════════════════════════

export async function addConsultationNote(id: string, author: string, text: string): Promise<{ success: boolean }> {
  if (!text.trim()) return { success: false };

  const db = createAdminClient();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("consultation_requests")
    .select("notes")
    .eq("id", id)
    .single();

  const currentNotes = Array.isArray(existing?.notes) ? existing.notes : [];
  const newNote: ConsultationNote = {
    id: crypto.randomUUID(),
    type: "comment",
    author,
    text: text.trim(),
    created_at: now,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("consultation_requests")
    .update({
      notes: [newNote, ...currentNotes],
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (error) return { success: false };
  revalidatePath(`/ops/consultations/${id}`);
  return { success: true };
}

// ═══════════════════════════════════════════
// 5. 연락처 수정
// ═══════════════════════════════════════════

export async function updateConsultationContact(
  id: string,
  contact: { contact_name?: string; contact_phone?: string; contact_email?: string },
): Promise<{ success: boolean }> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { last_activity_at: now, updated_at: now };
  if (contact.contact_name !== undefined) update.contact_name = contact.contact_name;
  if (contact.contact_phone !== undefined) update.contact_phone = contact.contact_phone;
  if (contact.contact_email !== undefined) update.contact_email = contact.contact_email;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("consultation_requests")
    .update(update)
    .eq("id", id);

  if (error) return { success: false };
  revalidatePath(`/ops/consultations/${id}`);
  return { success: true };
}

// ═══════════════════════════════════════════
// 6. 영업사원 배정
// ═══════════════════════════════════════════

export async function assignConsultationAgent(id: string, salesRef: string | null): Promise<{ success: boolean }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("consultation_requests")
    .select("notes")
    .eq("id", id)
    .single();

  const currentNotes = Array.isArray(existing?.notes) ? existing.notes : [];
  const systemNote: ConsultationNote = {
    id: crypto.randomUUID(),
    type: "system",
    author: "시스템",
    text: salesRef ? `담당자 배정: ${agentName}` : "담당자 배정 해제",
    created_at: now,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("consultation_requests")
    .update({
      assigned_to: salesRef,
      notes: [systemNote, ...currentNotes],
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (error) return { success: false };
  revalidatePath("/ops/consultations");
  revalidatePath(`/ops/consultations/${id}`);
  return { success: true };
}

// ═══════════════════════════════════════════
// 7. 후속 일정 업데이트
// ═══════════════════════════════════════════

export async function updateConsultationFollowUp(
  id: string,
  followUpDate: string | null,
): Promise<{ success: boolean }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("consultation_requests")
    .select("notes")
    .eq("id", id)
    .single();

  const currentNotes = Array.isArray(existing?.notes) ? existing.notes : [];
  const systemNote: ConsultationNote = {
    id: crypto.randomUUID(),
    type: "follow_up",
    author: "시스템",
    text: followUpDate
      ? `후속 일정 설정: ${new Date(followUpDate).toLocaleDateString("ko-KR")}`
      : "후속 일정 해제",
    created_at: now,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("consultation_requests")
    .update({
      follow_up_date: followUpDate,
      notes: [systemNote, ...currentNotes],
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (error) return { success: false };
  revalidatePath(`/ops/consultations/${id}`);
  return { success: true };
}

// ═══════════════════════════════════════════
// 8. 통계
// ═══════════════════════════════════════════

export async function getConsultationStats(channel?: string): Promise<ConsultationStats> {
  try {
    const db = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db as any)
      .from("consultation_requests")
      .select("status, created_at, last_activity_at");

    if (channel) {
      query = query.eq("channel", channel);
    }

    const { data: all, error } = await query;

    if (error) {
      console.error("getConsultationStats error:", error);
      return { total: 0, byStatus: {}, recentCount: 0, avgResponseTime: null };
    }

    const rows = all ?? [];
    const total = rows.length;
    const byStatus: Record<string, number> = {};
    for (const r of rows) {
      const s = r.status ?? "pending";
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    // 최근 7일
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const recentCount = rows.filter((r: { created_at: string }) => r.created_at >= sevenDaysAgo).length;

    // 평균 응답 시간 (pending → contacted 전환까지)
    // 간이 계산: last_activity_at - created_at (contacted 이상인 건)
    const respondedRows = rows.filter((r: { status: string }) =>
      r.status !== "pending"
    );
    let avgResponseTime: number | null = null;
    if (respondedRows.length > 0) {
      const totalHours = respondedRows.reduce((sum: number, r: { created_at: string; last_activity_at: string }) => {
        const diff = new Date(r.last_activity_at).getTime() - new Date(r.created_at).getTime();
        return sum + diff / 3600000;
      }, 0);
      avgResponseTime = Math.round((totalHours / respondedRows.length) * 10) / 10;
    }

    return { total, byStatus, recentCount, avgResponseTime };
  } catch (err) {
    console.error("getConsultationStats exception:", err);
    return { total: 0, byStatus: {}, recentCount: 0, avgResponseTime: null };
  }
}

// ═══════════════════════════════════════════
// 9. 영업사원 목록 (필터용 — 기존 재사용)
// ═══════════════════════════════════════════

export async function getConsultationAgentsList(): Promise<Array<{ ref_code: string; name: string }>> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("sales_agents")
      .select("ref_code, name")
      .eq("is_active", true)
      .order("name");
    return data ?? [];
  } catch (err) {
    console.error("getConsultationAgentsList exception:", err);
    return [];
  }
}
