/**
 * design-extractor.ts
 * HTML에서 디자인 요소를 추출하는 순수 함수 모듈 (cheerio 기반)
 */

import * as cheerio from "cheerio";
import axios from "axios";
import type {
  HomepageDesignAnalysis,
  SectionInfo,
  NavItem,
} from "./homepage-crawl-types";

// ── Tailwind → Hex 매핑 (주요 색상만) ────────────────────────────────────────

const TW_COLOR_MAP: Record<string, string> = {
  "red-500": "#ef4444", "red-600": "#dc2626", "red-700": "#b91c1c",
  "orange-500": "#f97316", "orange-600": "#ea580c",
  "amber-500": "#f59e0b", "amber-600": "#d97706",
  "yellow-500": "#eab308",
  "green-500": "#22c55e", "green-600": "#16a34a", "green-700": "#15803d",
  "emerald-500": "#10b981", "emerald-600": "#059669",
  "teal-500": "#14b8a6", "teal-600": "#0d9488",
  "cyan-500": "#06b6d4",
  "sky-500": "#0ea5e9", "sky-600": "#0284c7",
  "blue-500": "#3b82f6", "blue-600": "#2563eb", "blue-700": "#1d4ed8",
  "indigo-500": "#6366f1", "indigo-600": "#4f46e5",
  "violet-500": "#8b5cf6", "violet-600": "#7c3aed",
  "purple-500": "#a855f7", "purple-600": "#9333ea",
  "fuchsia-500": "#d946ef",
  "pink-500": "#ec4899", "pink-600": "#db2777",
  "rose-500": "#f43f5e", "rose-600": "#e11d48",
  "slate-50": "#f8fafc", "slate-100": "#f1f5f9", "slate-800": "#1e293b", "slate-900": "#0f172a",
  "gray-50": "#f9fafb", "gray-100": "#f3f4f6", "gray-800": "#1f2937", "gray-900": "#111827",
  "zinc-50": "#fafafa", "zinc-100": "#f4f4f5", "zinc-800": "#27272a", "zinc-900": "#18181b",
  "neutral-50": "#fafafa", "neutral-100": "#f5f5f5", "neutral-800": "#262626", "neutral-900": "#171717",
  "stone-50": "#fafaf9", "stone-100": "#f5f5f4", "stone-800": "#292524", "stone-900": "#1c1917",
  "white": "#ffffff", "black": "#000000",
};

// ── 섹션 감지 패턴 ──────────────────────────────────────────────────────────

const SECTION_PATTERNS: { type: SectionInfo["type"]; pattern: RegExp }[] = [
  { type: "hero", pattern: /hero|banner|main-visual|jumbotron|splash|intro|slider|visual|keyvisual/i },
  { type: "about", pattern: /about|company|소개|회사|인사말|greeting/i },
  { type: "services", pattern: /service|feature|서비스|시공분야|업무/i },
  { type: "portfolio", pattern: /portfolio|gallery|시공사례|작업|work|project|사례/i },
  { type: "testimonials", pattern: /testimon|review|후기|고객.*리뷰|voice/i },
  { type: "cta", pattern: /cta|call-to-action|견적|상담|contact-cta|inquiry-cta/i },
  { type: "contact", pattern: /contact|문의|연락|오시는.*길|찾아오시는|map|location/i },
  { type: "faq", pattern: /faq|자주.*묻|질문.*답/i },
  { type: "footer", pattern: /footer|bottom/i },
  { type: "stats", pattern: /stats|number|counter|실적|숫자/i },
  { type: "pricing", pattern: /pricing|price|요금|가격/i },
  { type: "blog", pattern: /blog|news|notice|공지|소식/i },
  { type: "map", pattern: /map|지도|위치/i },
];

// ── 색상 추출 헬퍼 ──────────────────────────────────────────────────────────

