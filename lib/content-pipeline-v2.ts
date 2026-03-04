/**
 * content-pipeline-v2.ts
 * v2 콘텐츠 생성 파이프라인
 *
 * 벤치마크 + 페르소나 + 중복회피 + AEO 기반 콘텐츠 생성
 *
 * ⚠️ createAdminClient() 사용
 * ⚠️ 벤치마크가 null이어도 정상 작동 (기본값 폴백)
 */

import { createAdminClient } from "@/lib/supabase/service";
import { runAgent, type AgentResult } from "@/lib/agent-runner";
import { getBenchmark, type BenchmarkData } from "@/lib/content-benchmark";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface ContentCreateParams {
  clientId: string;
  keyword: string;
  keywordId?: string;
  contentType: string; // 'list' | 'review' | 'info' | 'course'
  accountId?: string;
  sourceId?: string; // 소스 라이브러리 ID (content_sources)
}

export interface ContentCreateResult {
  success: boolean;
  data: {
    title: string;
    body: string;
    meta_description: string;
    hashtags: string[];
    self_check: Record<string, unknown>;
    aeo_snippet: string;
  } | null;
  benchmark: BenchmarkData | null;
  agentResult: AgentResult;
}

// ═══════════════════════════════════════════
// v2 콘텐츠 생성
// ═══════════════════════════════════════════

export async function createContentV2(
  params: ContentCreateParams
): Promise<ContentCreateResult> {
  const db = createAdminClient();

  // 1. 클라이언트 정보 + 페르소나 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client } = await (db as any)
    .from("clients")
    .select("brand_persona, name")
    .eq("id", params.clientId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persona: Record<string, any> = client?.brand_persona || {};

  // 2. 벤치마크 조회 (캐시 또는 신규 생성)
  //    null이어도 진행 — 기본값 사용
  let benchmark: BenchmarkData | null = null;
  try {
    benchmark = await getBenchmark(params.keyword);
  } catch (error) {
    console.warn("[content-pipeline-v2] 벤치마크 조회 실패, 기본값 사용:", error);
  }

  // 3. 기존 발행 글 조회 (중복 회피용)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: previousContents } = await (db as any)
    .from("contents")
    .select("title, body, created_at")
    .eq("client_id", params.clientId)
    .eq("keyword_id", params.keywordId || "")
    .order("created_at", { ascending: false })
    .limit(3);

  const prevSummary = ((previousContents || []) as Array<{ title: string; body: string; created_at: string }>).map((c) => ({
    title: c.title,
    h2_headings: extractH2s(c.body),
    published_at: c.created_at,
  }));

  // 4. 소스 자료 (있으면)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sourceMaterial: Record<string, unknown> | null = null;
  if (params.sourceId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: source } = await (db as any)
      .from("content_sources")
      .select("*")
      .eq("id", params.sourceId)
      .maybeSingle();
    sourceMaterial = source;
  }

  // 5. 플레이스 데이터 조회 (최신 분석에서)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: latestAnalysis } = await (db as any)
    .from("brand_analyses")
    .select("raw_data")
    .eq("client_id", params.clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placeData: Record<string, any> = latestAnalysis?.raw_data || {};

  // 6. COPYWRITER v2 실행
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brief: Record<string, any> = benchmark?.copywriter_brief || {};

  const agentResult = await runAgent({
    agent: "COPYWRITER",
    task: "content_create_v2",
    context: {
      keyword: params.keyword,
      content_type: params.contentType,
      place_name: client?.name || "",
      // 매장 정보
      address: placeData.address || "",
      business_hours: placeData.businessHours || "",
      menu_items: placeData.menuItems || "",
      facilities: placeData.facilities || "",
      parking: placeData.parking || "",
      reservation: placeData.reservation || "",
      // 페르소나
      one_liner: persona.one_liner || "",
      positioning: persona.positioning || "",
      primary_target: persona.primary_target || "",
      strengths: persona.strengths || [],
      tone: persona.tone || "친근한",
      content_angles: persona.content_angles || [],
      avoid_angles: persona.avoid_angles || [],
      // 벤치마크 브리프 (없으면 기본값)
      recommended_title: brief.recommended_title || "",
      recommended_length: brief.recommended_length || "2500~3000자",
      recommended_structure: brief.recommended_structure || [],
      keyword_target: brief.keyword_target || "10~14회 (밀도 2%)",
      image_target: brief.image_target || "5~7장",
      must_include: brief.must_include || [],
      must_avoid: brief.must_avoid || [],
      differentiation_angle: brief.differentiation_angle || "",
      // 중복 회피
      previous_contents: prevSummary,
      // 소스
      source_materials: sourceMaterial,
    },
    clientId: params.clientId,
  });

  if (!agentResult.success || !agentResult.data) {
    return {
      success: false,
      data: null,
      benchmark,
      agentResult,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = agentResult.data as Record<string, any>;

  return {
    success: true,
    data: {
      title: d.title || "",
      body: d.body || d.content || "",
      meta_description: d.meta_description || "",
      hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
      self_check: d.self_check || {},
      aeo_snippet: d.aeo_snippet || "",
    },
    benchmark,
    agentResult,
  };
}

// ═══════════════════════════════════════════
// 헬퍼
// ═══════════════════════════════════════════

function extractH2s(body: string | null): string[] {
  if (!body) return [];
  const matches = body.match(/^##\s+(.+)$/gm);
  return matches ? matches.map((m) => m.replace(/^##\s+/, "")) : [];
}
