import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured", titles: [] }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { contentType, placeName, mainKeyword, brief } = await request.json();

  const typeLabel =
    contentType === "blog_info"
      ? "정보형"
      : contentType === "blog_review"
        ? "후기성"
        : "소개성";

  const prompt = `다음 정보를 바탕으로 네이버 블로그 SEO에 최적화된 제목 5개를 생성해줘.

콘텐츠 유형: ${typeLabel}
매장명: ${placeName || "미정"}
메인 키워드: ${mainKeyword || "미정"}
브리프: ${brief || "없음"}

조건:
- 메인 키워드를 제목 앞부분에 포함
- 클릭을 유도하는 숫자/감성어 포함 (TOP 5, BEST, 솔직후기 등)
- 30자 이내
- 각 제목은 다른 스타일로 (숫자형/감성형/질문형/비교형/후기형)

JSON 배열로만 응답: ["제목1", "제목2", "제목3", "제목4", "제목5"]`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[generate-titles] Anthropic error:", resp.status, errText);
      return new Response(
        JSON.stringify({ error: "제목 생성에 실패했습니다", titles: [] }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await resp.json();
    const text = result.content?.[0]?.text || "[]";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const titles: string[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ titles }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-titles] Error:", err);
    return new Response(
      JSON.stringify({ error: "제목 생성에 실패했습니다", titles: [] }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
