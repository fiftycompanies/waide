/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
/**
 * gemini-html-generator.ts
 * MappedPage[] → Gemini API 순차 호출 → HTML 파일 배열 생성
 *
 * 동작 방식:
 * 1. mapBrandToPages()에서 생성된 MappedPage 배열을 입력받음
 * 2. 각 페이지의 prompt를 Gemini API에 순차 전달
 * 3. rate limit 대응 (페이지 간 2초 대기)
 * 4. onProgress 콜백으로 진행 상태 전달
 *
 * 모델: gemini-2.5-flash
 * API 키: GEMINI_API_KEY 환경변수
 *
 * 기존 코드 변경 없음. 신규 파일.
 */

import type { MappedPage } from "./brand-mapper";
import type { DesignSystem } from "./reference-analyzer";

// ── 타입 정의 ────────────────────────────────────────────────────────────────

export interface GeneratedPage {
  name: string;
  slug: string;
  html: string;
  tokenCount?: number;
}

export interface GenerateOptions {
  pages: MappedPage[];
  designSystem: DesignSystem;
  apiKey?: string;
  onProgress?: (current: number, total: number, pageName: string) => void;
}

// ── 메인 함수 ────────────────────────────────────────────────────────────────

/**
 * MappedPage[] → Gemini API 순차 호출 → GeneratedPage[] 반환
 *
 * @param options 생성 옵션 (페이지 목록, 디자인 시스템, API 키, 진행 콜백)
 * @returns GeneratedPage[] (각 페이지의 HTML)
 */
export async function generateMultipageHtml(
  options: GenerateOptions,
): Promise<GeneratedPage[]> {
  const { pages, designSystem, onProgress } = options;
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("[GeminiHtmlGenerator] GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  if (pages.length === 0) {
    throw new Error("[GeminiHtmlGenerator] 생성할 페이지가 없습니다.");
  }

  console.log(`[GeminiHtmlGenerator] ${pages.length}개 페이지 HTML 생성 시작`);

  const results: GeneratedPage[] = [];
  const RATE_LIMIT_DELAY = 2000; // 2초

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNum = i + 1;

    console.log(`[GeminiHtmlGenerator] [${pageNum}/${pages.length}] "${page.name}" 생성 중...`);
    onProgress?.(pageNum, pages.length, page.name);

    try {
      const html = await generatePageHtml(apiKey, page, designSystem);
      const cleaned = cleanHtmlOutput(html);

      results.push({
        name: page.name,
        slug: page.slug,
        html: cleaned,
      });

      console.log(`[GeminiHtmlGenerator] [${pageNum}/${pages.length}] "${page.name}" 완료 (${Math.round(cleaned.length / 1024)}KB)`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[GeminiHtmlGenerator] [${pageNum}/${pages.length}] "${page.name}" 실패: ${msg}`);

      // 실패한 페이지는 에러 페이지로 대체
      results.push({
        name: page.name,
        slug: page.slug,
        html: buildErrorPage(page.name, msg),
      });
    }

    // rate limit 대기 (마지막 페이지 제외)
    if (i < pages.length - 1) {
      console.log(`[GeminiHtmlGenerator] rate limit 대기 ${RATE_LIMIT_DELAY}ms...`);
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  const successCount = results.filter((r) => !r.html.includes("data-error-page")).length;
  console.log(`[GeminiHtmlGenerator] 생성 완료: ${successCount}/${pages.length} 성공`);

  return results;
}

// ── Gemini API 호출 (개별 페이지) ───────────────────────────────────────────

async function generatePageHtml(
  apiKey: string,
  page: MappedPage,
  designSystem: DesignSystem,
): Promise<string> {
  const model = "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = buildSystemInstruction(designSystem);

  const body = {
    contents: [
      {
        parts: [
          { text: page.prompt },
        ],
      },
    ],
    systemInstruction: {
      parts: [
        { text: systemInstruction },
      ],
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 16000,
    },
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`Gemini API HTTP ${resp.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await resp.json();

  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini API 응답에 candidates가 없습니다.");
  }

  const parts = candidates[0].content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("Gemini API 응답에 parts가 없습니다.");
  }

  const textParts = parts.filter((p: { text?: string }) => p.text);
  if (textParts.length === 0) {
    throw new Error("Gemini API 응답에 텍스트가 없습니다.");
  }

  return textParts.map((p: { text: string }) => p.text).join("\n");
}

// ── 시스템 인스트럭션 ────────────────────────────────────────────────────────

function buildSystemInstruction(designSystem: DesignSystem): string {
  return `You are an expert web developer specializing in modern, responsive Korean business websites.

CRITICAL RULES:
1. Output ONLY raw HTML code. No markdown, no code fences (\`\`\`), no explanations.
2. Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>).
3. All text must be in Korean.
4. Use the following design system:
   - Primary: ${designSystem.primaryColor}
   - Accent: ${designSystem.accentColor}
   - Background: ${designSystem.backgroundColor}
   - Text: ${designSystem.textColor}
   - Heading font: ${designSystem.headingFont}
   - Body font: ${designSystem.bodyFont}
5. Include Google Fonts link for ${designSystem.headingFont} and ${designSystem.bodyFont}.
6. Configure tailwind.config with brand colors and fonts.
7. Make all pages fully responsive (sm:, md:, lg: breakpoints).
8. For images, use: <img src="" data-img-slot="TYPE" alt="description" class="...">
   where TYPE is: hero, about, service, gallery, blog, team
9. Use semantic HTML5 elements (header, nav, main, section, footer).
10. Include SEO meta tags (title, description, og:title, og:description).
11. Do NOT use emoji characters as image placeholders.
12. Write complete, production-ready HTML.`;
}

// ── HTML 정리 ────────────────────────────────────────────────────────────────

function cleanHtmlOutput(text: string): string {
  let html = text;

  // 코드 블록 추출
  const codeBlockMatch = html.match(/```html\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    html = codeBlockMatch[1].trim();
  } else {
    const genericBlockMatch = html.match(/```\s*([\s\S]*?)```/);
    if (genericBlockMatch) {
      html = genericBlockMatch[1].trim();
    }
  }

  // HTML 시작점 찾기
  if (!html.startsWith("<!DOCTYPE") && !html.startsWith("<html")) {
    const htmlStart = html.indexOf("<!DOCTYPE");
    if (htmlStart !== -1) {
      html = html.slice(htmlStart);
    } else {
      const htmlTagStart = html.indexOf("<html");
      if (htmlTagStart !== -1) {
        html = html.slice(htmlTagStart);
      }
    }
  }

  return html.trim();
}

// ── 에러 페이지 ──────────────────────────────────────────────────────────────

function buildErrorPage(pageName: string, errorMessage: string): string {
  return `<!DOCTYPE html>
<html lang="ko" data-error-page="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageName} - 생성 실패</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
  <div class="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
    <h1 class="text-2xl font-bold text-gray-800 mb-4">${pageName}</h1>
    <p class="text-gray-600 mb-2">페이지 생성 중 오류가 발생했습니다.</p>
    <p class="text-sm text-gray-400">${errorMessage.slice(0, 100)}</p>
  </div>
</body>
</html>`;
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
