"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// Analytics record type
export interface AnalyticsRecord {
  id: string;
  content_id: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  date: string;
  created_at: string;
}

// KPI data type
export interface AnalyticsKPIs {
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalClicks: number;
  engagementRate: number;
  avgDailyImpressions: number;
}

// Chart data type
export interface ChartDataPoint {
  date: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
}

// Top post type
export interface TopPost {
  id: string;
  topic: string;
  caption: string;
  totalLikes: number;
  totalComments: number;
  totalImpressions: number;
}

/**
 * Helper: Get authenticated user's workspace ID
 */
async function getAuthWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return (membership as { workspace_id: string } | null)?.workspace_id || null;
}

/**
 * Generate mock analytics data for testing
 */
export async function generateMockAnalytics(): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    console.log("[Analytics] Starting mock data generation...");

    const workspaceId = await getAuthWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    const supabase = await createClient();

    // Get all contents for this workspace
    const { data: contentsData, error: contentsError } = await supabase
      .from("contents")
      .select("id")
      .eq("workspace_id", workspaceId);

    if (contentsError) {
      console.error("[Analytics] Contents fetch error:", contentsError);
      return { success: false, error: "콘텐츠를 불러오는데 실패했습니다." };
    }

    const contents = contentsData as { id: string }[] | null;

    if (!contents || contents.length === 0) {
      return { success: false, error: "분석할 콘텐츠가 없습니다. 먼저 콘텐츠를 생성해주세요." };
    }

    // Delete existing analytics data for this workspace's contents
    const contentIds = contents.map((c) => c.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("analytics").delete().in("content_id", contentIds);

    // Generate mock data for the last 30 days
    const analyticsRecords: Array<{
      content_id: string;
      impressions: number;
      likes: number;
      comments: number;
      shares: number;
      clicks: number;
      date: string;
    }> = [];

    const today = new Date();

    for (const content of contents) {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // Generate random but realistic-looking data
        const dayMultiplier = 1 + (29 - i) * 0.03;
        const baseImpressions = Math.floor(Math.random() * 500 + 100) * dayMultiplier;
        const impressions = Math.floor(baseImpressions);
        const likes = Math.floor(impressions * (Math.random() * 0.08 + 0.02));
        const comments = Math.floor(likes * (Math.random() * 0.3 + 0.05));
        const shares = Math.floor(likes * (Math.random() * 0.2 + 0.02));
        const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));

        analyticsRecords.push({
          content_id: content.id,
          impressions,
          likes,
          comments,
          shares,
          clicks,
          date: date.toISOString().split("T")[0],
        });
      }
    }

    // Insert all analytics records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from("analytics")
      .insert(analyticsRecords);

    if (insertError) {
      console.error("[Analytics] Insert error:", insertError);
      return { success: false, error: `데이터 생성 실패: ${insertError.message}` };
    }

    console.log(`[Analytics] ✅ Generated ${analyticsRecords.length} mock records`);

    revalidatePath("/analytics");
    return { success: true, count: analyticsRecords.length };
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}

/**
 * Get analytics data for the dashboard
 */
