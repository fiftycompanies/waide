/**
 * vision-to-html.ts
 * 스크린샷 → Claude Vision → 완전 새 HTML+CSS 생성
 *
 * 2단계 분리 구조:
 * Stage A: 구조 분석 — 양쪽 스크린샷 동시 전달 → 섹션 구조 JSON
 * Stage B: 섹션별 HTML 생성 — 각 섹션 독립 호출 (병렬 3개씩)
 *
 * 모델: claude-sonnet-4-6 (Vision 지원)
 *
 * 플레이스홀더 체계 (의미 기반):
 *   {{BRAND_NAME}}, {{NAV_LABEL_1~7}}, {{SECTION_TITLE}}, {{SECTION_DESC}},
 *   {{ITEM_TITLE_1~N}}, {{ITEM_DESC_1~N}}, {{FORM_NAME_LABEL}}, {{FORM_PHONE_LABEL}},
 *   {{FORM_MESSAGE_LABEL}}, {{PRIVACY_TEXT}}, {{PHONE}}, {{ADDRESS}}, {{HOURS}},
 *   {{CTA_TEXT}}, {{FOOTER_COL_TITLE_1~3}}, {{COPYRIGHT}},
 *   {{BLOG_TITLE_1~3}}, {{BLOG_EXCERPT_1~3}}
 *   data-img-slot="hero|about|service|gallery|blog"
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

export interface SectionStructure {
  order: number;
  type: string;
  layout: string;
  bgColor: string;
  hasImage: boolean;
  hasInteraction: string;
  contentDescription: string;
}

export interface ReferenceStructure {
  colorScheme: string;
  primaryBg: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  sections: SectionStructure[];
  navStructure: {
    style: string;
    hasDropdown: boolean;
    hasLanguageFlags: boolean;
    menuCount: number;
  };
}

// ── 메인 함수 ─────────────────────────────────────────────────────────────────

/**
 * 스크린샷을 Vision API로 분석하여 완전히 새로운 HTML+CSS를 생성한다.
 *
 * Stage A: 양쪽 스크린샷 → 섹션 구조 JSON (1회 호출)
 * Stage B: 섹션별 Vision 호출로 HTML+CSS 생성 (N회 호출, 3개씩 병렬)
 */
