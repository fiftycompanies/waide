import { NextResponse } from "next/server";
import { runAEOTrackingBatch, getAEOSettings } from "@/lib/actions/aeo-tracking-actions";

/**
 * AEO 추적 자동 크론
 *
 * 기본: cron_enabled='false' → 호출되어도 즉시 return (에러 아님)
 * vercel.json: "0 3 * * *" (매일 03:00 KST)
 */
export async function GET(request: Request) {
  // CRON_SECRET 인증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // cron_enabled 체크
  const settings = await getAEOSettings();
  if (!settings.cron_enabled) {
    return NextResponse.json({
      message: "AEO cron disabled",
      cron_enabled: false,
    });
  }

  try {
    const result = await runAEOTrackingBatch();
    return NextResponse.json({
      message: "AEO tracking batch completed",
      processed: result.processed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[AEO Cron] error:", error);
    return NextResponse.json(
      { error: "AEO tracking batch failed", details: String(error) },
      { status: 500 }
    );
  }
}
