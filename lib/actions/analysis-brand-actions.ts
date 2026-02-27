"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { parseUrl } from "@/lib/place-analyzer";
import { runFullAnalysis } from "@/lib/place-analyzer";
import { revalidatePath } from "next/cache";

// ── Types ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BrandAnalysisRow {
  id: string;
  place_id: string | null;
  input_url: string;
  url_type: string | null;
  status: string;
  basic_info: Record<string, unknown> | null;
  menu_analysis: Record<string, unknown> | null;
  review_analysis: Record<string, unknown> | null;
  keyword_analysis: Record<string, unknown> | null;
  content_strategy: Record<string, unknown> | null;
  marketing_score: number | null;
  customer_edits: Record<string, unknown> | null;
  client_id: string | null;
  view_count: number;
  analyzed_at: string | null;
  created_at: string;
}

// ── 1. getBrandAnalysis ───────────────────────────────────────────────────────

/** client_id로 연결된 brand_analyses 조회 */
export async function getBrandAnalysis(
  clientId: string
): Promise<BrandAnalysisRow | null> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("brand_analyses")
      .select("*")
      .eq("client_id", clientId)
      .in("status", ["completed", "converted"])
      .order("analyzed_at", { ascending: false })
      .limit(1);

    return (data?.[0] as BrandAnalysisRow) ?? null;
  } catch {
    return null;
  }
}

// ── 2. linkAnalysisToBrand ────────────────────────────────────────────────────

