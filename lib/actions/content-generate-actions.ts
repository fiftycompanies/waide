"use server";

/**
 * content-generate-actions.ts
 * v2 콘텐츠 생성 통합 함수 — Job 기반 파이프라인
 *
 * 흐름:
 *   1. Job 조회 (CONTENT_CREATE, PENDING)
 *   2. v2 콘텐츠 생성 (벤치마크 + 페르소나 + 중복회피)
 *   3. contents INSERT
 *   4. QC v2 검수
 *   5. FAIL → 재작성 루프 (최대 2회)
 *   6. Job 완료 처리
 *
 * ⚠️ createAdminClient() 사용
 * ⚠️ v2 실패 시 기존 로직 폴백 가능 (에러 전파)
 * ⚠️ ANTHROPIC_API_KEY 없으면 graceful skip
 */

import { createAdminClient } from "@/lib/supabase/service";
import { createContentV2 } from "@/lib/content-pipeline-v2";
import { runQcV2 } from "@/lib/content-qc-v2";
import { runRewriteLoop } from "@/lib/content-rewrite-loop";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface GenerateContentResult {
  success: boolean;
  contentId?: string;
  title?: string;
  qcScore?: number;
  qcPass?: boolean;
  rewrites?: number;
  error?: string;
}

// ═══════════════════════════════════════════
// 콘텐츠 생성 (통합 함수)
// ═══════════════════════════════════════════

