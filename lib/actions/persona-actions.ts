"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { normalizePersona, syncFlatFromEnhanced } from "@/lib/utils/persona-compat";

// ── Types ──────────────────────────────────────────────────────────────────

export interface BrandPersona {
  one_liner?: string;
  positioning?: string;
  target_audience?: string;
  tone?: string;
  strengths?: string[];
  weaknesses?: string[];
  content_angles?: string[];
  avoid_angles?: string[];
  competitor_differentiators?: string[];
  seasonal_hooks?: string[];
  recommended_keywords?: string[];
  brand_story_hook?: string;
  visual_direction?: string;
  // 추가 flat 필드 (v1에서 사용)
  primary_target?: string;
  target_customer?: string;
  appeal_point?: string;
  usp?: string[];
  category?: string;
  region?: string;
  // meta
  generated_at?: string;
  generated_by?: string;
  manually_edited?: boolean;
  manual_overrides?: Record<string, unknown>;
  [key: string]: unknown;
}

// === AI 추론 하위 타입 ===

export interface AiInferredTargetCustomer {
  primary?: string;
  secondary?: string;
  pain_points?: string[];
  search_intent?: string;
  confirmed?: boolean;
}

export interface AiInferredTone {
  style?: string;
  personality?: string;
  example_phrases?: string[];
  confirmed?: boolean;
}

export interface AiInferredUsp {
  points?: string[];
  from_reviews?: string[];
  confirmed?: boolean;
}

export interface AiInferredContentDirection {
  angles?: string[];
  types?: string[];
  frequency?: string;
  confirmed?: boolean;
}

export interface AiInferredPricePosition {
  position?: string;
  comparison?: string;
  confirmed?: boolean;
}

export interface AiInferred {
  target_customer?: AiInferredTargetCustomer;
  tone?: AiInferredTone;
  usp?: AiInferredUsp;
  content_direction?: AiInferredContentDirection;
  price_position?: AiInferredPricePosition;
}

export interface OwnerInput {
  brand_story?: string;
  forbidden_content?: string;
  awards_certifications?: string[];
  official_price_info?: string;
}

export interface ContentStrategyBlog {
  tone?: string;
  topics?: string[];
  cta_templates?: string[];
  forbidden_terms?: string[];
  target_length?: string;
}

export interface ContentStrategyAeo {
  entity_description?: string;
  target_questions?: string[];
}

export interface PersonaContentStrategy {
  blog?: ContentStrategyBlog;
  aeo?: ContentStrategyAeo;
}

export interface CompetitiveSummary {
  market_position?: string;
  top_competitors?: Array<{
    name?: string;
    differentiation?: string;
  }>;
}

export interface EnhancedBrandPersona extends BrandPersona {
  ai_inferred?: AiInferred;
  owner_input?: OwnerInput;
  content_strategy?: PersonaContentStrategy;
  competitive_summary?: CompetitiveSummary;
  persona_version?: number;
  confirmation_status?: "pending" | "partial" | "confirmed";
  last_confirmed_at?: string;
}

// ── Update persona fields ──────────────────────────────────────────────────

