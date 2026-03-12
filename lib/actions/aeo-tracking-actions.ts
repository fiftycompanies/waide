"use server";

/**
 * aeo-tracking-actions.ts
 * Phase 4+5: AEO 추적 시스템 — 서버 액션
 *
 * - getAEOSettings: 추적 설정 조회
 * - updateAEOSettings: 추적 설정 변경
 * - runAEOTracking: 수동 단일 고객 추적
 * - runAEOTrackingBatch: 크론 전체 고객 추적
 * - calculateAEOScore: AEO 점수 계산
 * - getAEODashboardData: 대시보드 AEO 데이터
 * - getAEOAnalyticsData: 성과분석 AEO 데이터
 * - getAEOCompetitionData: 경쟁 분석 데이터
 * - getAEOCitationData: Citation 분석 데이터
 * - getPortalAEOData: 포털 AEO 데이터
 *
 * 1000+ 고객 확장성 고려:
 * - 큐 기반 순차 처리
 * - 고객당 일일 질문 수 제한
 * - 우선순위 (유료 > 무료)
 * - API rate limit 준수
 */

import { createAdminClient } from "@/lib/supabase/service";
import { crawlLLM, MODEL_WEIGHTS, MODEL_RATE_LIMITS } from "@/lib/crawlers";
import { detectMentions } from "@/lib/crawlers/mention-detector";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface AEOSettings {
  max_questions_per_client_per_day: number;
  enabled_ai_models: string[];
  repeat_count: number;
  cron_enabled: boolean;
  playwright_enabled: boolean;
}

export interface TrackingResult {
  success: boolean;
  tracked: number;
  mentioned: number;
  score: number | null;
  error?: string;
}

export interface AEOScoreResult {
  overall_score: number;
  by_model: Record<string, number | null>;
  by_keyword: Record<string, number>;
  mention_count: number;
  total_queries: number;
  trend: number;
}

export interface AEODashboardData {
  score: number | null;
  previousScore: number | null;
  trend: number;
  byModel: Record<string, number>;
  recentMentions: Array<{
    question: string;
    ai_model: string;
    position: number | null;
    sentiment: string;
    created_at: string;
  }>;
  unmatchedQuestions: Array<{
    id: string;
    question: string;
    keyword: string;
    keyword_id: string;
  }>;
}

export interface AEOAnalyticsData {
  scoreTrend: Array<{ date: string; score: number; model?: string }>;
  questionTable: Array<{
    question_id: string;
    question: string;
    keyword: string;
    perplexity: { mentioned: boolean; position: number | null } | null;
    claude: { mentioned: boolean; position: number | null } | null;
    chatgpt: { mentioned: boolean; position: number | null } | null;
    gemini: { mentioned: boolean; position: number | null } | null;
    avg_position: number | null;
  }>;
  totalTracked: number;
  totalMentioned: number;
}

export interface AEOCompetitionData {
  competitors: Array<{
    brand: string;
    mention_count: number;
    avg_position: number | null;
    sentiment_breakdown: { positive: number; neutral: number; negative: number };
  }>;
  shareOfVoice: Array<{ brand: string; count: number; percentage: number }>;
  ourMentionCount: number;
}

export interface AEOCitationData {
  topSources: Array<{ url: string; citation_count: number; related_questions: number }>;
  ourContentCited: Array<{ url: string; citation_count: number; content_title: string }>;
}

// ═══════════════════════════════════════════
// 설정 조회/수정
// ═══════════════════════════════════════════

export async function getAEOSettings(): Promise<AEOSettings> {
  const db = createAdminClient();
  const { data } = await db.from("aeo_tracking_settings").select("setting_key, setting_value");

  const settingsMap: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{ setting_key: string; setting_value: string }>) {
    settingsMap[row.setting_key] = row.setting_value;
  }

  return {
    max_questions_per_client_per_day: parseInt(settingsMap.max_questions_per_client_per_day || "10"),
    enabled_ai_models: JSON.parse(settingsMap.enabled_ai_models || '["perplexity","claude"]'),
    repeat_count: parseInt(settingsMap.repeat_count || "3"),
    cron_enabled: settingsMap.cron_enabled === "true",
    playwright_enabled: settingsMap.playwright_enabled === "true",
  };
}