export async function generateContentV2(params: {
  clientId: string;
  keyword: string;
  keywordId?: string;
  contentType?: string;
  accountId?: string;
  sourceId?: string;
  jobId?: string; // 연결할 Job ID
}): Promise<GenerateContentResult> {
  const db = createAdminClient();

  // ANTHROPIC_API_KEY 체크
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ANTHROPIC_API_KEY 미설정" };
  }

  // Job 상태 업데이트 (있으면)
  if (params.jobId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .from("jobs")
        .update({
          status: "IN_PROGRESS",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.jobId);
    } catch {
      // Job 업데이트 실패해도 계속 진행
    }
  }

  try {
    // 1. v2 콘텐츠 생성
    const createResult = await createContentV2({
      clientId: params.clientId,
      keyword: params.keyword,
      keywordId: params.keywordId,
      contentType: params.contentType || "list",
      accountId: params.accountId,
      sourceId: params.sourceId,
    });

    if (!createResult.success || !createResult.data) {
      const errorMsg = "v2 콘텐츠 생성 실패";
      await updateJobFailed(db, params.jobId, errorMsg);
      return { success: false, error: errorMsg };
    }

    const content = createResult.data;

    // 2. contents 테이블에 저장
    const wordCount = content.body.replace(/\s+/g, " ").trim().length;
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saved, error: insertErr } = await (db as any)
      .from("contents")
      .insert({
        client_id: params.clientId,
        keyword_id: params.keywordId || null,
        account_id: params.accountId || null,
        title: content.title,
        body: content.body,
        meta_description: content.meta_description,
        content_type: params.contentType || "list",
        generated_by: "ai",
        publish_status: "draft",
        word_count: wordCount,
        tags: content.hashtags,
        is_active: true,
        is_tracking: false,
        metadata: {
          version: "v2",
          self_check: content.self_check,
          aeo_snippet: content.aeo_snippet,
          benchmark_used: !!createResult.benchmark,
          generated_at: now,
        },
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertErr || !saved) {
      const errorMsg = `콘텐츠 저장 실패: ${insertErr?.message ?? "unknown"}`;
      await updateJobFailed(db, params.jobId, errorMsg);
      return { success: false, error: errorMsg };
    }

    const contentId = saved.id;

    // 3. QC v2 검수
    let qcResult;
    try {
      qcResult = await runQcV2({
        contentId,
        clientId: params.clientId,
        title: content.title,
        body: content.body,
        metaDescription: content.meta_description,
        keyword: params.keyword,
      });
    } catch (qcErr) {
      // QC 실패해도 콘텐츠는 이미 저장됨 — draft 상태 유지
      console.error("[generate-content] QC 실패:", qcErr);
      await updateJobDone(db, params.jobId, contentId, null, 0, 0);
      revalidatePath("/ops/contents");
      return {
        success: true,
        contentId,
        title: content.title,
        qcScore: 0,
        qcPass: false,
        rewrites: 0,
      };
    }

    // 4. FAIL이면 재작성 루프
    if (!qcResult.pass) {
      try {
        const loopResult = await runRewriteLoop({
          contentId,
          clientId: params.clientId,
          originalTitle: content.title,
          originalBody: content.body,
          metaDescription: content.meta_description,
          keyword: params.keyword,
          qcResult,
        });

        await updateJobDone(
          db,
          params.jobId,
          contentId,
          loopResult.finalQc,
          loopResult.retries,
          loopResult.finalQc.score
        );

        revalidatePath("/ops/contents");
        return {
          success: true,
          contentId,
          title: loopResult.finalContent.title,
          qcScore: loopResult.finalQc.score,
          qcPass: loopResult.finalQc.pass,
          rewrites: loopResult.retries,
        };
      } catch (rewriteErr) {
        console.error("[generate-content] 재작성 루프 실패:", rewriteErr);
        // 재작성 실패해도 원본 콘텐츠는 유지
      }
    }

    // QC PASS → approved 상태로 업데이트
    if (qcResult.pass) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any)
          .from("contents")
          .update({
            publish_status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", contentId);
      } catch {
        // 상태 업데이트 실패해도 계속
      }
    }

    await updateJobDone(db, params.jobId, contentId, qcResult, 0, qcResult.score);

    revalidatePath("/ops/contents");
    return {
      success: true,
      contentId,
      title: content.title,
      qcScore: qcResult.score,
      qcPass: qcResult.pass,
      rewrites: 0,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "알 수 없는 에러";
    console.error("[generate-content] 파이프라인 실패:", error);
    await updateJobFailed(db, params.jobId, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ═══════════════════════════════════════════
// Job 처리 함수
// ═══════════════════════════════════════════

/**
 * PENDING 상태인 CONTENT_CREATE Job을 처리
 */
export async function processContentJobs(
  clientId?: string
): Promise<{ processed: number; results: GenerateContentResult[] }> {
  const db = createAdminClient();

  // ANTHROPIC_API_KEY 체크
  if (!process.env.ANTHROPIC_API_KEY) {
    return { processed: 0, results: [] };
  }

  // PENDING 상태의 CONTENT_CREATE Job 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("jobs")
    .select("*")
    .eq("job_type", "CONTENT_CREATE")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .limit(5); // 한 번에 최대 5개

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data: jobs, error } = await query;

  if (error || !jobs || jobs.length === 0) {
    return { processed: 0, results: [] };
  }

  const results: GenerateContentResult[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const job of jobs as any[]) {
    const payload = job.input_payload || {};

    const result = await generateContentV2({
      clientId: job.client_id,
      keyword: payload.keyword || "",
      keywordId: payload.keyword_id || null,
      contentType: payload.content_type || "list",
      accountId: payload.account_id || null,
      sourceId: payload.source_id || null,
      jobId: job.id,
    });

    results.push(result);
  }

  revalidatePath("/ops/jobs");
  return { processed: results.length, results };
}

// ═══════════════════════════════════════════
// 헬퍼: Job 상태 업데이트
// ═══════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateJobFailed(db: any, jobId: string | undefined, errorMsg: string) {
  if (!jobId) return;
  try {
    await db
      .from("jobs")
      .update({
        status: "FAILED",
        error_message: errorMsg,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch {
    // Job 업데이트 실패는 파이프라인을 블로킹하지 않음
  }
}

async function updateJobDone(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  jobId: string | undefined,
  contentId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qcResult: any,
  rewrites: number,
  qcScore: number
) {
  if (!jobId) return;
  try {
    await db
      .from("jobs")
      .update({
        status: "DONE",
        output_payload: { content_id: contentId, rewrites },
        quality_gate_result: qcResult?.pass ? "PASS" : "FAIL",
        quality_gate_score: qcScore,
        quality_gate_notes: qcResult
          ? JSON.stringify({
              verdict: qcResult.verdict,
              top_issues: qcResult.top_issues,
              rewrite_count: rewrites,
            })
          : null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch {
    // Job 업데이트 실패는 파이프라인을 블로킹하지 않음
  }
}
