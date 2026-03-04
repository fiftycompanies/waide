/**
 * content-qc-v2.ts
 * QC v2: 상세 피드백 + AEO 체크 + 벤치마크 비교
 *
 * 8항목 100점 채점:
 *   글자수(15) + 해요체(10) + 키워드SEO(15) + H2구조(10)
 *   + 이미지(10) + 금지표현(10) + AEO최적화(15) + 자연스러움(10) + 메타디스크립션(5)
 *
 * FAIL: 70점 미만 또는 해요체 60% 미만
 *
 * ⚠️ createAdminClient() 사용
 * ⚠️ contents.metadata 업데이트 시 기존 데이터 보존 필수
 */

import { createAdminClient } from "@/lib/supabase/service";
import { runAgent } from "@/lib/agent-runner";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface QcItemScore {
  name: string;
  score: number;
  maxScore: number;
  detail: string;
  status: "pass" | "warn" | "fail";
}

export interface QcResult {
  score: number;
  pass: boolean;
  items: QcItemScore[];
  duplication_check: Record<string, unknown> | null;
  persona_check: Record<string, unknown> | null;
  benchmark_comparison: Record<string, unknown> | null;
  top_issues: string[];
  verdict: string;
  rewrite_needed: boolean;
  rewrite_focus: string[];
}

// ═══════════════════════════════════════════
// QC v2 실행
// ═══════════════════════════════════════════

export async function runQcV2(params: {
  contentId: string;
  clientId: string;
  title: string;
  body: string;
  metaDescription?: string;
  keyword: string;
}): Promise<QcResult> {
  const db = createAdminClient();

  // 1. 브랜드 페르소나 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client } = await (db as any)
    .from("clients")
    .select("brand_persona")
    .eq("id", params.clientId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persona: Record<string, any> = client?.brand_persona || {};

  // 2. 벤치마크 조회 (있으면)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: benchmark } = await (db as any)
    .from("content_benchmarks")
    .select("benchmark_data")
    .eq("keyword", params.keyword)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  // 3. 기존 발행 글 조회 (중복 체크용)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: previousContents } = await (db as any)
    .from("contents")
    .select("title, body")
    .eq("client_id", params.clientId)
    .neq("id", params.contentId) // 자기 자신 제외
    .order("created_at", { ascending: false })
    .limit(5);

  const prevSummary = ((previousContents || []) as Array<{ title: string; body: string }>).map((c) => ({
    title: c.title,
    h2_headings: extractH2s(c.body),
    body_preview: c.body?.substring(0, 500) || "",
  }));

  // 4. QC v2 에이전트 실행
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const benchmarkData: Record<string, any> = benchmark?.benchmark_data?.pattern_analysis || {};

  const result = await runAgent({
    agent: "QC",
    task: "qc_review_v2",
    context: {
      title: params.title,
      body: params.body,
      meta_description: params.metaDescription || "",
      keyword: params.keyword,
      tone: persona.tone || "",
      avoid_angles: persona.avoid_angles || [],
      benchmark_avg_length: benchmarkData.length?.avg || null,
      benchmark_avg_density: benchmarkData.keyword_usage?.density_range || null,
      benchmark_avg_h2: benchmarkData.structure?.avg_h2_count || null,
      benchmark_avg_images: benchmarkData.images?.avg_count || null,
      previous_contents: prevSummary,
    },
    clientId: params.clientId,
  });

  // 5. 결과를 contents.metadata에 저장 — 기존 데이터 보존
  if (result.success && result.data) {
    try {
      // 기존 metadata 먼저 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (db as any)
        .from("contents")
        .select("metadata")
        .eq("id", params.contentId)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingMetadata: Record<string, any> = existing?.metadata || {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .from("contents")
        .update({
          metadata: {
            ...existingMetadata,
            qc_version: "v2",
            qc_score: result.data.score ?? result.data.total_score ?? 0,
            qc_pass: result.data.pass ?? false,
            qc_result: result.data,
            last_qc_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.contentId);
    } catch (dbErr) {
      console.error("[content-qc-v2] metadata 저장 실패:", dbErr);
    }
  }

  // 결과 정규화
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (result.data || {}) as Record<string, any>;

  return {
    score: d.score ?? d.total_score ?? 0,
    pass: d.pass ?? false,
    items: Array.isArray(d.items) ? d.items : [],
    duplication_check: d.duplication_check || null,
    persona_check: d.persona_check || null,
    benchmark_comparison: d.benchmark_comparison || null,
    top_issues: Array.isArray(d.top_issues) ? d.top_issues : (Array.isArray(d.critical_issues) ? d.critical_issues : []),
    verdict: d.verdict || d.overall_feedback || "",
    rewrite_needed: d.rewrite_needed ?? !d.pass,
    rewrite_focus: Array.isArray(d.rewrite_focus) ? d.rewrite_focus : [],
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
