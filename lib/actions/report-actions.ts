"use server";

import { createAdminClient } from "@/lib/supabase/service";

// ── 타입 ─────────────────────────────────────────────────────────────────

export interface ReportKpi {
  activeKeywords: number;
  prevActiveKeywords: number;
  monthlyContents: number;
  prevMonthlyContents: number;
  avgQcScore: number | null;
  prevAvgQcScore: number | null;
  exposedKeywords: number;
  avgRank: number | null;
  top3Keywords: number;
}

export interface ReportContent {
  id: string;
  title: string | null;
  keyword: string | null;
  publish_status: string;
  qc_score: number | null;
  created_at: string;
}

export interface ReportRanking {
  keyword: string;
  rank_naver: number | null;
  rank_google: number | null;
  change: number | null;
}

export interface ContentTrendItem {
  month: string;
  count: number;
}

export interface MonthlyReportData {
  brandName: string;
  reportMonth: string; // "2026년 2월"
  generatedAt: string;
  kpi: ReportKpi;
  contentsTrend: ContentTrendItem[];
  contents: ReportContent[];
  rankings: ReportRanking[];
  suggestedKeywordsCount: number;
  pendingContentsCount: number;
}

export interface ReportDelivery {
  id: string;
  client_id: string;
  report_month: string;
  email_sent_at: string | null;
  email_to: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface ReportSettings {
  enabled: boolean;
  recipient_email: string | null;
}

// ── 리포트 데이터 수집 ──────────────────────────────────────────────────

export async function getMonthlyReportData(
  clientId: string,
  year?: number,
  month?: number,
): Promise<MonthlyReportData | null> {
  const db = createAdminClient();
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1;

  const monthStart = new Date(targetYear, targetMonth - 1, 1);
  const monthEnd = new Date(targetYear, targetMonth, 1);
  const prevMonthStart = new Date(targetYear, targetMonth - 2, 1);

  // 클라이언트 정보
  const { data: client } = await db
    .from("clients")
    .select("brand_name:name")
    .eq("id", clientId)
    .single();

  if (!client) return null;

  // 병렬 쿼리
  const [
    activeKeywordsRes,
    prevActiveKeywordsRes,
    monthlyContentsRes,
    prevMonthlyContentsRes,
    contentsWithQcRes,
    prevContentsWithQcRes,
    serpRes,
    contentsListRes,
    trendRes,
    suggestedRes,
    pendingRes,
  ] = await Promise.all([
    // 활성 키워드 수 (현재)
    db.from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "active"),

    // 활성 키워드 수 (전월)
    db.from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "active")
      .lt("created_at", monthStart.toISOString()),

    // 이번 달 콘텐츠 수
    db.from("contents")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),

    // 전월 콘텐츠 수
    db.from("contents")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", prevMonthStart.toISOString())
      .lt("created_at", monthStart.toISOString()),

