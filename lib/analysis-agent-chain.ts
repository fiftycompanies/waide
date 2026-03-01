/**
 * analysis-agent-chain.ts
 * 분석 완료 후 실행되는 에이전트 체인
 *
 * 기존 분석 흐름(URL → 데이터 수집 → 점수 산출)은 유지하면서,
 * 뒤에 에이전트 체인을 추가:
 *   → [RND] 경쟁사 TOP5 비교 분석
 *   → [CMO] 브랜드 페르소나 생성
 *   → [CMO] SEO 진단 코멘트
 *   → [CMO] 개선포인트 전략 액션플랜
 *   → analysis_result JSONB에 모두 저장
 */

import { createAdminClient } from "@/lib/supabase/service";
import { runAgentChain } from "@/lib/agent-chain";
import { collectCompetitors, type CompetitorData } from "@/lib/competitor-collector";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface AnalysisAgentChainParams {
  analysisId: string;
  clientId?: string;          // clients.id (있을 때만)
  placeData: {
    placeId: string;
    name: string;
    category: string;
    businessType?: string;
    region: string;
    address: string;
    businessHours?: string;
    facilities?: string[];
    menuItems?: string;
    parking?: string;
    reservation?: string;
    additionalInfo?: string;
    reviewCount: number;
    blogReviewCount: number;
    rating?: number;
    positiveKeywords?: string;
    negativeKeywords?: string;
    imageAnalysis?: string;
    imageCount?: number;
    homepageUrl?: string;
    snsUrl?: string;
    serviceLabels?: string[];
  };
  scoringResult: {
    score: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    breakdown: Record<string, any>;
    improvements: string[];
  };
  keywords: string[];           // 대표 키워드 (최대 3개)
  seoAudit?: unknown;           // SEO 진단 결과
}

// ═══════════════════════════════════════════
// 메인: runAnalysisAgentChain
// ═══════════════════════════════════════════

export async function runAnalysisAgentChain(
  params: AnalysisAgentChainParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[analysis-agent-chain] ANTHROPIC_API_KEY 미설정, 에이전트 체인 스킵");
    return null;
  }

  const db = createAdminClient();

  // 1. 경쟁사 데이터 수집 (AI 아닌 크롤링)
  let competitors: CompetitorData[] = [];
  try {
    competitors = await collectCompetitors({
      keywords: params.keywords,
      myPlaceId: params.placeData.placeId,
    });
  } catch (error) {
    console.warn("[analysis-agent-chain] 경쟁사 수집 실패, 빈 데이터로 진행:", error);
  }

  // 2. 에이전트 체인 실행
  let chainResults;
  try {
    chainResults = await runAgentChain([
      // Step 1: RND 경쟁사 비교 분석
      {
        agent: "RND",
        task: "competitor_analysis",
        baseContext: {
          place_name: params.placeData.name,
          category: params.placeData.category,
          region: params.placeData.region,
          review_count: params.placeData.reviewCount,
          blog_review_count: params.placeData.blogReviewCount,
          marketing_score: params.scoringResult.score,
          keyword_rankings: params.keywords.join(", "),
          serp_data: JSON.stringify(competitors, null, 2),
        },
        resultKey: "competitor_analysis",
      },

      // Step 2: CMO 브랜드 페르소나
      {
        agent: "CMO",
        task: "brand_persona",
        baseContext: {
          place_name: params.placeData.name,
          category: params.placeData.category,
          category_detail: params.placeData.businessType || "",
          region: params.placeData.region,
          address: params.placeData.address,
          business_hours: params.placeData.businessHours || "정보 없음",
          facilities: params.placeData.facilities?.join(", ") || "정보 없음",
          menu_items: params.placeData.menuItems || "정보 없음",
          parking: params.placeData.parking || "정보 없음",
          reservation: params.placeData.reservation || "정보 없음",
          additional_info: params.placeData.additionalInfo || "",
          review_count: params.placeData.reviewCount,
          rating: params.placeData.rating || "정보 없음",
          positive_keywords: params.placeData.positiveKeywords || "정보 없음",
          negative_keywords: params.placeData.negativeKeywords || "정보 없음",
          image_analysis: params.placeData.imageAnalysis || "미분석",
          marketing_score: params.scoringResult.score,
        },
        dependsOn: {
          competitor_summary: "competitor_analysis",
        },
        resultKey: "brand_persona",
      },

      // Step 3: CMO SEO 진단 코멘트
      {
        agent: "CMO",
        task: "seo_diagnosis_comment",
        baseContext: {
          place_name: params.placeData.name,
          category: params.placeData.category,
          region: params.placeData.region,
          seo_audit: params.seoAudit ? JSON.stringify(params.seoAudit, null, 2) : "진단 데이터 없음",
          score_breakdown: JSON.stringify(params.scoringResult.breakdown, null, 2),
        },
        resultKey: "seo_comments",
      },

      // Step 4: CMO 개선포인트 전략 액션플랜
      {
        agent: "CMO",
        task: "improvement_plan",
        baseContext: {
          place_name: params.placeData.name,
          category: params.placeData.category,
          marketing_score: params.scoringResult.score,
          score_breakdown: JSON.stringify(params.scoringResult.breakdown, null, 2),
          improvements: params.scoringResult.improvements.join("\n"),
        },
        dependsOn: {
          brand_persona: "brand_persona",
        },
        resultKey: "improvement_plan",
      },
    ], params.clientId);
  } catch (chainError) {
    console.error("[analysis-agent-chain] 체인 실행 실패:", chainError);
    return null;
  }

  // 3. 결과를 brand_analyses에 저장 — 기존 데이터 보존 필수
  try {
    // 먼저 기존 analysis_result를 SELECT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (db as any)
      .from("brand_analyses")
      .select("analysis_result")
      .eq("id", params.analysisId)
      .single();

    const existingResult = (existing?.analysis_result as Record<string, unknown>) || {};

    // 기존 데이터에 에이전트 결과만 추가 (spread로 보존)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("brand_analyses")
      .update({
        analysis_result: {
          ...existingResult,
          competitor_analysis: chainResults.results?.competitor_analysis?.data || null,
          competitor_raw_data: competitors.length > 0 ? competitors : null,
          seo_comments: chainResults.results?.seo_comments?.data || null,
          improvement_plan: chainResults.results?.improvement_plan?.data || null,
          agent_chain_id: chainResults.chainId,
          agent_total_cost_usd: chainResults.totalCostUsd,
          agent_executed_at: new Date().toISOString(),
        },
      })
      .eq("id", params.analysisId);

    // 4. 브랜드 페르소나를 clients 테이블에 저장 (clientId가 있을 때만)
    if (params.clientId && chainResults.results?.brand_persona?.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .from("clients")
        .update({
          brand_persona: {
            ...chainResults.results.brand_persona.data,
            generated_at: new Date().toISOString(),
            generated_by: "CMO_v1.0",
            manually_edited: false,
            manual_overrides: {},
          },
          persona_updated_at: new Date().toISOString(),
        })
        .eq("id", params.clientId);
    }
  } catch (saveError) {
    console.error("[analysis-agent-chain] 결과 저장 실패:", saveError);
  }

  return chainResults;
}