const HEX_RE = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
const RGB_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/g;
const CSS_COLOR_PROP_RE = /(?:color|background-color|background|border-color)\s*:\s*([^;}{]+)/g;
const CSS_VAR_RE = /--(?:primary|secondary|accent|main|brand|theme|base|bg|text|heading|point)[^:]*:\s*([^;}{]+)/gi;
const TW_BG_RE = /\b(?:bg|text|border)-([a-z]+-\d{2,3})\b/g;

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function normalizeColor(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.startsWith("#")) {
    const match = trimmed.match(HEX_RE);
    return match ? match[0] : null;
  }
  const rgbMatch = RGB_RE.exec(trimmed);
  RGB_RE.lastIndex = 0;
  if (rgbMatch) {
    return rgbToHex(+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]);
  }
  // named color 무시 (transparent, inherit 등)
  return null;
}

function isNeutral(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // 채도가 매우 낮으면 중립색
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 30;
}

function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

// ── 메인 추출 함수 ──────────────────────────────────────────────────────────

export async function extractDesignFromHTML(
  html: string,
  url: string,
  crawlMethod: "http" | "playwright" = "http"
): Promise<HomepageDesignAnalysis> {
  const $ = cheerio.load(html);

  // 외부 CSS 1개 fetch하여 스타일 분석 보강
  const externalCss = await fetchFirstExternalCss($, url);
  const allCss = collectStyleContent($, html) + (externalCss ? "\n" + externalCss : "");

  const sections = detectLayoutSections($);

  return {
    url,
    crawlMethod,
    text: extractTextContent($),
    design: {
      colorPalette: extractColorsFromCss($, allCss),
      fonts: extractFontsFromCss($, allCss),
      borderRadius: extractBorderRadiusFromCss(allCss),
      designStyle: null, // merger에서 추론
    },
    images: extractImagesFromHTML($, url),
    layout: {
      sections,
      navigation: extractNavigation($),
      hasHero: sections.some((s) => s.type === "hero"),
      hasPortfolio: sections.some((s) => s.type === "portfolio"),
      hasCta: sections.some((s) => s.type === "cta"),
      hasTestimonials: sections.some((s) => s.type === "testimonials"),
      hasFaq: sections.some((s) => s.type === "faq"),
    },
    meta: extractMetaTags($, url),
  };
}

// ── 텍스트 추출 (기존 scraper 호환) ──────────────────────────────────────────

