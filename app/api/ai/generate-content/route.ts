import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json();
  const {
    contentType,
    brief,
    brandInfo,
    mainKeyword,
    subKeywords,
    imageUrls,
  } = body;

  const typeLabel =
    contentType === "blog_info"
      ? "정보형"
      : contentType === "blog_review"
        ? "후기성"
        : "소개성";

  const imageSection =
    imageUrls?.length > 0
      ? `\n\n사용할 이미지:\n${(imageUrls as string[]).map((u: string, i: number) => `${i + 1}. ${u}`).join("\n")}\n본문 중간중간에 이미지를 자연스럽게 배치해주세요.`
      : "";

  const systemPrompt = `당신은 네이버 블로그 SEO에 최적화된 콘텐츠 전문 작가입니다.
반드시 아래 규칙을 지켜 작성하세요:
1. 해요체(~해요, ~이에요, ~있어요) 사용 — 해요체 비율 90% 이상
2. 글자수 2,500자 이상
3. H2(##) 소제목 3~5개 사용
4. 메인 키워드를 자연스럽게 5~8회 포함
5. 서브 키워드를 각 2~3회 포함
6. 비교표(마크다운 테이블) 1개 이상 포함
7. CTA(Call-to-Action) 문구 포함
8. 해시태그 5~10개 (#키워드 형식)
9. 결론 섹션에 요약 포함
10. 광고성 느낌 최소화 — 실제 경험/정보 공유 톤
11. JSON-LD Schema.org 마크업 포함하지 않기 (별도 처리)`;

  const userPrompt = `[콘텐츠 유형] ${typeLabel}

[브랜드 정보]
- 매장명: ${brandInfo?.name || "미정"}
- 업종: ${brandInfo?.category || "미정"}
- 지역: ${brandInfo?.region || "미정"}
- 특징: ${brandInfo?.description || "없음"}

[브리프]
${brief || "없음"}

[메인 키워드] ${mainKeyword}
[서브 키워드] ${(subKeywords || []).join(", ")}
${imageSection}

위 정보를 바탕으로 네이버 블로그에 발행할 ${typeLabel} 콘텐츠를 마크다운으로 작성해주세요.
제목(H1)부터 시작하세요.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[generate-content] Anthropic error:", resp.status, errText);
      return new Response(
        JSON.stringify({ error: "콘텐츠 생성에 실패했습니다" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      return new Response(
        JSON.stringify({ error: "No response stream" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (!data || data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  if (
                    parsed.type === "content_block_delta" &&
                    parsed.delta?.type === "text_delta" &&
                    parsed.delta.text
                  ) {
                    const chunk = `data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`;
                    controller.enqueue(encoder.encode(chunk));
                  }
                } catch {
                  // skip parse errors
                }
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[generate-content] Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "생성 중 오류가 발생했습니다" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[generate-content] API error:", err);
    return new Response(
      JSON.stringify({ error: "콘텐츠 생성에 실패했습니다" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
