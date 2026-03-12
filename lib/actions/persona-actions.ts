"use server";

import { createAdminClient } from "@/lib/supabase/service";

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
  // meta
  generated_at?: string;
  generated_by?: string;
  manually_edited?: boolean;
  manual_overrides?: Record<string, unknown>;
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
    .select("id, basic_info, keyword_analysis, score_breakdown, marketing_score, seo_audit, keyword_rankings, analysis_result")
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
  const scoreBreakdown = (analysis.score_breakdown as any) || {};

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
      const { error } = await db
        .from("clients")
        .update({
          brand_persona: {
            ...result.data,
            generated_at: new Date().toISOString(),
            generated_by: "CMO_v1.0_regenerated",
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