export async function getAnalyticsData(): Promise<{
  success: boolean;
  kpis?: AnalyticsKPIs;
  chartData?: ChartDataPoint[];
  topPosts?: TopPost[];
  error?: string;
}> {
  try {
    const workspaceId = await getAuthWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    const supabase = await createClient();

    // Content type for this query
    type ContentRow = { id: string; topic: string; caption: string };

    // Get content IDs for this workspace
    const { data: contentsRaw } = await supabase
      .from("contents")
      .select("id, topic, caption")
      .eq("workspace_id", workspaceId);

    const contents = contentsRaw as ContentRow[] | null;

    if (!contents || contents.length === 0) {
      return {
        success: true,
        kpis: {
          totalImpressions: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalClicks: 0,
          engagementRate: 0,
          avgDailyImpressions: 0,
        },
        chartData: [],
        topPosts: [],
      };
    }

    const contentIds = contents.map((c) => c.id);

    // Get all analytics data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: analyticsRaw, error: analyticsError } = await (supabase as any)
      .from("analytics")
      .select("*")
      .in("content_id", contentIds)
      .order("date", { ascending: true });

    if (analyticsError) {
      console.error("[Analytics] Fetch error:", analyticsError);
      return { success: false, error: "분석 데이터를 불러오는데 실패했습니다." };
    }

    const analytics = analyticsRaw as AnalyticsRecord[] | null;

    if (!analytics || analytics.length === 0) {
      return {
        success: true,
        kpis: {
          totalImpressions: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalClicks: 0,
          engagementRate: 0,
          avgDailyImpressions: 0,
        },
        chartData: [],
        topPosts: [],
      };
    }

    // Calculate KPIs
    const totalImpressions = analytics.reduce((sum, a) => sum + (a.impressions || 0), 0);
    const totalLikes = analytics.reduce((sum, a) => sum + (a.likes || 0), 0);
    const totalComments = analytics.reduce((sum, a) => sum + (a.comments || 0), 0);
    const totalShares = analytics.reduce((sum, a) => sum + (a.shares || 0), 0);
    const totalClicks = analytics.reduce((sum, a) => sum + (a.clicks || 0), 0);

    const totalEngagement = totalLikes + totalComments + totalShares;
    const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

    const uniqueDates = new Set(analytics.map((a) => a.date));
    const avgDailyImpressions = uniqueDates.size > 0 ? totalImpressions / uniqueDates.size : 0;

    const kpis: AnalyticsKPIs = {
      totalImpressions,
      totalLikes,
      totalComments,
      totalShares,
      totalClicks,
      engagementRate: Math.round(engagementRate * 100) / 100,
      avgDailyImpressions: Math.round(avgDailyImpressions),
    };

    // Aggregate chart data by date
    const chartDataMap = new Map<string, ChartDataPoint>();

    for (const record of analytics) {
      const existing = chartDataMap.get(record.date);
      if (existing) {
        existing.impressions += record.impressions || 0;
        existing.likes += record.likes || 0;
        existing.comments += record.comments || 0;
        existing.shares += record.shares || 0;
      } else {
        chartDataMap.set(record.date, {
          date: record.date,
          impressions: record.impressions || 0,
          likes: record.likes || 0,
          comments: record.comments || 0,
          shares: record.shares || 0,
          engagement: 0,
        });
      }
    }

    const chartData = Array.from(chartDataMap.values()).map((point) => ({
      ...point,
      engagement: point.likes + point.comments + point.shares,
    }));

    chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate top posts
    const postStats = new Map<string, { likes: number; comments: number; impressions: number }>();

    for (const record of analytics) {
      const existing = postStats.get(record.content_id);
      if (existing) {
        existing.likes += record.likes || 0;
        existing.comments += record.comments || 0;
        existing.impressions += record.impressions || 0;
      } else {
        postStats.set(record.content_id, {
          likes: record.likes || 0,
          comments: record.comments || 0,
          impressions: record.impressions || 0,
        });
      }
    }

    const topPosts: TopPost[] = contents
      .map((content) => {
        const stats = postStats.get(content.id) || { likes: 0, comments: 0, impressions: 0 };
        return {
          id: content.id,
          topic: content.topic,
          caption: content.caption,
          totalLikes: stats.likes,
          totalComments: stats.comments,
          totalImpressions: stats.impressions,
        };
      })
      .sort((a, b) => b.totalLikes - a.totalLikes)
      .slice(0, 5);

    return {
      success: true,
      kpis,
      chartData,
      topPosts,
    };
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI 마케터 운영 Analytics — SERP 순위 추이 + AI SOM + Style Transfer
// ═══════════════════════════════════════════════════════════════════════════

export interface OpsKpiCards {
  citationRate: number;
  citationRateDelta: number;
  avgRank: number | null;
  avgRankDelta: number;
  contentPublished: number;
  top3Keywords: number;
  weightedVisibilityPc: number;
  visibilityDelta: number;
}

export interface SerpDataPoint {
  date: string;
  keyword: string;
  keyword_id: string;
  rank_pc: number | null;
  rank_mo: number | null;
}

export interface SerpKeyword {
  id: string;
  keyword: string;
  current_rank_pc: number | null;
  current_rank_mo: number | null;
}

export interface BestContent {
  id: string;
  title: string | null;
  keyword: string;
  keyword_id: string;
  peak_rank: number;
  peak_rank_at: string | null;
  word_count: number | null;
  image_count: number | null;
  heading_structure: {
    h2_count?: number;
    h3_count?: number;
    faq_count?: number;
    avg_section_length?: number;
  } | null;
  published_date: string | null;
  url: string | null;
}

/**
 * KPI 헤더 카드 4개 데이터 (AI SOM 인용율, 평균 순위, 발행 수, Top3 키워드).
 * clientId 지정 시 해당 고객사만, 미지정 시 전체(Master Admin).
 */
export async function getOpsKpiCards(clientId?: string): Promise<OpsKpiCards> {
  const db = createAdminClient();
  const todayStr = new Date().toISOString().split("T")[0];

  // ── AI SOM 인용율 ──
  const somQ = db
    .from("som_reports")
    .select("citation_rate, report_week")
    .order("report_week", { ascending: false })
    .limit(2);
  if (clientId) somQ.eq("client_id", clientId);
  const { data: somData } = await somQ;
  const thisRate = Number(somData?.[0]?.citation_rate ?? 0);
  const prevRate = Number(somData?.[1]?.citation_rate ?? 0);

  // ── 이번달 발행 수 ──
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cQ = (db as any)
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("publish_status", "published")
    .gte("published_at", startOfMonth.toISOString().split("T")[0]);
  if (clientId) cQ = cQ.eq("client_id", clientId);
  const { count: contentPublished } = await cQ;

  // ── 평균 순위 + TOP3 (keyword_visibility 오늘 데이터 직접 계산) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let kvQ = (db as any)
    .from("keyword_visibility")
    .select("rank_pc")
    .eq("measured_at", todayStr);
  if (clientId) kvQ = kvQ.eq("client_id", clientId);
  const { data: kvData } = await kvQ;

  const ranks = ((kvData ?? []) as { rank_pc: number | null }[])
    .map((r) => r.rank_pc)
    .filter((r): r is number => r !== null);
  const todayRank = ranks.length > 0
    ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10
    : null;
  const top3Keywords = ranks.filter((r) => r <= 3).length;

  // ── 지난주 평균 순위 (delta 계산용) ──
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let kvPrevQ = (db as any)
    .from("keyword_visibility")
    .select("rank_pc")
    .eq("measured_at", lastWeekStr);
  if (clientId) kvPrevQ = kvPrevQ.eq("client_id", clientId);
  const { data: kvPrevData } = await kvPrevQ;
  const prevRanks = ((kvPrevData ?? []) as { rank_pc: number | null }[])
    .map((r) => r.rank_pc)
    .filter((r): r is number => r !== null);
  const prevRank = prevRanks.length > 0
    ? Math.round((prevRanks.reduce((a, b) => a + b, 0) / prevRanks.length) * 10) / 10
    : null;

  // ── 노출 점유율 (daily_visibility_summary) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let visQ = (db as any)
    .from("daily_visibility_summary")
    .select("measured_at, weighted_visibility_pc")
    .order("measured_at", { ascending: false })
    .limit(14);
  if (clientId) visQ = visQ.eq("client_id", clientId);
  const { data: visData } = await visQ;
  const todayVis = (visData ?? []).find((r: { measured_at: string }) => r.measured_at === todayStr);
  const prevVis = (visData ?? []).find((r: { measured_at: string }) => r.measured_at <= lastWeekStr);
  const weightedVisibilityPc = Number(todayVis?.weighted_visibility_pc ?? 0);
  const prevVisibilityPc = Number(prevVis?.weighted_visibility_pc ?? 0);

  return {
    citationRate: thisRate,
    citationRateDelta: Number((thisRate - prevRate).toFixed(1)),
    avgRank: todayRank,
    avgRankDelta:
      todayRank !== null && prevRank !== null
        ? Number((todayRank - prevRank).toFixed(1))
        : 0,
    contentPublished: contentPublished ?? 0,
    top3Keywords,
    weightedVisibilityPc,
    visibilityDelta: Number((weightedVisibilityPc - prevVisibilityPc).toFixed(1)),
  };
}

/**
 * SERP 순위 추이 데이터 (최근 N일, recharts LineChart용).
 */
export async function getOpsSerp(
  clientId?: string,
  days: number = 30,
  keywordIds?: string[],
): Promise<{ trend: SerpDataPoint[]; keywords: SerpKeyword[] }> {
  const db = createAdminClient();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const kwQ = db
    .from("keywords")
    .select("id, keyword")
    .eq("is_tracking", true)
    .order("priority", { ascending: true })
    .limit(5);
  if (clientId) kwQ.eq("client_id", clientId);
  if (keywordIds?.length) kwQ.in("id", keywordIds);
  const { data: keywords } = await kwQ;

  if (!keywords?.length) return { trend: [], keywords: [] };

  const kwIds = keywords.map((k) => k.id);

  const contQ = db
    .from("contents")
    .select("id, keyword_id")
    .in("keyword_id", kwIds)
    .eq("publish_status", "published");
  if (clientId) contQ.eq("client_id", clientId);
  const { data: contents } = await contQ;

  if (!contents?.length) {
    return {
      trend: [],
      keywords: keywords.map((k) => ({
        id: k.id,
        keyword: k.keyword,
        current_rank_pc: null,
        current_rank_mo: null,
      })),
    };
  }

  const contentIds = contents.map((c) => c.id);
  const kwByContentId = Object.fromEntries(
    contents.map((c) => [c.id, keywords.find((k) => k.id === c.keyword_id)]),
  );

  const { data: serpRows } = await db
    .from("serp_results")
    .select("content_id, device, rank, captured_at")
    .in("content_id", contentIds)
    .eq("search_platform", "NAVER_SERP")
    .gte("captured_at", sinceStr)
    .order("captured_at", { ascending: true });

  const trendMap = new Map<string, SerpDataPoint>();
  const latestMap = new Map<string, { pc: number | null; mo: number | null }>();

  for (const row of serpRows ?? []) {
    const kw = kwByContentId[row.content_id];
    if (!kw) continue;
    const key = `${row.captured_at}__${kw.id}`;
    const pt = trendMap.get(key) ?? {
      date: row.captured_at,
      keyword: kw.keyword,
      keyword_id: kw.id,
      rank_pc: null,
      rank_mo: null,
    };
    if (row.device === "PC") pt.rank_pc = row.rank;
    if (row.device === "MO") pt.rank_mo = row.rank;
    trendMap.set(key, pt);

    const cur = latestMap.get(kw.id) ?? { pc: null, mo: null };
    if (row.device === "PC") cur.pc = row.rank;
    if (row.device === "MO") cur.mo = row.rank;
    latestMap.set(kw.id, cur);
  }

  return {
    trend: Array.from(trendMap.values()),
    keywords: keywords.map((k) => ({
      id: k.id,
      keyword: k.keyword,
      current_rank_pc: latestMap.get(k.id)?.pc ?? null,
      current_rank_mo: latestMap.get(k.id)?.mo ?? null,
    })),
  };
}

/**
 * peak_rank ≤ maxRank 베스트 콘텐츠 목록 (Style Transfer 위젯).
 */
export async function getBestContents(
  clientId?: string,
  maxRank: number = 5,
): Promise<BestContent[]> {
  const db = createAdminClient();

  const q = db
    .from("contents")
    .select(`
      id, title, peak_rank, peak_rank_at,
      word_count, image_count, heading_structure,
      published_date, url, keyword_id,
      keywords!inner(keyword)
    `)
    .not("peak_rank", "is", null)
    .lte("peak_rank", maxRank)
    .eq("publish_status", "published")
    .order("peak_rank", { ascending: true })
    .limit(20);

  if (clientId) q.eq("client_id", clientId);
  const { data } = await q;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    keyword: row.keywords?.keyword ?? "",
    keyword_id: row.keyword_id,
    peak_rank: row.peak_rank,
    peak_rank_at: row.peak_rank_at,
    word_count: row.word_count,
    image_count: row.image_count,
    heading_structure: row.heading_structure,
    published_date: row.published_date,
    url: row.url,
  }));
}