/** 분석 결과를 브랜드(client)에 연결 */
export async function linkAnalysisToBrand(
  analysisId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    const { error } = await db
      .from("brand_analyses")
      .update({
        client_id: clientId,
        status: "converted",
      })
      .eq("id", analysisId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/brands");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── 3. searchAnalysisByUrl ────────────────────────────────────────────────────

/** URL로 기존 분석 결과 검색 (place_id 기반) */
export async function searchAnalysisByUrl(
  url: string
): Promise<{ analysis: BrandAnalysisRow | null; placeId: string | null }> {
  try {
    const parsed = await parseUrl(url);
    if (!parsed.placeId) return { analysis: null, placeId: null };

    const db = createAdminClient();
    const { data } = await db
      .from("brand_analyses")
      .select("*")
      .eq("place_id", parsed.placeId)
      .in("status", ["completed", "converted"])
      .order("analyzed_at", { ascending: false })
      .limit(1);

    return {
      analysis: (data?.[0] as BrandAnalysisRow) ?? null,
      placeId: parsed.placeId,
    };
  } catch {
    return { analysis: null, placeId: null };
  }
}

// ── 4. createBrandFromAnalysis ────────────────────────────────────────────────

/** 분석 결과 기반으로 브랜드(client + brand_persona) 자동 생성 + 연결 */
export async function createBrandFromAnalysis(
  analysisId: string,
  workspaceId: string,
  overrides?: { name?: string; clientType?: string; parentId?: string | null }
): Promise<{ success: boolean; clientId?: string; error?: string }> {
  try {
    const db = createAdminClient();
    const now = new Date().toISOString();

    // 분석 결과 조회
    const { data: analysis, error: aErr } = await db
      .from("brand_analyses")
      .select("*")
      .eq("id", analysisId)
      .single();

    if (aErr || !analysis) return { success: false, error: "분석 결과를 찾을 수 없습니다." };

    const bi = (analysis.basic_info ?? {}) as Record<string, unknown>;
    const cs = (analysis.content_strategy ?? {}) as Record<string, unknown>;
    const ba = (cs.brand_analysis ?? {}) as Record<string, unknown>;
    const tone = (ba.tone ?? {}) as Record<string, unknown>;

    const brandName = overrides?.name || (bi.name as string) || "새 브랜드";

    // Step 1: clients INSERT
    const { data: client, error: cErr } = await db
      .from("clients")
      .insert({
        workspace_id: workspaceId,
        name: brandName,
        company_name: brandName,
        status: "active",
        is_active: true,
        website_url: (bi.homepage_url as string) || null,
        industry: (bi.category as string) || null,
        client_type: overrides?.clientType ?? "company",
        parent_id: overrides?.parentId ?? null,
        updated_at: now,
      })
      .select("id")
      .single();

    if (cErr || !client) return { success: false, error: cErr?.message ?? "클라이언트 생성 실패" };

    // Step 2: brand_personas INSERT
    const toneVoice = (tone.style as string) ? [tone.style as string] : [];
    const personality = tone.personality as string;
    if (personality) toneVoice.push(personality);
    const examplePhrases = (tone.example_phrases as string[]) ?? [];

    const targetAudience = ba.target_audience as Record<string, unknown> | undefined;
    const usp = (ba.usp as string[]) ?? [];

    const { error: pErr } = await db
      .from("brand_personas")
      .insert({
        workspace_id: workspaceId,
        client_id: client.id,
        name: brandName,
        description: `AI 분석 기반 자동 생성 (마케팅 점수: ${analysis.marketing_score ?? "?"}점)`,
        tone_voice_settings: {
          toneVoice,
          keywords: examplePhrases.slice(0, 5),
          formality: 3,
          humor: 2,
          enthusiasm: 3,
          empathy: 3,
        },
        target_audience: targetAudience
          ? `${targetAudience.primary ?? ""} / ${targetAudience.secondary ?? ""}`
          : null,
        brand_values: usp.slice(0, 5),
        base_prompt_instruction: `브랜드: ${brandName}. USP: ${usp.join(", ")}. 톤: ${toneVoice.join(", ")}`,
        is_active: true,
        updated_at: now,
      });

    if (pErr) {
      // Rollback client
      await db.from("clients").delete().eq("id", client.id);
      return { success: false, error: pErr.message };
    }

    // Step 3: brand_analyses에 client_id 연결 + status → converted
    await db
      .from("brand_analyses")
      .update({ client_id: client.id, status: "converted" })
      .eq("id", analysisId);

    revalidatePath("/brands");
    revalidatePath("/dashboard");
    return { success: true, clientId: client.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── 5. runBrandAnalysis ───────────────────────────────────────────────────────

/** 브랜드에서 직접 분석 실행 + 자동 연결 */
export async function runBrandAnalysis(
  clientId: string,
  url: string
): Promise<{ success: boolean; analysisId?: string; error?: string }> {
  try {
    const db = createAdminClient();

    // 신규 레코드 생성
    const { data, error } = await db
      .from("brand_analyses")
      .insert({
        input_url: url,
        client_id: clientId,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    // 비동기 분석 시작
    const analysisId = data.id;
    setTimeout(() => {
      runFullAnalysis(analysisId).catch((err) => {
        console.error("Brand analysis failed:", err);
      });
    }, 10);

    return { success: true, analysisId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── 6. refreshBrandAnalysis ───────────────────────────────────────────────────

/** 재분석 (기존 삭제 → 새로 실행) */
export async function refreshBrandAnalysis(
  analysisId: string
): Promise<{ success: boolean; newAnalysisId?: string; error?: string }> {
  try {
    const db = createAdminClient();

    // 기존 분석 조회
    const { data: old } = await db
      .from("brand_analyses")
      .select("input_url, client_id")
      .eq("id", analysisId)
      .single();

    if (!old) return { success: false, error: "분석 결과를 찾을 수 없습니다." };

    // 기존 삭제
    await db.from("brand_analyses").delete().eq("id", analysisId);

    // 새 레코드 생성
    const { data: newRec, error } = await db
      .from("brand_analyses")
      .insert({
        input_url: old.input_url,
        client_id: old.client_id,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    // 비동기 분석 시작
    setTimeout(() => {
      runFullAnalysis(newRec.id).catch((err) => {
        console.error("Refresh analysis failed:", err);
      });
    }, 10);

    revalidatePath("/brands");
    return { success: true, newAnalysisId: newRec.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── 7. getBrandAnalysisKpi ────────────────────────────────────────────────────

/** 대시보드 KPI용 분석 요약 데이터 */
export interface ScoreArea {
  score: number;
  max: number;
  details?: string;
}

export interface BrandAnalysisKpi {
  hasAnalysis: boolean;
  marketingScore: number | null;
  totalKeywords: number;
  topKeywords: Array<{ keyword: string; monthlySearch?: number; priority: string }>;
  visitorReviews: number;
  blogReviews: number;
  topSellingPoint: string | null;
  postingFrequency: string | null;
  contentTypes: string[];
  mainKeyword: string | null;
  scoreBreakdown: Record<string, ScoreArea>;
}

export async function getBrandAnalysisKpi(
  clientId?: string
): Promise<BrandAnalysisKpi> {
  const empty: BrandAnalysisKpi = {
    hasAnalysis: false,
    marketingScore: null,
    totalKeywords: 0,
    topKeywords: [],
    visitorReviews: 0,
    blogReviews: 0,
    topSellingPoint: null,
    postingFrequency: null,
    contentTypes: [],
    mainKeyword: null,
    scoreBreakdown: {},
  };

  if (!clientId) return empty;

  try {
    const analysis = await getBrandAnalysis(clientId);
    if (!analysis) return empty;

    const bi = (analysis.basic_info ?? {}) as Record<string, unknown>;
    const ka = (analysis.keyword_analysis ?? {}) as Record<string, unknown>;
    const ra = (analysis.review_analysis ?? {}) as Record<string, unknown>;
    const cs = (analysis.content_strategy ?? {}) as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keywords = (ka.keywords ?? []) as any[];
    const sellingPoints = (ra.selling_points ?? []) as string[];

    const rawBreakdown = (cs.score_breakdown ?? {}) as Record<string, { score: number; max?: number; details?: string; detail?: string }>;
    const scoreBreakdown: Record<string, ScoreArea> = {};
    for (const [k, v] of Object.entries(rawBreakdown)) {
      scoreBreakdown[k] = { score: v.score, max: v.max ?? 25, details: v.details ?? v.detail };
    }

    return {
      hasAnalysis: true,
      marketingScore: analysis.marketing_score,
      totalKeywords: keywords.length,
      topKeywords: keywords.slice(0, 5).map((k) => ({
        keyword: k.keyword,
        monthlySearch: k.monthlySearch,
        priority: k.priority,
      })),
      visitorReviews: (bi.visitor_reviews as number) ?? 0,
      blogReviews: (bi.blog_reviews as number) ?? 0,
      topSellingPoint: sellingPoints[0] ?? null,
      postingFrequency: (cs.posting_frequency as string) ?? null,
      contentTypes: (cs.recommended_content_types as string[]) ?? [],
      mainKeyword: (ka.main_keyword as string) ?? null,
      scoreBreakdown,
    };
  } catch {
    return empty;
  }
}
