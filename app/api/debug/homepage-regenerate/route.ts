/**
 * 디버그용: 홈페이지 재생성 API
 * POST /api/debug/homepage-regenerate
 * Body: { clientId, referenceUrls }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { HomepageGenerator } from "@/lib/homepage/generate/homepage-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientId = body.clientId || "7a0abbba-22d8-42c3-800e-c05c4a755bfb";
    const referenceUrls = body.referenceUrls || ["https://www.rest-clinic.com/"];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "SUPABASE 환경변수 누락" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 기존 프로젝트 삭제
    const { data: existing } = await supabase
      .from("homepage_projects")
      .select("id, project_name")
      .eq("client_id", clientId);

    if (existing && existing.length > 0) {
      for (const p of existing) {
        await supabase.from("homepage_projects").delete().eq("id", p.id);
      }
    }

    // 홈페이지 생성
    const generator = new HomepageGenerator(supabase, (progress) => {
      console.log(`[${progress.step}] ${progress.message} (${progress.percent}%)`);
    });

    const result = await generator.generate({
      clientId,
      referenceUrls,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[debug/homepage-regenerate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
