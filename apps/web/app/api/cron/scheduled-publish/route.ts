/**
 * 예약 발행 실행 크론 API
 *
 * 스케줄: 매시간 실행 (0 * * * *)
 * 동작:
 *   1. contents WHERE publish_status='scheduled' AND scheduled_at <= NOW() 조회
 *   2. 각 건에 대해 executePublish() 호출
 *   3. 성공 시 publish_status='published', 실패 시 publish_status='draft' + error_logs INSERT
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";
import { logError } from "@/lib/actions/error-log-actions";

export const maxDuration = 120; // 2분
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // CRON_SECRET 검증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const now = new Date().toISOString();

  // 예약 시간이 지난 콘텐츠 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scheduled, error: queryError } = await (db as any)
    .from("contents")
    .select("id, client_id, title, keyword_id")
    .eq("publish_status", "scheduled")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now)
    .limit(20);

  if (queryError) {
    console.error("[cron/scheduled-publish] query error:", queryError);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  if (!scheduled || scheduled.length === 0) {
    return NextResponse.json({
      message: "No scheduled contents to publish",
      processed: 0,
      published: 0,
      failed: 0,
    });
  }

  let published = 0;
  let failed = 0;
  const results: { contentId: string; title: string; status: string; error?: string }[] = [];

  for (const content of scheduled) {
    try {
      // 해당 클라이언트의 기본 블로그 계정 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: defaultAccount } = await (db as any)
        .from("blog_accounts")
        .select("id, platform")
        .eq("client_id", content.client_id)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();

      if (!defaultAccount) {
        // 기본 계정이 없으면 draft로 되돌림
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any)
          .from("contents")
          .update({ publish_status: "draft" })
          .eq("id", content.id);

        failed++;
        results.push({
          contentId: content.id,
          title: content.title || "Untitled",
          status: "no_account",
          error: "기본 블로그 계정이 설정되지 않았습니다",
        });
        continue;
      }

      // executePublish 호출
      const { executePublish } = await import("@/lib/actions/publish-actions");
      const result = await executePublish({
        contentId: content.id,
        clientId: content.client_id,
        blogAccountId: defaultAccount.id,
        platform: defaultAccount.platform,
        publishType: "auto",
      });

      if (result.success) {
        published++;
        results.push({
          contentId: content.id,
          title: content.title || "Untitled",
          status: "published",
        });
      } else {
        // 실패 시 draft로 되돌림
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any)
          .from("contents")
          .update({ publish_status: "draft" })
          .eq("id", content.id);

        failed++;
        results.push({
          contentId: content.id,
          title: content.title || "Untitled",
          status: "failed",
          error: result.error,
        });
      }
    } catch (err) {
      // 에러 시 draft로 되돌림
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .from("contents")
        .update({ publish_status: "draft" })
        .eq("id", content.id)
        .then(() => {});

      failed++;
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.push({
        contentId: content.id,
        title: content.title || "Untitled",
        status: "error",
        error: errorMsg,
      });

      logError({
        errorMessage: errorMsg,
        errorStack: err instanceof Error ? err.stack : undefined,
        errorType: "cron",
        pageUrl: "/api/cron/scheduled-publish",
        clientId: content.client_id,
        metadata: { contentId: content.id },
      }).catch(() => {});
    }
  }

  const response = {
    processed: scheduled.length,
    published,
    failed,
    results,
  };

  console.log("[cron/scheduled-publish] Complete:", JSON.stringify(response));
  return NextResponse.json(response);
}

// Vercel Cron은 GET도 지원
export async function GET(request: Request) {
  return POST(request);
}
