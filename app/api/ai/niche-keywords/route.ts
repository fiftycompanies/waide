import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai/niche-keywords
 * 니치 키워드 발굴 AI 분석 API
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY 미설정" }, { status: 500 });
  }

  try {
    const { prompt } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `AI API 오류: ${response.status}` }, { status: 500 });
    }

    const result = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = (result as any).content?.[0]?.text || "[]";

    // JSON 파싱
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ keywords: [] });
    }

    const keywords = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ keywords });
  } catch (err) {
    console.error("[api/ai/niche-keywords] error:", err);
    return NextResponse.json({ error: "분석 실패" }, { status: 500 });
  }
}
