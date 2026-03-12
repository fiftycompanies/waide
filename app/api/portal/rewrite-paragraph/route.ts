import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { paragraph, keyword, context } = await request.json();

    if (!paragraph || !keyword) {
      return NextResponse.json(
        { error: "paragraph and keyword are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Graceful fallback: return original text if no API key
      return NextResponse.json({ rewritten: paragraph });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system:
          "당신은 SEO 최적화 전문 한국어 콘텐츠 에디터입니다. 주어진 단락을 자연스러운 해요체로 재작성하세요. 키워드를 자연스럽게 포함하되, 과도한 키워드 반복은 피하세요.",
        messages: [
          {
            role: "user",
            content: `다음 단락을 SEO에 최적화된 한국어로 자연스럽게 재작성해주세요.\n\n키워드: ${keyword}\n\n${context ? `주변 맥락:\n${context}\n\n` : ""}재작성할 단락:\n${paragraph}\n\n재작성된 단락만 출력하세요. 설명이나 추가 문구 없이 재작성 결과만 반환하세요.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[rewrite-paragraph] API error:", response.status);
      return NextResponse.json({ rewritten: paragraph });
    }

    const data = await response.json();
    const rewritten =
      data.content?.[0]?.type === "text"
        ? data.content[0].text.trim()
        : paragraph;

    return NextResponse.json({ rewritten });
  } catch (error) {
    console.error("[rewrite-paragraph] Error:", error);
    return NextResponse.json(
      { error: "재작성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