function extractTextContent($: cheerio.CheerioAPI): HomepageDesignAnalysis["text"] {
  const $clean = cheerio.load($.html() || "");
  $clean("script, style, noscript, iframe, svg").remove();
  $clean('[style*="display:none"], [style*="display: none"], .hidden, [hidden]').remove();

  const title =
    $clean("title").text().trim() ||
    $clean('meta[property="og:title"]').attr("content")?.trim() ||
    $clean("h1").first().text().trim() ||
    "";

  const metaDescription =
    $clean('meta[name="description"]').attr("content")?.trim() ||
    $clean('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  const headings: string[] = [];
  $clean("h1, h2, h3").each((_, el) => {
    const text = $clean(el).text().trim();
    if (text && text.length > 2 && text.length < 200) {
      headings.push(text);
    }
  });

  const paragraphs: string[] = [];
  $clean("p, li, article, section > div, .content, .description, .about").each((_, el) => {
    const text = $clean(el).text().trim();
    if (text && text.length > 20 && text.length < 1000 && !paragraphs.includes(text)) {
      paragraphs.push(text);
    }
  });

  const textParts: string[] = [
    title && `Title: ${title}`,
    metaDescription && `Description: ${metaDescription}`,
    headings.length > 0 && `Headings: ${headings.slice(0, 10).join(", ")}`,
    paragraphs.length > 0 && `Content: ${paragraphs.slice(0, 15).join(" ")}`,
  ].filter(Boolean) as string[];

  let fullText = textParts.join("\n\n");

  const mainContent = $clean("main, article, .main, #main, .content, #content").text().trim();
  if (fullText.length < 200 && mainContent.length > 100) {
    fullText += "\n\n" + mainContent.slice(0, 2000);
  }
  if (fullText.length > 4000) {
    fullText = fullText.slice(0, 4000) + "...";
  }

  return {
    title,
    metaDescription,
    headings: headings.slice(0, 10),
    paragraphs: paragraphs.slice(0, 15),
    fullText,
  };
}

// ── 외부 CSS fetch (첫 번째 1개만, 3초 타임아웃) ──────────────────────────────

async function fetchFirstExternalCss($: cheerio.CheerioAPI, baseUrl: string): Promise<string | null> {
  const firstCssLink = $('link[rel="stylesheet"]').first().attr("href");
  if (!firstCssLink) return null;

  try {
    const cssUrl = new URL(firstCssLink, baseUrl).href;
    const resp = await axios.get(cssUrl, { timeout: 3000, responseType: "text" });
    if (typeof resp.data === "string" && resp.data.length < 500000) {
      return resp.data;
    }
  } catch {
    // 실패해도 무시
  }
  return null;
}

// ── 색상 추출 ────────────────────────────────────────────────────────────────

function extractColorsFromCss(
  $: cheerio.CheerioAPI,
  allCss: string
): HomepageDesignAnalysis["design"]["colorPalette"] {
  const colorCounts = new Map<string, number>();

  function addColor(hex: string) {
    const lower = hex.toLowerCase();
    colorCounts.set(lower, (colorCounts.get(lower) || 0) + 1);
  }

  let match: RegExpExecArray | null;

  while ((match = CSS_COLOR_PROP_RE.exec(allCss)) !== null) {
    const val = match[1];
    // hex
    const hexes = val.match(HEX_RE);
    if (hexes) hexes.forEach((h) => addColor(h));
    // rgb/rgba
    let rgbM: RegExpExecArray | null;
    while ((rgbM = RGB_RE.exec(val)) !== null) {
      addColor(rgbToHex(+rgbM[1], +rgbM[2], +rgbM[3]));
    }
  }

  // 2. CSS 변수
  while ((match = CSS_VAR_RE.exec(allCss)) !== null) {
    const normalized = normalizeColor(match[1]);
    if (normalized) addColor(normalized);
  }

  // 3. Tailwind 클래스 (HTML class 속성에서 추출)
  const rawHtml = $.html() || "";
  while ((match = TW_BG_RE.exec(rawHtml)) !== null) {
    const hex = TW_COLOR_MAP[match[1]];
    if (hex) addColor(hex);
  }

  // 4. <meta name="theme-color">
  const themeColor = $('meta[name="theme-color"]').attr("content");
  if (themeColor) {
    const normalized = normalizeColor(themeColor);
    if (normalized) {
      addColor(normalized);
      addColor(normalized); // 가중치 부여
    }
  }

  // 빈도 정렬
  const allColors = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);

  // 분류
  const chromatic = allColors.filter((c) => !isNeutral(c));
  const neutralLight = allColors.filter((c) => isNeutral(c) && isLight(c));
  const neutralDark = allColors.filter((c) => isNeutral(c) && !isLight(c));

  return {
    primary: chromatic[0] || null,
    secondary: chromatic[1] || null,
    accent: chromatic[2] || null,
    background: neutralLight[0] || "#ffffff",
    textColor: neutralDark[0] || "#111111",
    allColors: allColors.slice(0, 20),
  };
}

function collectStyleContent($: cheerio.CheerioAPI, html: string): string {
  const parts: string[] = [];

  // <style> 태그 내용
  $("style").each((_, el) => {
    parts.push($(el).text());
  });

  // 인라인 style="" 속성
  $("[style]").each((_, el) => {
    const s = $(el).attr("style");
    if (s) parts.push(s);
  });

  // 외부 CSS <link>는 별도 fetch 하지 않음 (성능 이유)
  // 대신 html 전체에서 정규식으로 보완
  return parts.join("\n");
}