/**
 * 사용자가 선택한 베스트 글 목록을 campaign_style_refs에 저장.
 */
export async function saveStyleRef(
  clientId: string,
  contentIds: string[],
): Promise<{ id: string } | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("campaign_style_refs")
    .insert({ client_id: clientId, content_ids: contentIds, is_analyzed: false })
    .select("id")
    .single();

  if (error) {
    console.error("[analytics-actions] saveStyleRef 오류:", error.message);
    return null;
  }
  return data as { id: string };
}

// ── Evolving Knowledge ────────────────────────────────────────────────────────

export interface EvolvingKnowledge {
  id: string;
  agent_type: string;
  hypothesis: string;
  action: string | null;
  outcome: string | null;
  verdict: "confirmed" | "pending" | "rejected";
  tags: string[] | null;
  created_at: string;
}

/**
 * evolving_knowledge 테이블 조회 (rejected 제외)
 */
export async function getEvolvingKnowledge(
  clientId?: string,
  limit: number = 30,
): Promise<EvolvingKnowledge[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("evolving_knowledge")
    .select("id, agent_type, hypothesis, action, outcome, verdict, tags, created_at")
    .neq("verdict", "rejected")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[analytics-actions] getEvolvingKnowledge:", error);
    return [];
  }
  return (data ?? []) as EvolvingKnowledge[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 노출 점유율 & 대시보드 데이터
// ═══════════════════════════════════════════════════════════════════════════

export interface VisibilityKpi {
  weightedVisibilityPc: number;
  exposureRate: number;
  exposedKeywords: number;
  totalKeywords: number;
  top3Count: number;
  contentPublishedMonth: number;
  decliningCount: number;
  // vs 지난주
  visibilityDelta: number;
  exposureRateDelta: number;
  top3Delta: number;
}

export interface VisibilityTrendPoint {
  date: string;
  weighted_visibility_pc: number;
  exposure_rate: number;
}

export interface KeywordDistribution {
  top3: number;
  top4to10: number;
  rank11to20: number;
  notExposed: number;
}

export interface RecentActivity {
  type: "job" | "content" | "rank";
  title: string;
  detail: string;
  at: string;
  status?: string;
}

export interface AccountPerfSummary {
  account_name: string;
  publish_count: number;
  avg_rank: number | null;
  top3_count: number;
  active_count: number;
}

export interface DecliningKeyword {
  id: string;
  keyword: string;
  change: number;
}

export interface KeywordVisibilityRow {
  keyword: string;
  rank_pc: number | null;
  rank_mo: number | null;
  visibility_score_pc: number;
  visibility_score_mo: number;
  search_volume_pc: number;
  search_volume_mo: number;
  is_exposed: boolean;
  measured_at: string;
}

/**
 * 대시보드 KPI: 노출 점유율, 노출률, Top3, 이번달 발행, 순위 하락
 */
export async function getVisibilityKpi(clientId?: string): Promise<VisibilityKpi> {
  const db = createAdminClient();

  // 오늘/지난주 daily_visibility_summary
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let visQ = (db as any)
    .from("daily_visibility_summary")
    .select("measured_at, weighted_visibility_pc, exposure_rate, exposed_keywords, total_keywords, top3_count")
    .order("measured_at", { ascending: false })
    .limit(14);
  if (clientId) visQ = visQ.eq("client_id", clientId);
  const { data: visData } = await visQ;

  const todayVis = (visData ?? []).find((r: { measured_at: string }) => r.measured_at === todayStr);
  const prevVis = (visData ?? []).find((r: { measured_at: string }) => r.measured_at <= lastWeekStr);

  const weightedVisibilityPc = Number(todayVis?.weighted_visibility_pc ?? 0);
  const exposureRate = Number(todayVis?.exposure_rate ?? 0);
  const exposedKeywords = Number(todayVis?.exposed_keywords ?? 0);
  const totalKeywords = Number(todayVis?.total_keywords ?? 0);
  const top3Count = Number(todayVis?.top3_count ?? 0);

  const prevVisibilityPc = Number(prevVis?.weighted_visibility_pc ?? 0);
  const prevExposureRate = Number(prevVis?.exposure_rate ?? 0);
  const prevTop3 = Number(prevVis?.top3_count ?? 0);

  // 이번달 발행 수
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cQ = (db as any)
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("publish_status", "published")
    .gte("published_at", startOfMonth);
  if (clientId) cQ = cQ.eq("client_id", clientId);
  const { count: contentPublishedMonth } = await cQ;

  // 7일내 5위 이상 하락 키워드 수 (keyword_visibility 비교)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let decQ = (db as any)
    .from("keyword_visibility")
    .select("keyword_id, measured_at, rank_pc")
    .gte("measured_at", sevenDaysAgoStr)
    .not("rank_pc", "is", null)
    .order("measured_at", { ascending: false });
  if (clientId) decQ = decQ.eq("client_id", clientId);
  const { data: decData } = await decQ;

  // 각 키워드별 7일전 vs 오늘 순위 비교
  let decliningCount = 0;
  if (decData && decData.length > 0) {
    const byKeyword: Record<string, { earliest: number; latest: number }> = {};
    for (const row of decData) {
      const kid = row.keyword_id;
      const rank = row.rank_pc;
      if (!byKeyword[kid]) byKeyword[kid] = { earliest: rank, latest: rank };
      if (row.measured_at === todayStr) byKeyword[kid].latest = rank;
      if (row.measured_at <= sevenDaysAgoStr) byKeyword[kid].earliest = rank;
    }
    decliningCount = Object.values(byKeyword).filter(
      (v) => v.latest - v.earliest >= 5
    ).length;
  }

  return {
    weightedVisibilityPc,
    exposureRate,
    exposedKeywords,
    totalKeywords,
    top3Count,
    contentPublishedMonth: contentPublishedMonth ?? 0,
    decliningCount,
    visibilityDelta: Number((weightedVisibilityPc - prevVisibilityPc).toFixed(1)),
    exposureRateDelta: Number((exposureRate - prevExposureRate).toFixed(1)),
    top3Delta: top3Count - prevTop3,
  };
}

/**
 * 30일 노출 점유율 추이
 */
export async function getVisibilityTrend(
  clientId?: string,
  days: number = 30
): Promise<VisibilityTrendPoint[]> {
  const db = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any)
    .from("daily_visibility_summary")
    .select("measured_at, weighted_visibility_pc, exposure_rate")
    .gte("measured_at", sinceStr)
    .order("measured_at", { ascending: true });
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;

  return (data ?? []).map((r: { measured_at: string; weighted_visibility_pc: number; exposure_rate: number }) => ({
    date: r.measured_at,
    weighted_visibility_pc: Number(r.weighted_visibility_pc),
    exposure_rate: Number(r.exposure_rate),
  }));
}