export async function generateHtmlFromScreenshots(
  options: VisionToHtmlOptions
): Promise<string> {
  const { screenshots, tokens, apiKey } = options;

  // ── Stage A: 구조 분석 ──────────────────────────────────────────────────────
  console.log("[VisionToHtml] Stage A: 섹션 구조 분석 시작...");
  const structure = await analyzeReferenceStructure(screenshots, apiKey);
  console.log(`[VisionToHtml] Stage A 완료: ${structure.sections.length}개 섹션 감지`);
  for (const s of structure.sections) {
    console.log(`  [${s.order}] ${s.type} (${s.layout}, bg:${s.bgColor}) — ${s.contentDescription}`);
  }

  // ── Stage B: 섹션별 HTML 생성 (3개씩 병렬) ──────────────────────────────────
  console.log(`[VisionToHtml] Stage B: 섹션별 HTML 생성 시작 (${structure.sections.length}개)...`);

  const sectionResults: SectionResult[] = [];
  const BATCH_SIZE = 3;

  for (let i = 0; i < structure.sections.length; i += BATCH_SIZE) {
    const batch = structure.sections.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map((section) => {
      // nav, hero → top 스크린샷 / 나머지 → middle (fallback: top)
      const screenshot =
        section.order <= 2
          ? screenshots.top
          : screenshots.middle || screenshots.top;

      return generateSectionHtml(screenshot, section, tokens, apiKey)
        .then((result) => ({
          order: section.order,
          type: section.type,
          ...result,
        }))
        .catch((err) => {
          console.warn(
            `[VisionToHtml] 섹션 ${section.type} 생성 실패:`,
            err.message
          );
          return null;
        });
    });

    const results = await Promise.all(batchPromises);
    for (const r of results) {
      if (r) {
        sectionResults.push(r);
        console.log(`[VisionToHtml] 섹션 ${r.type} 생성 완료`);
      }
    }
  }

  // 순서대로 정렬
  sectionResults.sort((a, b) => a.order - b.order);

  // 블로그 섹션이 없으면 기본 블로그 추가
  if (!sectionResults.some((s) => s.type === "blog")) {
    sectionResults.push({
      order: 998,
      type: "blog",
      css: getDefaultBlogCss(),
      html: getDefaultBlogHtml(),
    });
  }

  // 푸터 섹션이 없으면 기본 푸터 추가 (전화번호/주소/저작권 필수)
  if (!sectionResults.some((s) => s.type === "footer")) {
    sectionResults.push({
      order: 999,
      type: "footer",
      css: getDefaultFooterCss(),
      html: getDefaultFooterHtml(),
    });
  }

  // 조립
  const fullHtml = assembleFullHtmlFromSections(sectionResults, tokens);
  console.log(
    `[VisionToHtml] HTML 생성 완료: ${Math.round(fullHtml.length / 1024)}KB`
  );

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
      backgroundColor:
        parsed.backgroundColor || DEFAULT_TOKENS.backgroundColor,
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

// ── Stage A: 구조 분석 ──────────────────────────────────────────────────────

async function analyzeReferenceStructure(
  screenshots: ScreenshotSet,
  apiKey: string
): Promise<ReferenceStructure> {
  const prompt = `이 웹사이트 스크린샷들을 분석하여 섹션 구조를 JSON으로만 반환하라.
다른 텍스트 없이 JSON만 출력.

{
  "colorScheme": "dark|light|mixed",
  "primaryBg": "#hex",
  "accentColor": "#hex",
  "headingFont": "폰트명",
  "bodyFont": "폰트명",
  "sections": [
    {
      "order": 1,
      "type": "nav|hero|feature-split|body-map|treatment-tabs|card-grid|before-after|promo-slider|contact|blog|footer",
      "layout": "fullscreen|split-left|split-right|grid-3|grid-4|tabs|slider|form-split|centered",
      "bgColor": "dark|beige|white|accent",
      "hasImage": true,
      "hasInteraction": "tabs|slider|map|none",
      "contentDescription": "이 섹션이 하는 일을 한 문장으로"
    }
  ],
  "navStructure": {
    "style": "transparent-fixed|solid-fixed",
    "hasDropdown": true,
    "hasLanguageFlags": true,
    "menuCount": 7
  }
}`;

  const images: string[] = [screenshots.top];
  if (screenshots.middle) {
    images.push(screenshots.middle);
  }

  const resp = await callVisionApiMultiImage(images, prompt, apiKey, 4000);

  const jsonMatch = resp.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("[VisionToHtml] Stage A: JSON 파싱 실패, 기본 구조 사용");
    return getDefaultStructure();
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ReferenceStructure;
    if (!parsed.sections || parsed.sections.length === 0) {
      return getDefaultStructure();
    }
    return parsed;
  } catch {
    console.warn("[VisionToHtml] Stage A: JSON 파싱 에러, 기본 구조 사용");
    return getDefaultStructure();
  }
}

