/**
 * vision-to-html.ts
 * 스크린샷 → Claude Vision → 완전 새 HTML+CSS 생성
 *
 * 패러다임: "레퍼런스 HTML 코드에 절대 접근하지 않는다.
 *           스크린샷만 인풋. 코드는 Vision AI가 100% 새로 생성."
 *
 * 모델: claude-sonnet-4-6 (Vision 지원)
 * 호출: 2회 (상단부 → 하단부 순서로 섹션별 생성)
 *
 * 출력 HTML은 플레이스홀더([BRAND_NAME], data-img-slot 등)를 포함한
 * 브랜드 독립적 템플릿. brand-injector.ts가 후속 주입한다.
 */

import type { ScreenshotSet } from "./screenshot-crawler";

// ── 타입 ─────────────────────────────────────────────────────────────────────

export interface DesignTokens {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
}

export interface VisionToHtmlOptions {
  /** 스크린샷 세트 */
  screenshots: ScreenshotSet;
  /** Vision에서 추출된 디자인 토큰 (색상/폰트) */
  tokens: DesignTokens;
  /** API 키 */
  apiKey: string;
}

// ── 메인 함수 ─────────────────────────────────────────────────────────────────

/**
 * 스크린샷을 Vision API로 분석하여 완전히 새로운 HTML+CSS를 생성한다.
 * 2회 호출: 상단부(Nav+Hero) → 하단부(About~Footer)
 */
export async function generateHtmlFromScreenshots(
  options: VisionToHtmlOptions
): Promise<string> {
  const { screenshots, tokens, apiKey } = options;

  // 호출 1: 상단부 — Nav + Hero
  console.log("[VisionToHtml] 호출 1: 상단부 분석 시작 (Nav + Hero)");
  const topHtml = await callVisionApi(
    screenshots.top,
    buildTopPrompt(tokens),
    apiKey
  );

  // 호출 2: 중간부 — About, Services, Gallery, Contact, Blog, Footer
  let bottomHtml: string;
  if (screenshots.middle) {
    console.log("[VisionToHtml] 호출 2: 중간부 분석 시작 (About ~ Footer)");
    bottomHtml = await callVisionApi(
      screenshots.middle,
      buildBottomPrompt(tokens),
      apiKey
    );
  } else {
    // 중간부 스크린샷이 없으면 상단 스크린샷으로 전체 섹션 생성
    console.log("[VisionToHtml] 중간부 스크린샷 없음 → 상단 기반 하단부 생성");
    bottomHtml = await callVisionApiTextOnly(
      buildBottomFallbackPrompt(tokens),
      apiKey
    );
  }

  // 두 결과를 합쳐서 완성 HTML 반환
  const fullHtml = assembleFullHtml(topHtml, bottomHtml, tokens);
  console.log(`[VisionToHtml] HTML 생성 완료: ${Math.round(fullHtml.length / 1024)}KB`);

  return fullHtml;
}

// ── 디자인 토큰 추출 (상단 스크린샷 분석) ─────────────────────────────────────

/**
 * 상단 스크린샷에서 디자인 토큰(색상, 폰트)을 추출한다.
 */