    // 이번 달 콘텐츠 QC 점수
    db.from("contents")
      .select("metadata")
      .eq("client_id", clientId)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),

    // 전월 콘텐츠 QC 점수
    db.from("contents")
      .select("metadata")
      .eq("client_id", clientId)
      .gte("created_at", prevMonthStart.toISOString())
      .lt("created_at", monthStart.toISOString()),

    // SERP — keyword_visibility (client_id 보유)
    db.from("keyword_visibility")
      .select("keyword_id, rank_pc, rank_mo, rank_google, is_exposed")
      .eq("client_id", clientId)
      .order("measured_at", { ascending: false })
      .limit(200),

    // 이번 달 콘텐츠 목록
    db.from("contents")
      .select("id, title, keyword, publish_status, metadata, created_at")
      .eq("client_id", clientId)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(20),

    // 6개월 콘텐츠 발행 추이
    db.from("contents")
      .select("id, created_at")
      .eq("client_id", clientId)
      .gte("created_at", new Date(targetYear, targetMonth - 7, 1).toISOString())
      .lt("created_at", monthEnd.toISOString()),

    // AI 추천 대기 키워드
    db.from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "suggested"),

    // 예정 콘텐츠
    db.from("contents")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .in("publish_status", ["draft", "review", "approved"]),
  ]);

  // QC 평균 점수 계산
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractQcScores = (items: any[] | null) => {
    if (!items || items.length === 0) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scores = items.map((c: any) => c.metadata?.qc_score).filter((s: unknown) => typeof s === "number") as number[];
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  // SERP — 키워드별 최신 데이터 (중복 제거)
  const keywordIdsSeen = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueSerp = ((serpRes.data ?? []) as any[]).filter((r) => {
    if (keywordIdsSeen.has(r.keyword_id)) return false;
    keywordIdsSeen.add(r.keyword_id);
    return true;
  });

  const exposedCount = uniqueSerp.filter((r) => r.is_exposed).length;
  const rankedItems = uniqueSerp.filter((r) => r.rank_pc != null || r.rank_mo != null);
  const ranks = rankedItems.map((r) => r.rank_pc ?? r.rank_mo ?? 999);
  const avgRank = ranks.length > 0 ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length * 10) / 10 : null;
  const top3Count = ranks.filter((r) => r <= 3).length;

  // 키워드명 조회
  const keywordIds = uniqueSerp.map((r) => r.keyword_id);
  let keywordNameMap: Record<string, string> = {};
  if (keywordIds.length > 0) {
    const { data: kwNames } = await db
      .from("keywords")
      .select("id, keyword")
      .in("id", keywordIds);
    keywordNameMap = Object.fromEntries((kwNames ?? []).map((k: { id: string; keyword: string }) => [k.id, k.keyword]));
  }

  // 6개월 트렌드 계산
  const trendData: ContentTrendItem[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(targetYear, targetMonth - 1 - i, 1);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = ((trendRes.data ?? []) as any[]).filter((c) => {
      const ct = new Date(c.created_at);
      return ct >= mStart && ct < mEnd;
    }).length;
    trendData.push({ month: mKey, count });
  }

  return {
    brandName: client.brand_name || "브랜드",
    reportMonth: `${targetYear}년 ${targetMonth}월`,
    generatedAt: new Date().toLocaleDateString("ko-KR"),
    kpi: {
      activeKeywords: activeKeywordsRes.count ?? 0,
      prevActiveKeywords: prevActiveKeywordsRes.count ?? 0,
      monthlyContents: monthlyContentsRes.count ?? 0,
      prevMonthlyContents: prevMonthlyContentsRes.count ?? 0,
      avgQcScore: extractQcScores(contentsWithQcRes.data),
      prevAvgQcScore: extractQcScores(prevContentsWithQcRes.data),
      exposedKeywords: exposedCount,
      avgRank,
      top3Keywords: top3Count,
    },
    contentsTrend: trendData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contents: ((contentsListRes.data ?? []) as any[]).map((c) => ({
      id: c.id,
      title: c.title,
      keyword: c.keyword,
      publish_status: c.publish_status,
      qc_score: c.metadata?.qc_score ?? null,
      created_at: c.created_at,
    })),
    rankings: uniqueSerp.slice(0, 30).map((r) => ({
      keyword: keywordNameMap[r.keyword_id] || "-",
      rank_naver: r.rank_pc ?? r.rank_mo ?? null,
      rank_google: r.rank_google ?? null,
      change: null,
    })),
    suggestedKeywordsCount: suggestedRes.count ?? 0,
    pendingContentsCount: pendingRes.count ?? 0,
  };
}

// ── 리포트 설정 CRUD ────────────────────────────────────────────────────

export async function getReportSettings(clientId: string): Promise<ReportSettings> {
  const db = createAdminClient();
  const { data } = await db
    .from("clients")
    .select("metadata")
    .eq("id", clientId)
    .single();

  const settings = (data?.metadata as Record<string, unknown>)?.report_settings as ReportSettings | undefined;
  return {
    enabled: settings?.enabled ?? false,
    recipient_email: settings?.recipient_email ?? null,
  };
}