/**
 * 키워드 노출 상태 분포 (도넛 차트용)
 */
export async function getKeywordDistribution(
  clientId?: string
): Promise<KeywordDistribution> {
  const db = createAdminClient();
  const todayStr = new Date().toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any)
    .from("keyword_visibility")
    .select("rank_pc, is_exposed")
    .eq("measured_at", todayStr);
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;

  if (!data || data.length === 0) {
    return { top3: 0, top4to10: 0, rank11to20: 0, notExposed: 0 };
  }

  let top3 = 0, top4to10 = 0, rank11to20 = 0, notExposed = 0;
  for (const r of data) {
    const rank = r.rank_pc;
    if (!r.is_exposed || rank === null) notExposed++;
    else if (rank <= 3) top3++;
    else if (rank <= 10) top4to10++;
    else rank11to20++;
  }

  return { top3, top4to10, rank11to20, notExposed };
}

/**
 * 최근 활동 피드 (Job + 콘텐츠 발행 + 순위 변동)
 */
export async function getRecentActivities(
  clientId?: string,
  limit: number = 10
): Promise<RecentActivity[]> {
  const db = createAdminClient();

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString();

  // 최근 Job
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jQ = (db as any)
    .from("jobs")
    .select("id, title, status, job_type, completed_at, created_at")
    .gte("created_at", sinceStr)
    .in("status", ["DONE", "FAILED"])
    .order("created_at", { ascending: false })
    .limit(5);
  if (clientId) jQ = jQ.eq("client_id", clientId);
  const { data: jobs } = await jQ;

  // 최근 발행 콘텐츠
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cQ = (db as any)
    .from("contents")
    .select("id, title, published_at, created_at")
    .eq("publish_status", "published")
    .gte("created_at", sinceStr)
    .order("created_at", { ascending: false })
    .limit(5);
  if (clientId) cQ = cQ.eq("client_id", clientId);
  const { data: contents } = await cQ;

  const activities: RecentActivity[] = [];

  for (const job of jobs ?? []) {
    activities.push({
      type: "job",
      title: job.title ?? job.job_type,
      detail: job.status === "DONE" ? "완료" : "실패",
      at: job.completed_at ?? job.created_at,
      status: job.status,
    });
  }

  for (const c of contents ?? []) {
    activities.push({
      type: "content",
      title: c.title ?? "(제목 없음)",
      detail: "발행 완료",
      at: c.published_at ?? c.created_at,
    });
  }

  activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return activities.slice(0, limit);
}