function getDefaultStructure(): ReferenceStructure {
  return {
    colorScheme: "light",
    primaryBg: "#ffffff",
    accentColor: "#c8a882",
    headingFont: "Noto Sans KR",
    bodyFont: "Noto Sans KR",
    sections: [
      { order: 1, type: "nav", layout: "centered", bgColor: "dark", hasImage: false, hasInteraction: "none", contentDescription: "네비게이션 바" },
      { order: 2, type: "hero", layout: "fullscreen", bgColor: "dark", hasImage: true, hasInteraction: "none", contentDescription: "히어로 배너" },
      { order: 3, type: "feature-split", layout: "split-left", bgColor: "white", hasImage: true, hasInteraction: "none", contentDescription: "서비스 소개" },
      { order: 4, type: "card-grid", layout: "grid-3", bgColor: "beige", hasImage: true, hasInteraction: "none", contentDescription: "서비스 카드 목록" },
      { order: 5, type: "contact", layout: "form-split", bgColor: "white", hasImage: false, hasInteraction: "none", contentDescription: "연락처 및 상담 폼" },
      { order: 6, type: "footer", layout: "centered", bgColor: "dark", hasImage: false, hasInteraction: "none", contentDescription: "푸터" },
    ],
    navStructure: {
      style: "transparent-fixed",
      hasDropdown: false,
      hasLanguageFlags: false,
      menuCount: 5,
    },
  };
}

// ── Stage B: 섹션별 HTML 생성 ────────────────────────────────────────────────

interface SectionResult {
  order: number;
  type: string;
  css: string;
  html: string;
}

async function generateSectionHtml(
  screenshot: string,
  section: SectionStructure,
  tokens: DesignTokens,
  apiKey: string
): Promise<{ css: string; html: string }> {
  const prompt = buildSectionPrompt(section, tokens);
  const resp = await callVisionApi(screenshot, prompt, apiKey, 6000);

  // CSS와 HTML 분리
  const css = extractStyleContent(resp);
  const html = removeStyleTags(resp);

  return { css, html };
}

function buildSectionPrompt(
  section: SectionStructure,
  tokens: DesignTokens
): string {
  return `아래 스크린샷에서 ${section.type} 섹션을 재현하라.
레이아웃: ${section.layout}
배경: ${section.bgColor}
인터랙션: ${section.hasInteraction}
설명: ${section.contentDescription}

규칙:
- waide- 접두사 클래스만 사용
- CSS 변수(--waide-*)만 색상에 사용:
${buildCssVariables(tokens)}
- 이미지: <img src="" data-img-slot="hero|about|service|gallery|blog"> 로 빈 src + data 속성
  배경 이미지: data-bg-slot="hero|section" 속성 추가
- 이모지 사용 금지. CSS 그라데이션으로 이미지 대체 금지.
- 배경색, padding, 정렬 방식을 스크린샷과 최대한 동일하게.

텍스트 플레이스홀더 규칙 (스크린샷 텍스트를 절대 그대로 쓰지 말 것):
* 브랜드명 → {{BRAND_NAME}}
* 네비 메뉴명 → {{NAV_LABEL_1}}~{{NAV_LABEL_7}}
* 섹션 제목 → {{SECTION_TITLE}}
* 섹션 소제목/설명 → {{SECTION_DESC}}
* 서비스/시술명 → {{ITEM_TITLE_1}}~{{ITEM_TITLE_N}} (N은 보이는 아이템 수만큼)
* 서비스 설명 → {{ITEM_DESC_1}}~{{ITEM_DESC_N}}
* 폼 이름 라벨 → {{FORM_NAME_LABEL}} (절대 서비스명 사용 금지)
* 폼 연락처 라벨 → {{FORM_PHONE_LABEL}}
* 폼 내용 라벨 → {{FORM_MESSAGE_LABEL}}
* 개인정보동의 텍스트 → {{PRIVACY_TEXT}}
* 전화번호 → {{PHONE}}
* 주소 → {{ADDRESS}}
* 영업시간 → {{HOURS}}
* CTA 버튼 → {{CTA_TEXT}}
* 푸터 컬럼 제목 → {{FOOTER_COL_TITLE_1}}~{{FOOTER_COL_TITLE_3}}
* 저작권 → {{COPYRIGHT}}
* 블로그 제목 → {{BLOG_TITLE_1}}~{{BLOG_TITLE_3}}
* 블로그 발췌 → {{BLOG_EXCERPT_1}}~{{BLOG_EXCERPT_3}}

이 섹션의 HTML+CSS만 출력. 설명/코멘트 없이 코드만.
CSS는 <style data-section="${section.type}"> 태그로 분리 출력.
반응형: @media (max-width: 768px) 포함.`;
}

