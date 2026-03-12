/**
 * POST /api/analyze — 분석 시작
 * body: { url: string, salesRef?: string, visitorToken?: string }
 */

import { NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";
import { runFullAnalysis } from "@/lib/place-analyzer";

// Next.js route segment config — 분석은 300초까지 허용 (Vercel Pro 필요)
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, salesRef, visitorToken } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let db;
    try {
      db = createAdminClient();
    } catch (envErr) {
      console.error("Supabase client error:", envErr);
      return NextResponse.json(
        { error: "서버 설정 오류 (환경변수 확인 필요)" },
        { status: 500 }
      );
    }

    // 항상 새 레코드 생성 (같은 매장이라도 분석마다 독립 ID)
    const { data, error } = await db
      .from("brand_analyses")
      .insert({
        input_url: url,
        sales_ref: salesRef || null,
        visitor_token: visitorToken || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("DB insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const analysisId = data.id;

    // after()로 응답 후 백그라운드 분석 실행 (Vercel serverless 호환)
    after(async () => {
      try {
        await runFullAnalysis(analysisId);
      } catch (err) {
        console.error("Analysis failed:", err);
        // 실패 시 상태를 failed로 업데이트
        try {
          const adminDb = createAdminClient();
          await adminDb
            .from("brand_analyses")
            .update({
              status: "failed",
              basic_info: { error: String(err) },
            })
            .eq("id", analysisId);
        } catch {
          console.error("Failed to update analysis status");
        }
      }
    });

    return NextResponse.json({ id: analysisId, existing: false });
  } catch (err) {
    console.error("POST /api/analyze error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