/**
 * 계정별 성과 요약
 */
export async function getAccountPerformanceSummary(
  clientId?: string
): Promise<AccountPerfSummary[]> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any)
    .from("contents")
    .select("account_id, peak_rank, is_active")
    .eq("publish_status", "published")
    .not("account_id", "is", null);
  if (clientId) q = q.eq("client_id", clientId);
  const { data: contents } = await q;

  if (!contents || contents.length === 0) return [];

  const accountIds = [...new Set(contents.map((c: { account_id: string }) => c.account_id))] as string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accounts } = await (db as any)
    .from("blog_accounts")
    .select("id, account_name")
    .in("id", accountIds);

  const accMap: Record<string, string> = Object.fromEntries(
    (accounts ?? []).map((a: { id: string; account_name: string }) => [a.id, a.account_name])
  );

  const grouped: Record<string, { ranks: number[]; active: number; total: number; top3: number }> = {};
  for (const c of contents) {
    const aid = c.account_id;
    if (!grouped[aid]) grouped[aid] = { ranks: [], active: 0, total: 0, top3: 0 };
    grouped[aid].total++;
    if (c.is_active) grouped[aid].active++;
    if (c.peak_rank != null) {
      grouped[aid].ranks.push(c.peak_rank);
      if (c.peak_rank <= 3) grouped[aid].top3++;
    }
  }

  return accountIds.map((aid) => {
    const g = grouped[aid] ?? { ranks: [], active: 0, total: 0, top3: 0 };
    const avg = g.ranks.length > 0 ? Math.round(g.ranks.reduce((a, b) => a + b, 0) / g.ranks.length * 10) / 10 : null;
    return {
      account_name: accMap[aid] ?? aid,
      publish_count: g.total,
      avg_rank: avg,
      top3_count: g.top3,
      active_count: g.active,
    };
  }).sort((a, b) => b.publish_count - a.publish_count);
}

