/**
 * AI 인사이트 코멘트 API
 * 발행 후 7일 이상 지난 콘텐츠에 대해 1줄 코멘트 생성
 * 결과 캐시: contents.metadata.insight 에 저장 (재호출 방지)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const { contentId, keyword, publishedAt, currentRank, daysElapsed } =
    await request.json();

  if (!contentId || !keyword) {
    return NextResponse.json(
      { error: "contentId and keyword required" },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // 캐시 체크: metadata.insight 존재 시 바로 반환
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: content } = await (db as any)
    .from("contents")
    .select("metadata")
    .eq("id", contentId)
    .single();

  const existingInsight = content?.metadata?.insight;
  if (existingInsight) {
    return NextResponse.json({ insight: existingInsight });
  }

  // Claude Haiku로 인사이트 생성
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const fallback = currentRank
      ? `발행 ${daysElapsed || "N"}일 후 현재 ${currentRank}위입니다.`
      : `발행 ${daysElapsed || "N"}일 경과, 순위 추적 중입니다.`;
    return NextResponse.json({ insight: fallback });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system:
          "당신은 SEO 분석 전문가입니다. 발행된 블로그 콘텐츠의 성과를 1줄로 요약해주세요. 한국어로 답변하세요.",
        messages: [
          {
            role: "user",
            content: `키워드: ${keyword}\n발행일: ${publishedAt || "N/A"}\n발행 후 경과일: ${daysElapsed || "N/A"}일\n현재 순위: ${currentRank ? `${currentRank}위` : "미측정"}\n\n이 콘텐츠의 SEO 성과를 1줄로 요약해주세요.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }

    const data = await response.json();
    const insight =
      data.content?.[0]?.text || "인사이트를 생성할 수 없습니다.";

    // 캐시 저장: metadata.insight
    const currentMeta = content?.metadata || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("contents")
      .update({ metadata: { ...currentMeta, insight } })
      .eq("id", contentId);

    return NextResponse.json({ insight });
  } catch (err) {
    console.error("[post-insight] error:", err);
    const fallback = currentRank
      ? `발행 ${daysElapsed || "N"}일 후 현재 ${currentRank}위입니다.`
      : `발행 ${daysElapsed || "N"}일 경과, 순위 추적 중입니다.`;
    return NextResponse.json({ insight: fallback });
  }
}
