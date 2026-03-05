/**
 * 검색량 갱신 크론 API
 *
 * 스케줄: 매월 1일 새벽 4시
 * 동작:
 *   1. 전체 활성 클라이언트 순회
 *   2. 클라이언트별 API 키 분기 (광고 API / DataLab)
 *   3. 키워드 검색량 일괄 업데이트
 *   4. 결과 Slack 알림
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";
import {
  verifyCronAuth,
  runScheduledTask,
  sendSlackNotification,
  getSchedulerSettings,
} from "@/lib/scheduler";
import { getKeywordSearchVolume, type NaverAdCredentials } from "@/lib/naver-keyword-api";
import { getKeywordTrendVolume } from "@/lib/naver-datalab-api";
import { logError } from "@/lib/actions/error-log-actions";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BATCH_SIZE = 5;
const BATCH_DELAY = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSchedulerSettings("search_volume_scheduler", {
    enabled: true,
    cron_day: 1,
    run_at_hour: 4,
  });

  if (!settings.enabled) {
    return NextResponse.json({ skipped: true, reason: "scheduler disabled" });
  }

  const result = await runScheduledTask("search_volume", async () => {
    const db = createAdminClient();

    // 활성 클라이언트 조회
    const { data: clients } = await db
      .from("clients")
      .select("id, name, naver_ad_api_key, naver_ad_secret_key, naver_ad_customer_id")
      .eq("is_active", true);

    if (!clients?.length) return { updated: 0, failed: 0, message: "활성 클라이언트 없음" };

    let totalUpdated = 0;
    let totalFailed = 0;
    const clientResults: Array<{ name: string; source: string; updated: number; failed: number }> = [];

    for (const client of clients) {
      const hasCreds = client.naver_ad_api_key && client.naver_ad_secret_key && client.naver_ad_customer_id;
      const source = hasCreds ? "naver_ad" : "datalab";
      const creds: NaverAdCredentials | undefined = hasCreds
        ? { apiKey: client.naver_ad_api_key, secretKey: client.naver_ad_secret_key, customerId: client.naver_ad_customer_id }
        : undefined;

      // 키워드 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: keywords } = await (db as any)
        .from("keywords")
        .select("id, keyword")
        .eq("client_id", client.id)
        .neq("status", "archived");

      if (!keywords?.length) continue;

      let updated = 0;
      let failed = 0;

      // 배치 처리
      for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
        const batch = keywords.slice(i, i + BATCH_SIZE);
        const kwTexts = batch.map((k: { keyword: string }) => k.keyword);

        try {
          if (creds) {
            // 광고 API
            const volumes = await getKeywordSearchVolume(kwTexts, creds);
            for (const kw of batch) {
              const clean = kw.keyword.replace(/\s+/g, "");
              const found = volumes.find((v) => v.keyword === clean) ?? volumes[0];
              if (found) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (db as any).from("keywords").update({
                  monthly_search_pc: found.monthlyPc,
                  monthly_search_mo: found.monthlyMo,
                  monthly_search_total: found.monthlyTotal,
                  search_volume_source: "naver_ad",
                }).eq("id", kw.id);
                updated++;
              } else {
                failed++;
              }
            }
          } else {
            // DataLab 폴백
            const trends = await getKeywordTrendVolume(kwTexts);
            for (const kw of batch) {
              const found = trends.find((t) => t.keyword === kw.keyword);
              if (found) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (db as any).from("keywords").update({
                  monthly_search_pc: found.estimatedPc,
                  monthly_search_mo: found.estimatedMo,
                  monthly_search_total: found.estimatedTotal,
                  search_volume_source: "datalab",
                }).eq("id", kw.id);
                updated++;
              } else {
                failed++;
              }
            }
          }
        } catch (err) {
          failed += batch.length;
          const errorMsg = err instanceof Error ? err.message : "Unknown batch error";
          console.error(`[cron/search-volume] batch error for ${client.name}:`, err);
          logError({
            errorMessage: errorMsg,
            errorStack: err instanceof Error ? err.stack : undefined,
            errorType: "cron",
            pageUrl: "/api/cron/search-volume",
            clientId: client.id,
            metadata: { clientName: client.name, source, batchIndex: i, batchSize: batch.length },
          }).catch(() => {});
        }

        if (i + BATCH_SIZE < keywords.length) await sleep(BATCH_DELAY);
      }

      totalUpdated += updated;
      totalFailed += failed;
      clientResults.push({ name: client.name, source, updated, failed });
    }

    // Slack 알림
    const lines = [
      "🔍 *[분석봇] 검색량 갱신 완료*",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━",
      `✅ 성공: ${totalUpdated}건 | ❌ 실패: ${totalFailed}건`,
      "",
      ...clientResults.map((c) =>
        `*${c.name}*: ${c.source === "naver_ad" ? "광고API" : "DataLab"} — ${c.updated}건 갱신`
      ),
    ];
    await sendSlackNotification(lines.join("\n"), undefined, "serp");

    return { updated: totalUpdated, failed: totalFailed, clients: clientResults };
  });

  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