/**
 * 키워드별 visibility 테이블 (analytics 페이지용)
 */
export async function getKeywordVisibilityTable(
  clientId?: string,
  limit: number = 50
): Promise<KeywordVisibilityRow[]> {
  const db = createAdminClient();
  const todayStr = new Date().toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any)
    .from("keyword_visibility")
    .select("rank_pc, rank_mo, visibility_score_pc, visibility_score_mo, search_volume_pc, search_volume_mo, is_exposed, measured_at, keywords!inner(keyword)")
    .eq("measured_at", todayStr)
    .order("visibility_score_pc", { ascending: false })
    .limit(limit);
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    keyword: r.keywords?.keyword ?? "",
    rank_pc: r.rank_pc,
    rank_mo: r.rank_mo,
    visibility_score_pc: Number(r.visibility_score_pc),
    visibility_score_mo: Number(r.visibility_score_mo),
    search_volume_pc: r.search_volume_pc,
    search_volume_mo: r.search_volume_mo,
    is_exposed: r.is_exposed,
    measured_at: r.measured_at,
  }));
}

// ─── 브랜드별 요약 (전체 보기 모드용) ────────────────────────────────────────

export interface BrandSummaryStats {
  brand_id: string;
  brand_name: string;
  active_keywords: number;
  active_accounts: number;
  content_this_month: number;
}

