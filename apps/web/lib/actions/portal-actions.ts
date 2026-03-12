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
    .in("status", ["completed", "converted"])
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
    .in("status", ["completed", "converted"])
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
    .in("status", ["completed", "converted"])
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
      .select("id, marketing_score, keyword_rankings, analyzed_at, analysis_result, content_strategy")
      .eq("client_id", clientId)
      .in("status", ["completed", "converted"])
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
      .select("brand_name:name, assigned_sales_agent_id, brand_persona, created_at")
      .eq("id", clientId)
      .single(),
  ]);

  // 온보딩 체크리스트 쿼리 (병렬)
  const [
    checkAnalysis,
    checkKeywords,
    checkBlogAccounts,
    checkContents,
    checkPublications,
    exposedKeywordsRes,
  ] = await Promise.all([
    db.from("brand_analyses").select("id", { count: "exact", head: true }).eq("client_id", clientId).in("status", ["completed", "converted"]),
    db.from("keywords").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    db.from("blog_accounts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("is_active", true),
    db.from("contents").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    db.from("publications").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "published"),
    // keyword_visibility에서 노출 키워드 집계 (키워드명 JOIN)
    db.from("keyword_visibility")
      .select("keyword_id, rank_pc, rank_mo, is_exposed, keywords!keyword_id(keyword)")
      .eq("client_id", clientId)
      .eq("is_exposed", true)
      .order("measured_at", { ascending: false })
      .limit(20),
  ]);

  const onboardingChecklist = {
    analysisComplete: (checkAnalysis.count ?? 0) > 0,
    keywordsSet: (checkKeywords.count ?? 0) > 0,
    blogConnected: (checkBlogAccounts.count ?? 0) > 0,
    firstContent: (checkContents.count ?? 0) > 0,
    firstPublish: (checkPublications.count ?? 0) > 0,
  };
  const exposedKeywords = exposedKeywordsRes.data;

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

  // score_breakdown: content_strategy JSONB 내부의 score_breakdown 필드에서 추출
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentStrategy = (analysisRes.data as any)?.content_strategy as Record<string, unknown> | undefined;
  const rawScoreBreakdown = contentStrategy?.score_breakdown || null;

  // brandPersona에 strengths/weaknesses 포함
  const brandPersonaRaw = (clientRes.data?.brand_persona as Record<string, unknown>) || null;

  return {
    kpi: {
      activeKeywords: activeKeywordsRes.count || 0,
      monthlyContents: monthlyContentsRes.count || 0,
      suggestedKeywords: suggestedKeywordsRes.count || 0,
      avgQcScore,
    },
    latestAnalysis: analysisRes.data,
    scoreBreakdown: rawScoreBreakdown,
    brandName: clientRes.data?.brand_name || "",
    clientCreatedAt: clientRes.data?.created_at || null,
    onboardingChecklist,
    brandPersona: brandPersonaRaw,
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
    pointBalance: await getPortalPointBalance(clientId),
    aeoScore: await getPortalAEOScoreQuick(clientId),
    keywordOccupancy: {
      total: activeKeywordsRes.count || 0,
      exposed: exposedKeywords?.length || 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      keywords: (exposedKeywords || []).map((kw: any) => ({
        keyword_id: kw.keyword_id as string,
        keyword: (kw.keywords?.keyword ?? null) as string | null,
        rank_pc: kw.rank_pc as number | null,
        rank_mo: kw.rank_mo as number | null,
        is_exposed: kw.is_exposed as boolean,
      })),
    },
  };
}

// ── AEO Score 간편 조회 (포털 대시보드용) ───────────────────────────────