// ── CSS 변수 빌더 ─────────────────────────────────────────────────────────────

function buildCssVariables(tokens: DesignTokens): string {
  return `  --waide-primary: ${tokens.primaryColor};
  --waide-accent: ${tokens.accentColor};
  --waide-bg: ${tokens.backgroundColor};
  --waide-text: ${tokens.textColor};
  --waide-font-heading: '${tokens.headingFont}', sans-serif;
  --waide-font-body: '${tokens.bodyFont}', sans-serif;`;
}

// ── 기본 블로그 섹션 ─────────────────────────────────────────────────────────

function getDefaultBlogCss(): string {
  return `.waide-blog { padding: 80px 5%; background: var(--waide-bg); }
.waide-blog h2 { font-family: var(--waide-font-heading); font-size: 2rem; text-align: center; margin-bottom: 40px; color: var(--waide-text); }
.waide-blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; max-width: 1200px; margin: 0 auto; }
.waide-blog-card { border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
.waide-blog-img { height: 200px; background-size: cover; background-position: center; }
.waide-blog-card h3 { padding: 16px 16px 8px; font-size: 1.1rem; color: var(--waide-text); }
.waide-blog-card p { padding: 0 16px 16px; font-size: 0.9rem; color: var(--waide-text); opacity: 0.7; }
@media (max-width: 768px) { .waide-blog-grid { grid-template-columns: 1fr; } }`;
}

function getDefaultBlogHtml(): string {
  return `<section class="waide-blog">
  <h2>블로그</h2>
  <div class="waide-blog-grid">
    <article class="waide-blog-card">
      <div class="waide-blog-img" data-img-slot="blog"></div>
      <h3>{{BLOG_TITLE_1}}</h3>
      <p>{{BLOG_EXCERPT_1}}</p>
    </article>
    <article class="waide-blog-card">
      <div class="waide-blog-img" data-img-slot="blog"></div>
      <h3>{{BLOG_TITLE_2}}</h3>
      <p>{{BLOG_EXCERPT_2}}</p>
    </article>
    <article class="waide-blog-card">
      <div class="waide-blog-img" data-img-slot="blog"></div>
      <h3>{{BLOG_TITLE_3}}</h3>
      <p>{{BLOG_EXCERPT_3}}</p>
    </article>
  </div>
</section>`;
}

function getDefaultFooterCss(): string {
  return `.waide-footer { padding: 60px 5% 30px; background: #1a1a1a; color: #ffffff; }
.waide-footer-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; }
.waide-footer-brand h3 { font-family: var(--waide-font-heading); font-size: 1.5rem; margin-bottom: 16px; color: var(--waide-accent, #c8a882); }
.waide-footer-brand p { font-size: 0.9rem; opacity: 0.8; line-height: 1.8; }
.waide-footer-col h4 { font-size: 1rem; margin-bottom: 16px; color: var(--waide-accent, #c8a882); }
.waide-footer-col ul { list-style: none; }
.waide-footer-col li { font-size: 0.9rem; opacity: 0.7; margin-bottom: 8px; }
.waide-footer-bottom { max-width: 1200px; margin: 40px auto 0; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; font-size: 0.8rem; opacity: 0.5; }
@media (max-width: 768px) { .waide-footer-inner { grid-template-columns: 1fr; gap: 30px; } }`;
}

