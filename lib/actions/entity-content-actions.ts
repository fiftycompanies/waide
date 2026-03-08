"use server";

/**
 * entity-content-actions.ts
 * Phase 4+5: 엔티티 정의형 콘텐츠 생성
 *
 * - generateEntityContent: 엔티티 정의 콘텐츠 생성 (content_type='aeo_entity')
 * - 온보딩 완료 시 자동 생성 1건 = 무료 (포인트 차감 안 함)
 * - 관리자 실행 = 무료, 고객 = 포인트 차감
 *
 * // [향후 홈페이지 자동 생성 데이터 매핑]
 * // brand_analyses → 메인 페이지 히어로 + About
 * // brand_personas → 브랜드 소개 + 톤앤매너
 * // 소스 라이브러리 → 갤러리 + 이미지
 * // 엔티티 콘텐츠 → 서비스 소개 + FAQ
 * // SEO/AEO 콘텐츠 → 블로그 포스트 자동 연동
 * // keywords → SEO 메타데이터 + Schema markup
 */

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { loadPromptTemplate, fillPromptTemplate } from "@/lib/prompt-loader";

interface EntityContentResult {
  success: boolean;
  contentId?: string;
  error?: string;
}

/**
 * 엔티티 정의 콘텐츠 생성
 *
 * @param clientId - 고객 ID
 * @param isOnboarding - true면 무료 (온보딩 자동 생성)
 */
export async function generateEntityContent(
  clientId: string,
  isOnboarding: boolean = false
): Promise<EntityContentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("[Entity Content] ANTHROPIC_API_KEY not set, skipping");
    return { success: false, error: "ANTHROPIC_API_KEY 미설정" };
  }

  const db = createAdminClient();

  try {
    // 클라이언트 정보 조회
    const { data: client } = await db
      .from("clients")
      .select("name, brand_persona, category, metadata")
      .eq("id", clientId)
      .single();

    if (!client) {
      return { success: false, error: "고객 정보를 찾을 수 없습니다" };
    }

    // 최신 분석 결과 조회 (주소/업종 등)
    const { data: analysis } = await db
      .from("brand_analyses")
      .select("analysis_result, raw_data")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const brandName = client.name || "브랜드";
    const persona = client.brand_persona || {};
    const rawData = analysis?.raw_data || {};
    const analysisResult = analysis?.analysis_result || {};

    const category = persona.category || client.category || rawData.category || "업체";
    const location = rawData.address || persona.location || "위치 정보 없음";
    const strengths = persona.strengths?.join(", ") || analysisResult.strengths?.join(", ") || "정보 없음";
    const appeal = persona.appeal_point || persona.differentiator || "정보 없음";
    const target = persona.target_customer || "일반 고객";

    // 엔티티 프롬프트 (DB 로딩 + fallback)
    const template = await loadPromptTemplate("aeo_entity_writer");
    const prompt = fillPromptTemplate(template, {
      brand_name: brandName,
      category,
      location,
      strengths,
      appeal,
      target,
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return { success: false, error: `AI API 오류: ${response.status}` };
    }

    const data = await response.json();
    const body = data.content?.find((b: { type: string }) => b.type === "text")?.text || "";

    if (!body || body.length < 100) {
      return { success: false, error: "생성된 콘텐츠가 너무 짧습니다" };
    }

    const title = `${brandName} — ${category} 엔티티 정보`;
    const now = new Date().toISOString();

    // contents INSERT (aeo_entity)
    const { data: saved, error: insertErr } = await db
      .from("contents")
      .insert({
        client_id: clientId,
        keyword_id: null,
        account_id: null,
        title,
        body,
        meta_description: `${brandName}의 핵심 정보, 특징, FAQ를 담은 엔티티 정의 콘텐츠`,
        content_type: "aeo_entity",
        generated_by: "ai",
        publish_status: isOnboarding ? "approved" : "draft",
        word_count: body.length,
        question_id: null,
        is_active: true,
        is_tracking: false,
        metadata: {
          version: "entity_v1",
          is_onboarding: isOnboarding,
          generated_at: now,
        },
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertErr || !saved) {
      return { success: false, error: `저장 실패: ${insertErr?.message}` };
    }

    revalidatePath("/contents");
    return { success: true, contentId: saved.id };
  } catch (error) {
    console.error("[Entity Content] generation error:", error);
    return { success: false, error: String(error) };
  }
}
