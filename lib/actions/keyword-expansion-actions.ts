"use server";

/**
 * keyword-expansion-actions.ts
 * 니치 키워드 확장 실행
 *
 * 향후 확장 (Phase E-3: 구글 상위노출):
 * ─────────────────────────────────────────
 * lib/actions/gsc-keyword-discovery.ts (미구현)
 * GSC 데이터에서 미공략 키워드 자동 발견 → 발행 추천
 *
 * 흐름:
 * 1. GSC 일일 크론에서 유입 키워드 수집
 * 2. 기존 keywords 테이블과 비교 → 새로운 키워드 발견
 * 3. [RND] 검색량/경쟁도 체크
 * 4. [CMO] 페르소나와 맞는지 판단
 * 5. 맞으면 → 자동으로 keywords에 'suggested' + source='gsc_discovery' 추가
 * 6. 어드민에 알림
 * ─────────────────────────────────────────
 * 클라이언트별로 메인 키워드에서 니치 키워드 발굴
 * ⚠️ createAdminClient() 사용
 */

import { createAdminClient } from "@/lib/supabase/service";
import { collectNaverSuggestions, extractPlaceFeatureKeywords } from "@/lib/naver-suggest-collector";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface ExpandNicheParams {
  clientId: string;
  mainKeywords: string[];   // 대표 키워드 (최대 5개)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placeData?: any;           // 플레이스 데이터 (있을 때만)
}

interface NicheKeyword {
  keyword: string;
  search_intent?: string;
  source?: string;
  relevance?: string;
  competition_estimate?: string;
  content_angle?: string;
}

interface ExpandResult {
  success: boolean;
  inserted: number;
  skipped: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentResult?: any;
  error?: string;
}

// ═══════════════════════════════════════════
// Main: expandNicheKeywords
// ═══════════════════════════════════════════

export async function expandNicheKeywords(params: ExpandNicheParams): Promise<ExpandResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, inserted: 0, skipped: 0, error: "ANTHROPIC_API_KEY 미설정" };
  }

  const db = createAdminClient();

  // 1. 네이버 자동완성/연관검색어 수집 (크롤링)
  const suggestions: Record<string, { autocomplete: string[]; relatedSearches: string[] }> = {};
  for (const kw of params.mainKeywords.slice(0, 5)) {
    try {
      suggestions[kw] = await collectNaverSuggestions(kw);
    } catch (error) {
      console.warn(`[keyword-expansion] 자동완성 수집 실패 (${kw}):`, error);
      suggestions[kw] = { autocomplete: [], relatedSearches: [] };
    }
  }

  // 2. 매장 특성 키워드 추출
  const placeFeatures = params.placeData ? extractPlaceFeatureKeywords(params.placeData) : [];

  // 3. RND 에이전트에게 니치 키워드 확장 요청
  let agentResult;
  try {
    const { runAgent } = await import("@/lib/agent-runner");

    agentResult = await runAgent({
      agent: "RND",
      task: "niche_keyword_expansion",
      context: {
        place_name: params.placeData?.name || "",
        category: params.placeData?.category || "",
        category_detail: params.placeData?.categoryDetail || params.placeData?.businessType || "",
        region: params.placeData?.region || "",
        existing_keywords: JSON.stringify(params.mainKeywords),
        autocomplete_data: JSON.stringify(suggestions),
        related_search_data: JSON.stringify(
          Object.values(suggestions).flatMap((s) => s.relatedSearches)
        ),
        place_features: JSON.stringify(placeFeatures),
      },
      clientId: params.clientId,
    });
  } catch (agentErr) {
    console.error("[keyword-expansion] RND 에이전트 실패:", agentErr);
    return { success: false, inserted: 0, skipped: 0, error: "AI 키워드 확장 실패" };
  }

  // 4. 결과를 keywords 테이블에 suggested 상태로 저장
  let inserted = 0;
  let skipped = 0;

  if (agentResult?.success && agentResult.data?.niche_keywords) {
    const nicheKeywords = agentResult.data.niche_keywords as NicheKeyword[];

    for (const niche of nicheKeywords) {
      if (!niche.keyword || !niche.keyword.trim()) {
        skipped++;
        continue;
      }

      // 이미 있는 키워드면 스킵
      const { data: existing } = await db
        .from("keywords")
        .select("id")
        .eq("client_id", params.clientId)
        .eq("keyword", niche.keyword.trim())
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error } = await db.from("keywords").insert({
        client_id: params.clientId,
        keyword: niche.keyword.trim(),
        status: "suggested",
        source: "niche_expansion",
        is_tracking: false,
        metadata: {
          search_intent: niche.search_intent || null,
          source: niche.source || null,
          relevance: niche.relevance || null,
          competition_estimate: niche.competition_estimate || null,
          content_angle: niche.content_angle || null,
          generated_by: "RND_niche_v1.0",
          generated_at: new Date().toISOString(),
        },
        monthly_search_total: 0,
        competition_level: "medium",
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.warn(`[keyword-expansion] 키워드 저장 실패 (${niche.keyword}):`, error.message);
        skipped++;
      } else {
        inserted++;
      }
    }
  }

  return {
    success: true,
    inserted,
    skipped,
    agentResult,
  };
}

// ═══════════════════════════════════════════
// Helper: 클라이언트의 메인 키워드 조회
// ═══════════════════════════════════════════

export async function getClientMainKeywords(clientId: string): Promise<string[]> {
  const db = createAdminClient();

  const { data } = await db
    .from("keywords")
    .select("keyword")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("priority_score", { ascending: false, nullsFirst: false })
    .limit(5);

  return (data ?? []).map((k: { keyword: string }) => k.keyword);
}

// ═══════════════════════════════════════════
// Helper: suggested 키워드 승인/제외
// ═══════════════════════════════════════════

export async function approveSuggestedKeyword(
  keywordId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { error } = await db
    .from("keywords")
    .update({
      status: "active",
      is_tracking: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", keywordId)
    .eq("status", "suggested");

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function rejectSuggestedKeyword(
  keywordId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { error } = await db
    .from("keywords")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", keywordId)
    .eq("status", "suggested");

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function bulkApproveSuggestedKeywords(
  keywordIds: string[],
): Promise<{ success: boolean; approved: number; error?: string }> {
  const db = createAdminClient();
  let approved = 0;

  for (const id of keywordIds) {
    const { error } = await db
      .from("keywords")
      .update({
        status: "active",
        is_tracking: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "suggested");

    if (!error) approved++;
  }

  return { success: true, approved };
}