export async function updateReportSettings(
  clientId: string,
  settings: ReportSettings,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  // JSONB SELECT → spread → UPDATE
  const { data: current } = await db
    .from("clients")
    .select("metadata")
    .eq("id", clientId)
    .single();

  const existingMetadata = (current?.metadata as Record<string, unknown>) || {};
  const updated = {
    ...existingMetadata,
    report_settings: settings,
  };

  const { error } = await db
    .from("clients")
    .update({ metadata: updated })
    .eq("id", clientId);

  if (error) {
    console.error("[report-actions] updateReportSettings error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ── 발송 이력 ────────────────────────────────────────────────────────

export async function getReportDeliveries(clientId: string): Promise<ReportDelivery[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("report_deliveries")
    .select("id, client_id, report_month, email_sent_at, email_to, status, error_message, created_at")
    .eq("client_id", clientId)
    .order("report_month", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[report-actions] getReportDeliveries error:", error);
    return [];
  }

  return (data ?? []) as ReportDelivery[];
}

// ── 리포트 생성 + 발송 (수동) ────────────────────────────────────────────

export async function generateAndSendReport(
  clientId: string,
  yearOverride?: number,
  monthOverride?: number,
): Promise<{ success: boolean; error?: string; status?: string }> {
  const db = createAdminClient();
  const now = new Date();
  const year = yearOverride ?? now.getFullYear();
  const month = monthOverride ?? now.getMonth() + 1;
  const reportMonth = `${year}-${String(month).padStart(2, "0")}-01`;

  try {
    // 리포트 데이터 수집
    const reportData = await getMonthlyReportData(clientId, year, month);
    if (!reportData) {
      return { success: false, error: "클라이언트 데이터를 찾을 수 없습니다" };
    }

    // 수신 이메일 조회
    const settings = await getReportSettings(clientId);
    const recipientEmail = settings.recipient_email;

    // PDF 생성
    const { generateReportPdf } = await import("@/lib/pdf/generate-report");
    const pdfBuffer = await generateReportPdf(reportData);

    // 이메일 발송
    if (!recipientEmail) {
      // 이메일 없으면 PDF만 생성 성공 (skipped)
      await upsertDelivery(db, clientId, reportMonth, {
        status: "skipped",
        error_message: "수신 이메일 미설정",
        pdf_buffer_stored: true,
      });
      return { success: true, status: "skipped" };
    }

    const { sendReportEmail } = await import("@/lib/email/send-report");
    const emailResult = await sendReportEmail({
      to: recipientEmail,
      brandName: reportData.brandName,
      reportMonth: reportData.reportMonth,
      pdfBuffer,
      kpiSummary: {
        monthlyContents: reportData.kpi.monthlyContents,
        activeKeywords: reportData.kpi.activeKeywords,
        top3Keywords: reportData.kpi.top3Keywords,
      },
    });

    if (!emailResult.success) {
      await upsertDelivery(db, clientId, reportMonth, {
        status: "failed",
        email_to: recipientEmail,
        error_message: emailResult.error || "이메일 발송 실패",
        pdf_buffer_stored: true,
      });
      return { success: false, error: emailResult.error };
    }

    await upsertDelivery(db, clientId, reportMonth, {
      status: "sent",
      email_sent_at: new Date().toISOString(),
      email_to: recipientEmail,
      pdf_buffer_stored: true,
    });

    return { success: true, status: "sent" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[report-actions] generateAndSendReport error:", err);

    await upsertDelivery(db, clientId, reportMonth, {
      status: "failed",
      error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

// ── 재발송 ────────────────────────────────────────────────────────

export async function resendReport(deliveryId: string): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  const { data: delivery } = await db
    .from("report_deliveries")
    .select("client_id, report_month")
    .eq("id", deliveryId)
    .single();

  if (!delivery) {
    return { success: false, error: "발송 이력을 찾을 수 없습니다" };
  }

  const reportDate = new Date(delivery.report_month);
  return generateAndSendReport(
    delivery.client_id,
    reportDate.getFullYear(),
    reportDate.getMonth() + 1,
  );
}

// ── 내부 헬퍼 ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertDelivery(db: any, clientId: string, reportMonth: string, fields: Record<string, unknown>) {
  const { data: existing } = await db
    .from("report_deliveries")
    .select("id")
    .eq("client_id", clientId)
    .eq("report_month", reportMonth)
    .maybeSingle();

  if (existing) {
    await db
      .from("report_deliveries")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await db
      .from("report_deliveries")
      .insert({ client_id: clientId, report_month: reportMonth, ...fields });
  }
}
