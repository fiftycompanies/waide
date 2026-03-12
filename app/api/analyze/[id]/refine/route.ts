import { NextRequest, NextResponse } from "next/server";
import { refineAnalysis } from "@/lib/actions/refinement-actions";

export const maxDuration = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { keywords, strengths, appeal, target } = body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: "키워드를 1개 이상 입력해주세요." },
        { status: 400 }
      );
    }

    if (keywords.length > 5) {
      return NextResponse.json(
        { error: "키워드는 최대 5개까지 입력 가능합니다." },
        { status: 400 }
      );
    }

    const result = await refineAnalysis(id, {
      keywords: keywords.slice(0, 5),
      strengths: strengths || "",
      appeal: appeal || "",
      target: target || "",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