/**
 * 전체 브랜드별 요약 통계 (dashboard 전체 보기 모드)
 */
export async function getBrandSummaryStats(): Promise<BrandSummaryStats[]> {
  const db = createAdminClient();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [brandsRes, kwRes, accRes, contRes] = await Promise.all([
    (db as any).from("clients").select("id, name").eq("status", "active").order("name"),
    (db as any).from("keywords").select("client_id").eq("status", "active"),
    (db as any).from("blog_accounts").select("client_id").eq("is_active", true),
    (db as any).from("contents").select("client_id").gte("created_at", startOfMonth),
  ]);

  const brands: { id: string; name: string }[] = brandsRes.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kwMap = ((kwRes.data ?? []) as any[]).reduce((m: Record<string, number>, r: any) => {
    m[r.client_id] = (m[r.client_id] ?? 0) + 1; return m;
  }, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accMap = ((accRes.data ?? []) as any[]).reduce((m: Record<string, number>, r: any) => {
    m[r.client_id] = (m[r.client_id] ?? 0) + 1; return m;
  }, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contMap = ((contRes.data ?? []) as any[]).reduce((m: Record<string, number>, r: any) => {
    m[r.client_id] = (m[r.client_id] ?? 0) + 1; return m;
  }, {});

  return brands.map((b) => ({
    brand_id: b.id,
    brand_name: b.name,
    active_keywords: kwMap[b.id] ?? 0,
    active_accounts: accMap[b.id] ?? 0,
    content_this_month: contMap[b.id] ?? 0,
  }));
}

/**
 * evolving_knowledge verdict 수동 업데이트
 */
export async function updateKnowledgeVerdict(
  id: string,
  verdict: "confirmed" | "pending" | "rejected",
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("evolving_knowledge")
    .update({ verdict })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/analytics");
  return { success: true };
}
