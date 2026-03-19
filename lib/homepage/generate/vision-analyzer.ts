/**
 * vision-analyzer.ts
 * 레퍼런스 홈페이지 스크린샷을 Claude Vision API로 분석하여
 * 구조(layout) + 디자인 토큰을 추출한다.
 *
 * - model: claude-sonnet-4-6 (Vision 지원)
 * - 입력: base64 JPEG 스크린샷 + cheerio 크롤링 디자인 데이터
 * - 출력: ReferenceStructure JSON
 */

import type { MergedDesignProfile } from "./homepage-crawl-types";

// ── 출력 타입 ─────────────────────────────────────────────────────────────────

export interface ReferenceSection {
  type: string;
  order: number;
  /** 레이아웃 토큰: "centered-text", "2-col-image-left", "3-card-grid", "full-width-bg" 등 */
  layout: string;
  /** 배경 스키마: "dark-bg", "light-bg", "gradient", "primary-bg", "image-bg" */
  colorScheme: string;
  /** 이 섹션에 들어갈 콘텐츠 힌트 */
  contentHints: string;
}

export interface ReferenceStructure {
  sections: ReferenceSection[];
  globalStyle: {
    designTone: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string | null;
    backgroundColor: string;
    textColor: string;
    headingFont: string | null;
    bodyFont: string | null;
    /** "none" | "small" (4px) | "medium" (8-12px) | "large" (16-20px) | "pill" (999px) */
    borderRadius: string;
    /** "compact" | "normal" | "spacious" */
    spacing: string;
  };
  heroStyle: {
    hasBackgroundImage: boolean;
    hasOverlay: boolean;
    textAlignment: string;
    ctaStyle: string;
  };
  navStyle: {
    position: string;
    background: string;
    alignment: string;
  };
}

// ── Vision 분석 메인 함수 ─────────────────────────────────────────────────────