async function getPortalAEOScoreQuick(clientId: string): Promise<{
  score: number | null;
  trend: number;
  byModel: Record<string, number>;
} | null> {
  try {
    const db = createAdminClient();

    // 최근 AEO 점수
    const { data: latestScore } = await db
      .from("aeo_scores")
      .select("score")
      .eq("client_id", clientId)
      .is("keyword_id", null)
      .is("ai_model", null)
      .order("period_end", { ascending: false })
      .limit(1);

    const currentScore = (latestScore as Array<{ score: number }> | null)?.[0]?.score ?? null;
    if (currentScore === null) return null;

    // 이전 점수
    const { data: prevScores } = await db
      .from("aeo_scores")
      .select("score")
      .eq("client_id", clientId)
      .is("keyword_id", null)
      .is("ai_model", null)
      .order("period_end", { ascending: false })
      .range(1, 1);

    const previousScore = (prevScores as Array<{ score: number }> | null)?.[0]?.score ?? 0;
    const trend = Math.round((currentScore - previousScore) * 10) / 10;

    // 모델별 추적 수
    const { data: modelCounts } = await db
      .from("llm_answers")
      .select("ai_model")
      .eq("client_id", clientId);

    const byModel: Record<string, number> = {};
    for (const row of (modelCounts ?? []) as Array<{ ai_model: string }>) {
      byModel[row.ai_model] = (byModel[row.ai_model] || 0) + 1;
    }

    return { score: currentScore, trend, byModel };
  } catch {
    return null;
  }
}

// ── 포인트 잔액 조회 (포털용) ─────────────────────────────────────────

export async function getPortalPointBalance(clientId: string): Promise<number> {
  const db = createAdminClient();
  const { data } = await db
    .from("client_points")
    .select("balance")
    .eq("client_id", clientId)
    .maybeSingle();
  return data?.balance ?? 0;
}

// ── 포털 키워드 V2 데이터 (Phase P-1) ─────────────────────────────────