function getDefaultFooterHtml(): string {
  return `<footer class="waide-footer">
  <div class="waide-footer-inner">
    <div class="waide-footer-brand">
      <h3>{{BRAND_NAME}}</h3>
      <p>{{ADDRESS}}</p>
      <p>Tel. {{PHONE}}</p>
      <p>{{HOURS}}</p>
    </div>
    <div class="waide-footer-col">
      <h4>{{FOOTER_COL_TITLE_1}}</h4>
      <ul>
        <li>{{ITEM_TITLE_1}}</li>
        <li>{{ITEM_TITLE_2}}</li>
        <li>{{ITEM_TITLE_3}}</li>
      </ul>
    </div>
    <div class="waide-footer-col">
      <h4>{{FOOTER_COL_TITLE_2}}</h4>
      <ul>
        <li>{{NAV_LABEL_1}}</li>
        <li>{{NAV_LABEL_2}}</li>
        <li>{{NAV_LABEL_3}}</li>
      </ul>
    </div>
    <div class="waide-footer-col">
      <h4>{{FOOTER_COL_TITLE_3}}</h4>
      <ul>
        <li>{{NAV_LABEL_4}}</li>
        <li>{{NAV_LABEL_5}}</li>
      </ul>
    </div>
  </div>
  <div class="waide-footer-bottom">{{COPYRIGHT}}</div>
</footer>`;
}

// ── HTML 조립 ────────────────────────────────────────────────────────────────

function assembleFullHtmlFromSections(
  sections: SectionResult[],
  tokens: DesignTokens
): string {
  const allCss = sections
    .map((s) => `    /* ── ${s.type} ── */\n    ${s.css}`)
    .join("\n\n");

  const allHtml = sections.map((s) => s.html).join("\n\n  ");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{BRAND_NAME}} | {{TAGLINE}}</title>
  <meta name="description" content="{{SUBTITLE}}">
  <meta property="og:title" content="{{BRAND_NAME}} | {{TAGLINE}}">
  <meta property="og:description" content="{{SUBTITLE}}">
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

${allCss}
  </style>
</head>
<body>
  ${allHtml}
</body>
</html>`;
}

// ── Vision API 호출 ──────────────────────────────────────────────────────────

/** 단일 이미지 Vision API 호출 */
async function callVisionApi(
  screenshotBase64: string,
  prompt: string,
  apiKey: string,
  maxTokens: number = 16000
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
      max_tokens: maxTokens,
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

  return extractHtml(text);
}

/** 다중 이미지 Vision API 호출 (Stage A 구조 분석용) */
async function callVisionApiMultiImage(
  screenshotsBase64: string[],
  prompt: string,
  apiKey: string,
  maxTokens: number = 4000
): Promise<string> {
  const imageBlocks = screenshotsBase64.map((s) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: "image/jpeg" as const,
      data: s,
    },
  }));

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text" as const, text: prompt },
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

/** Vision API raw 호출 (디자인 토큰 추출용) */
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

// ── HTML 추출 + 유틸 ────────────────────────────────────────────────────────

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

function extractStyleContent(html: string): string {
  const rawHtml = extractHtml(html);
  const styles: string[] = [];
  const regex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawHtml)) !== null) {
    styles.push(match[1].trim());
  }
  return styles.join("\n\n");
}

function removeStyleTags(html: string): string {
  const rawHtml = extractHtml(html);
  let cleaned = rawHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // 래퍼 태그 제거
  cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, "");
  cleaned = cleaned.replace(/<html[^>]*>/gi, "");
  cleaned = cleaned.replace(/<\/html>/gi, "");
  cleaned = cleaned.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");
  cleaned = cleaned.replace(/<head[^>]*>/gi, "");
  cleaned = cleaned.replace(/<\/head>/gi, "");
  cleaned = cleaned.replace(/<body[^>]*>/gi, "");
  cleaned = cleaned.replace(/<\/body>/gi, "");
  cleaned = cleaned.replace(/<link[^>]*>/gi, "");
  cleaned = cleaned.replace(/<meta[^>]*>/gi, "");
  cleaned = cleaned.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
  return cleaned.trim();
}