export async function analyzeReferenceScreenshot(
  screenshotBase64: string,
  designData: MergedDesignProfile,
  apiKey: string
): Promise<ReferenceStructure> {
  const prompt = buildVisionPrompt(designData);

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
    throw new Error(`Vision API HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await resp.json();
  const responseText: string = data.content?.[0]?.text || "";

  if (!responseText) {
    throw new Error("Vision API 응답 비어있음");
  }

  // JSON 추출
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Vision API JSON 파싱 실패");
  }

  const parsed = JSON.parse(jsonMatch[0]) as ReferenceStructure;

  // 크롤링 데이터로 보강 (Vision이 색상을 잘못 읽는 경우 보정)
  return enrichWithCrawlData(parsed, designData);
}

// ── Vision 프롬프트 ─────────────────────────────────────────────────────────

function buildVisionPrompt(designData: MergedDesignProfile): string {
  return `이 홈페이지 스크린샷의 구조와 디자인을 분석하세요.

[크롤링으로 사전 추출된 디자인 데이터 — 색상은 이 데이터를 우선 사용]
- 주색: ${designData.primaryColor}
- 보조색: ${designData.secondaryColor}
- 강조색: ${designData.accentColor || "없음"}
- 배경색: ${designData.backgroundColor}
- 텍스트색: ${designData.textColor}
- 제목 폰트: ${designData.headingFont || "기본"}
- 본문 폰트: ${designData.bodyFont || "기본"}
- 디자인 스타일: ${designData.designStyle}

다음 JSON 형식으로 분석 결과를 출력하세요:
{
  "sections": [
    {
      "type": "hero|about|services|portfolio|testimonials|cta|contact|faq|stats|map|footer",
      "order": 0,
      "layout": "레이아웃 토큰 (centered-text, 2-col-image-left, 3-card-grid, full-width-bg, split-50-50 등)",
      "colorScheme": "dark-bg|light-bg|gradient|primary-bg|image-bg",
      "contentHints": "이 섹션의 콘텐츠 유형 간략 설명"
    }
  ],
  "globalStyle": {
    "designTone": "modern-minimal|bold-dark|luxury-elegant|natural-organic|warm-friendly|corporate-clean",
    "primaryColor": "#hex (크롤링 데이터 우선)",
    "secondaryColor": "#hex",
    "accentColor": "#hex 또는 null",
    "backgroundColor": "#hex",
    "textColor": "#hex",
    "headingFont": "폰트명 또는 null",
    "bodyFont": "폰트명 또는 null",
    "borderRadius": "none|small|medium|large|pill",
    "spacing": "compact|normal|spacious"
  },
  "heroStyle": {
    "hasBackgroundImage": true/false,
    "hasOverlay": true/false,
    "textAlignment": "center|left",
    "ctaStyle": "button|phone-link|form"
  },
  "navStyle": {
    "position": "fixed|static",
    "background": "transparent|solid|blur",
    "alignment": "between|center"
  }
}

중요:
- 반드시 유효한 JSON만 출력하세요.
- sections는 스크린샷에 보이는 순서대로 나열하세요.
- 색상값은 크롤링 데이터를 우선 사용하고, 스크린샷에서 추가로 발견된 색상만 보완하세요.
- layout 토큰은 해당 섹션의 실제 배치를 구체적으로 기술하세요.`;
}

// ── 크롤링 데이터로 보강 ─────────────────────────────────────────────────────

function enrichWithCrawlData(
  vision: ReferenceStructure,
  crawl: MergedDesignProfile
): ReferenceStructure {
  // 색상: 크롤링 데이터가 더 정확 (Vision은 스크린샷 압축/렌더링으로 색 왜곡 가능)
  const gs = vision.globalStyle;
  gs.primaryColor = crawl.primaryColor || gs.primaryColor;
  gs.secondaryColor = crawl.secondaryColor || gs.secondaryColor;
  gs.accentColor = crawl.accentColor || gs.accentColor;
  gs.backgroundColor = crawl.backgroundColor || gs.backgroundColor;
  gs.textColor = crawl.textColor || gs.textColor;

  // 폰트: 크롤링이 확실하면 사용
  if (crawl.headingFont) gs.headingFont = crawl.headingFont;
  if (crawl.bodyFont) gs.bodyFont = crawl.bodyFont;

  // sections가 비어있으면 크롤링 sectionOrder로 폴백
  if (!vision.sections || vision.sections.length === 0) {
    vision.sections = crawl.sectionOrder.map((type, i) => ({
      type,
      order: i,
      layout: "centered-text",
      colorScheme: "light-bg",
      contentHints: "",
    }));
  }

  return vision;
}

// ── HTML 텍스트 기반 구조 분석 (스크린샷 없이 Claude로 분석) ────────────────────

export async function analyzeStructureFromHtml(
  html: string,
  designData: MergedDesignProfile,
  apiKey: string
): Promise<ReferenceStructure> {
  // HTML을 적절한 크기로 잘라서 전달 (토큰 절약)
  const truncatedHtml = truncateHtml(html, 15000);
  const prompt = buildHtmlAnalysisPrompt(truncatedHtml, designData);

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
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`HTML Analysis API HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await resp.json();
  const responseText: string = data.content?.[0]?.text || "";

  if (!responseText) {
    throw new Error("HTML 분석 API 응답 비어있음");
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("HTML 분석 API JSON 파싱 실패");
  }

  const parsed = JSON.parse(jsonMatch[0]) as ReferenceStructure;
  return enrichWithCrawlData(parsed, designData);
}

function truncateHtml(html: string, maxChars: number): string {
  // script, style 태그 내용 제거 (토큰 절약)
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s{2,}/g, " ");

  if (cleaned.length > maxChars) {
    cleaned = cleaned.slice(0, maxChars) + "\n<!-- ... truncated -->";
  }
  return cleaned;
}

