/**
 * 월간 리포트 자동 발송 크론 API
 *
 * 스케줄: 매월 1일 UTC 00:00 (한국시간 09:00)
 * 동작:
 *   1. report_settings.enabled=true 인 클라이언트 조회
 *   2. 각 클라이언트별 PDF 생성 + 이메일 발송
 *   3. report_deliveries에 이력 저장
 *   4. 결과 반환 (성공/실패/스킵 건수)
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

export const maxDuration = 300; // 5분
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // CRON_SECRET 검증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  // 전월 계산 (크론은 매월 1일 실행 → 전월 리포트 발송)
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const reportYear = prevMonth.getFullYear();
  const reportMonth = prevMonth.getMonth() + 1;
  const reportMonthDate = `${reportYear}-${String(reportMonth).padStart(2, "0")}-01`;

  // report_settings.enabled = true 인 클라이언트 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clients, error: clientsError } = await (db as any)
    .from("clients")
    .select("id, name, metadata")
    .not("metadata", "is", null);

  if (clientsError) {
    console.error("[cron/monthly-report] clients query error:", clientsError);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  // metadata.report_settings.enabled = true 필터링
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enabledClients = ((clients ?? []) as any[]).filter((c) => {
    const settings = c.metadata?.report_settings;
    return settings?.enabled === true;
  });

  if (enabledClients.length === 0) {
    return NextResponse.json({
      message: "No clients with report enabled",
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });
  }

  // 최대 10건 처리 (타임아웃 방지)
  const batch = enabledClients.slice(0, 10);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const results: { clientId: string; name: string; status: string; error?: string }[] = [];

  for (const client of batch) {
    try {
      // 이미 발송됐는지 확인 (중복 방지)
      const { data: existing } = await db
        .from("report_deliveries")
        .select("id, status")
        .eq("client_id", client.id)
        .eq("report_month", reportMonthDate)
        .maybeSingle();

      if (existing?.status === "sent") {
        skipped++;
        results.push({ clientId: client.id, name: client.name, status: "already_sent" });
        continue;
      }

      // 리포트 생성 + 발송
      const { generateAndSendReport } = await import("@/lib/actions/report-actions");
      const result = await generateAndSendReport(client.id, reportYear, reportMonth);

      if (result.success) {
        if (result.status === "skipped") {
          skipped++;
        } else {
          sent++;
        }
        results.push({ clientId: client.id, name: client.name, status: result.status || "sent" });
      } else {
        failed++;
        results.push({ clientId: client.id, name: client.name, status: "failed", error: result.error });
      }
    } catch (err) {
      failed++;
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.push({ clientId: client.id, name: client.name, status: "error", error: errorMsg });
      console.error(`[cron/monthly-report] Error for client ${client.id}:`, err);
    }
  }

  const response = {
    reportMonth: `${reportYear}-${String(reportMonth).padStart(2, "0")}`,
    processed: batch.length,
    total: enabledClients.length,
    sent,
    failed,
    skipped,
    results,
  };

  console.log("[cron/monthly-report] Complete:", JSON.stringify(response));
  return NextResponse.json(response);
}

// Vercel Cron은 GET도 지원
export async function GET(request: Request) {
  return POST(request);
}