export async function extractDesignTokensFromScreenshot(
  screenshotBase64: string,
  apiKey: string
): Promise<DesignTokens> {
  const prompt = `이 웹사이트 스크린샷의 디자인 토큰을 분석하세요.

다음 JSON만 출력하세요 (다른 텍스트 없이):
{
  "primaryColor": "#hex (주 색상, 로고/버튼/헤더 등에 사용되는 브랜드 대표색)",
  "accentColor": "#hex (강조색, CTA 버튼/링크/하이라이트에 사용)",
  "backgroundColor": "#hex (페이지 배경색)",
  "textColor": "#hex (본문 텍스트 색상)",
  "headingFont": "폰트명 (제목에 사용되는 폰트, 추정)",
  "bodyFont": "폰트명 (본문에 사용되는 폰트, 추정)"
}

중요:
- 색상은 스크린샷에서 실제 보이는 색상을 정확히 추출하세요.
- 폰트는 시각적 특징으로 추정하세요 (serif → Playfair Display/Noto Serif KR, sans-serif → Pretendard/Noto Sans KR 등).
- 반드시 유효한 JSON만 출력하세요.`;

  const resp = await callVisionApiRaw(screenshotBase64, prompt, apiKey);

  const jsonMatch = resp.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("[VisionToHtml] 디자인 토큰 추출 실패, 기본값 사용");
    return DEFAULT_TOKENS;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as DesignTokens;
    return {
      primaryColor: parsed.primaryColor || DEFAULT_TOKENS.primaryColor,
      accentColor: parsed.accentColor || DEFAULT_TOKENS.accentColor,
      backgroundColor: parsed.backgroundColor || DEFAULT_TOKENS.backgroundColor,
      textColor: parsed.textColor || DEFAULT_TOKENS.textColor,
      headingFont: parsed.headingFont || DEFAULT_TOKENS.headingFont,
      bodyFont: parsed.bodyFont || DEFAULT_TOKENS.bodyFont,
    };
  } catch {
    console.warn("[VisionToHtml] 디자인 토큰 JSON 파싱 실패, 기본값 사용");
    return DEFAULT_TOKENS;
  }
}

const DEFAULT_TOKENS: DesignTokens = {
  primaryColor: "#1a1a2e",
  accentColor: "#e94560",
  backgroundColor: "#ffffff",
  textColor: "#333333",
  headingFont: "Noto Sans KR",
  bodyFont: "Noto Sans KR",
};

// ── 프롬프트 빌더 ─────────────────────────────────────────────────────────────

function buildCssVariables(tokens: DesignTokens): string {
  return `  --waide-primary: ${tokens.primaryColor};
  --waide-accent: ${tokens.accentColor};
  --waide-bg: ${tokens.backgroundColor};
  --waide-text: ${tokens.textColor};
  --waide-font-heading: '${tokens.headingFont}', sans-serif;
  --waide-font-body: '${tokens.bodyFont}', sans-serif;`;
}

function buildCommonRules(tokens: DesignTokens): string {
  return `[중요 규칙]
- 원본 사이트의 코드는 모르고 봐서도 안 된다.
- 눈에 보이는 레이아웃·색상·폰트·간격을 최대한 재현한다.
- 모든 class명은 waide- 접두사를 사용한다 (예: waide-nav, waide-hero, waide-btn).
- 색상/폰트에는 아래 CSS 변수만 사용한다:
${buildCssVariables(tokens)}
- 텍스트는 모두 플레이스홀더로 작성:
  [BRAND_NAME] = 브랜드명
  [TAGLINE] = 한줄 소개
  [USP] = 핵심 강점
  [SERVICE_1], [SERVICE_2], [SERVICE_3], [SERVICE_4], [SERVICE_5] = 서비스명
  [SERVICE_DESC_1]~[SERVICE_DESC_5] = 서비스 설명
  [PHONE] = 전화번호
  [ADDRESS] = 주소
- 이미지는 <img src="" data-img-slot="hero|about|service|gallery"> 로 빈 src + data 속성만 추가.
  배경 이미지는 background-image를 비워두고 data-bg-slot="hero|section" 속성을 추가.
- 이모지 사용 금지. CSS 그라데이션으로 이미지 대체 금지.
- 각 섹션의 배경색, padding, 정렬 방식을 스크린샷과 최대한 동일하게 작성.

[섹션별 최소 보장]
- Nav: 로고([BRAND_NAME]) + 메뉴(서비스 소개, 시술안내, 오시는길, 상담예약) + CTA 버튼([PHONE])
- Hero: 풀스크린 배경이미지 + 제목([TAGLINE]) + 부제목([USP]) + CTA 버튼
- Services: 카드 또는 탭 형태로 [SERVICE_1]~[SERVICE_5] 목록 (각각 이미지+제목+설명)
- Contact: [PHONE] + [ADDRESS] + 상담 폼(이름/연락처/문의내용/제출버튼)
- Footer: [BRAND_NAME] + [PHONE] + [ADDRESS] + 저작권 © 2026

[출력 형식]
- HTML+CSS만 출력. 다른 텍스트/설명/코멘트 없이 코드만.
- <style> 태그 안에 CSS 작성 (외부 파일 금지).
- 반응형: @media (max-width: 768px) 포함.`;
}

