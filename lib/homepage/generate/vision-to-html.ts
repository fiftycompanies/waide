/**
 * vision-to-html.ts
 * 스크린샷 → Claude Vision → Tailwind CSS HTML 생성
 *
 * abi/screenshot-to-code 방법론 적용:
 * - Tailwind CSS 전용 (custom CSS 금지)
 * - 700px 크롭 단위로 개별 변환
 * - 검증된 system/user prompt
 *
 * 2단계 구조:
 * Stage A: 구조 분석 — 양쪽 스크린샷 동시 전달 → 섹션 구조 JSON
 * Stage B: 크롭별 Tailwind HTML 생성 — 각 크롭 독립 호출 (병렬 2개씩)
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
  /** 업종 (예: "피부과", "숙박", "카페") — 섹션 구조 힌트용 */
  industry?: string;
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
 * 스크린샷을 Vision API로 분석하여 Tailwind CSS 기반 HTML을 생성한다.
 *
 * Stage A: 양쪽 스크린샷 → 섹션 구조 JSON (1회 호출)
 * Stage B: 크롭별 Vision 호출로 Tailwind HTML 생성 (N회 호출, 2개씩 병렬)
 */
export async function generateHtmlFromScreenshots(
  options: VisionToHtmlOptions
): Promise<string> {
  const { screenshots, tokens, apiKey, industry } = options;

  // ── Stage A: 구조 분석 ──────────────────────────────────────────────────────
  console.log("[VisionToHtml] Stage A: 섹션 구조 분석 시작...");
  const structure = await analyzeReferenceStructure(screenshots, apiKey);
  console.log(`[VisionToHtml] Stage A 완료: ${structure.sections.length}개 섹션 감지`);
  for (const s of structure.sections) {
    console.log(`  [${s.order}] ${s.type} (${s.layout}, bg:${s.bgColor}) — ${s.contentDescription}`);
  }

  // ── Stage B: 크롭별 Tailwind HTML 생성 (2개씩 병렬) ──────────────────────────
  const crops = screenshots.crops;
  if (crops.length === 0) {
    console.warn("[VisionToHtml] 크롭 없음, top/middle 스크린샷으로 폴백");
    crops.push(screenshots.top);
    if (screenshots.middle) crops.push(screenshots.middle);
  }

  console.log(`[VisionToHtml] Stage B: 크롭별 Tailwind HTML 생성 시작 (${crops.length}개)...`);

  const cropResults: string[] = [];
  const BATCH_SIZE = 2;

  for (let i = 0; i < crops.length; i += BATCH_SIZE) {
    const batch = crops.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map((crop, batchIdx) => {
      const cropIndex = i + batchIdx;
      return generateCropHtml(crop, cropIndex, crops.length, tokens, apiKey, industry)
        .then((html) => {
          console.log(`[VisionToHtml] 크롭 ${cropIndex + 1}/${crops.length} 완료`);
          return html;
        })
        .catch((err) => {
          console.warn(`[VisionToHtml] 크롭 ${cropIndex + 1} 생성 실패:`, err.message);
          return "";
        });
    });

    const results = await Promise.all(batchPromises);
    for (const r of results) {
      if (r) cropResults.push(r);
    }
  }

  // 블로그 섹션이 없으면 기본 블로그 추가
  const allHtml = cropResults.join("\n\n");
  const hasBlog = allHtml.includes("data-img-slot=\"blog\"") || allHtml.toLowerCase().includes("blog");
  const hasFooter = allHtml.includes("{{PHONE}}") && allHtml.includes("{{ADDRESS}}");

  const extras: string[] = [];
  if (!hasBlog) {
    extras.push(getDefaultBlogHtml());
  }
  if (!hasFooter) {
    extras.push(getDefaultFooterHtml());
  }

  // 조립
  const fullHtml = assembleTailwindHtml(cropResults, extras, tokens);
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

// ── Stage B: 크롭별 Tailwind HTML 생성 ──────────────────────────────────────

/**
 * abi/screenshot-to-code 방식 system prompt
 */
function getTailwindSystemPrompt(): string {
  return `You are an expert Tailwind CSS developer.
You take a screenshot of a reference web page section and reproduce its LAYOUT and VISUAL STRUCTURE using Tailwind CSS and HTML.

CRITICAL — REFERENCE TEXT ISOLATION:
The screenshot is from a DIFFERENT business. You must NOT copy any text, brand names, product names, slogans, or descriptions from the screenshot.
Instead, use the provided {{PLACEHOLDER}} tokens for all text content.
The screenshot is ONLY a layout/design reference — treat all visible text as if it were lorem ipsum.

- Reproduce the layout, spacing, grid structure, and visual hierarchy from the screenshot.
- Pay close attention to background color, text color, font size, font family, padding, margin, border, etc. Match the colors and sizes exactly.
- Do NOT copy any text from the screenshot. Use ONLY the {{PLACEHOLDER}} tokens provided in the user prompt.
- Do not add comments in the code such as "<!-- Add other navigation links as needed -->" and "<!-- ... other news items ... -->" in place of writing the full code. WRITE THE FULL CODE.
- Repeat elements as needed to match the screenshot. For example, if there are 15 items, the code should have 15 items. DO NOT LEAVE comments like "<!-- Repeat for each news item -->" or bad things will happen.
- For images, use placeholder img tags with data-img-slot attribute: <img src="" data-img-slot="hero|about|service|gallery|blog" alt="description" class="...">
- For background images, use data-bg-slot attribute on the div: <div data-bg-slot="hero|section" class="bg-cover bg-center ...">
- DO NOT use emoji characters as image placeholders. DO NOT use CSS gradients as image substitutes.
- Use Tailwind CSS classes exclusively. Do NOT write custom CSS or <style> tags.
- Make sure to use responsive Tailwind classes (sm:, md:, lg:) for mobile compatibility.`;
}

/**
 * 크롭별 user prompt 생성 (플레이스홀더 규칙 + 디자인 토큰)
 */
function buildCropUserPrompt(
  cropIndex: number,
  totalCrops: number,
  tokens: DesignTokens,
  industry?: string
): string {
  const industryContext = industry ? getIndustryContext(industry) : "";

  return `Generate the Tailwind CSS HTML code for this section of the website screenshot.
This is crop ${cropIndex + 1} of ${totalCrops} (vertical section of the page).
${industryContext}

Design tokens for this brand:
- Primary color: ${tokens.primaryColor}
- Accent color: ${tokens.accentColor}
- Background: ${tokens.backgroundColor}
- Text color: ${tokens.textColor}
- Heading font: ${tokens.headingFont}
- Body font: ${tokens.bodyFont}

Use these Tailwind arbitrary values for brand colors:
- bg-[${tokens.primaryColor}], text-[${tokens.primaryColor}]
- bg-[${tokens.accentColor}], text-[${tokens.accentColor}]
- bg-[${tokens.backgroundColor}], text-[${tokens.textColor}]

IMPORTANT TEXT PLACEHOLDER RULES (do NOT copy text from the screenshot):
* Brand name → {{BRAND_NAME}}
* Nav menu items → {{NAV_LABEL_1}} ~ {{NAV_LABEL_7}}
* Section title → {{SECTION_TITLE}}
* Section description → {{SECTION_DESC}}
* Service/item names → {{ITEM_TITLE_1}} ~ {{ITEM_TITLE_N}}
* Service descriptions → {{ITEM_DESC_1}} ~ {{ITEM_DESC_N}}
* Form name label → {{FORM_NAME_LABEL}}
* Form phone label → {{FORM_PHONE_LABEL}}
* Form message label → {{FORM_MESSAGE_LABEL}}
* Privacy text → {{PRIVACY_TEXT}}
* Phone number → {{PHONE}}
* Address → {{ADDRESS}}
* Business hours → {{HOURS}}
* CTA button → {{CTA_TEXT}}
* Footer column titles → {{FOOTER_COL_TITLE_1}} ~ {{FOOTER_COL_TITLE_3}}
* Copyright → {{COPYRIGHT}}
* Blog titles → {{BLOG_TITLE_1}} ~ {{BLOG_TITLE_3}}
* Blog excerpts → {{BLOG_EXCERPT_1}} ~ {{BLOG_EXCERPT_3}}
* Statistics numbers → {{STAT_1}}, {{STAT_2}}, {{STAT_3}}
* Statistics labels → {{STAT_LABEL_1}}, {{STAT_LABEL_2}}, {{STAT_LABEL_3}}

For language flag images (if any), use: <span data-img-slot="flag-kr">🇰🇷</span>, <span data-img-slot="flag-cn">🇨🇳</span>, <span data-img-slot="flag-us">🇺🇸</span>, <span data-img-slot="flag-jp">🇯🇵</span>

STRICT RULES — VIOLATIONS WILL BREAK THE OUTPUT:
1. Do NOT add large decorative letters (T, M, Y, R, S, or any single letter)
   as watermarks or background decorations.
   These are confusing and look unprofessional.
   Even if the screenshot shows them, DO NOT reproduce them.
2. CRITICAL — Do NOT copy ANY text from the reference screenshot.
   The screenshot belongs to a DIFFERENT business. All visible text
   (brand names, service names, slogans, descriptions, phone numbers,
   addresses, product names, prices) must be REPLACED with the
   {{PLACEHOLDER}} tokens listed above. Never reproduce the reference
   site's original content.
3. Every section must have real content — no empty colored boxes
   (empty div with just background color and no children).
4. If the right side of a split section appears to show text/list content,
   always include that content using the brand info provided.
5. Maintain dark (#1A1A1A) or beige (#F0EDE8) backgrounds throughout.
   Do NOT use white (#FFFFFF) or light gray as section backgrounds
   unless the screenshot clearly shows a white background section.
6. Do NOT include product-specific images from the screenshot.
   For ALL images, use data-img-slot attributes as instructed above.
   The reference images (cosmetics, food, rooms, etc.) are NOT for this brand.

Output ONLY the HTML code for this section. No explanation, no markdown code fences, no comments.
Use Tailwind CSS classes only. No custom CSS. No <style> tags.`;
}

async function generateCropHtml(
  cropBase64: string,
  cropIndex: number,
  totalCrops: number,
  tokens: DesignTokens,
  apiKey: string,
  industry?: string
): Promise<string> {
  const systemPrompt = getTailwindSystemPrompt();
  const userPrompt = buildCropUserPrompt(cropIndex, totalCrops, tokens, industry);

  const resp = await callVisionApiWithSystem(
    cropBase64,
    systemPrompt,
    userPrompt,
    apiKey,
    8000
  );

  return cleanCropOutput(resp);
}

/**
 * Vision API 응답에서 clean HTML만 추출
 */
function cleanCropOutput(text: string): string {
  let html = extractHtml(text);

  // <style> 태그 제거 (Tailwind만 사용해야 함)
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // 래퍼 태그 제거
  html = html.replace(/<!DOCTYPE[^>]*>/gi, "");
  html = html.replace(/<html[^>]*>/gi, "");
  html = html.replace(/<\/html>/gi, "");
  html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");
  html = html.replace(/<head[^>]*>/gi, "");
  html = html.replace(/<\/head>/gi, "");
  html = html.replace(/<body[^>]*>/gi, "");
  html = html.replace(/<\/body>/gi, "");
  html = html.replace(/<link[^>]*>/gi, "");
  html = html.replace(/<meta[^>]*>/gi, "");
  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
  // Tailwind CDN script 제거 (우리가 직접 추가)
  html = html.replace(/<script[^>]*tailwindcss[^>]*>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<script[^>]*tailwindcss[^>]*\/>/gi, "");
  html = html.replace(/<script[^>]*cdn\.tailwindcss[^>]*>[\s\S]*?<\/script>/gi, "");

  return html.trim();
}

// ── 기본 블로그 섹션 (Tailwind CSS) ──────────────────────────────────────────

function getDefaultBlogHtml(): string {
  return `<section class="py-20 px-[5%] bg-[#1A1A1A]">
  <h2 class="text-3xl font-bold text-center mb-10 text-white">블로그</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
    <article class="rounded-lg overflow-hidden bg-[#2A2A2A]">
      <div class="h-48 bg-gray-700 bg-cover bg-center" data-img-slot="blog"></div>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-white mb-2">{{BLOG_TITLE_1}}</h3>
        <p class="text-sm text-[#999999]">{{BLOG_EXCERPT_1}}</p>
      </div>
    </article>
    <article class="rounded-lg overflow-hidden bg-[#2A2A2A]">
      <div class="h-48 bg-gray-700 bg-cover bg-center" data-img-slot="blog"></div>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-white mb-2">{{BLOG_TITLE_2}}</h3>
        <p class="text-sm text-[#999999]">{{BLOG_EXCERPT_2}}</p>
      </div>
    </article>
    <article class="rounded-lg overflow-hidden bg-[#2A2A2A]">
      <div class="h-48 bg-gray-700 bg-cover bg-center" data-img-slot="blog"></div>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-white mb-2">{{BLOG_TITLE_3}}</h3>
        <p class="text-sm text-[#999999]">{{BLOG_EXCERPT_3}}</p>
      </div>
    </article>
  </div>
</section>`;
}

function getDefaultFooterHtml(): string {
  return `<footer class="bg-[#111111] text-white py-16 px-[5%]">
  <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
    <div>
      <h3 class="text-xl font-bold mb-4">{{BRAND_NAME}}</h3>
      <p class="text-sm text-[#888888] leading-relaxed">{{ADDRESS}}</p>
      <p class="text-sm text-[#888888] mt-2">Tel. {{PHONE}}</p>
      <p class="text-sm text-[#888888] mt-2">{{HOURS}}</p>
    </div>
    <div>
      <h4 class="font-semibold mb-4">{{FOOTER_COL_TITLE_1}}</h4>
      <ul class="space-y-2 text-sm text-[#888888]">
        <li>{{ITEM_TITLE_1}}</li>
        <li>{{ITEM_TITLE_2}}</li>
        <li>{{ITEM_TITLE_3}}</li>
      </ul>
    </div>
    <div>
      <h4 class="font-semibold mb-4">{{FOOTER_COL_TITLE_2}}</h4>
      <ul class="space-y-2 text-sm text-[#888888]">
        <li>{{NAV_LABEL_1}}</li>
        <li>{{NAV_LABEL_2}}</li>
        <li>{{NAV_LABEL_3}}</li>
      </ul>
    </div>
    <div>
      <h4 class="font-semibold mb-4">{{FOOTER_COL_TITLE_3}}</h4>
      <ul class="space-y-2 text-sm text-[#888888]">
        <li>{{NAV_LABEL_4}}</li>
        <li>{{NAV_LABEL_5}}</li>
      </ul>
    </div>
  </div>
  <div class="max-w-6xl mx-auto mt-10 pt-6 border-t border-[#2A2A2A] text-center text-xs text-[#555555]">
    {{COPYRIGHT}}
  </div>
</footer>`;
}

// ── Tailwind HTML 조립 ────────────────────────────────────────────────────────

function assembleTailwindHtml(
  cropHtmls: string[],
  extras: string[],
  tokens: DesignTokens
): string {
  const allSections = [...cropHtmls, ...extras].join("\n\n  ");

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
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              primary: '${tokens.primaryColor}',
              accent: '${tokens.accentColor}',
              bg: '${tokens.backgroundColor}',
              text: '${tokens.textColor}',
            }
          },
          fontFamily: {
            heading: ['${tokens.headingFont}', 'sans-serif'],
            body: ['${tokens.bodyFont}', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    body {
      font-family: '${tokens.bodyFont}', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: '${tokens.headingFont}', sans-serif;
    }
  </style>
</head>
<body class="bg-[${tokens.backgroundColor}] text-[${tokens.textColor}]">
  ${allSections}
</body>
</html>`;
}

// ── Vision API 호출 ──────────────────────────────────────────────────────────

/** system + user prompt Vision API 호출 (Stage B 크롭용) */
async function callVisionApiWithSystem(
  screenshotBase64: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  maxTokens: number = 8000
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
      system: systemPrompt,
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
              text: userPrompt,
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

  return text;
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

// ── 업종별 컨텍스트 ─────────────────────────────────────────────────────────

const INDUSTRY_CONTEXT_MAP: Record<string, string> = {
  피부과: `
INDUSTRY CONTEXT — 피부과/클리닉:
This website is for a dermatology clinic. Appropriate section types:
- Hero: clinic name + tagline + CTA
- Services: 시술 목록 (레이저, 보톡스, 필러, 리프팅 등)
- Gallery: 시술 전후 사진 슬롯
- Doctor/Team: 의료진 소개
- Contact: 상담 예약 폼 + 위치
Do NOT include cosmetics product images or shopping cart elements.`,

  의원: `
INDUSTRY CONTEXT — 의원/클리닉:
This website is for a medical clinic. Appropriate section types:
- Hero: clinic name + tagline + CTA
- Services: 진료 과목 / 시술 목록
- About: 의료진 소개, 장비 소개
- Gallery: 시술 전후 사진 슬롯
- Contact: 상담 예약 폼 + 위치
Do NOT include unrelated product images.`,

  치과: `
INDUSTRY CONTEXT — 치과:
This website is for a dental clinic. Appropriate section types:
- Hero: clinic name + tagline + CTA
- Services: 임플란트, 교정, 미백, 충치치료 등
- Doctor/Team: 의료진 소개
- Gallery: 진료 공간 또는 시술 결과
- Contact: 예약 폼 + 오시는 길`,

  숙박: `
INDUSTRY CONTEXT — 숙박/호텔:
This website is for an accommodation business. Appropriate section types:
- Hero: property name + hero image + CTA
- Rooms: 객실 타입별 소개
- Facilities: 부대시설 (스파, 수영장, 레스토랑 등)
- Gallery: 객실/시설 사진 슬롯
- Location: 오시는 길 + 주변 관광지
- Contact: 예약 문의 폼`,

  카페: `
INDUSTRY CONTEXT — 카페:
This website is for a cafe. Appropriate section types:
- Hero: cafe name + ambiance image + CTA
- Menu: 음료/디저트 목록
- About: 카페 스토리, 인테리어 컨셉
- Gallery: 매장/메뉴 사진 슬롯
- Location: 오시는 길 + 영업시간`,

  음식점: `
INDUSTRY CONTEXT — 음식점/레스토랑:
This website is for a restaurant. Appropriate section types:
- Hero: restaurant name + signature dish image + CTA
- Menu: 메뉴 카테고리별 소개
- About: 셰프/브랜드 스토리
- Gallery: 음식/매장 사진 슬롯
- Reservation: 예약 폼 + 영업시간 + 위치`,
};

/**
 * 업종에 맞는 섹션 구조 힌트를 반환한다.
 * 매칭되는 업종이 없으면 빈 문자열.
 */
function getIndustryContext(industry: string): string {
  // 정확히 매칭
  if (INDUSTRY_CONTEXT_MAP[industry]) {
    return INDUSTRY_CONTEXT_MAP[industry];
  }
  // 부분 매칭 (예: "피부과의원" → "피부과")
  for (const [key, context] of Object.entries(INDUSTRY_CONTEXT_MAP)) {
    if (industry.includes(key) || key.includes(industry)) {
      return context;
    }
  }
  // 범용 업종 컨텍스트
  return `
INDUSTRY CONTEXT — ${industry}:
This website is for a "${industry}" business. Use appropriate section types
that match this industry. Do NOT include images or content from the
reference screenshot's industry if it differs.`;
}

// ── HTML 추출 유틸 ────────────────────────────────────────────────────────

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
