/**
 * 홈페이지 블로그 자동 발행 크론 API
 *
 * 스케줄: 매일 07:00 KST (0 7 * * *)
 * 동작:
 *   1. homepage_projects WHERE is_deployed=true 조회
 *   2. 각 프로젝트의 client_id로 approved/draft 상태의 최신 콘텐츠 1건 조회
 *   3. 아직 homepage에 발행되지 않은 콘텐츠만 필터
 *   4. executePublish(platform='homepage') 호출
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";
import { logError } from "@/lib/actions/error-log-actions";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // CRON_SECRET 검증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  // 1. 배포된 홈페이지 프로젝트 조회
  const { data: projects, error: projError } = await db
    .from("homepage_projects")
    .select("id, client_id, subdomain")
    .eq("is_deployed", true)
    .limit(50);

  if (projError) {
    console.error("[cron/homepage-blog] project query error:", projError);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  if (!projects || projects.length === 0) {
    return NextResponse.json({
      message: "No deployed homepage projects",
      processed: 0,
      published: 0,
      failed: 0,
    });
  }

  // 2. 각 프로젝트의 publishing_accounts(homepage) 조회
  const clientIds: string[] = [...new Set<string>(projects.map((p: { client_id: string }) => p.client_id))];
  const { data: pubAccounts } = await db
    .from("publishing_accounts")
    .select("id, client_id, platform, memo")
    .eq("platform", "homepage")
    .eq("is_active", true)
    .in("client_id", clientIds);

  if (!pubAccounts || pubAccounts.length === 0) {
    return NextResponse.json({
      message: "No homepage publishing accounts found",
      processed: 0,
      published: 0,
      failed: 0,
    });
  }

  // client_id → publishing_account 매핑
  const clientPubAccount: Record<string, { id: string; memo: string | null }> = {};
  for (const pa of pubAccounts) {
    clientPubAccount[pa.client_id] = { id: pa.id, memo: pa.memo };
  }

  let published = 0;
  let failed = 0;
  let skipped = 0;
  const results: { clientId: string; contentId?: string; status: string; error?: string }[] = [];

  for (const clientId of clientIds) {
    const account = clientPubAccount[clientId];
    if (!account) {
      skipped++;
      continue;
    }

    try {
      // 3. 아직 homepage에 발행되지 않은 최신 approved/draft 콘텐츠 조회
      // 이미 published된 콘텐츠는 제외 (published_url이 waide.kr 포함 여부로 판단)
      const { data: contents } = await db
        .from("contents")
        .select("id, title, publish_status, published_url")
        .eq("client_id", clientId)
        .in("publish_status", ["approved", "draft"])
        .is("published_url", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!contents || contents.length === 0) {
        skipped++;
        continue;
      }

      const content = contents[0];

      // 4. executePublish 호출
      const { executePublish } = await import("@/lib/actions/publish-actions");
      const result = await executePublish({
        contentId: content.id,
        clientId,
        blogAccountId: account.id, // publishing_accounts.id
        platform: "homepage",
        publishType: "auto",
      });

      if (result.success) {
        published++;
        results.push({
          clientId,
          contentId: content.id,
          status: "published",
        });
      } else {
        failed++;
        results.push({
          clientId,
          contentId: content.id,
          status: "failed",
          error: result.error,
        });
      }
    } catch (err) {
      failed++;
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.push({
        clientId,
        status: "error",
        error: errorMsg,
      });

      logError({
        errorMessage: errorMsg,
        errorStack: err instanceof Error ? err.stack : undefined,
        errorType: "cron",
        pageUrl: "/api/cron/homepage-blog",
        clientId,
      }).catch(() => {});
    }
  }

  const response = {
    processed: clientIds.length,
    published,
    failed,
    skipped,
    results,
  };

  console.log("[cron/homepage-blog] Complete:", JSON.stringify(response));
  return NextResponse.json(response);
}

// Vercel Cron은 GET도 지원
export async function GET(request: Request) {
  return POST(request);
}