export async function updateAEOSettings(
  settings: Partial<{
    max_questions_per_client_per_day: number;
    enabled_ai_models: string[];
    repeat_count: number;
    cron_enabled: boolean;
    playwright_enabled: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    const now = new Date().toISOString();

    const updates: Array<{ key: string; value: string }> = [];

    if (settings.max_questions_per_client_per_day !== undefined) {
      updates.push({ key: "max_questions_per_client_per_day", value: String(settings.max_questions_per_client_per_day) });
    }
    if (settings.enabled_ai_models !== undefined) {
      updates.push({ key: "enabled_ai_models", value: JSON.stringify(settings.enabled_ai_models) });
    }
    if (settings.repeat_count !== undefined) {
      updates.push({ key: "repeat_count", value: String(settings.repeat_count) });
    }
    if (settings.cron_enabled !== undefined) {
      updates.push({ key: "cron_enabled", value: String(settings.cron_enabled) });
    }
    if (settings.playwright_enabled !== undefined) {
      updates.push({ key: "playwright_enabled", value: String(settings.playwright_enabled) });
    }

    for (const u of updates) {
      await db
        .from("aeo_tracking_settings")
        .update({ setting_value: u.value, updated_at: now })
        .eq("setting_key", u.key);
    }

    revalidatePath("/ops/aeo-settings");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ═══════════════════════════════════════════
// 수동 추적 실행 (단일 고객)
// ═══════════════════════════════════════════

export async function runAEOTracking(clientId: string): Promise<TrackingResult> {
  try {
    const db = createAdminClient();
    const settings = await getAEOSettings();
    const enabledModels = settings.enabled_ai_models;
    const maxQuestions = settings.max_questions_per_client_per_day;
    const repeatCount = settings.repeat_count;

    // 브랜드 정보 조회
    const { data: client } = await db
      .from("clients")
      .select("name, brand_persona")
      .eq("id", clientId)
      .single();

    if (!client) {
      return { success: false, tracked: 0, mentioned: 0, score: null, error: "고객 정보를 찾을 수 없습니다" };
    }

    const brandName = client.name || "";
    const brandAliases: string[] = client.brand_persona?.aliases || [];

    // 활성 키워드의 질문 수집
    const { data: questions } = await db
      .from("questions")
      .select("id, question, keyword_id")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (!questions || questions.length === 0) {
      return { success: false, tracked: 0, mentioned: 0, score: null, error: "추적할 질문이 없습니다" };
    }

    // 질문 수 제한 (라운드 로빈 — 키워드당 균등)
    const selectedQuestions = limitQuestionsByKeyword(
      questions as Array<{ id: string; question: string; keyword_id: string }>,
      maxQuestions
    );

    let tracked = 0;
    let mentioned = 0;

    // 각 질문 × 각 모델 × repeat_count 실행
    for (const q of selectedQuestions) {
      for (const model of enabledModels) {
        for (let i = 0; i < repeatCount; i++) {
          try {
            // LLM 크롤링
            const answer = await crawlLLM(q.question, model, settings.playwright_enabled);
            if (!answer) continue;

            // llm_answers INSERT
            const { data: insertedAnswer } = await db
              .from("llm_answers")
              .insert({
                question_id: q.id,
                client_id: clientId,
                ai_model: model,
                response_text: answer.response_text,
                sources: answer.sources,
                crawl_method: answer.crawl_method,
              })
              .select("id")
              .single();

            if (!insertedAnswer) continue;
            tracked++;

            // Mention Detection
            const mentions = await detectMentions(answer.response_text, brandName, brandAliases);

            // mentions INSERT
            for (const m of mentions) {
              await db.from("mentions").insert({
                answer_id: insertedAnswer.id,
                client_id: clientId,
                brand_name: m.brand,
                is_target: m.is_target,
                position: m.position,
                context: m.context,
                sentiment: m.sentiment,
                confidence: m.confidence,
              });

              if (m.is_target) mentioned++;
            }

            // Rate limit 대기
            const delay = MODEL_RATE_LIMITS[model] || 2000;
            await new Promise((resolve) => setTimeout(resolve, delay));
          } catch (err) {
            console.error(`[AEO Tracking] Error for question ${q.id}, model ${model}:`, err);
            // 개별 실패는 계속 진행
          }
        }
      }
    }

    // AEO Score 계산
    const today = new Date().toISOString().split("T")[0];
    const scoreResult = await calculateAEOScore(clientId, today, today);

    revalidatePath("/analytics");
    revalidatePath("/dashboard");

    return {
      success: true,
      tracked,
      mentioned,
      score: scoreResult?.overall_score ?? null,
    };
  } catch (error) {
    console.error("[AEO Tracking] runAEOTracking error:", error);
    return { success: false, tracked: 0, mentioned: 0, score: null, error: String(error) };
  }
}

/**
 * 라운드 로빈 질문 선택 — 키워드당 균등 배분
 */
function limitQuestionsByKeyword(
  questions: Array<{ id: string; question: string; keyword_id: string }>,
  maxCount: number
): Array<{ id: string; question: string; keyword_id: string }> {
  if (questions.length <= maxCount) return questions;

  // 키워드별 그룹핑
  const byKeyword: Record<string, Array<{ id: string; question: string; keyword_id: string }>> = {};
  for (const q of questions) {
    const kid = q.keyword_id || "none";
    if (!byKeyword[kid]) byKeyword[kid] = [];
    byKeyword[kid].push(q);
  }

  const keywordIds = Object.keys(byKeyword);
  const result: Array<{ id: string; question: string; keyword_id: string }> = [];
  let round = 0;

  while (result.length < maxCount) {
    let added = false;
    for (const kid of keywordIds) {
      if (result.length >= maxCount) break;
      if (round < byKeyword[kid].length) {
        result.push(byKeyword[kid][round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }

  return result;
}

// ═══════════════════════════════════════════
// 크론 배치 추적 (전체 고객)
// ═══════════════════════════════════════════

export async function runAEOTrackingBatch(): Promise<{ processed: number; errors: number }> {
  const settings = await getAEOSettings();
  if (!settings.cron_enabled) {
    console.log("[AEO Batch] cron_enabled=false, skipping");
    return { processed: 0, errors: 0 };
  }

  const db = createAdminClient();

  // 활성 client 목록 (활성 키워드 + 질문 있는)
  const { data: clients } = await db
    .from("clients")
    .select("id, name")
    .eq("status", "active")
    .order("created_at");

  if (!clients || clients.length === 0) {
    return { processed: 0, errors: 0 };
  }

  // 우선순위 부여: 포인트 잔액 있으면 priority 1, 없으면 2
  const { data: pointData } = await db
    .from("client_points")
    .select("client_id, balance");

  const balanceMap: Record<string, number> = {};
  for (const p of (pointData ?? []) as Array<{ client_id: string; balance: number }>) {
    balanceMap[p.client_id] = p.balance;
  }

  const sortedClients = (clients as Array<{ id: string; name: string }>).sort((a, b) => {
    const aPriority = (balanceMap[a.id] || 0) > 0 ? 1 : 2;
    const bPriority = (balanceMap[b.id] || 0) > 0 ? 1 : 2;
    return aPriority - bPriority;
  });

  let processed = 0;
  let errors = 0;

  for (const client of sortedClients) {
    try {
      const result = await runAEOTracking(client.id);
      if (result.success) {
        processed++;
      } else {
        errors++;
      }
    } catch (err) {
      console.error(`[AEO Batch] Error for client ${client.id}:`, err);
      errors++;
    }
  }

  return { processed, errors };
}

// ═══════════════════════════════════════════
// AEO Score 계산
// ═══════════════════════════════════════════

/**
 * score = Σ(mention_weight × position_weight) / total_queries × 100
 *
 * position_weight: 1위=1.0, 2위=0.7, 3위=0.4, 본문(순위없음)=0.2, 미언급=0
 * mention_weight (AI 모델별): ChatGPT=1.0, Perplexity=0.8, Gemini=0.7, Claude=0.5
 */
export async function calculateAEOScore(
  clientId: string,
  periodStart: string,
  periodEnd: string
): Promise<AEOScoreResult | null> {
  try {
    const db = createAdminClient();

    // 기간 내 llm_answers 조회
    const { data: answers } = await db
      .from("llm_answers")
      .select("id, question_id, ai_model, created_at")
      .eq("client_id", clientId)
      .gte("created_at", `${periodStart}T00:00:00`)
      .lte("created_at", `${periodEnd}T23:59:59`);

    if (!answers || answers.length === 0) return null;

    const answerIds = (answers as Array<{ id: string }>).map((a) => a.id);

    // mentions 조회 (is_target=true만)
    const { data: mentions } = await db
      .from("mentions")
      .select("answer_id, position, confidence")
      .eq("client_id", clientId)
      .eq("is_target", true)
      .in("answer_id", answerIds);

    const mentionMap = new Set(
      (mentions ?? []).map((m: { answer_id: string }) => m.answer_id)
    );

    // 키워드 정보 조회
    const questionIds = [...new Set((answers as Array<{ question_id: string }>).map((a) => a.question_id))];
    const { data: questionData } = await db
      .from("questions")
      .select("id, keyword_id")
      .in("id", questionIds);

    const questionKeywordMap: Record<string, string | null> = {};
    for (const q of (questionData ?? []) as Array<{ id: string; keyword_id: string | null }>) {
      questionKeywordMap[q.id] = q.keyword_id;
    }

    // 키워드 이름 매핑
    const keywordIds = [...new Set(Object.values(questionKeywordMap).filter(Boolean) as string[])];
    let keywordNameMap: Record<string, string> = {};
    if (keywordIds.length > 0) {
      const { data: kwData } = await db.from("keywords").select("id, keyword").in("id", keywordIds);
      for (const kw of (kwData ?? []) as Array<{ id: string; keyword: string }>) {
        keywordNameMap[kw.id] = kw.keyword;
      }
    }

    // Score 계산
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const byModel: Record<string, { score: number; count: number }> = {};
    const byKeyword: Record<string, { score: number; count: number }> = {};
    let mentionCount = 0;

    for (const answer of answers as Array<{ id: string; question_id: string; ai_model: string }>) {
      const modelWeight = MODEL_WEIGHTS[answer.ai_model] || 0.5;
      const isMentioned = mentionMap.has(answer.id);

      // position_weight
      let positionWeight = 0;
      if (isMentioned) {
        const mention = (mentions as Array<{ answer_id: string; position: number | null }>)
          ?.find((m) => m.answer_id === answer.id);
        const pos = mention?.position;

        if (pos === 1) positionWeight = 1.0;
        else if (pos === 2) positionWeight = 0.7;
        else if (pos === 3) positionWeight = 0.4;
        else positionWeight = 0.2; // 본문 언급 (순위 없음)

        mentionCount++;
      }

      const itemScore = modelWeight * positionWeight;
      totalWeightedScore += itemScore;
      totalWeight += modelWeight;

      // 모델별 집계
      if (!byModel[answer.ai_model]) byModel[answer.ai_model] = { score: 0, count: 0 };
      byModel[answer.ai_model].score += positionWeight;
      byModel[answer.ai_model].count++;

      // 키워드별 집계
      const kwId = questionKeywordMap[answer.question_id];
      const kwName = kwId ? keywordNameMap[kwId] : "기타";
      if (kwName) {
        if (!byKeyword[kwName]) byKeyword[kwName] = { score: 0, count: 0 };
        byKeyword[kwName].score += positionWeight;
        byKeyword[kwName].count++;
      }
    }

    const totalQueries = answers.length;
    const overallScore = totalWeight > 0
      ? Math.round((totalWeightedScore / totalWeight) * 100 * 10) / 10
      : 0;

    // 모델별 점수 정리
    const byModelResult: Record<string, number | null> = {};
    for (const model of ["perplexity", "claude", "chatgpt", "gemini"]) {
      if (byModel[model]) {
        byModelResult[model] = Math.round((byModel[model].score / byModel[model].count) * 100 * 10) / 10;
      } else {
        byModelResult[model] = null;
      }
    }

    // 키워드별 점수 정리
    const byKeywordResult: Record<string, number> = {};
    for (const [kw, data] of Object.entries(byKeyword)) {
      byKeywordResult[kw] = Math.round((data.score / data.count) * 100 * 10) / 10;
    }

    // 이전 기간 점수 조회 (트렌드)
    const prevStart = new Date(periodStart);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(periodStart);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const { data: prevScores } = await db
      .from("aeo_scores")
      .select("score")
      .eq("client_id", clientId)
      .is("keyword_id", null)
      .is("ai_model", null)
      .gte("period_start", prevStart.toISOString().split("T")[0])
      .lte("period_end", prevEnd.toISOString().split("T")[0])
      .order("created_at", { ascending: false })
      .limit(1);

    const prevScore = (prevScores as Array<{ score: number }> | null)?.[0]?.score ?? 0;
    const trend = Math.round((overallScore - prevScore) * 10) / 10;

    // aeo_scores INSERT (매 추적마다 새 레코드)
    await db.from("aeo_scores").insert({
      client_id: clientId,
      keyword_id: null,
      ai_model: null,
      score: overallScore,
      mention_count: mentionCount,
      total_queries: totalQueries,
      period_start: periodStart,
      period_end: periodEnd,
      details: { by_model: byModelResult, by_keyword: byKeywordResult },
    }).then(({ error: insertErr }) => {
      if (insertErr) {
        console.error("[AEO Score] insert error:", insertErr.message);
      }
    });

    return {
      overall_score: overallScore,
      by_model: byModelResult,
      by_keyword: byKeywordResult,
      mention_count: mentionCount,
      total_queries: totalQueries,
      trend,
    };
  } catch (error) {
    console.error("[AEO Score] calculation error:", error);
    return null;
  }
}

// ═══════════════════════════════════════════
// 대시보드 AEO 데이터
// ═══════════════════════════════════════════

export async function getAEODashboardData(clientId: string): Promise<AEODashboardData> {
  const db = createAdminClient();

  // 최근 AEO 점수
  const { data: latestScore } = await db
    .from("aeo_scores")
    .select("score, period_start, details")
    .eq("client_id", clientId)
    .is("keyword_id", null)
    .is("ai_model", null)
    .order("period_end", { ascending: false })
    .limit(1);

  const currentScore = (latestScore as Array<{ score: number }> | null)?.[0]?.score ?? null;

  // 이전 점수 (트렌드)
  const { data: prevScores } = await db
    .from("aeo_scores")
    .select("score")
    .eq("client_id", clientId)
    .is("keyword_id", null)
    .is("ai_model", null)
    .order("period_end", { ascending: false })
    .range(1, 1);

  const previousScore = (prevScores as Array<{ score: number }> | null)?.[0]?.score ?? null;
  const trend = currentScore !== null && previousScore !== null
    ? Math.round((currentScore - previousScore) * 10) / 10
    : 0;

  // 모델별 언급 횟수
  const { data: modelCounts } = await db
    .from("llm_answers")
    .select("ai_model")
    .eq("client_id", clientId);

  const byModel: Record<string, number> = {};
  for (const row of (modelCounts ?? []) as Array<{ ai_model: string }>) {
    byModel[row.ai_model] = (byModel[row.ai_model] || 0) + 1;
  }

  // 최근 언급된 질문 TOP 5
  const { data: recentMentionsRaw } = await db
    .from("mentions")
    .select("answer_id, position, sentiment, created_at")
    .eq("client_id", clientId)
    .eq("is_target", true)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentMentions: AEODashboardData["recentMentions"] = [];
  if (recentMentionsRaw && recentMentionsRaw.length > 0) {
    const answerIds = (recentMentionsRaw as Array<{ answer_id: string }>).map((m) => m.answer_id);
    const { data: answerData } = await db
      .from("llm_answers")
      .select("id, question_id, ai_model")
      .in("id", answerIds);

    const answerMap: Record<string, { question_id: string; ai_model: string }> = {};
    for (const a of (answerData ?? []) as Array<{ id: string; question_id: string; ai_model: string }>) {
      answerMap[a.id] = { question_id: a.question_id, ai_model: a.ai_model };
    }

    const qIds = [...new Set(Object.values(answerMap).map((a) => a.question_id))];
    const { data: qData } = await db.from("questions").select("id, question").in("id", qIds);
    const qMap: Record<string, string> = {};
    for (const q of (qData ?? []) as Array<{ id: string; question: string }>) {
      qMap[q.id] = q.question;
    }

    for (const m of recentMentionsRaw as Array<{
      answer_id: string;
      position: number | null;
      sentiment: string;
      created_at: string;
    }>) {
      const ans = answerMap[m.answer_id];
      if (ans) {
        recentMentions.push({
          question: qMap[ans.question_id] || "알 수 없음",
          ai_model: ans.ai_model,
          position: m.position,
          sentiment: m.sentiment,
          created_at: m.created_at,
        });
      }
    }
  }

  // 미노출 질문 (최근 추적에서 미언급)
  const { data: allQuestions } = await db
    .from("questions")
    .select("id, question, keyword_id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: mentionedAnswers } = await db
    .from("mentions")
    .select("answer_id")
    .eq("client_id", clientId)
    .eq("is_target", true);

  const mentionedAnswerIds = new Set(
    (mentionedAnswers ?? []).map((m: { answer_id: string }) => m.answer_id)
  );

  const { data: allAnswers } = await db
    .from("llm_answers")
    .select("id, question_id")
    .eq("client_id", clientId);

  const mentionedQuestionIds = new Set<string>();
  for (const a of (allAnswers ?? []) as Array<{ id: string; question_id: string }>) {
    if (mentionedAnswerIds.has(a.id)) {
      mentionedQuestionIds.add(a.question_id);
    }
  }

  // 키워드 이름 매핑
  const kwIds = [...new Set(
    (allQuestions ?? [])
      .map((q: { keyword_id: string | null }) => q.keyword_id)
      .filter(Boolean) as string[]
  )];
  let kwNameMap: Record<string, string> = {};
  if (kwIds.length > 0) {
    const { data: kwData } = await db.from("keywords").select("id, keyword").in("id", kwIds);
    for (const kw of (kwData ?? []) as Array<{ id: string; keyword: string }>) {
      kwNameMap[kw.id] = kw.keyword;
    }
  }

  const unmatchedQuestions = (allQuestions ?? [])
    .filter((q: { id: string }) => !mentionedQuestionIds.has(q.id))
    .slice(0, 10)
    .map((q: { id: string; question: string; keyword_id: string }) => ({
      id: q.id,
      question: q.question,
      keyword: kwNameMap[q.keyword_id] || "기타",
      keyword_id: q.keyword_id,
    }));

  return {
    score: currentScore,
    previousScore,
    trend,
    byModel,
    recentMentions,
    unmatchedQuestions,
  };
}

// ═══════════════════════════════════════════
// 성과분석 AEO 데이터
// ═══════════════════════════════════════════

export async function getAEOAnalyticsData(
  clientId: string,
  days: number = 30,
  modelFilter?: string
): Promise<AEOAnalyticsData> {
  const db = createAdminClient();
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const since = sinceDate.toISOString();

  // Score 추이
  const { data: scores } = await db
    .from("aeo_scores")
    .select("score, period_start, ai_model")
    .eq("client_id", clientId)
    .gte("period_start", since.split("T")[0])
    .order("period_start");

  const scoreTrend = (scores ?? []).map((s: { score: number; period_start: string; ai_model: string | null }) => ({
    date: s.period_start,
    score: s.score,
    model: s.ai_model ?? undefined,
  }));

  // 질문별 노출 테이블
  let answersQuery = db
    .from("llm_answers")
    .select("id, question_id, ai_model")
    .eq("client_id", clientId)
    .gte("created_at", since);

  if (modelFilter && modelFilter !== "all") {
    answersQuery = answersQuery.eq("ai_model", modelFilter);
  }

  const { data: answers } = await answersQuery;

  const { data: mentionsData } = await db
    .from("mentions")
    .select("answer_id, position, is_target")
    .eq("client_id", clientId)
    .eq("is_target", true)
    .gte("created_at", since);

  const mentionByAnswer: Record<string, number | null> = {};
  for (const m of (mentionsData ?? []) as Array<{ answer_id: string; position: number | null }>) {
    mentionByAnswer[m.answer_id] = m.position;
  }

  // 질문별 그룹핑
  const questionIds = [...new Set((answers ?? []).map((a: { question_id: string }) => a.question_id))];
  const { data: qData } = await db
    .from("questions")
    .select("id, question, keyword_id")
    .in("id", questionIds.length > 0 ? questionIds : ["none"]);

  const kwIds = [...new Set(
    (qData ?? []).map((q: { keyword_id: string | null }) => q.keyword_id).filter(Boolean) as string[]
  )];
  let kwMap: Record<string, string> = {};
  if (kwIds.length > 0) {
    const { data: kwData } = await db.from("keywords").select("id, keyword").in("id", kwIds);
    for (const kw of (kwData ?? []) as Array<{ id: string; keyword: string }>) {
      kwMap[kw.id] = kw.keyword;
    }
  }

  // 질문별 모델별 언급 상태
  const questionTable: AEOAnalyticsData["questionTable"] = [];
  let totalTracked = 0;
  let totalMentioned = 0;

  for (const q of (qData ?? []) as Array<{ id: string; question: string; keyword_id: string }>) {
    const qAnswers = (answers ?? []).filter((a: { question_id: string }) => a.question_id === q.id);
    const modelStatus: Record<string, { mentioned: boolean; position: number | null } | null> = {
      perplexity: null, claude: null, chatgpt: null, gemini: null,
    };

    let posSum = 0;
    let posCount = 0;

    for (const a of qAnswers as Array<{ id: string; ai_model: string }>) {
      const hasMention = a.id in mentionByAnswer;
      const position = mentionByAnswer[a.id] ?? null;

      modelStatus[a.ai_model] = {
        mentioned: hasMention,
        position: hasMention ? position : null,
      };

      totalTracked++;
      if (hasMention) {
        totalMentioned++;
        if (position) {
          posSum += position;
          posCount++;
        }
      }
    }

    questionTable.push({
      question_id: q.id,
      question: q.question,
      keyword: kwMap[q.keyword_id] || "기타",
      perplexity: modelStatus.perplexity,
      claude: modelStatus.claude,
      chatgpt: modelStatus.chatgpt,
      gemini: modelStatus.gemini,
      avg_position: posCount > 0 ? Math.round((posSum / posCount) * 10) / 10 : null,
    });
  }

  return { scoreTrend, questionTable, totalTracked, totalMentioned };
}

// ═══════════════════════════════════════════
// 경쟁 분석 데이터
// ═══════════════════════════════════════════

export async function getAEOCompetitionData(clientId: string): Promise<AEOCompetitionData> {
  const db = createAdminClient();

  // 전체 mentions (is_target 구분 없이)
  const { data: allMentions } = await db
    .from("mentions")
    .select("brand_name, is_target, position, sentiment")
    .eq("client_id", clientId);

  if (!allMentions || allMentions.length === 0) {
    return { competitors: [], shareOfVoice: [], ourMentionCount: 0 };
  }

  // 브랜드별 집계
  const brandStats: Record<string, {
    count: number;
    positions: number[];
    sentiments: { positive: number; neutral: number; negative: number };
    is_target: boolean;
  }> = {};

  for (const m of allMentions as Array<{
    brand_name: string;
    is_target: boolean;
    position: number | null;
    sentiment: string;
  }>) {
    if (!brandStats[m.brand_name]) {
      brandStats[m.brand_name] = {
        count: 0,
        positions: [],
        sentiments: { positive: 0, neutral: 0, negative: 0 },
        is_target: m.is_target,
      };
    }
    brandStats[m.brand_name].count++;
    if (m.position) brandStats[m.brand_name].positions.push(m.position);
    const sent = m.sentiment as "positive" | "neutral" | "negative";
    if (sent in brandStats[m.brand_name].sentiments) {
      brandStats[m.brand_name].sentiments[sent]++;
    }
  }

  // 경쟁자 목록 (is_target=false)
  const competitors = Object.entries(brandStats)
    .filter(([, data]) => !data.is_target)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 20)
    .map(([brand, data]) => ({
      brand,
      mention_count: data.count,
      avg_position: data.positions.length > 0
        ? Math.round((data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10) / 10
        : null,
      sentiment_breakdown: data.sentiments,
    }));

  // Share of Voice
  const totalMentions = Object.values(brandStats).reduce((sum, d) => sum + d.count, 0);
  const shareOfVoice = Object.entries(brandStats)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([brand, data]) => ({
      brand,
      count: data.count,
      percentage: Math.round((data.count / totalMentions) * 1000) / 10,
    }));

  const ourMentionCount = Object.values(brandStats)
    .filter((d) => d.is_target)
    .reduce((sum, d) => sum + d.count, 0);

  return { competitors, shareOfVoice, ourMentionCount };
}

// ═══════════════════════════════════════════
// Citation 분석 데이터
// ═══════════════════════════════════════════

export async function getAEOCitationData(clientId: string): Promise<AEOCitationData> {
  const db = createAdminClient();

  // Perplexity sources에서 인용 출처 추출
  const { data: answersWithSources } = await db
    .from("llm_answers")
    .select("id, sources, question_id")
    .eq("client_id", clientId)
    .eq("ai_model", "perplexity")
    .not("sources", "eq", "[]");

  const sourceCount: Record<string, { count: number; questions: Set<string> }> = {};

  for (const a of (answersWithSources ?? []) as Array<{
    id: string;
    sources: string[];
    question_id: string;
  }>) {
    const sources = Array.isArray(a.sources) ? a.sources : [];
    for (const src of sources) {
      if (typeof src !== "string") continue;
      if (!sourceCount[src]) sourceCount[src] = { count: 0, questions: new Set() };
      sourceCount[src].count++;
      sourceCount[src].questions.add(a.question_id);
    }
  }

  const topSources = Object.entries(sourceCount)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([url, data]) => ({
      url,
      citation_count: data.count,
      related_questions: data.questions.size,
    }));

  // 우리 콘텐츠 인용 여부 (published URL과 sources URL 매칭)
  const { data: publishedContents } = await db
    .from("contents")
    .select("id, title, published_url")
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .not("published_url", "is", null);

  const ourContentCited: AEOCitationData["ourContentCited"] = [];

  for (const content of (publishedContents ?? []) as Array<{
    id: string;
    title: string;
    published_url: string;
  }>) {
    const url = content.published_url;
    if (!url) continue;

    // URL의 도메인 부분으로 매칭
    const domain = extractDomain(url);
    let citationCount = 0;

    for (const [srcUrl, data] of Object.entries(sourceCount)) {
      if (srcUrl.includes(domain) || srcUrl === url) {
        citationCount += data.count;
      }
    }

    if (citationCount > 0) {
      ourContentCited.push({
        url,
        citation_count: citationCount,
        content_title: content.title || "제목 없음",
      });
    }
  }

  return { topSources, ourContentCited };
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

// ═══════════════════════════════════════════
// 포털 AEO 데이터
// ═══════════════════════════════════════════

export async function getPortalAEOData(clientId: string): Promise<{
  score: number | null;
  trend: number;
  byModel: Record<string, number>;
  scoreTrend: Array<{ date: string; score: number }>;
  questionTable: Array<{
    question: string;
    perplexity: boolean | null;
    claude: boolean | null;
    chatgpt: boolean | null;
    gemini: boolean | null;
  }>;
}> {
  const dashboardData = await getAEODashboardData(clientId);
  const analyticsData = await getAEOAnalyticsData(clientId, 30);

  return {
    score: dashboardData.score,
    trend: dashboardData.trend,
    byModel: dashboardData.byModel,
    scoreTrend: analyticsData.scoreTrend.map((s) => ({ date: s.date, score: s.score })),
    questionTable: analyticsData.questionTable.slice(0, 20).map((q) => ({
      question: q.question,
      perplexity: q.perplexity?.mentioned ?? null,
      claude: q.claude?.mentioned ?? null,
      chatgpt: q.chatgpt?.mentioned ?? null,
      gemini: q.gemini?.mentioned ?? null,
    })),
  };
}

// ═══════════════════════════════════════════
// 추적 전 정보 조회 (모달용)
// ═══════════════════════════════════════════

export async function getAEOTrackingPreview(clientId: string): Promise<{
  questionCount: number;
  modelCount: number;
  repeatCount: number;
  models: string[];
}> {
  const settings = await getAEOSettings();

  const db = createAdminClient();
  const { count } = await db
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  const questionCount = Math.min(count || 0, settings.max_questions_per_client_per_day);

  return {
    questionCount,
    modelCount: settings.enabled_ai_models.length,
    repeatCount: settings.repeat_count,
    models: settings.enabled_ai_models,
  };
}