export async function getPortalKeywordsV2(clientId: string) {
  const db = createAdminClient();

  const [activeRes, suggestedRes, archivedRes, analysisRes] = await Promise.all([
    // 활성 키워드 (확장 필드 포함)
    db.from("keywords")
      .select("id, keyword, status, source, created_at, metadata, monthly_search_volume, current_rank_naver_pc, current_rank_naver_mo")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    // AI 추천 키워드
    db.from("keywords")
      .select("id, keyword, status, source, created_at, metadata, monthly_search_volume")
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
      .in("status", ["completed", "converted"])
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
  const supabase = createAdminClient();
  const { data, error } = await (supabase as ReturnType<typeof createAdminClient>)
    .from("contents")
    .select(`
      id, title, publish_status, created_at, published_at,
      published_url, body, qc_score, keyword_id, metadata,
      keywords!keyword_id(keyword)
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[portal-actions] getPortalContentsV2 error:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((c: any) => ({
    id: c.id as string,
    title: c.title as string,
    keyword: (c.keywords?.keyword ?? null) as string | null,
    publish_status: c.publish_status as string,
    published_at: c.published_at as string | null,
    published_url: c.published_url as string | null,
    platform: null as string | null,
    qc_score: (c.qc_score ?? c.metadata?.qc_score ?? null) as number | null,
    created_at: c.created_at as string,
    body: c.body as string | null,
    keyword_id: (c.keyword_id || null) as string | null,
    qcResult: (c.metadata?.qc_result ?? null) as unknown,
    rewriteHistory: (c.metadata?.rewrite_history ?? null) as unknown,
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
      .select("keyword_id, rank_pc, rank_mo, rank_google, measured_at, is_exposed")
      .eq("client_id", clientId)
      .order("measured_at", { ascending: false })
      .limit(100),
    // 분석 이력
    db.from("brand_analyses")
      .select("id, marketing_score, analyzed_at, content_strategy")
      .eq("client_id", clientId)
      .in("status", ["completed", "converted"])
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

  // SERP 순위: keyword_visibility → 키워드명 + 구글 순위 매핑
  const visibilityRows = (serpRes.data || []) as { keyword_id: string; rank_pc: number | null; rank_mo: number | null; rank_google: number | null; measured_at: string; is_exposed: boolean }[];
  const rankKwIds = [...new Set(visibilityRows.map((r) => r.keyword_id))];
  let kwNameMap: Record<string, string> = {};
  let kwGoogleMap: Record<string, number | null> = {};
  if (rankKwIds.length > 0) {
    const { data: kwNames } = await db.from("keywords").select("id, keyword, current_rank_google").in("id", rankKwIds);
    kwNameMap = Object.fromEntries((kwNames || []).map((k: { id: string; keyword: string }) => [k.id, k.keyword]));
    kwGoogleMap = Object.fromEntries((kwNames || []).map((k: { id: string; current_rank_google: number | null }) => [k.id, k.current_rank_google]));
  }

  // 키워드별 최신 순위 (keyword_id dedup) — 네이버 + 구글
  const serpMap = new Map<string, { keyword: string; rank: number; rank_google: number | null; device: string; checked_at: string }>();
  for (const r of visibilityRows) {
    if (!serpMap.has(r.keyword_id)) {
      // rank_google: keyword_visibility에 있으면 사용, 없으면 keywords 테이블 폴백
      const googleRank = r.rank_google ?? kwGoogleMap[r.keyword_id] ?? null;
      serpMap.set(r.keyword_id, {
        keyword: kwNameMap[r.keyword_id] || r.keyword_id,
        rank: r.rank_pc ?? 0,
        rank_google: googleRank,
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

  // AEO 데이터 수집
  let aeoData: { score: number | null; previousScore: number | null; byModel: { model: string; mentions: number }[]; topQuestions: { question: string; model: string; position: number | null }[] } | null = null;
  try {
    const [aeoScoreRes, aeoMentionsRes] = await Promise.all([
      db.from("aeo_scores")
        .select("score")
        .eq("client_id", clientId)
        .order("period_end", { ascending: false })
        .limit(2),
      db.from("mentions")
        .select("brand_name, position, ai_model")
        .eq("client_id", clientId)
        .eq("is_target", true)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString())
        .limit(100),
    ]);

    const scores = (aeoScoreRes.data || []) as { score: number }[];
    const mentionRows = (aeoMentionsRes.data || []) as { brand_name: string; position: number | null; ai_model: string }[];

    if (scores.length > 0 || mentionRows.length > 0) {
      const modelMap = new Map<string, number>();
      for (const m of mentionRows) {
        modelMap.set(m.ai_model, (modelMap.get(m.ai_model) || 0) + 1);
      }

      aeoData = {
        score: scores[0]?.score ?? null,
        previousScore: scores[1]?.score ?? null,
        byModel: Array.from(modelMap.entries()).map(([model, mentions]) => ({ model, mentions })),
        topQuestions: mentionRows
          .filter((m) => m.position != null)
          .sort((a, b) => (a.position || 999) - (b.position || 999))
          .slice(0, 5)
          .map((m) => ({ question: m.brand_name, model: m.ai_model, position: m.position })),
      };
    }
  } catch {
    // AEO 테이블 미존재 시 무시
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
    aeo: aeoData,
  };
}

// ── 포털 진행중 Job 목록 (Phase 4) ──────────────────────────────────────

export async function getPortalActiveJobs(clientId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("jobs")
    .select("id, title, status, input_payload, created_at, updated_at")
    .eq("client_id", clientId)
    .in("status", ["PENDING", "IN_PROGRESS"])
    .order("created_at", { ascending: false });
  return data || [];
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

// ── Phase 2: 마케팅 건강 점수 ──────────────────────────────────────────────

export async function getPortalHealthScore(clientId: string) {
  const db = createAdminClient();

  // 블로그 점수: 최근 30일 published contents count × 가중치
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { count: publishedLast30 } = await db
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .gte("published_at", thirtyDaysAgo.toISOString());
  const blogScore = Math.min(100, (publishedLast30 || 0) * 12);

  // SEO 점수: brand_analyses.seo_audit
  const { data: latestAnalysis } = await db
    .from("brand_analyses")
    .select("marketing_score, seo_audit")
    .eq("client_id", clientId)
    .in("status", ["completed", "converted"])
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seoAudit = latestAnalysis?.seo_audit as any;
  const seoScore = seoAudit?.score ?? (latestAnalysis?.marketing_score ?? 0);

  // SERP 점수: keyword_visibility에서 활성 키워드 점유율
  const { data: activeKws } = await db
    .from("keywords")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "active");
  const activeKwIds = (activeKws || []).map((k: { id: string }) => k.id);

  let serpScore = 0;
  if (activeKwIds.length > 0) {
    const { data: visibility } = await db
      .from("keyword_visibility")
      .select("rank_pc")
      .eq("client_id", clientId)
      .in("keyword_id", activeKwIds)
      .order("checked_at", { ascending: false })
      .limit(activeKwIds.length);
    const withRank = (visibility || []).filter((v: { rank_pc: number | null }) => v.rank_pc != null && v.rank_pc <= 30);
    serpScore = visibility && visibility.length > 0
      ? Math.round((withRank.length / visibility.length) * 100)
      : 0;
  }

  // 플레이스 점수: 메인 키워드 3개 순위 기반
  const { data: mainKws } = await db
    .from("keywords")
    .select("current_rank_naver_pc")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("priority", { ascending: true })
    .limit(3);
  const placeScores = (mainKws || []).map((k: { current_rank_naver_pc: number | null }) => {
    const r = k.current_rank_naver_pc;
    if (r == null) return 0;
    if (r <= 3) return 100;
    if (r <= 10) return 80;
    if (r <= 20) return 60;
    if (r <= 30) return 40;
    return 20;
  });
  const placeScore = placeScores.length > 0
    ? Math.round(placeScores.reduce((a: number, b: number) => a + b, 0) / placeScores.length)
    : 0;

  // 가중 평균
  const totalScore = Math.round(blogScore * 0.25 + seoScore * 0.25 + serpScore * 0.25 + placeScore * 0.25);
  const grade = totalScore >= 90 ? "A" as const : totalScore >= 70 ? "B" as const : totalScore >= 50 ? "C" as const : totalScore >= 30 ? "D" as const : "F" as const;

  // 전월 점수
  const prevMonthScore = latestAnalysis?.marketing_score ?? null;
  const delta = prevMonthScore != null ? totalScore - prevMonthScore : null;

  return {
    totalScore,
    grade,
    blog: { score: blogScore },
    seo: { score: seoScore },
    serp: { score: serpScore },
    place: { score: placeScore },
    prevMonthScore,
    delta,
  };
}

// ── Phase 2: 긴급 후킹 배너 조건 ──────────────────────────────────────────

export async function getPortalUrgentBannerCondition(clientId: string) {
  const db = createAdminClient();

  // A: rank > 20 or 하락 키워드 존재
  const { data: dangerKws } = await db
    .from("keywords")
    .select("id, keyword, current_rank_naver_pc")
    .eq("client_id", clientId)
    .eq("status", "active")
    .or("current_rank_naver_pc.gt.20,current_rank_naver_pc.is.null")
    .limit(1);

  // B: 최근 발행이 14일 이전
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const { data: recentPub } = await db
    .from("contents")
    .select("published_at")
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const noRecentPublish = !recentPub?.published_at || new Date(recentPub.published_at) < fourteenDaysAgo;

  // C: 이번달 발행 0
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { count: thisMonthCount } = await db
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .gte("published_at", monthStart.toISOString());
  const noPublishThisMonth = (thisMonthCount || 0) === 0;

  // D: 잔여 포인트 3 이하
  const balance = await getPortalPointBalance(clientId);
  const lowQuota = balance <= 3;

  // 위험 키워드 ID (가장 순위 나쁜 키워드)
  const criticalKeywordId = dangerKws?.[0]?.id ?? null;

  // 우선순위: rank_drop > no_publish_14d > no_publish_this_month > low_quota
  if (dangerKws && dangerKws.length > 0) {
    return {
      show: true,
      reason: "rank_drop" as const,
      criticalKeywordId,
      message: `"${dangerKws[0].keyword}" 키워드의 순위가 하락했습니다. 지금 콘텐츠를 발행하세요!`,
    };
  }
  if (noRecentPublish) {
    return {
      show: true,
      reason: "no_publish_14d" as const,
      criticalKeywordId,
      message: "최근 14일간 발행된 콘텐츠가 없습니다. 꾸준한 발행이 순위 유지의 핵심입니다!",
    };
  }
  if (noPublishThisMonth) {
    return {
      show: true,
      reason: "no_publish_this_month" as const,
      criticalKeywordId,
      message: "이번 달 아직 콘텐츠를 발행하지 않았습니다. 지금 시작하세요!",
    };
  }
  if (lowQuota) {
    return {
      show: true,
      reason: "low_quota" as const,
      criticalKeywordId: null,
      message: `잔여 포인트가 ${balance}개 남았습니다. 플랜을 업그레이드하세요.`,
    };
  }

  return { show: false, reason: null, criticalKeywordId: null, message: "" };
}

// ── Phase 2: SERP 트래킹 페이지 데이터 ─────────────────────────────────────

export async function getPortalSerpPage(clientId: string) {
  const db = createAdminClient();

  // 활성 키워드 목록
  const { data: keywords } = await db
    .from("keywords")
    .select("id, keyword, current_rank_naver_pc, current_rank_naver_mo, current_rank_google")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!keywords || keywords.length === 0) {
    return { keywords: [], missingKeywords: [], criticalKeywordId: null };
  }

  // keyword_visibility 최근 7일 데이터
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const kwIds = keywords.map((k: { id: string }) => k.id);

  const { data: visibilityData } = await db
    .from("keyword_visibility")
    .select("keyword_id, rank_pc, rank_google, checked_at")
    .eq("client_id", clientId)
    .in("keyword_id", kwIds)
    .gte("checked_at", sevenDaysAgo.toISOString())
    .order("checked_at", { ascending: true });

  // 키워드별 최신 발행일
  const { data: latestContents } = await db
    .from("contents")
    .select("keyword_id, published_at, published_url")
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .in("keyword_id", kwIds)
    .order("published_at", { ascending: false });

  // 키워드별 데이터 매핑
  const missingKeywords: string[] = [];
  let criticalKeywordId: string | null = null;
  let worstRank = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywordResults = keywords.map((kw: any) => {
    const kwVisibility = (visibilityData || []).filter(
      (v: { keyword_id: string }) => v.keyword_id === kw.id
    );

    // Sparkline: 최근 7일 네이버 PC 순위
    const sparkline = kwVisibility.map((v: { rank_pc: number | null }) => v.rank_pc ?? 0);
    while (sparkline.length < 7) sparkline.unshift(0);
    const last7 = sparkline.slice(-7);

    // 순위 변화 (네이버)
    const currentRank = kw.current_rank_naver_pc;
    const prevRank = kwVisibility.length >= 2 ? kwVisibility[kwVisibility.length - 2]?.rank_pc : null;
    const rankChange = currentRank != null && prevRank != null ? prevRank - currentRank : null;

    // 상태 배지
    let statusBadge: "top" | "mid" | "danger" | "invisible" = "invisible";
    if (currentRank != null) {
      if (currentRank <= 10) statusBadge = "top";
      else if (currentRank <= 30) statusBadge = "mid";
      else if (currentRank <= 50) statusBadge = "danger";
    }

    // 누락 키워드 (null or >= 50)
    if (currentRank == null || currentRank >= 50) {
      missingKeywords.push(kw.keyword);
    }

    // 가장 위험한 키워드 추적
    if (currentRank != null && currentRank > worstRank) {
      worstRank = currentRank;
      criticalKeywordId = kw.id;
    } else if (currentRank == null && !criticalKeywordId) {
      criticalKeywordId = kw.id;
    }

    // 최근 발행 정보
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestContent = (latestContents || []).find((c: any) => c.keyword_id === kw.id);

    return {
      id: kw.id,
      keyword: kw.keyword,
      platform: "naver" as const,
      currentRank: currentRank ?? null,
      rankGoogle: kw.current_rank_google ?? null,
      rankChange,
      sparkline: last7,
      publishedUrl: latestContent?.published_url ?? null,
      statusBadge,
      lastPublishedAt: latestContent?.published_at ?? null,
    };
  });

  return {
    keywords: keywordResults,
    missingKeywords,
    criticalKeywordId,
  };
}

// ── Task 1-1: 발행 현황 상태별 분리 ──────────────────────────────────────

export async function getPortalPublishStatusBreakdown(clientId: string) {
  try {
    const db = createAdminClient();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const now = new Date().toISOString();

    const [publishedRes, approvedRes, draftRes, pointBalance] = await Promise.all([
      // 이번 달 발행 완료
      db.from("contents")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("publish_status", "published")
        .gte("created_at", monthStart.toISOString()),
      // 승인 대기 (approved 상태 — 발행 준비 완료)
      db.from("contents")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .in("publish_status", ["approved", "review"]),
      // 초안 (이번 달)
      db.from("contents")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("publish_status", "draft")
        .gte("created_at", monthStart.toISOString()),
      getPortalPointBalance(clientId),
    ]);

    if (publishedRes.error) console.error("[getPortalPublishStatusBreakdown] publishedRes error:", publishedRes.error);
    if (approvedRes.error) console.error("[getPortalPublishStatusBreakdown] approvedRes error:", approvedRes.error);
    if (draftRes.error) console.error("[getPortalPublishStatusBreakdown] draftRes error:", draftRes.error);

    return {
      published_count: publishedRes.count ?? 0,
      scheduled_count: approvedRes.count ?? 0,
      draft_count: draftRes.count ?? 0,
      remaining: pointBalance,
    };
  } catch (err) {
    console.error("[getPortalPublishStatusBreakdown] FATAL:", err);
    throw err;
  }
}

// ── Task 1-2: 키워드 Top3 + delta ───────────────────────────────────────

export async function getPortalKeywordTop3WithDelta(clientId: string) {
  try {
  const db = createAdminClient();

  // 활성 키워드 목록
  const { data: activeKws, error: kwErr } = await db
    .from("keywords")
    .select("id, keyword, current_rank_naver_pc, current_rank_google")
    .eq("client_id", clientId)
    .eq("status", "active");

  if (kwErr) console.error("[getPortalKeywordTop3WithDelta] keywords query error:", kwErr);
  if (!activeKws || activeKws.length === 0) return [];

  const kwIds = activeKws.map((k: { id: string }) => k.id);

  // 최근 2일간 keyword_visibility 데이터
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const { data: visData, error: visErr } = await db
    .from("keyword_visibility")
    .select("keyword_id, rank_pc, measured_at")
    .eq("client_id", clientId)
    .in("keyword_id", kwIds)
    .gte("measured_at", twoDaysAgo.toISOString().slice(0, 10))
    .order("measured_at", { ascending: false });

  if (visErr) console.error("[getPortalKeywordTop3WithDelta] keyword_visibility query error:", visErr);

  // 키워드별 오늘 rank / 어제 rank 계산
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const todayRanks: Record<string, number | null> = {};
  const yesterdayRanks: Record<string, number | null> = {};

  for (const row of (visData || []) as Array<{ keyword_id: string; rank_pc: number | null; measured_at: string }>) {
    const day = row.measured_at.slice(0, 10);
    if (day === today && !(row.keyword_id in todayRanks)) {
      todayRanks[row.keyword_id] = row.rank_pc;
    } else if (day === yesterday && !(row.keyword_id in yesterdayRanks)) {
      yesterdayRanks[row.keyword_id] = row.rank_pc;
    }
  }

  // 결과 생성
  const results = activeKws.map((kw: { id: string; keyword: string; current_rank_naver_pc: number | null; current_rank_google: number | null }) => {
    const currentRank = todayRanks[kw.id] ?? kw.current_rank_naver_pc;
    const prevRank = yesterdayRanks[kw.id] ?? null;
    const delta = (prevRank != null && currentRank != null) ? prevRank - currentRank : null;
    return {
      keyword_id: kw.id,
      keyword: kw.keyword,
      rank: currentRank,
      rank_google: kw.current_rank_google,
      delta,
    };
  });

  // 정렬: delta 하락폭 큰 순 우선 (delta가 큰 음수), 없으면 rank 낮은 순
  results.sort((a: { delta: number | null; rank: number | null }, b: { delta: number | null; rank: number | null }) => {
    // 하락 키워드 우선 (delta < 0)
    const aDropping = a.delta !== null && a.delta < -10;
    const bDropping = b.delta !== null && b.delta < -10;
    if (aDropping && !bDropping) return -1;
    if (!aDropping && bDropping) return 1;
    if (aDropping && bDropping) return (a.delta!) - (b.delta!); // 더 큰 하락 먼저
    // 그 외: rank 낮은 순 (1위가 먼저)
    return (a.rank ?? 999) - (b.rank ?? 999);
  });

  return results.slice(0, 3);
  } catch (err) {
    console.error("[getPortalKeywordTop3WithDelta] FATAL:", err);
    throw err;
  }
}

// ── Task 1-3: 추천 액션 rule-based ──────────────────────────────────────

interface RecommendedAction {
  type: "serp_drop" | "no_publish" | "low_points" | "seo_low" | "add_keyword";
  keyword?: string;
  link: string;
  title: string;
  description: string;
}

export async function getPortalRecommendedActions(
  clientId: string,
  healthScore: { seo: { score: number } } | null,
): Promise<RecommendedAction[]> {
  try {
  const actions: RecommendedAction[] = [];
  const db = createAdminClient();

  // 1) delta < -10인 키워드
  const top3 = await getPortalKeywordTop3WithDelta(clientId);
  const droppingKw = top3.find((k) => k.delta !== null && k.delta < -10);
  if (droppingKw) {
    actions.push({
      type: "serp_drop",
      keyword: droppingKw.keyword,
      link: `/portal/blog/write?keyword_id=${droppingKw.keyword_id}&urgent=true`,
      title: "순위 하락 키워드 대응",
      description: `"${droppingKw.keyword}" 순위가 ${Math.abs(droppingKw.delta!)}단계 하락했습니다`,
    });
  }

  // 2) 마지막 발행일 14일 이상 경과
  if (actions.length < 3) {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const { data: recentPub } = await db
      .from("contents")
      .select("published_at")
      .eq("client_id", clientId)
      .eq("publish_status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!recentPub?.published_at || new Date(recentPub.published_at) < fourteenDaysAgo) {
      actions.push({
        type: "no_publish",
        link: "/portal/blog/write",
        title: "콘텐츠 발행 필요",
        description: "14일 이상 발행이 없습니다. 꾸준한 발행이 핵심입니다",
      });
    }
  }

  // 3) 잔여 포인트 ≤ 3
  if (actions.length < 3) {
    const balance = await getPortalPointBalance(clientId);
    if (balance <= 3) {
      actions.push({
        type: "low_points",
        link: "/portal/settings",
        title: "포인트 부족",
        description: `잔여 포인트 ${balance}건. 추가 충전이 필요합니다`,
      });
    }
  }

  // 4) SEO 점수 < 40
  if (actions.length < 3 && healthScore && healthScore.seo.score < 40) {
    actions.push({
      type: "seo_low",
      link: "/portal/serp",
      title: "SEO 점수 개선",
      description: `현재 SEO 점수 ${healthScore.seo.score}점. 개선이 필요합니다`,
    });
  }

  // 5) 기본: 키워드 추가
  if (actions.length < 3) {
    actions.push({
      type: "add_keyword",
      link: "/portal/keywords",
      title: "키워드 추가",
      description: "새로운 키워드를 등록하고 SEO 커버리지를 확장하세요",
    });
  }

  return actions.slice(0, 3);
  } catch (err) {
    console.error("[getPortalRecommendedActions] FATAL:", err);
    throw err;
  }
}