function buildHtmlAnalysisPrompt(html: string, designData: MergedDesignProfile): string {
  return `이 HTML 소스 코드를 분석하여 홈페이지의 섹션 구조와 디자인 스타일을 추출하세요.

[크롤링으로 사전 추출된 디자인 데이터]
- 주색: ${designData.primaryColor}
- 보조색: ${designData.secondaryColor}
- 강조색: ${designData.accentColor || "없음"}
- 배경색: ${designData.backgroundColor}
- 텍스트색: ${designData.textColor}
- 제목 폰트: ${designData.headingFont || "기본"}
- 본문 폰트: ${designData.bodyFont || "기본"}
- 디자인 스타일: ${designData.designStyle}

[HTML 소스]
${html}

다음 JSON 형식으로 분석 결과를 출력하세요:
{
  "sections": [
    {
      "type": "hero|about|services|portfolio|testimonials|cta|contact|faq|stats|map|footer",
      "order": 0,
      "layout": "레이아웃 토큰 (centered-text, 2-col-image-left, 2-col-image-right, 3-card-grid, 4-card-grid, full-width-bg, split-50-50, single-column, image-gallery 등)",
      "colorScheme": "dark-bg|light-bg|gradient|primary-bg|image-bg",
      "contentHints": "이 섹션의 콘텐츠 유형 간략 설명"
    }
  ],
  "globalStyle": {
    "designTone": "modern-minimal|bold-dark|luxury-elegant|natural-organic|warm-friendly|corporate-clean",
    "primaryColor": "#hex (크롤링 데이터 우선)",
    "secondaryColor": "#hex",
    "accentColor": "#hex 또는 null",
    "backgroundColor": "#hex",
    "textColor": "#hex",
    "headingFont": "폰트명 또는 null",
    "bodyFont": "폰트명 또는 null",
    "borderRadius": "none|small|medium|large|pill",
    "spacing": "compact|normal|spacious"
  },
  "heroStyle": {
    "hasBackgroundImage": true/false,
    "hasOverlay": true/false,
    "textAlignment": "center|left",
    "ctaStyle": "button|phone-link|form"
  },
  "navStyle": {
    "position": "fixed|static",
    "background": "transparent|solid|blur",
    "alignment": "between|center"
  }
}

중요:
- 반드시 유효한 JSON만 출력하세요.
- sections는 HTML에 나타나는 실제 섹션을 순서대로 모두 나열하세요. 최소 5개 이상의 섹션을 감지하세요.
- HTML의 class명, id, 태그 구조, 텍스트 내용을 분석하여 각 섹션의 type을 정확히 판별하세요.
- layout 토큰은 해당 섹션의 실제 DOM 구조(grid, flex, columns)를 분석하여 구체적으로 기술하세요.
- 색상값은 크롤링 데이터를 우선 사용하세요.
- 어두운 배경의 사이트는 designTone을 "bold-dark"로, 고급스러운 사이트는 "luxury-elegant"로 설정하세요.`;
}

// ── 스크린샷 없을 때 크롤링 데이터만으로 구조 생성 (최종 폴백) ──────────────────

export function buildStructureFromCrawlData(
  designData: MergedDesignProfile
): ReferenceStructure {
  const sections: ReferenceSection[] = designData.sectionOrder.map((type, i) => ({
    type,
    order: i,
    layout: getDefaultLayout(type),
    colorScheme: getDefaultColorScheme(type),
    contentHints: "",
  }));

  return {
    sections,
    globalStyle: {
      designTone: mapDesignStyle(designData.designStyle),
      primaryColor: designData.primaryColor,
      secondaryColor: designData.secondaryColor,
      accentColor: designData.accentColor,
      backgroundColor: designData.backgroundColor,
      textColor: designData.textColor,
      headingFont: designData.headingFont,
      bodyFont: designData.bodyFont,
      borderRadius: "medium",
      spacing: "normal",
    },
    heroStyle: {
      hasBackgroundImage: false,
      hasOverlay: false,
      textAlignment: "center",
      ctaStyle: "button",
    },
    navStyle: {
      position: "fixed",
      background: "blur",
      alignment: "between",
    },
  };
}

function getDefaultLayout(type: string): string {
  const map: Record<string, string> = {
    hero: "centered-text",
    about: "centered-text",
    services: "3-card-grid",
    portfolio: "3-card-grid",
    testimonials: "3-card-grid",
    cta: "centered-text",
    contact: "centered-text",
    faq: "single-column",
    stats: "4-col-counter",
    map: "centered-text",
    footer: "centered-text",
  };
  return map[type] || "centered-text";
}

function getDefaultColorScheme(type: string): string {
  const dark = ["hero", "cta", "stats"];
  return dark.includes(type) ? "primary-bg" : "light-bg";
}

function mapDesignStyle(style: string): string {
  const map: Record<string, string> = {
    modern: "modern-minimal",
    bold: "bold-dark",
    luxury: "luxury-elegant",
    natural: "natural-organic",
    warm: "warm-friendly",
    minimal: "modern-minimal",
  };
  return map[style] || "modern-minimal";
}
