"use server";

import { createAdminClient } from "@/lib/supabase/service";

// ── 포털 대시보드 데이터 ──────────────────────────────────────────────────

export async function getPortalDashboard(clientId: string) {
  const db = createAdminClient();

  // 최신 분석 결과
  const { data: latestAnalysis } = await db
    .from("brand_analyses")
    .select("id, marketing_score, basic_info, keyword_rankings, content_strategy, analyzed_at, seo_audit, analysis_result")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 발행 콘텐츠 수
  const { count: contentCount } = await db
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("publish_status", "published");

  // 이번 달 발행 수
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { count: monthlyContentCount } = await db
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .gte("published_at", monthStart.toISOString());

  // 구독 정보
  const { data: subscription } = await db
    .from("subscriptions")
    .select("*, products(name, slug, features)")
    .eq("client_id", clientId)
    .in("status", ["active", "trial"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 담당 영업사원 + 페르소나
  const { data: client } = await db
    .from("clients")
    .select("brand_name:name, assigned_sales_agent_id, brand_persona")
    .eq("id", clientId)
    .single();

  let salesAgent = null;
  if (client?.assigned_sales_agent_id) {
    const { data: agent } = await db
      .from("sales_agents")
      .select("name, phone, email")
      .eq("id", client.assigned_sales_agent_id)
      .single();
    salesAgent = agent;
  }

  // analysis_result에서 AI 해석 데이터 추출
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysisResult = (latestAnalysis as any)?.analysis_result as Record<string, unknown> | undefined;
  const improvementPlan = analysisResult?.improvement_plan || null;
  const seoComments = analysisResult?.seo_comments || null;

  return {
    latestAnalysis,
    contentCount: contentCount || 0,
    monthlyContentCount: monthlyContentCount || 0,
    subscription,
    salesAgent,
    brandName: client?.brand_name || "",
    brandPersona: (client?.brand_persona as Record<string, unknown>) || null,
    improvementPlan,
    seoComments,
  };
}

// ── 키워드 순위 데이터 ──────────────────────────────────────────────────

export async function getPortalKeywords(clientId: string) {
  const db = createAdminClient();

  // 최신 분석의 keyword_rankings + analysis_result (전략 포함)
  const { data: latestAnalysis } = await db
    .from("brand_analyses")
    .select("keyword_rankings, keyword_analysis, analyzed_at, analysis_result")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 키워드 순위 이력 (keyword_visibility)
  const { data: visibilityData } = await db
    .from("keyword_visibility")
    .select("keyword, rank, visibility_score, checked_at")
    .eq("client_id", clientId)
    .order("checked_at", { ascending: false })
    .limit(100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysisResult = (latestAnalysis as any)?.analysis_result as Record<string, unknown> | undefined;

  return {
    keywordRankings: latestAnalysis?.keyword_rankings || [],
    keywordAnalysis: latestAnalysis?.keyword_analysis || null,
    analyzedAt: latestAnalysis?.analyzed_at || null,
    visibilityHistory: visibilityData || [],
    keywordStrategy: analysisResult?.keyword_strategy || null,
  };
}

// ── 콘텐츠 목록 ──────────────────────────────────────────────────────────

export async function getPortalContents(clientId: string) {
  const db = createAdminClient();

  const { data: contents } = await db
    .from("contents")
    .select("id, title, keyword, publish_status, published_at, platform, qc_score, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50);

  return contents || [];
}

// ── 리포트 데이터 ──────────────────────────────────────────────────────────

export async function getPortalReport(clientId: string) {
  const db = createAdminClient();

  // 최근 3개 분석의 마케팅 점수 (추이)
  const { data: analyses } = await db
    .from("brand_analyses")
    .select("id, marketing_score, analyzed_at, content_strategy")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("analyzed_at", { ascending: false })
    .limit(3);

  // 콘텐츠 발행 이력
  const { data: contents } = await db
    .from("contents")
    .select("id, title, keyword, publish_status, published_at, qc_score")
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .order("published_at", { ascending: false })
    .limit(10);

  return {
    analyses: analyses || [],
    contents: contents || [],
  };
}

// ── 포털 대시보드 V2 데이터 (Phase P-1) ─────────────────────────────────

export async function getPortalDashboardV2(clientId: string) {
  const db = createAdminClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // 병렬 쿼리
  const [
    analysisRes,
    activeKeywordsRes,
    suggestedKeywordsRes,
    monthlyContentsRes,
    recentContentsRes,
    clientRes,
  ] = await Promise.all([
    // 최신 분석 결과
    db.from("brand_analyses")
      .select("id, marketing_score, keyword_rankings, analyzed_at, analysis_result")
      .eq("client_id", clientId)
      .eq("status", "completed")
      .order("analyzed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // 활성 키워드 수
    db.from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "active"),
    // AI 추천 대기 키워드 수
    db.from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "suggested"),
    // 이번 달 콘텐츠 수 (모든 상태)
    db.from("contents")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", monthStart.toISOString()),
    // 최근 콘텐츠 5건
    db.from("contents")
      .select("id, title, keyword, publish_status, created_at, metadata")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(5),
    // 클라이언트 정보
    db.from("clients")
      .select("brand_name:name, assigned_sales_agent_id, brand_persona")
      .eq("id", clientId)
      .single(),
  ]);

  // 최근 콘텐츠 QC 평균
  const recentContents = recentContentsRes.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qcScores = recentContents
    .map((c: { metadata?: { qc_score?: number } }) => c.metadata?.qc_score)
    .filter((s: number | undefined): s is number => typeof s === "number");
  const avgQcScore = qcScores.length > 0
    ? Math.round(qcScores.reduce((a: number, b: number) => a + b, 0) / qcScores.length)
    : null;

  // 최근 키워드 활동 (승인/거절)
  const { data: recentKeywords } = await db
    .from("keywords")
    .select("id, keyword, status, updated_at")
    .eq("client_id", clientId)
    .in("status", ["active", "archived"])
    .order("updated_at", { ascending: false })
    .limit(5);

  // 영업사원
  let salesAgent = null;
  if (clientRes.data?.assigned_sales_agent_id) {
    const { data: agent } = await db
      .from("sales_agents")
      .select("name, phone, email")
      .eq("id", clientRes.data.assigned_sales_agent_id)
      .single();
    salesAgent = agent;
  }

  // analysis_result에서 AI 해석 데이터 추출
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysisResult = (analysisRes.data as any)?.analysis_result as Record<string, unknown> | undefined;
  const improvementPlan = analysisResult?.improvement_plan || null;
  const seoComments = analysisResult?.seo_comments || null;

  return {
    kpi: {
      activeKeywords: activeKeywordsRes.count || 0,
      monthlyContents: monthlyContentsRes.count || 0,
      suggestedKeywords: suggestedKeywordsRes.count || 0,
      avgQcScore,
    },
    latestAnalysis: analysisRes.data,
    brandName: clientRes.data?.brand_name || "",
    brandPersona: (clientRes.data?.brand_persona as Record<string, unknown>) || null,
    improvementPlan,
    seoComments,
    recentContents: recentContents.map((c: {
      id: string;
      title: string;
      keyword: string;
      publish_status: string;
      created_at: string;
      metadata?: { qc_score?: number };
    }) => ({
      id: c.id,
      title: c.title,
      keyword: c.keyword,
      status: c.publish_status,
      date: c.created_at,
    })),
    recentKeywordActivity: (recentKeywords || []).map((k: {
      id: string;
      keyword: string;
      status: string;
      updated_at: string;
    }) => ({
      id: k.id,
      keyword: k.keyword,
      status: k.status,
      date: k.updated_at,
    })),
    salesAgent,
    subscription: null as { status: string; products: { name: string } | null } | null,
  };
}

// ── 포털 키워드 V2 데이터 (Phase P-1) ─────────────────────────────────

export async function getPortalKeywordsV2(clientId: string) {
  const db = createAdminClient();

  const [activeRes, suggestedRes, archivedRes, analysisRes] = await Promise.all([
    // 활성 키워드
    db.from("keywords")
      .select("id, keyword, status, source, created_at, metadata")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    // AI 추천 키워드
    db.from("keywords")
      .select("id, keyword, status, source, created_at, metadata")
      .eq("client_id", clientId)
      .eq("status", "suggested")
      .order("created_at", { ascending: false }),
    // 보관 키워드
    db.from("keywords")
      .select("id, keyword, status, source, created_at, metadata")
      .eq("client_id", clientId)
      .eq("status", "archived")
      .order("created_at", { ascending: false }),
    // 전략 데이터
    db.from("brand_analyses")
      .select("analysis_result")
      .eq("client_id", clientId)
      .eq("status", "completed")
      .order("analyzed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysisResult = (analysisRes.data as any)?.analysis_result as Record<string, unknown> | undefined;

  return {
    activeKeywords: activeRes.data || [],
    suggestedKeywords: suggestedRes.data || [],
    archivedKeywords: archivedRes.data || [],
    keywordStrategy: analysisResult?.keyword_strategy || null,
  };
}

// ── 포털 콘텐츠 V2 데이터 (Phase P-1) ─────────────────────────────────

export async function getPortalContentsV2(clientId: string) {
  const db = createAdminClient();

  const { data: contents } = await db
    .from("contents")
    .select("id, title, keyword, publish_status, published_at, published_url, platform, qc_score, created_at, body, metadata")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (contents || []).map((c: {
    id: string;
    title: string;
    keyword: string;
    publish_status: string;
    published_at: string | null;
    published_url: string | null;
    platform: string | null;
    qc_score: number | null;
    created_at: string;
    body: string | null;
    metadata: Record<string, unknown> | null;
  }) => ({
    id: c.id,
    title: c.title,
    keyword: c.keyword,
    publish_status: c.publish_status,
    published_at: c.published_at,
    published_url: c.published_url,
    platform: c.platform,
    qc_score: c.qc_score ?? (c.metadata as { qc_score?: number } | null)?.qc_score ?? null,
    created_at: c.created_at,
    body: c.body,
    qcResult: (c.metadata as { qc_result?: unknown } | null)?.qc_result ?? null,
    rewriteHistory: (c.metadata as { rewrite_history?: unknown } | null)?.rewrite_history ?? null,
  }));
}

// ── 포털 리포트 V2 데이터 (Phase P-1) ─────────────────────────────────

export async function getPortalReportV2(clientId: string, year?: number, month?: number) {
  const db = createAdminClient();
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1;

  const monthStart = new Date(targetYear, targetMonth - 1, 1);
  const monthEnd = new Date(targetYear, targetMonth, 1);

  // 병렬 쿼리
  const [
    monthlyContentsRes,
    monthlyNewKeywordsRes,
    monthlyAgentLogsRes,
    contentsTrendRes,
    keywordsTrendRes,
    serpRes,
    analysesRes,
  ] = await Promise.all([
    // 이번 달 콘텐츠 수
    db.from("contents")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),
    // 이번 달 신규 활성 키워드 수
    db.from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "active")
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),
    // 이번 달 에이전트 실행 횟수
    db.from("agent_execution_logs")
      .select("id, agent_type", { count: "exact" })
      .eq("client_id", clientId)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),
    // 최근 6개월 월별 콘텐츠 수 (전체 조회 후 JS에서 그룹핑)
    db.from("contents")
      .select("id, created_at")
      .eq("client_id", clientId)
      .gte("created_at", new Date(targetYear, targetMonth - 7, 1).toISOString())
      .lt("created_at", monthEnd.toISOString()),
    // 최근 6개월 월별 활성 키워드 (전체 조회 후 JS에서 그룹핑)
    db.from("keywords")
      .select("id, created_at, status")
      .eq("client_id", clientId)
      .eq("status", "active"),
    // SERP 순위 데이터 → keyword_visibility (client_id FK 보유)
    db.from("keyword_visibility")
      .select("keyword_id, rank_pc, rank_mo, measured_at, is_exposed")
      .eq("client_id", clientId)
      .order("measured_at", { ascending: false })
      .limit(100),
    // 분석 이력
    db.from("brand_analyses")
      .select("id, marketing_score, analyzed_at, content_strategy")
      .eq("client_id", clientId)
      .eq("status", "completed")
      .order("analyzed_at", { ascending: false })
      .limit(5),
  ]);

  // 월별 콘텐츠 발행 추이 (6개월)
  const contentsTrend: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(targetYear, targetMonth - 1 - i, 1);
    const mEnd = new Date(targetYear, targetMonth - i, 1);
    const label = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const count = (contentsTrendRes.data || []).filter((c: { created_at: string }) => {
      const d = new Date(c.created_at);
      return d >= m && d < mEnd;
    }).length;
    contentsTrend.push({ month: label, count });
  }

  // 월별 활성 키워드 누적 추이 (6개월)
  const keywordsTrend: { month: string; count: number }[] = [];
  const allActiveKeywords = keywordsTrendRes.data || [];
  for (let i = 5; i >= 0; i--) {
    const mEnd = new Date(targetYear, targetMonth - i, 1);
    const label = `${mEnd.getFullYear()}-${String(mEnd.getMonth() + 1).padStart(2, "0")}`;
    // 실제로는 해당 월 말까지 생성된 active 키워드 카운트
    const prevMonth = new Date(targetYear, targetMonth - 1 - i, 1);
    const labelMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
    const count = allActiveKeywords.filter((k: { created_at: string }) =>
      new Date(k.created_at) < mEnd
    ).length;
    keywordsTrend.push({ month: labelMonth, count });
  }

  // SERP 순위: keyword_visibility → 키워드명 매핑
  const visibilityRows = (serpRes.data || []) as { keyword_id: string; rank_pc: number | null; rank_mo: number | null; measured_at: string; is_exposed: boolean }[];
  const rankKwIds = [...new Set(visibilityRows.map((r) => r.keyword_id))];
  let kwNameMap: Record<string, string> = {};
  if (rankKwIds.length > 0) {
    const { data: kwNames } = await db.from("keywords").select("id, keyword").in("id", rankKwIds);
    kwNameMap = Object.fromEntries((kwNames || []).map((k: { id: string; keyword: string }) => [k.id, k.keyword]));
  }

  // 키워드별 최신 순위 (keyword_id dedup)
  const serpMap = new Map<string, { keyword: string; rank: number; device: string; checked_at: string }>();
  for (const r of visibilityRows) {
    if (!serpMap.has(r.keyword_id) && r.rank_pc != null) {
      serpMap.set(r.keyword_id, {
        keyword: kwNameMap[r.keyword_id] || r.keyword_id,
        rank: r.rank_pc,
        device: "pc",
        checked_at: r.measured_at,
      });
    }
  }
  const serpRankings = Array.from(serpMap.values());

  // 에이전트 실행 타입별 카운트
  const agentLogs = monthlyAgentLogsRes.data || [];
  const agentTypeCounts: Record<string, number> = {};
  for (const log of agentLogs as { agent_type: string }[]) {
    agentTypeCounts[log.agent_type] = (agentTypeCounts[log.agent_type] || 0) + 1;
  }

  return {
    selectedMonth: { year: targetYear, month: targetMonth },
    summary: {
      monthlyContents: monthlyContentsRes.count || 0,
      newKeywords: monthlyNewKeywordsRes.count || 0,
      agentExecutions: monthlyAgentLogsRes.count || 0,
    },
    contentsTrend,
    keywordsTrend,
    serpRankings,
    agentTypeCounts,
    analyses: analysesRes.data || [],
  };
}

// ── 포털 사용자 설정 데이터 ──────────────────────────────────────────────

export async function getPortalSettings(userId: string, clientId: string) {
  const db = createAdminClient();

  const { data: user } = await db
    .from("users")
    .select("id, email, name, phone, role, created_at")
    .eq("id", userId)
    .single();

  const { data: subscription } = await db
    .from("subscriptions")
    .select("*, products(name, features)")
    .eq("client_id", clientId)
    .in("status", ["active", "trial"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: client } = await db
    .from("clients")
    .select("assigned_sales_agent_id")
    .eq("id", clientId)
    .single();

  let salesAgent = null;
  if (client?.assigned_sales_agent_id) {
    const { data: agent } = await db
      .from("sales_agents")
      .select("name, phone, email")
      .eq("id", client.assigned_sales_agent_id)
      .single();
    salesAgent = agent;
  }

  return {
    user,
    subscription,
    salesAgent,
  };
}
