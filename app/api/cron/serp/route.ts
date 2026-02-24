/**
 * SERP 순위 수집 크론 API
 *
 * 스케줄: 매일 새벽 3시 (vercel.json cron 또는 외부 스케줄러)
 * 동작:
 *   1. 전체 활성 키워드 SERP 수집 (serp-collector.ts)
 *   2. keyword_visibility + daily_visibility_summary 자동 갱신
 *   3. 결과 Slack 알림
 */

import { NextResponse } from "next/server";
import {
  verifyCronAuth,
  runScheduledTask,
  sendSlackNotification,
  getSchedulerSettings,
} from "@/lib/scheduler";
import { collectSerpAll } from "@/lib/serp-collector";

export const maxDuration = 300; // 5분 (Vercel Pro)
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSchedulerSettings("serp_scheduler", {
    enabled: true,
    run_at_hour: 3,
    slack_webhook_url: "",
    slack_channel: "#serp-alerts",
  });

  if (!settings.enabled) {
    return NextResponse.json({ skipped: true, reason: "scheduler disabled" });
  }

  const result = await runScheduledTask("serp_collection", async () => {
    const summary = await collectSerpAll();

    // Slack 알림
    const msg = [
      "📊 *[분석봇] SERP 순위 수집 완료*",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━",
      `📅 ${summary.date}`,
      `총 키워드: ${summary.total}개`,
      `✅ 노출: ${summary.exposed}개 (${summary.exposureRate}%)`,
      `❌ 미노출: ${summary.notExposed}개`,
      summary.failed > 0 ? `⚠️ 실패: ${summary.failed}개` : "",
      `🏆 TOP3: ${summary.top3}개 | TOP10: ${summary.top10}개`,
      `📊 평균 순위 PC: ${summary.avgRankPc ?? "N/A"}위 | MO: ${summary.avgRankMo ?? "N/A"}위`,
      `가중 점유율: PC ${summary.weightedVisibilityPc}% | MO ${summary.weightedVisibilityMo}%`,
    ]
      .filter(Boolean)
      .join("\n");

    await sendSlackNotification(msg, settings.slack_webhook_url || undefined, "serp");

    return {
      date: summary.date,
      total: summary.total,
      exposed: summary.exposed,
      notExposed: summary.notExposed,
      failed: summary.failed,
      top3: summary.top3,
      top10: summary.top10,
      exposureRate: summary.exposureRate,
      weightedVisibilityPc: summary.weightedVisibilityPc,
    };
  });

  return NextResponse.json(result);
}

// Vercel Cron은 GET도 지원
export async function GET(request: Request) {
  return POST(request);
}
