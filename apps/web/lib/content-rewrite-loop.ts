/**
 * content-rewrite-loop.ts
 * QC FAIL → COPYWRITER 재작성 → QC 재검수 루프
 *
 * 최대 2회 재작성
 * 2회 후에도 FAIL이면 수동 검토 플래그 (publish_status: 'review')
 *
 * ⚠️ createAdminClient() 사용
 * ⚠️ contents.metadata 업데이트 시 기존 데이터 보존 필수
 * ⚠️ content_notes 테이블 없음 — metadata 내 rewrite_history에 기록
 */

import { createAdminClient } from "@/lib/supabase/service";
import { runAgent } from "@/lib/agent-runner";
import { runQcV2, type QcResult } from "@/lib/content-qc-v2";

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

const MAX_RETRIES = 2;

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface RewriteLoopResult {
  finalContent: {
    title: string;
    body: string;
  };
  finalQc: QcResult;
  retries: number;
}

// ═══════════════════════════════════════════
// 재작성 루프
// ═══════════════════════════════════════════

export async function runRewriteLoop(params: {
  contentId: string;
  clientId: string;
  originalTitle: string;
  originalBody: string;
  metaDescription: string;
  keyword: string;
  qcResult: QcResult;
}): Promise<RewriteLoopResult> {
  const db = createAdminClient();

  let currentTitle = params.originalTitle;
  let currentBody = params.originalBody;
  const currentMeta = params.metaDescription;
  let currentQc = params.qcResult;
  let retries = 0;

  // 브랜드 페르소나 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client } = await (db as any)
    .from("clients")
    .select("brand_persona")
    .eq("id", params.clientId)
    .single();

  while (!currentQc.pass && retries < MAX_RETRIES) {
    retries++;

    // 1. COPYWRITER 재작성 요청
    let rewriteResult;
    try {
      rewriteResult = await runAgent({
        agent: "COPYWRITER",
        task: "content_rewrite",
        context: {
          original_title: currentTitle,
          keyword: params.keyword,
          original_content: `# ${currentTitle}\n\n${currentBody}`,
          qc_score: currentQc.score,
          qc_feedback: currentQc.verdict,
          qc_item_scores: currentQc.items,
          top_issues: currentQc.top_issues,
          improvement_items: currentQc.rewrite_focus,
          tone: client?.brand_persona?.tone || "",
        },
        clientId: params.clientId,
      });
    } catch (error) {
      console.error(`[rewrite-loop] 재작성 #${retries} 실패:`, error);
      break;
    }

    if (!rewriteResult.success || !rewriteResult.data) {
      console.warn(`[rewrite-loop] 재작성 #${retries} 에이전트 실패`);
      break;
    }

    // 2. 재작성 결과 적용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rewriteData = rewriteResult.data as Record<string, any>;
    currentTitle = rewriteData.title || currentTitle;
    currentBody = rewriteData.body || rewriteData.content || currentBody;

    // 3. contents 테이블 업데이트 — 기존 metadata 보존
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingContent } = await (db as any)
        .from("contents")
        .select("metadata")
        .eq("id", params.contentId)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingMetadata: Record<string, any> = existingContent?.metadata || {};
      const rewriteHistory: Array<Record<string, unknown>> = existingMetadata.rewrite_history || [];
      rewriteHistory.push({
        attempt: retries,
        previous_score: currentQc.score,
        top_issues: currentQc.top_issues,
        changes: rewriteData.changes || [],
        timestamp: new Date().toISOString(),
      });

      const wordCount = currentBody.replace(/\s+/g, " ").trim().length;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .from("contents")
        .update({
          title: currentTitle,
          body: currentBody,
          word_count: wordCount,
          metadata: {
            ...existingMetadata,
            rewrite_count: retries,
            rewrite_history: rewriteHistory,
            last_rewrite_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.contentId);
    } catch (dbErr) {
      console.error(`[rewrite-loop] DB 업데이트 #${retries} 실패:`, dbErr);
    }

    // 4. 재검수
    try {
      currentQc = await runQcV2({
        contentId: params.contentId,
        clientId: params.clientId,
        title: currentTitle,
        body: currentBody,
        metaDescription: currentMeta,
        keyword: params.keyword,
      });
    } catch (qcErr) {
      console.error(`[rewrite-loop] QC 재검수 #${retries} 실패:`, qcErr);
      break;
    }
  }

  // 최대 재작성 후에도 FAIL이면 수동 검토 플래그
  if (!currentQc.pass && retries >= MAX_RETRIES) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingContent } = await (db as any)
        .from("contents")
        .select("metadata")
        .eq("id", params.contentId)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .from("contents")
        .update({
          publish_status: "review", // 수동 검토 필요 → review 상태
          metadata: {
            ...(existingContent?.metadata || {}),
            needs_manual_review: true,
            manual_review_reason: `${MAX_RETRIES}회 재작성 후 ${currentQc.score}점 — 수동 검토 필요`,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.contentId);
    } catch (dbErr) {
      console.error("[rewrite-loop] 수동 검토 플래그 저장 실패:", dbErr);
    }
  }

  return {
    finalContent: { title: currentTitle, body: currentBody },
    finalQc: currentQc,
    retries,
  };
}
