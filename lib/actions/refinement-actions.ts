"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { initializeClientPoints } from "./point-actions";
import { syncFlatFromEnhanced } from "@/lib/utils/persona-compat";
import type { EnhancedBrandPersona, AiInferred, OwnerInput } from "@/lib/actions/persona-actions";

/**
 * 분석 결과 보완 데이터 저장 + 재분석 트리거
 */
export async function refineAnalysis(
  analysisId: string,
  refinement: {
    keywords: string[];
    strengths: string;
    appeal: string;
    target: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();

    // 현재 분석 데이터 가져오기
    const { data: analysis, error: fetchErr } = await db
      .from("brand_analyses")
      .select("*")
      .eq("id", analysisId)
      .single();

    if (fetchErr || !analysis) {
      return { success: false, error: "분석 데이터를 찾을 수 없습니다." };
    }

    // 보완 데이터 저장
    const currentCount = (analysis.refinement_count as number) ?? 0;
    await db
      .from("brand_analyses")
      .update({
        refined_keywords: refinement.keywords,
        refined_strengths: refinement.strengths || null,
        refined_appeal: refinement.appeal || null,
        refined_target: refinement.target || null,
        refinement_count: currentCount + 1,
        last_refined_at: new Date().toISOString(),
        status: "analyzing",
      })
      .eq("id", analysisId);

    // 재분석 실행 (비동기) — 보완 데이터를 runFullAnalysis에 전달
    const refinedPayload = {
      keywords: refinement.keywords,
      strengths: refinement.strengths || undefined,
      appeal: refinement.appeal || undefined,
      target: refinement.target || undefined,
    };
    try {
      const { runFullAnalysis } = await import("@/lib/place-analyzer");
      // runFullAnalysis를 비동기로 실행하되, 이 요청에서는 즉시 응답
      runFullAnalysis(analysisId, refinedPayload).catch(async (err) => {
        console.error("[refineAnalysis] 재분석 실패:", err);
        // 실패 시 status를 failed로 변경 — 기존 basic_info 보존
        const { data: existing } = await db.from("brand_analyses").select("basic_info").eq("id", analysisId).single();
        const existingInfo = (existing?.basic_info && typeof existing.basic_info === "object") ? existing.basic_info : {};
        db.from("brand_analyses")
          .update({ status: "failed", basic_info: { ...existingInfo, error: String(err) } })
          .eq("id", analysisId);
      });
    } catch (err) {
      console.error("[refineAnalysis] 재분석 모듈 로드 실패:", err);
      // 재분석 실패해도 보완 데이터는 저장됨 — status를 failed로 (기존 basic_info 보존)
      const { data: existing } = await db.from("brand_analyses").select("basic_info").eq("id", analysisId).single();
      const existingInfo = (existing?.basic_info && typeof existing.basic_info === "object") ? existing.basic_info : {};
      await db
        .from("brand_analyses")
        .update({ status: "failed", basic_info: { ...existingInfo, error: String(err) } })
        .eq("id", analysisId);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * 분석 결과 → 프로젝트(클라이언트) 자동 생성
 * 1. clients INSERT
 * 2. brand_analyses UPDATE (client_id 연결)
 * 3. brand_persona JSONB 저장
 * 4. keywords INSERT × N
 * 5. users UPDATE (client_id 연결)
 */
export async function applyAnalysisToProject(
  analysisId: string,
  userId: string,
  overrides?: {
    keywords?: string[];
    strengths?: string;
    appeal?: string;
    target?: string;
    // v2 확장
    aiInferred?: AiInferred;
    ownerInput?: OwnerInput;
  }
): Promise<{ success: boolean; clientId?: string; error?: string }> {
  try {
    const db = createAdminClient();

    // 분석 데이터 가져오기
    const { data: analysis, error: fetchErr } = await db
      .from("brand_analyses")
      .select("*")
      .eq("id", analysisId)
      .single();

    if (fetchErr || !analysis) {
      return { success: false, error: "분석 데이터를 찾을 수 없습니다." };
    }

    // 이미 프로젝트가 생성된 경우
    if (analysis.client_id) {
      return { success: false, error: "이미 프로젝트가 생성된 분석입니다." };
    }

    const bi = (analysis.basic_info ?? {}) as Record<string, unknown>;
    const ka = (analysis.keyword_analysis ?? {}) as Record<string, unknown>;
    const ra = (analysis.review_analysis ?? {}) as Record<string, unknown>;
    const ar = (analysis.analysis_result ?? {}) as Record<string, unknown>;

    // 워크스페이스 ID 조회
    const { data: ws } = await db
      .from("workspaces")
      .select("id")
      .limit(1)
      .single();

    if (!ws) {
      return { success: false, error: "워크스페이스를 찾을 수 없습니다." };
    }

    const now = new Date().toISOString();
    const placeName = (bi.name as string) || "새 브랜드";

    // 1. clients INSERT
    const { data: client, error: clientErr } = await db
      .from("clients")
      .insert({
        workspace_id: ws.id,
        name: placeName,
        company_name: placeName,
        website_url: (bi.homepage_url as string) || null,
        client_type: "company",
        status: "active",
        is_active: true,
        onboarding_status: "completed",
        updated_at: now,
      })
      .select("id")
      .single();

    if (clientErr || !client) {
      return { success: false, error: `클라이언트 생성 실패: ${clientErr?.message}` };
    }

    const clientId = client.id as string;

    // 2. brand_analyses UPDATE (client_id 연결)
    await db
      .from("brand_analyses")
      .update({ client_id: clientId })
      .eq("id", analysisId);

    // 3. brand_persona JSONB 저장 (clients.brand_persona 컬럼)
    const refinedStrengths = overrides?.strengths || (analysis.refined_strengths as string) || "";
    const refinedAppeal = overrides?.appeal || (analysis.refined_appeal as string) || "";
    const refinedTarget = overrides?.target || (analysis.refined_target as string) || "";

    const sellingPoints = (ra.selling_points as string[]) || [];
    const usp = (ra.usp as string[]) || [];
    const persona = (ar.brand_persona as Record<string, unknown>) || {};

    // v2 Enhanced Persona 구성
    const enhancedPersona: EnhancedBrandPersona = {
      ...persona,
      one_liner: (persona.one_liner as string) || `${placeName} - ${(bi.category as string) || "로컬 비즈니스"}`,
      strengths: sellingPoints.length > 0 ? sellingPoints : (refinedStrengths ? [refinedStrengths] : []),
      usp: usp.length > 0 ? usp : [],
      target_customer: refinedTarget || (persona.target_customer as string) || "",
      appeal_point: refinedAppeal || (persona.appeal_point as string) || "",
      category: (bi.category as string) || "",
      region: (bi.region as string) || "",
      updated_at: now,
      // v2 구조
      ai_inferred: overrides?.aiInferred || (persona as Record<string, unknown>).ai_inferred as AiInferred || undefined,
      owner_input: overrides?.ownerInput || undefined,
      persona_version: 2,
      confirmation_status: overrides?.aiInferred ? "confirmed" : "pending",
      last_confirmed_at: overrides?.aiInferred ? now : undefined,
    };

    // flat 필드 동기화
    const brandPersona = syncFlatFromEnhanced(enhancedPersona);

    await db
      .from("clients")
      .update({
        brand_persona: brandPersona,
        persona_updated_at: now,
      })
      .eq("id", clientId);

    // 4. keywords INSERT × N
    const refinedKws = overrides?.keywords || (analysis.refined_keywords as string[]) || [];
    const analysisKws = (ka.keywords as Array<{ keyword: string; monthlySearch?: number; competition?: string; intent?: string; priority?: string }>) || [];

    // 보완 키워드 우선, 분석 키워드 보조
    const keywordsToInsert: Array<{
      client_id: string;
      keyword: string;
      status: string;
      priority: string;
      source: string;
      metadata: Record<string, unknown>;
    }> = [];

    // 보완 키워드 (사용자가 직접 입력)
    for (const kw of refinedKws) {
      if (!kw.trim()) continue;
      keywordsToInsert.push({
        client_id: clientId,
        keyword: kw.trim(),
        status: "active",
        priority: "high",
        source: "user_refined",
        metadata: { from_analysis: analysisId },
      });
    }

    // 분석 키워드 (AI 추천, 중복 제외)
    const existingKws = new Set(keywordsToInsert.map((k) => k.keyword.toLowerCase()));
    for (const akw of analysisKws.slice(0, 10)) {
      if (existingKws.has(akw.keyword.toLowerCase())) continue;
      keywordsToInsert.push({
        client_id: clientId,
        keyword: akw.keyword,
        status: "active",
        priority: akw.priority === "high" ? "high" : "medium",
        source: "analysis",
        metadata: {
          from_analysis: analysisId,
          monthly_search: akw.monthlySearch,
          competition: akw.competition,
        },
      });
      existingKws.add(akw.keyword.toLowerCase());
    }

    if (keywordsToInsert.length > 0) {
      const { data: insertedKws } = await db
        .from("keywords")
        .insert(keywordsToInsert)
        .select("id");

      // 질문 자동 생성 트리거 (비동기, 실패해도 프로젝트 생성은 유지)
      if (insertedKws && insertedKws.length > 0) {
        import("./question-actions").then(({ generateQuestions }) => {
          for (const kw of insertedKws as Array<{ id: string }>) {
            generateQuestions(kw.id, clientId).catch((err: unknown) => {
              console.warn("[applyAnalysisToProject] 질문 생성 실패:", err);
            });
          }
        });
      }
    }

    // 5. users UPDATE (client_id 연결)
    if (userId) {
      await db
        .from("users")
        .update({
          client_id: clientId,
          role: "client_owner",
          updated_at: now,
        })
        .eq("id", userId);
    }

    // 6. 포인트 초기화 (가입 보너스)
    await initializeClientPoints(clientId);

    // 7. 엔티티 콘텐츠 자동 생성 (1건, 무료 — 포인트 차감 없음)
    import("@/lib/actions/entity-content-actions")
      .then(({ generateEntityContent }) => {
        generateEntityContent(clientId, true).catch((err) =>
          console.error("[applyAnalysisToProject] 엔티티 자동 생성 실패:", err)
        );
      })
      .catch(() => { /* entity-content-actions import 실패 무시 */ });

    revalidatePath("/portal");
    revalidatePath("/dashboard");
    revalidatePath("/ops/clients");

    return { success: true, clientId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * 어드민용: 분석 → 기존 클라이언트에 연결
 */
export async function linkAnalysisToExistingClient(
  analysisId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();

    // 분석 데이터에 client_id 연결
    const { error } = await db
      .from("brand_analyses")
      .update({ client_id: clientId })
      .eq("id", analysisId);

    if (error) return { success: false, error: error.message };

    // clients.onboarding_status 업데이트
    await db
      .from("clients")
      .update({ onboarding_status: "analysis_done" })
      .eq("id", clientId);

    revalidatePath(`/ops/clients/${clientId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