// ── 폰트 추출 ────────────────────────────────────────────────────────────────

function extractFontsFromCss(
  $: cheerio.CheerioAPI,
  allCss: string
): HomepageDesignAnalysis["design"]["fonts"] {
  const fonts: string[] = [];

  // Google Fonts <link>에서 family 파라미터 추출
  $('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const familyMatch = href.match(/family=([^&:]+)/);
    if (familyMatch) {
      fonts.push(decodeURIComponent(familyMatch[1]).replace(/\+/g, " "));
    }
  });

  // allCss에서 font-family 추출
  const fontFamilyRe = /font-family\s*:\s*['"]?([^;'"}\n]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = fontFamilyRe.exec(allCss)) !== null) {
    const familyRaw = match[1].trim();
    const first = familyRaw.split(",")[0].trim().replace(/['"]/g, "");
    if (first && !["inherit", "initial", "sans-serif", "serif", "monospace", "cursive", "system-ui"].includes(first.toLowerCase())) {
      fonts.push(first);
    }
  }

  // 제목/본문 분류
  const headingFont = fonts[0] || null;
  const bodyFont = fonts.length > 1 ? fonts[1] : null;

  return { heading: headingFont, body: bodyFont };
}

// ── 이미지 추출 ──────────────────────────────────────────────────────────────

function extractImagesFromHTML(
  $: cheerio.CheerioAPI,
  baseUrl: string
): HomepageDesignAnalysis["images"] {
  const toAbsolute = (src: string | undefined): string | null => {
    if (!src) return null;
    try {
      return new URL(src, baseUrl).href;
    } catch {
      return null;
    }
  };

  // OG image
  const ogImageUrl = toAbsolute(
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content")
  );

  // Logo
  let logoUrl: string | null = null;
  const logoSelectors = [
    'img[class*="logo"]', 'img[id*="logo"]', 'img[alt*="logo"]', 'img[alt*="로고"]',
    'a[class*="logo"] img', 'header img:first-child', '.logo img', '#logo img',
  ];
  for (const sel of logoSelectors) {
    const src = $(sel).first().attr("src");
    if (src) {
      logoUrl = toAbsolute(src);
      break;
    }
  }

  // Hero image
  let heroImageUrl: string | null = null;
  const heroSelectors = [
    '[class*="hero"] img', '[class*="banner"] img', '[class*="slider"] img',
    '[class*="visual"] img', '[class*="main-visual"] img', '[id*="hero"] img',
    'section:first-of-type img',
  ];
  for (const sel of heroSelectors) {
    const src = $(sel).first().attr("src");
    if (src) {
      heroImageUrl = toAbsolute(src);
      break;
    }
  }
  // CSS background-image 폴백
  if (!heroImageUrl) {
    const heroEls = $('[class*="hero"], [class*="banner"], [class*="visual"]');
    heroEls.each((_, el) => {
      if (heroImageUrl) return;
      const style = $(el).attr("style") || "";
      const bgMatch = style.match(/background-image\s*:\s*url\(['"]?([^'")\s]+)['"]?\)/);
      if (bgMatch) {
        heroImageUrl = toAbsolute(bgMatch[1]);
      }
    });
  }

  // Section images (최대 10개)
  const sectionImages: string[] = [];
  const seenSrcs = new Set<string>();
  $("img").each((_, el) => {
    if (sectionImages.length >= 10) return;
    const src = $(el).attr("src");
    const abs = toAbsolute(src);
    if (!abs || seenSrcs.has(abs)) return;
    // skip tiny images (icons, spacers)
    const width = parseInt($(el).attr("width") || "0", 10);
    const height = parseInt($(el).attr("height") || "0", 10);
    if ((width > 0 && width < 50) || (height > 0 && height < 50)) return;
    // skip data URIs and tracking pixels
    if (abs.startsWith("data:") || abs.includes("pixel") || abs.includes("tracking")) return;
    seenSrcs.add(abs);
    sectionImages.push(abs);
  });

  // Favicon
  const faviconUrl = toAbsolute(
    $('link[rel="icon"]').attr("href") ||
    $('link[rel="shortcut icon"]').attr("href") ||
    $('link[rel="apple-touch-icon"]').attr("href")
  );

  return {
    heroImageUrl,
    logoUrl,
    ogImageUrl,
    sectionImages,
    faviconUrl,
  };
}

// ── 섹션 레이아웃 감지 ──────────────────────────────────────────────────────

function detectLayoutSections($: cheerio.CheerioAPI): SectionInfo[] {
  const sections: SectionInfo[] = [];
  let order = 0;

  $("section, [class*='section'], main > div, body > div > div").each((_, el) => {
    const id = $(el).attr("id") || "";
    const cls = $(el).attr("class") || "";
    const combined = `${id} ${cls}`;

    let matched = false;
    for (const { type, pattern } of SECTION_PATTERNS) {
      if (pattern.test(combined)) {
        const headingEl = $(el).find("h1, h2, h3").first();
        sections.push({
          type,
          order: order++,
          headingText: headingEl.text().trim().slice(0, 100) || null,
        });
        matched = true;
        break;
      }
    }

    if (!matched && $(el).children().length > 2) {
      // 큰 div이면 unknown 섹션으로 기록
      const headingEl = $(el).find("h2, h3").first();
      if (headingEl.length) {
        sections.push({
          type: "unknown",
          order: order++,
          headingText: headingEl.text().trim().slice(0, 100) || null,
        });
      }
    }
  });

  // 중복 제거 (같은 type이 연속)
  return sections.filter((s, i, arr) => i === 0 || s.type !== arr[i - 1].type);
}

// ── 네비게이션 추출 ──────────────────────────────────────────────────────────

function extractNavigation($: cheerio.CheerioAPI): NavItem[] {
  const items: NavItem[] = [];
  const seen = new Set<string>();

  $("nav a, header a, [class*='nav'] a, [class*='menu'] a").each((_, el) => {
    const label = $(el).text().trim();
    const href = $(el).attr("href") || "";
    if (!label || label.length > 50 || label.length < 1) return;
    if (seen.has(label.toLowerCase())) return;
    seen.add(label.toLowerCase());
    items.push({ label, href });
  });

  return items.slice(0, 15);
}

// ── 메타 태그 추출 ──────────────────────────────────────────────────────────

function extractMetaTags(
  $: cheerio.CheerioAPI,
  baseUrl: string
): HomepageDesignAnalysis["meta"] {
  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property");
    const content = $(el).attr("content");
    if (prop && content) ogTags[prop] = content;
  });

  // JSON-LD schema
  let schemaMarkup: Record<string, unknown> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (schemaMarkup) return;
    try {
      schemaMarkup = JSON.parse($(el).text());
    } catch {
      // invalid JSON-LD
    }
  });

  const canonical = $('link[rel="canonical"]').attr("href") || null;
  const favicon =
    $('link[rel="icon"]').attr("href") ||
    $('link[rel="shortcut icon"]').attr("href") ||
    null;

  return {
    ogTags,
    schemaMarkup,
    canonical,
    favicon: favicon ? (() => { try { return new URL(favicon, baseUrl).href; } catch { return favicon; } })() : null,
  };
}

// ── border-radius 추출 ──────────────────────────────────────────────────────

function extractBorderRadiusFromCss(allCss: string): string | null {
  const radiusRe = /border-radius\s*:\s*([^;}{]+)/g;
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = radiusRe.exec(allCss)) !== null) {
    values.push(match[1].trim());
  }
  if (values.length === 0) return null;
  // 가장 빈도 높은 값 반환
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
