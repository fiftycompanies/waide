import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

export const maxDuration = 10;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createAdminClient();

    // 분석 레코드 확인
    const { data: analysis, error: fetchErr } = await db
      .from("brand_analyses")
      .select("id, status, input_url, refined_keywords, refined_strengths, refined_appeal, refined_target")
      .eq("id", id)
      .single();

    if (fetchErr || !analysis) {
      return NextResponse.json(
        { error: "분석 데이터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // failed 또는 analyzing(stuck) 상태만 재시도 허용
    if (analysis.status !== "failed" && analysis.status !== "analyzing") {
      return NextResponse.json(
        { error: "재시도할 수 없는 상태입니다.", status: analysis.status },
        { status: 400 }
      );
    }

    // status를 analyzing으로 리셋
    await db
      .from("brand_analyses")
      .update({ status: "analyzing" })
      .eq("id", id);

    // 보완 데이터가 있으면 전달
    const refinedData = (analysis.refined_keywords as string[] | null)?.length
      ? {
          keywords: analysis.refined_keywords as string[],
          strengths: (analysis.refined_strengths as string) || undefined,
          appeal: (analysis.refined_appeal as string) || undefined,
          target: (analysis.refined_target as string) || undefined,
        }
      : undefined;

    // 비동기 재분석 실행
    import("@/lib/place-analyzer").then(({ runFullAnalysis }) => {
      runFullAnalysis(id, refinedData).catch((err) => {
        console.error("[retry] 재분석 실패:", err);
        db.from("brand_analyses")
          .update({ status: "failed", basic_info: { error: String(err) } })
          .eq("id", id);
      });
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
