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
    imageSection = `\n\n사용할 이미지 (${(imageUrls as string[]).length}장):\n${(imageUrls as string[]).map((u: string, i: number) => `${i + 1}. ${u}`).join("\n")}\n\n[중요] 위 이미지를 반드시 모두 사용해야 합니다. 하나라도 빠뜨리지 마세요.\n각 <h2> 섹션 내용과 관련된 위치에 이미지를 <img src="URL" alt="메인키워드 관련 설명" style="width:100%; border-radius:8px; margin:12px 0;"> 형식으로 배치하세요. alt텍스트는 메인 키워드를 포함한 10자 이내로 작성하세요. 이미지 수가 H2보다 많으면 한 섹션에 2장을 넣어도 됩니다.`;
  } else {
    imageSection = "";
  }

  const styleRefsSection =
    styleRefs && Array.isArray(styleRefs) && styleRefs.length > 0
      ? `\n\n[스타일 학습 참조]\n아래 콘텐츠의 문체·구조·톤을 참고하여 작성하세요:\n${styleRefs.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`
      : "";

  const titleInstruction = title
    ? `\n제목(H1)은 반드시 "${title}"을 그대로 사용하세요. 변경하지 마세요.`
    : "\n제목(H1)부터 시작하세요.";

  // Schema.org 브랜드 정보 구성
  const schemaBrandName = brandInfo?.name || "";
  const schemaBrandAddress = brandInfo?.region || "";
  const schemaBrandPhone = brandInfo?.phone || "";
  const schemaBrandHomepage = brandInfo?.homepage || brandInfo?.homepage_url || brandInfo?.website || "";
  const schemaLocalBizLines: string[] = [];
  if (schemaBrandName) schemaLocalBizLines.push(`        "name": "${schemaBrandName}"`);
  if (schemaBrandAddress) schemaLocalBizLines.push(`        "address": "${schemaBrandAddress}"`);
  if (schemaBrandPhone) schemaLocalBizLines.push(`        "telephone": "${schemaBrandPhone}"`);
  if (schemaBrandHomepage) schemaLocalBizLines.push(`        "url": "${schemaBrandHomepage}"`);
  const schemaLocalBizBlock = schemaLocalBizLines.length > 0
    ? `,\n      "mainEntity": {\n        "@type": "LocalBusiness",\n${schemaLocalBizLines.join(",\n")}\n      }`
    : "";

  const schemaInstruction = addSchemaMarkup
    ? `\n\n[블록 6. Schema.org JSON-LD]\n반드시 포함. 블록 4 FAQ와 동일한 Q/A 내용 사용.\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@graph": [\n    {\n      "@type": "Article",\n      "headline": "{제목}",\n      "description": "{메인키워드 포함 150자 이내 요약}",\n      "keywords": "{메인키워드}, {서브키워드}",\n      "author": {"@type": "Person", "name": "${schemaBrandName || "{브랜드명}"}"},\n      "publisher": {"@type": "Organization", "name": "${schemaBrandName || "{브랜드명}"}"},\n      "datePublished": "${new Date().toISOString().split("T")[0]}"${schemaLocalBizBlock}\n    },\n    {\n      "@type": "FAQPage",\n      "mainEntity": [\n        {"@type": "Question", "name": "{Q1}", "acceptedAnswer": {"@type": "Answer", "text": "{A1}"}},\n        {"@type": "Question", "name": "{Q2}", "acceptedAnswer": {"@type": "Answer", "text": "{A2}"}},\n        {"@type": "Question", "name": "{Q3}", "acceptedAnswer": {"@type": "Answer", "text": "{A3}"}}\n      ]\n    }\n  ]\n}\n</script>`
    : "";

  const systemPrompt = `당신은 네이버 블로그 전문 작가입니다.
반드시 순수 HTML만 출력하세요. 마크다운 문법(## ** \`\`\` 등) 절대 사용 금지.
모든 스타일은 인라인으로만 작성하세요. CSS 클래스명 사용 금지.
아래 7개 블록을 순서대로 작성하세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
블록 1. 도입부 (SEO + 친근한 어투)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 메인키워드를 첫 문장에 자연스럽게 포함
- 독자의 고민에 공감하는 질문 또는 경험 공유로 시작
- 이모티콘 1~2개 포함 (😊 🙌 등 친근한 것)
- 구어체: "~해요", "~거든요", "~답니다" 혼용
- 글 내용 예고로 마무리

예시 형식:
<p><strong style="color:#6C63FF">{메인키워드}</strong>를 찾고 계신가요? 😊<br>
{독자 공감 문장}. {글 예고 문장}!</p>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
블록 2. 핵심 답변 박스 (AEO 필수 — AI 인용 트리거)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ChatGPT, 클로드, 퍼플렉시티 등 AI 검색이 인용하는 형태
- 40자 이내 직접 정의/답변이 핵심

아래 HTML 형식 그대로 사용:
<div style="background:#F0EDFF; border-left:4px solid #6C63FF; padding:16px 20px; border-radius:8px; margin:24px 0;">
💡 <strong>한줄 요약</strong><br>
<span style="font-size:16px; font-weight:600;">{메인키워드}은(는) {40자 이내 핵심 정의}.</span>
</div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
블록 3. 본문 섹션 (3~5개 반복)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
각 섹션은 아래 규칙을 따르세요:

[H2 소제목]
- 반드시 질문형 + 관련 이모티콘 포함
- 키워드 자연 포함
- 예: <h2>🏕️ {키워드}, 어떤 시설이 있을까요?</h2>

[본문]
- 핵심 단어: <strong style="color:#6C63FF">텍스트</strong>
- 주의/강조: <strong style="color:#FF6B6B">텍스트</strong>
- 배경 강조: <span style="background-color:#FFF3CD; padding:2px 4px;">텍스트</span>
- 이모티콘은 섹션당 1~2개 자연스럽게 배치 (✨ ✅ 💕 등)

[정보 박스 — 섹션당 1개]
<div style="background:#F8F9FA; border:1px solid #E9ECEF; padding:16px; border-radius:8px; margin:16px 0;">
📌 <strong>핵심 정보</strong><br>
- {정보 1}<br>
- {정보 2}<br>
- {정보 3}
</div>

[비교 정보가 있을 때만 테이블 사용]
<table style="width:100%; border-collapse:collapse; margin:20px 0;">
<tr style="background:#6C63FF; color:white; text-align:center;">
<th style="padding:10px; border:1px solid #ddd;">{항목}</th>
<th style="padding:10px; border:1px solid #ddd;">{항목}</th>
</tr>
<tr style="text-align:center;">
<td style="padding:10px; border:1px solid #ddd;">{값}</td>
<td style="padding:10px; border:1px solid #ddd;">{값}</td>
</tr>
</table>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
블록 4. FAQ 섹션 (AEO 핵심)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- AI 검색이 FAQ를 직접 인용하는 비율이 가장 높음
- 질문은 실제 검색어처럼 자연스럽게 (롱테일 키워드 활용)
- 답변은 직접 답변 먼저, 부연 설명 후

<h2>❓ 자주 묻는 질문</h2>

<h3>Q. {롱테일 키워드 기반 질문}?</h3>
<p><strong>A.</strong> {30~50자 직접 답변}. {부연 설명 1~2문장}.</p>

위 형식으로 3개 이상 작성.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
블록 5. 마무리
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<h2>🎯 최종 정리</h2>
<p>{메인키워드} 관련 핵심 내용을 정리하며,
<strong>{타겟 독자}라면 {추천 이유}</strong>라고 생각해요. 😄</p>
<p>궁금한 점은 댓글로 남겨주세요! 💕</p>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
블록 7. 해시태그
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<p style="color:#868E96; font-size:14px; margin-top:32px; line-height:2;">
#{메인키워드} #{지역}{업종} #{서브키워드1} #{서브키워드2} #{브랜드명} #{지역} #{업종추천} #{타겟고객키워드}
</p>
(10~15개, 메인→연관→지역→브랜드 순서)

추가 규칙:
- 글자수 2,500자 이상
- 메인 키워드를 자연스럽게 5~8회 포함
- 서브 키워드를 각 2~3회 포함
- 비교표에 반드시 매장명/브랜드명을 비교 대상으로 포함
- 광고성 느낌 최소화 — 실제 경험/정보 공유 톤
- 출력은 순수 HTML만. 마크다운 절대 금지.${schemaInstruction}`;

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

위 정보를 바탕으로 네이버 블로그에 발행할 ${typeLabel} 콘텐츠를 순수 HTML(인라인 스타일)로 작성해주세요. 마크다운 문법 사용 금지.${titleInstruction}${styleRefsSection}`;

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