function buildTopPrompt(tokens: DesignTokens): string {
  return `너는 시니어 웹 개발자다.
아래 웹사이트 스크린샷을 보고 시각적으로 동일한 HTML+CSS를 새로 작성해라.

${buildCommonRules(tokens)}

Nav와 Hero 섹션의 HTML+CSS만 출력. <style> 태그 포함.
다른 텍스트 없이 HTML 코드만 출력하라.`;
}

function buildBottomPrompt(tokens: DesignTokens): string {
  return `너는 시니어 웹 개발자다.
아래 웹사이트 스크린샷을 보고 시각적으로 동일한 HTML+CSS를 새로 작성해라.

${buildCommonRules(tokens)}

About, Services, Gallery, Contact, Blog, Footer 섹션의 HTML+CSS만 출력.

[추가 필수 섹션]
블로그 섹션:
<section class="waide-blog">
  <h2>블로그</h2>
  <div class="waide-blog-grid">
    <article class="waide-blog-card" data-blog-slot="1">
      <div class="waide-blog-img" data-img-slot="gallery"></div>
      <h3>[BLOG_TITLE_1]</h3>
      <p>[BLOG_EXCERPT_1]</p>
    </article>
    <article class="waide-blog-card" data-blog-slot="2">
      <div class="waide-blog-img" data-img-slot="gallery"></div>
      <h3>[BLOG_TITLE_2]</h3>
      <p>[BLOG_EXCERPT_2]</p>
    </article>
    <article class="waide-blog-card" data-blog-slot="3">
      <div class="waide-blog-img" data-img-slot="gallery"></div>
      <h3>[BLOG_TITLE_3]</h3>
      <p>[BLOG_EXCERPT_3]</p>
    </article>
  </div>
</section>

다른 텍스트 없이 HTML 코드만 출력하라.`;
}

function buildBottomFallbackPrompt(tokens: DesignTokens): string {
  return `너는 시니어 웹 개발자다.
다음 디자인 시스템에 맞게 홈페이지 하단 섹션들의 HTML+CSS를 작성해라.

CSS 변수:
${buildCssVariables(tokens)}

${buildCommonRules(tokens)}

About, Services, Gallery, Contact, Blog, Footer 섹션의 HTML+CSS를 작성하라.
럭셔리하고 모던한 의료/서비스업 느낌으로 작성.

블로그 섹션은 3개 카드 그리드로 포함:
<section class="waide-blog">
  <h2>블로그</h2>
  <div class="waide-blog-grid">
    <article class="waide-blog-card" data-blog-slot="1">
      <div class="waide-blog-img" data-img-slot="gallery"></div>
      <h3>[BLOG_TITLE_1]</h3><p>[BLOG_EXCERPT_1]</p>
    </article>
    <article class="waide-blog-card" data-blog-slot="2">
      <div class="waide-blog-img" data-img-slot="gallery"></div>
      <h3>[BLOG_TITLE_2]</h3><p>[BLOG_EXCERPT_2]</p>
    </article>
    <article class="waide-blog-card" data-blog-slot="3">
      <div class="waide-blog-img" data-img-slot="gallery"></div>
      <h3>[BLOG_TITLE_3]</h3><p>[BLOG_EXCERPT_3]</p>
    </article>
  </div>
</section>

다른 텍스트 없이 HTML 코드만 출력하라.`;
}

