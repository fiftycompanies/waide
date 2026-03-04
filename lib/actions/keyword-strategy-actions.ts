"use server";

/**
 * keyword-strategy-actions.ts
 * CMO가 키워드 공략 전략 수립
 * ⚠️ createAdminClient() 사용
 * ⚠️ analysis_result 업데이트 시 기존 데이터 보존 필수 (SELECT → spread → UPDATE)
 */

import { createAdminClient } from "@/lib/supabase/service";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface GenerateStrategyResult {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strategy?: any;
  error?: string;
}

// ═══════════════════════════════════════════
// Main: generateKeywordStrategy
// ═══════════════════════════════════════════

export async function generateKeywordStrategy(
  clientId: string,
): Promise<GenerateStrategyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, error: "ANTHROPIC_API_KEY 미설정" };
  }

  const db = createAdminClient();

  // 1. 현재 키워드 순위 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: keywords } = await (db as any)
    .from("keywords")
    .select("keyword, status, current_rank_naver_pc, current_rank_naver_mo, monthly_search_total, monthly_search_pc, competition_level, metadata")
    .eq("client_id", clientId)
    .in("status", ["active", "suggested"]);

  // 2. 브랜드 페르소나 조회
  const { data: client } = await db
    .from("clients")
    .select("brand_persona")
    .eq("id", clientId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persona = (client?.brand_persona as any) || {};

  // 3. 경쟁사 분석 결과 조회 (최신)
  const { data: latestAnalysis } = await db
    .from("brand_analyses")
    .select("id, analysis_result")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysisResult = (latestAnalysis?.analysis_result as Record<string, any>) || {};
  const competitorKeywords = analysisResult?.competitor_analysis?.quick_win_opportunities || [];

  // 4. 키워드 분류
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeKeywords = (keywords || []).filter((k: any) => k.status === "active");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestedKeywords = (keywords || []).filter((k: any) => k.status === "suggested");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const top3Keywords = activeKeywords.filter((k: any) => k.current_rank_naver_pc && k.current_rank_naver_pc <= 3);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const top10Keywords = activeKeywords.filter((k: any) => k.current_rank_naver_pc && k.current_rank_naver_pc <= 10);

  // 5. CMO에게 전략 수립 요청
  let result;
  try {
    const { runAgent } = await import("@/lib/agent-runner");

    result = await runAgent({
      agent: "CMO",
      task: "keyword_strategy",
      context: {
        place_name: persona.one_liner || "",
        category: persona.positioning || "",
        region: "",
        brand_persona: JSON.stringify(persona),
        current_keywords: JSON.stringify(activeKeywords.map((k: { keyword: string; current_rank_naver_pc: number | null; monthly_search_total: number | null; competition_level: string | null }) => ({
          keyword: k.keyword,
          rank: k.current_rank_naver_pc,
          search_volume: k.monthly_search_total,
          competition: k.competition_level,
        }))),
        top3_keywords: JSON.stringify(top3Keywords.map((k: { keyword: string }) => k.keyword)),
        top10_keywords: JSON.stringify(top10Keywords.map((k: { keyword: string }) => k.keyword)),
        niche_keywords: JSON.stringify(suggestedKeywords.map((k: { keyword: string; metadata: unknown }) => ({
          keyword: k.keyword,
          metadata: k.metadata,
        }))),
        competitor_keywords: JSON.stringify(competitorKeywords),
      },
      clientId,
    });
  } catch (agentErr) {
    console.error("[keyword-strategy] CMO 에이전트 실패:", agentErr);
    return { success: false, error: "AI 전략 수립 실패" };
  }

  // 6. ⚠️ 전략 결과 저장 — 기존 analysis_result 보존 필수
  if (result?.success && latestAnalysis) {
    try {
      // 기존 analysis_result SELECT
      const { data: existing } = await db
        .from("brand_analyses")
        .select("analysis_result")
        .eq("id", latestAnalysis.id)
        .single();

      const existingResult = (existing?.analysis_result as Record<string, unknown>) || {};

      await db
        .from("brand_analyses")
        .update({
          analysis_result: {
            ...existingResult,  // 기존 데이터 보존 (competitor_analysis, seo_comments 등)
            keyword_strategy: result.data,
            keyword_strategy_generated_at: new Date().toISOString(),
          },
        })
        .eq("id", latestAnalysis.id);
    } catch (saveErr) {
      console.error("[keyword-strategy] 전략 저장 실패:", saveErr);
    }

    // 전략에 포함된 키워드 자동 승인/제외
    if (result.data) {
      try {
        // abandon_keywords → archived
        if (result.data.abandon_keywords && Array.isArray(result.data.abandon_keywords)) {
          for (const excluded of result.data.abandon_keywords) {
            if (!excluded.keyword) continue;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (db as any)
              .from("keywords")
              .update({
                status: "archived",
                metadata: { archived_reason: excluded.reason || "전략에서 제외" },
                updated_at: new Date().toISOString(),
              })
              .eq("client_id", clientId)
              .eq("keyword", excluded.keyword)
              .eq("status", "suggested");
          }
        }

        // 전략에 포함된 니치 키워드 → active 승인
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const qwKws = Array.isArray(result.data.quick_win_keywords) ? result.data.quick_win_keywords : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nicheKws = Array.isArray(result.data.niche_keywords) ? result.data.niche_keywords : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const approvedKeywords = [...qwKws, ...nicheKws].map((k: any) => k.keyword).filter(Boolean);

        for (const kw of approvedKeywords) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any)
            .from("keywords")
            .update({
              status: "active",
              is_tracking: true,
              updated_at: new Date().toISOString(),
            })
            .eq("client_id", clientId)
            .eq("keyword", kw)
            .eq("status", "suggested");
        }
      } catch (autoErr) {
        console.warn("[keyword-strategy] 자동 승인/제외 일부 실패:", autoErr);
      }
    }
  }

  return {
    success: true,
    strategy: result?.data || null,
  };
}

// ═══════════════════════════════════════════
// Helper: 전략 결과 조회
// ═══════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getKeywordStrategy(clientId: string): Promise<any> {
  const db = createAdminClient();

  const { data } = await db
    .from("brand_analyses")
    .select("analysis_result")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.analysis_result) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.analysis_result as any).keyword_strategy || null;
}
