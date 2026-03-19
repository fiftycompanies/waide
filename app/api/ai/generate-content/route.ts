import { NextRequest } from "next/server";
import { buildImagePromptSection } from "@/lib/image-content-matcher";
import type { ImageAnalysis } from "@/lib/image-analyzer";

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
    imageAnalyses,
    title,
    addSchemaMarkup,
    styleRefs,
  } = body;

  const brandRegion = brandInfo?.region || "미정";
  const brandDescription = brandInfo?.description || "없음";

  // 추가 브랜드 데이터
  const brandHours = brandInfo?.hours || null;
  const brandFacilities = brandInfo?.facilities || null;
  const brandSellingPoints = brandInfo?.selling_points || null;
  const brandToneStyle = brandInfo?.tone_style || null;
  const brandMenuItems = brandInfo?.menu_items || null;
  const brandBookingUrl = brandInfo?.booking_url || null;

  const typeLabel =
    contentType === "blog_info"
      ? "정보형"
      : contentType === "blog_review"
        ? "후기성"
        : "소개성";

  const hasImages = imageUrls?.length > 0;
  const hasImageAnalyses = Array.isArray(imageAnalyses) && imageAnalyses.length > 0;

  let imageSection: string;
  if (hasImageAnalyses && hasImages) {
    // Vision 분석 결과가 있으면 타입/hook_score 기반 배치 지시
    imageSection = "\n\n" + buildImagePromptSection(
      imageAnalyses as ImageAnalysis[],
      imageUrls as string[],
    );
  } else if (hasImages) {
    // URL 나열 + 부족한 섹션에 📷 플레이스홀더 삽입 지시
    imageSection = `\n\n사용할 이미지 (${(imageUrls as string[]).length}장):\n${(imageUrls as string[]).map((u: string, i: number) => `${i + 1}. ${u}`).join("\n")}\n\n[중요] 위 이미지를 반드시 모두 사용해야 합니다. 하나라도 빠뜨리지 마세요.\n각 H2 섹션 직후에 이미지를 ![설명](url) 형식으로 배치하세요. 이미지 수가 H2보다 많으면 한 섹션에 2장을 넣어도 됩니다.\n이미지가 부족하여 배치할 수 없는 H2 섹션이 있다면, 아래 형식의 플레이스홀더를 삽입하세요:\n> 📷 [이미지 추천] {맥락에 맞는 이미지 설명} — 이런 사진을 넣어보세요.`;
  } else {
    imageSection = `\n\n이미지가 없습니다. 각 H2 섹션 직후에 아래 형식의 이미지 플레이스홀더를 1개씩 삽입해주세요:
> 📷 [이미지 추천] {맥락에 맞는 이미지 설명 1~2줄} — 이런 사진을 넣어보세요.

예시:
> 📷 [이미지 추천] 캠핑장 전경을 담은 낮 시간대 와이드샷. 잔디와 데크가 함께 보이는 사진이 좋습니다 — 이런 사진을 넣어보세요.`;
  }

  const styleRefsSection =
    styleRefs && Array.isArray(styleRefs) && styleRefs.length > 0
      ? `\n\n[스타일 학습 참조]\n아래 콘텐츠의 문체·구조·톤을 참고하여 작성하세요:\n${styleRefs.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`
      : "";

  const titleInstruction = title
    ? `\n제목(H1)은 반드시 "${title}"을 그대로 사용하세요. 변경하지 마세요.`
    : "\n제목(H1)부터 시작하세요.";

  const schemaInstruction = addSchemaMarkup
    ? `11. 콘텐츠 마지막에 JSON-LD Schema.org 마크업을 <script type="application/ld+json"> 태그로 포함하세요.
    - Article 스키마 (headline, author, datePublished)
    - FAQ 스키마 (본문에서 Q&A 형식의 내용이 있으면 추출)
    - LocalBusiness 스키마 (매장명, 업종이 있으면 포함)`
    : `11. JSON-LD Schema.org 마크업 포함하지 않기 (별도 처리)`;

  const systemPrompt = `당신은 네이버 블로그 SEO에 최적화된 콘텐츠 전문 작가입니다.
반드시 아래 규칙을 지켜 작성하세요:
1. 해요체(~해요, ~이에요, ~있어요) 사용 — 해요체 비율 90% 이상
2. 글자수 2,500자 이상
3. H2(##) 소제목 3~5개 사용
4. 메인 키워드를 자연스럽게 5~8회 포함
5. 서브 키워드를 각 2~3회 포함
6. 비교표(마크다운 테이블) 1개 이상 포함 — 반드시 매장명/브랜드명을 비교 대상으로 포함하고, 경쟁사 대비 장점이 드러나도록 작성. "A vs B" 형식의 모호한 비교 금지
7. CTA(Call-to-Action) 문구 포함
8. 해시태그 5~10개 (#키워드 형식)
9. 결론 섹션에 요약 포함
10. 광고성 느낌 최소화 — 실제 경험/정보 공유 톤
${schemaInstruction}`;

  // 추가 브랜드 정보 라인 생성
  const extraBrandLines: string[] = [];
  if (brandHours) extraBrandLines.push(`- 영업시간: ${typeof brandHours === 'string' ? brandHours : JSON.stringify(brandHours)}`);
  if (brandFacilities) extraBrandLines.push(`- 편의시설: ${Array.isArray(brandFacilities) ? brandFacilities.join(", ") : String(brandFacilities)}`);
  if (brandMenuItems) extraBrandLines.push(`- 대표 메뉴: ${Array.isArray(brandMenuItems) ? brandMenuItems.map((m: Record<string, unknown>) => m.name || m.menu || String(m)).join(", ") : String(brandMenuItems)}`);
  if (brandSellingPoints) extraBrandLines.push(`- 고객 리뷰 강점: ${Array.isArray(brandSellingPoints) ? brandSellingPoints.join(", ") : String(brandSellingPoints)}`);
  if (brandToneStyle) extraBrandLines.push(`- 브랜드 톤앤매너: ${String(brandToneStyle)}`);
  if (brandBookingUrl) extraBrandLines.push(`- 예약 링크: ${String(brandBookingUrl)}`);
  const extraBrandSection = extraBrandLines.length > 0 ? "\n" + extraBrandLines.join("\n") : "";

  const userPrompt = `[콘텐츠 유형] ${typeLabel}

[브랜드 정보]
- 매장명: ${brandInfo?.name || "미정"}
- 업종: ${brandInfo?.category || "미정"}
- 지역: ${brandRegion}
- 특징: ${brandDescription}${extraBrandSection}

[브리프]
${brief || "없음"}

[메인 키워드] ${mainKeyword}
[서브 키워드] ${(subKeywords || []).join(", ")}
${imageSection}

[비교표 작성 지침]
- 비교표에 반드시 "${brandInfo?.name || '매장명'}"을(를) 주요 비교 대상으로 포함
- "OO 업체" 등 모호한 표현 대신 구체적 브랜드명 사용
- 브랜드 강점이 자연스럽게 드러나도록 구성

위 정보를 바탕으로 네이버 블로그에 발행할 ${typeLabel} 콘텐츠를 마크다운으로 작성해주세요.${titleInstruction}${styleRefsSection}`;

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
        max_tokens: 8000,
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
                  // stop_reason 감지: max_tokens로 잘린 경우 경고 전송
                  if (
                    parsed.type === "message_delta" &&
                    parsed.delta?.stop_reason === "max_tokens"
                  ) {
                    const warning = `data: ${JSON.stringify({ warning: "max_tokens_reached" })}\n\n`;
                    controller.enqueue(encoder.encode(warning));
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