// ── Vision API 호출 ──────────────────────────────────────────────────────────

async function callVisionApi(
  screenshotBase64: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: screenshotBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`Vision API HTTP ${resp.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await resp.json();
  const text: string = data.content?.[0]?.text || "";

  if (!text) {
    throw new Error("Vision API 응답이 비어있습니다");
  }

  // HTML 코드만 추출 (```html ... ``` 또는 순수 HTML)
  return extractHtml(text);
}

async function callVisionApiRaw(
  screenshotBase64: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: screenshotBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`Vision API HTTP ${resp.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await resp.json();
  return data.content?.[0]?.text || "";
}

async function callVisionApiTextOnly(
  prompt: string,
  apiKey: string
): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`API HTTP ${resp.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await resp.json();
  const text: string = data.content?.[0]?.text || "";
  return extractHtml(text);
}

// ── HTML 추출 + 조립 ─────────────────────────────────────────────────────────

function extractHtml(text: string): string {
  // ```html ... ``` 블록 추출
  const codeBlockMatch = text.match(/```html\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // ``` ... ``` 블록 추출
  const genericBlockMatch = text.match(/```\s*([\s\S]*?)```/);
  if (genericBlockMatch) {
    return genericBlockMatch[1].trim();
  }

  // <로 시작하는 HTML 직접 반환
  const htmlStart = text.indexOf("<");
  if (htmlStart !== -1) {
    return text.slice(htmlStart).trim();
  }

  return text.trim();
}

function assembleFullHtml(
  topHtml: string,
  bottomHtml: string,
  tokens: DesignTokens
): string {
  // top과 bottom에서 <style> 태그 내용 추출
  const topStyles = extractStyles(topHtml);
  const bottomStyles = extractStyles(bottomHtml);

  // <style> 태그를 제거한 본문 추출
  const topBody = removeStyles(topHtml);
  const bottomBody = removeStyles(bottomHtml);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[BRAND_NAME] | [TAGLINE]</title>
  <meta name="description" content="[USP]">
  <meta property="og:title" content="[BRAND_NAME] | [TAGLINE]">
  <meta property="og:description" content="[USP]">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(tokens.headingFont)}:wght@400;500;600;700&family=${encodeURIComponent(tokens.bodyFont)}:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
${buildCssVariables(tokens)}
    }

    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: var(--waide-font-body);
      color: var(--waide-text);
      background-color: var(--waide-bg);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    img {
      max-width: 100%;
      height: auto;
      display: block;
    }

    a {
      text-decoration: none;
      color: inherit;
    }

    /* ── Vision 생성 스타일 (상단부) ── */
    ${topStyles}

    /* ── Vision 생성 스타일 (하단부) ── */
    ${bottomStyles}
  </style>
</head>
<body>
  ${topBody}
  ${bottomBody}
</body>
</html>`;
}

function extractStyles(html: string): string {
  const styles: string[] = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match: RegExpExecArray | null;
  while ((match = styleRegex.exec(html)) !== null) {
    styles.push(match[1].trim());
  }
  return styles.join("\n\n");
}

function removeStyles(html: string): string {
  // <style> 태그 제거
  let cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // <!DOCTYPE>, <html>, <head>, <body> 래퍼 제거 (본문만 추출)
  cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, "");
  cleaned = cleaned.replace(/<html[^>]*>/gi, "");
  cleaned = cleaned.replace(/<\/html>/gi, "");
  cleaned = cleaned.replace(/<head>[\s\S]*?<\/head>/gi, "");
  cleaned = cleaned.replace(/<body[^>]*>/gi, "");
  cleaned = cleaned.replace(/<\/body>/gi, "");
  cleaned = cleaned.replace(/<link[^>]*>/gi, "");
  cleaned = cleaned.replace(/<meta[^>]*>/gi, "");
  cleaned = cleaned.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
  return cleaned.trim();
}