export async function updatePersona(
  clientId: string,
  updates: Partial<BrandPersona>,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  // 기존 페르소나 가져오기
  const { data: client } = await db
    .from("clients")
    .select("brand_persona")
    .eq("id", clientId)
    .single();

  if (!client) return { success: false, error: "클라이언트를 찾을 수 없습니다" };

  const existing = (client.brand_persona as BrandPersona) || {};

  const { error } = await db
    .from("clients")
    .update({
      brand_persona: {
        ...existing,
        ...updates,
        manually_edited: true,
        manual_overrides: {
          ...(existing.manual_overrides || {}),
          ...Object.fromEntries(Object.keys(updates).map((k) => [k, new Date().toISOString()])),
        },
      },
      persona_updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Add manual strength ────────────────────────────────────────────────────

export async function addManualStrength(
  clientId: string,
  strength: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { data: client } = await db
    .from("clients")
    .select("brand_persona")
    .eq("id", clientId)
    .single();

  if (!client) return { success: false, error: "클라이언트를 찾을 수 없습니다" };

  const existing = (client.brand_persona as BrandPersona) || {};
  const strengths = [...(existing.strengths || []), strength];

  const { error } = await db
    .from("clients")
    .update({
      brand_persona: {
        ...existing,
        strengths,
        manually_edited: true,
        manual_overrides: {
          ...(existing.manual_overrides || {}),
          strengths: new Date().toISOString(),
        },
      },
      persona_updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Remove manual strength ─────────────────────────────────────────────────

export async function removeManualStrength(
  clientId: string,
  index: number,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { data: client } = await db
    .from("clients")
    .select("brand_persona")
    .eq("id", clientId)
    .single();

  if (!client) return { success: false, error: "클라이언트를 찾을 수 없습니다" };

  const existing = (client.brand_persona as BrandPersona) || {};
  const strengths = [...(existing.strengths || [])];
  if (index >= 0 && index < strengths.length) {
    strengths.splice(index, 1);
  }

  const { error } = await db
    .from("clients")
    .update({
      brand_persona: {
        ...existing,
        strengths,
        manually_edited: true,
      },
      persona_updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Regenerate persona (re-run CMO agent) ──────────────────────────────────

export async function regeneratePersona(
  clientId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  // 최신 분석 결과에서 데이터 추출
  const { data: analysis } = await db
    .from("brand_analyses")
    .select("id, basic_info, keyword_analysis, content_strategy, marketing_score, seo_audit, keyword_rankings")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 분석 데이터가 없으면 클라이언트 기본 정보로 폴백 페르소나 생성
  if (!analysis) {
    const { data: clientInfo } = await db
      .from("clients")
      .select("name, industry, website_url, company_name")
      .eq("id", clientId)
      .single();

    if (!clientInfo) {
      return { success: false, error: "클라이언트를 찾을 수 없습니다." };
    }

    // 분석 없이 기본 정보로 간소화된 페르소나 생성
    const basicPersona: BrandPersona = {
      one_liner: `${clientInfo.name} — 고객 맞춤형 마케팅 전략 준비 중`,
      positioning: clientInfo.industry
        ? `${clientInfo.industry} 분야에서 차별화된 서비스를 제공하는 브랜드`
        : "분석 완료 후 포지셔닝이 업데이트됩니다",
      target_audience: "분석 완료 후 자동 업데이트됩니다",
      tone: "친근하고 전문적인 톤",
      strengths: [],
      weaknesses: [],
      content_angles: [],
      recommended_keywords: [],
      generated_at: new Date().toISOString(),
      generated_by: "BASIC_FALLBACK",
      manually_edited: false,
      manual_overrides: {},
    };

    const { error: updateErr } = await db
      .from("clients")
      .update({
        brand_persona: basicPersona,
        persona_updated_at: new Date().toISOString(),
      })
      .eq("id", clientId);

    if (updateErr) return { success: false, error: updateErr.message };
    return { success: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const basicInfo = (analysis.basic_info as any) || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywordAnalysis = (analysis.keyword_analysis as any) || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentStrategy = (analysis.content_strategy as any) || {};
  const scoreBreakdown = contentStrategy.score_breakdown || {};

  try {
    const { runAgent } = await import("@/lib/agent-runner");

    const result = await runAgent({
      agent: "CMO",
      task: "brand_persona",
      context: {
        place_name: basicInfo.name || basicInfo.place_name || "",
        category: basicInfo.category || "",
        category_detail: basicInfo.businessType || "",
        region: basicInfo.region || "",
        address: basicInfo.address || "",
        business_hours: basicInfo.businessHours || "정보 없음",
        facilities: basicInfo.facilities?.join?.(", ") || "정보 없음",
        menu_items: basicInfo.menuItems || "정보 없음",
        parking: basicInfo.parking || "정보 없음",
        reservation: basicInfo.reservation || "정보 없음",
        additional_info: basicInfo.additionalInfo || "",
        review_count: basicInfo.reviewCount || 0,
        rating: basicInfo.rating || "정보 없음",
        positive_keywords: basicInfo.positiveKeywords || keywordAnalysis.positiveKeywords || "정보 없음",
        negative_keywords: basicInfo.negativeKeywords || keywordAnalysis.negativeKeywords || "정보 없음",
        image_analysis: basicInfo.imageAnalysis || "미분석",
        marketing_score: analysis.marketing_score || 0,
        competitor_summary: "재생성 모드 — 기존 경쟁사 데이터 참조",
      },
      clientId,
    });

    if (result.success && result.data) {
      const normalized = normalizePersona(result.data as Record<string, unknown>);
      const synced = syncFlatFromEnhanced(normalized);
      const { error } = await db
        .from("clients")
        .update({
          brand_persona: {
            ...synced,
            persona_version: 2,
            confirmation_status: "pending",
            generated_at: new Date().toISOString(),
            generated_by: "CMO_v2.0_regenerated",
            manually_edited: false,
            manual_overrides: {},
          },
          persona_updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    return { success: false, error: "AI 페르소나 생성 실패: " + (result.raw || "응답 없음").slice(0, 100) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "에이전트 실행 오류: " + msg };
  }
}

// ── Get persona ────────────────────────────────────────────────────────────

export async function getPersona(
  clientId: string,
): Promise<BrandPersona | null> {
  const db = createAdminClient();

  const { data } = await db
    .from("clients")
    .select("brand_persona")
    .eq("id", clientId)
    .single();

  if (!data?.brand_persona) return null;
  return data.brand_persona as BrandPersona;
}

// ── 브랜드 분석 페이지 데이터 조회 ─────────────────────────────────────────

export interface BrandAnalysisPageData {
  client: {
    id: string;
    name: string;
    industry?: string;
    website_url?: string;
    persona_updated_at?: string;
  };
  persona: EnhancedBrandPersona | null;
  analysis: {
    marketing_score?: number;
    basic_info?: Record<string, unknown>;
    score_breakdown?: Record<string, unknown>;
    keyword_analysis?: Record<string, unknown>;
    analysis_result?: Record<string, unknown>;
    content_strategy?: Record<string, unknown>;
    seo_audit?: Record<string, unknown>;
    keyword_rankings?: Record<string, unknown>[];
  } | null;
  activeKeywords: string[];
  // 상담 신청 + CTA 표시용
  analysisId: string | null;
  userRole: string;
  userName: string;
  userPhone: string;
  userEmail: string;
}

export async function getBrandAnalysisPageData(
  clientId: string,
): Promise<BrandAnalysisPageData | null> {
  const db = createAdminClient();

  // 1. clients 테이블: 기본 정보 + 페르소나
  const { data: client } = await db
    .from("clients")
    .select("id, name, industry, website_url, brand_persona, persona_updated_at")
    .eq("id", clientId)
    .single();

  if (!client) return null;

  // 2. brand_analyses 테이블: 최신 완료 분석 1건
  const { data: analysisRows } = await db
    .from("brand_analyses")
    .select("id, basic_info, marketing_score, keyword_analysis, content_strategy, seo_audit, keyword_rankings")
    .eq("client_id", clientId)
    .in("status", ["completed", "converted"])
    .order("analyzed_at", { ascending: false })
    .limit(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysisRow = (analysisRows?.[0] as any) ?? null;

  // 3. keywords 테이블: 활성 키워드 목록
  const { data: kwRows } = await db
    .from("keywords")
    .select("keyword")
    .eq("client_id", clientId)
    .eq("status", "active");

  const activeKeywords = (kwRows ?? []).map((k: { keyword: string }) => k.keyword);

  // content_strategy에서 score_breakdown과 improvements 추출
  const cs = analysisRow?.content_strategy ?? {};

  // improvement_plan 폴백 로직: AI 에이전트 결과 → rule-based improvements
  // 빈 객체/빈 배열이면 rule-based로 폴백
  const rawIp = cs.improvement_plan;
  const isIpMeaningful = rawIp && (
    (Array.isArray(rawIp) && rawIp.length > 0) ||
    (typeof rawIp === "object" && !Array.isArray(rawIp) && Object.keys(rawIp).length > 0) ||
    typeof rawIp === "string"
  );
  const effectiveImprovementPlan = isIpMeaningful ? rawIp : (cs.improvements ?? undefined);

  return {
    client: {
      id: client.id,
      name: client.name,
      industry: client.industry ?? undefined,
      website_url: client.website_url ?? undefined,
      persona_updated_at: client.persona_updated_at ?? undefined,
    },
    persona: (client.brand_persona as EnhancedBrandPersona) ?? null,
    analysis: analysisRow
      ? {
          marketing_score: analysisRow.marketing_score ?? undefined,
          basic_info: analysisRow.basic_info ?? undefined,
          score_breakdown: cs.score_breakdown ?? undefined,
          keyword_analysis: analysisRow.keyword_analysis ?? undefined,
          analysis_result: {
            improvement_plan: effectiveImprovementPlan,
            seo_comments: cs.seo_comments ?? cs.brand_analysis ?? undefined,
            competitor_analysis: cs.competitor_analysis ?? undefined,
          },
          content_strategy: cs,
          seo_audit: analysisRow.seo_audit ?? undefined,
          keyword_rankings: analysisRow.keyword_rankings ?? undefined,
        }
      : null,
    activeKeywords,
    analysisId: analysisRow?.id ?? null,
    // user 정보는 page.tsx에서 주입
    userRole: "",
    userName: "",
    userPhone: "",
    userEmail: "",
  };
}

// ── 키워드 활성화/비활성화 ──────────────────────────────────────────────────

export async function activateAnalysisKeyword(
  clientId: string,
  keyword: string,
  metadata?: { monthlySearch?: number; competition?: string; intent?: string },
): Promise<{ success: boolean; keywordId?: string; error?: string }> {
  const db = createAdminClient();

  // 이미 존재하는 키워드인지 확인
  const { data: existing } = await db
    .from("keywords")
    .select("id, status")
    .eq("client_id", clientId)
    .eq("keyword", keyword.trim())
    .maybeSingle();

  if (existing) {
    // 이미 active면 그대로 반환
    if (existing.status === "active") {
      return { success: true, keywordId: existing.id };
    }
    // paused/archived 등이면 active로 변경
    const { error } = await db
      .from("keywords")
      .update({
        status: "active",
        is_tracking: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
    return { success: true, keywordId: existing.id };
  }

  // 새로 INSERT
  const { data: inserted, error } = await db
    .from("keywords")
    .insert({
      client_id: clientId,
      keyword: keyword.trim(),
      status: "active",
      source: "analysis",
      is_tracking: true,
      metadata: {
        search_intent: metadata?.intent || null,
        competition_estimate: metadata?.competition || null,
        generated_by: "brand_analysis_activation",
        generated_at: new Date().toISOString(),
      },
      monthly_search_total: metadata?.monthlySearch || 0,
      competition_level: metadata?.competition || "medium",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // 질문 자동 생성 트리거 (비동기, 실패해도 활성화는 유지)
  if (inserted?.id) {
    import("./question-actions").then(({ generateQuestions }) => {
      generateQuestions(inserted.id, clientId).catch((err) => {
        console.warn("[activateAnalysisKeyword] 질문 생성 실패:", err);
      });
    });
  }

  return { success: true, keywordId: inserted?.id };
}

export async function deactivateAnalysisKeyword(
  clientId: string,
  keyword: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { error } = await db
    .from("keywords")
    .update({
      status: "paused",
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", clientId)
    .eq("keyword", keyword.trim())
    .eq("status", "active");

  if (error) return { success: false, error: error.message };
  return { success: true };
}
