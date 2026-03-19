/**
 * reference-cloner.ts
 * 레퍼런스 사이트 DOM 완전 복제 크롤러
 *
 * 패러다임: "생성 금지, 복제 후 교체만"
 * 1. Playwright로 완전 렌더링된 HTML 수집
 * 2. 외부 CSS 모두 인라인화
 * 3. 외부 JS 제거 (보안·개인정보)
 * 4. 완전한 독립 HTML 반환
 */

import {
  createStealthBrowser,
} from "@/lib/crawlers/playwright-base";

// ── 반환 타입 ──────────────────────────────────────────────────────────────────

export interface CloneResult {
  /** 독립 실행 가능한 HTML (외부 리소스 없음) */
  html: string;
  /** 레퍼런스 사이트 base URL (이미지 절대경로 변환용) */
  baseUrl: string;
}

// ── 하위 호환용 DEPRECATED 타입 ────────────────────────────────────────────────

/** @deprecated DOM 복제 파이프라인에서는 미사용 */
export interface BrandContent {
  brandName: string;
  industry: string;
  phone: string | null;
  address: string | null;
  websiteUrl: string | null;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutDescription: string;
  services: Array<{ title: string; description: string }>;
  whyChooseUs: Array<{ title: string; description: string }>;
  ctaText: string;
  seoTitle: string;
  seoDescription: string;
  testimonials?: Array<{ text: string; author: string }>;
  faqItems?: Array<{ question: string; answer: string }>;
  stats?: Array<{ number: string; label: string }>;
}

/** @deprecated DOM 복제 파이프라인에서는 미사용 */
export interface ClonerOptions {
  referenceHtml?: string | null;
  industry?: string;
}

/** @deprecated DOM 복제 파이프라인으로 전환. cloneReference()를 사용하세요. */
export async function generateReferenceCloneHtml(
  _structure: unknown,
  _brandContent: unknown,
  _apiKey: string,
  _options?: unknown
): Promise<string> {
  throw new Error(
    "[DEPRECATED] generateReferenceCloneHtml()는 폐기됨. cloneReference()를 사용하세요."
  );
}

// ── 메인: 레퍼런스 사이트 완전 복제 ─────────────────────────────────────────────

export async function cloneReference(url: string): Promise<CloneResult> {
  // URL 정규화
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  const baseUrl = new URL(normalizedUrl).origin;

  // Step 1: Playwright로 완전 렌더링된 HTML 수집
  const result = await createStealthBrowser();
  if (!result) {
    throw new Error("Playwright를 사용할 수 없습니다 (미설치)");
  }

  const { browser, context } = result;

  try {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    // networkidle 대기 (JS 렌더링 완료)
    try {
      await page.goto(normalizedUrl, { waitUntil: "networkidle", timeout: 40000 });
    } catch {
      // networkidle 실패 시 load + 추가 대기로 폴백
      await page.goto(normalizedUrl, { waitUntil: "load", timeout: 20000 });
      await page.waitForTimeout(3000);
    }

    // 추가 렌더링 대기 (이미지/폰트/CSS)
    await page.waitForTimeout(2000);

    // Step 2: 외부 CSS URL 수집 + 인라인화 (Playwright 내에서)
    const cssInlineResult = await page.evaluate(async (baseOrigin: string) => {
      const cssTexts: string[] = [];
      const linksToRemove: Element[] = [];

      // <link rel="stylesheet"> 찾기
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      for (const link of links) {
        const href = (link as HTMLLinkElement).href;
        if (!href) continue;

        try {
          const resp = await fetch(href, { mode: "cors" });
          if (resp.ok) {
            let cssText = await resp.text();
            // CSS 내 상대경로 url() → 절대경로로 변환
            const cssBaseUrl = new URL(href).origin;
            cssText = cssText.replace(
              /url\(\s*['"]?(?!data:|https?:|\/\/)(.*?)['"]?\s*\)/gi,
              (_match: string, p1: string) => {
                try {
                  const absUrl = new URL(p1, href).href;
                  return `url('${absUrl}')`;
                } catch {
                  return `url('${cssBaseUrl}/${p1}')`;
                }
              }
            );
            cssTexts.push(cssText);
            linksToRemove.push(link);
          }
        } catch {
          // CORS 실패 등 → 무시 (원본 link 유지)
        }
      }

      // 원본 <link> 제거 + <style> 삽입
      for (const link of linksToRemove) {
        link.remove();
      }
      if (cssTexts.length > 0) {
        const styleEl = document.createElement("style");
        styleEl.textContent = cssTexts.join("\n\n");
        document.head.appendChild(styleEl);
      }

      // <img> src 상대경로 → 절대경로 변환
      const imgs = document.querySelectorAll("img");
      for (const img of imgs) {
        const src = img.getAttribute("src");
        if (src && !src.startsWith("http") && !src.startsWith("data:") && !src.startsWith("//")) {
          try {
            img.setAttribute("src", new URL(src, baseOrigin).href);
          } catch {
            img.setAttribute("src", `${baseOrigin}/${src.replace(/^\//, "")}`);
          }
        }
        // srcset도 절대경로 변환
        const srcset = img.getAttribute("srcset");
        if (srcset) {
          const converted = srcset.replace(
            /(\S+)(\s+\d+[wx])/g,
            (_m: string, u: string, desc: string) => {
              if (u.startsWith("http") || u.startsWith("data:") || u.startsWith("//")) return u + desc;
              try {
                return new URL(u, baseOrigin).href + desc;
              } catch {
                return `${baseOrigin}/${u.replace(/^\//, "")}` + desc;
              }
            }
          );
          img.setAttribute("srcset", converted);
        }
      }

      // CSS background-image 상대경로 변환 (인라인 style)
      const allElements = document.querySelectorAll("[style]");
      for (const el of allElements) {
        const style = el.getAttribute("style") || "";
        if (style.includes("url(")) {
          const fixed = style.replace(
            /url\(\s*['"]?(?!data:|https?:|\/\/)(.*?)['"]?\s*\)/gi,
            (_m: string, p1: string) => {
              try {
                return `url('${new URL(p1, baseOrigin).href}')`;
              } catch {
                return `url('${baseOrigin}/${p1.replace(/^\//, "")}')`;
              }
            }
          );
          el.setAttribute("style", fixed);
        }
      }

      return { inlinedCount: cssTexts.length };
    }, baseUrl);

    console.log(`[ReferenceCloner] CSS 인라인 완료: ${cssInlineResult.inlinedCount}개`);

    // Step 3: 외부 JS 제거 + 정리 (Playwright 내에서)
    await page.evaluate(() => {
      // 외부 스크립트 제거 (인라인 인터랙션 JS는 유지)
      const scripts = document.querySelectorAll("script");
      for (const script of scripts) {
        const src = script.getAttribute("src");
        const content = script.textContent || "";

        // 외부 스크립트는 모두 제거
        if (src) {
          script.remove();
          continue;
        }

        // 인라인 스크립트: 트래킹/분석 관련만 제거
        const trackingPatterns = [
          "gtag", "ga(", "fbq(", "kakaoPixel", "dataLayer",
          "naver.wcslog", "_satellite", "amplitude", "mixpanel",
          "hotjar", "clarity", "googletagmanager",
        ];
        const isTracking = trackingPatterns.some((p) => content.includes(p));
        if (isTracking) {
          script.remove();
        }
      }

      // noscript 제거
      document.querySelectorAll("noscript").forEach((el) => el.remove());

      // iframe 제거 (광고/트래킹)
      document.querySelectorAll("iframe").forEach((el) => el.remove());

      // HTML 주석 제거
      const walker = document.createTreeWalker(
        document.documentElement,
        NodeFilter.SHOW_COMMENT,
        null
      );
      const comments: Comment[] = [];
      let comment;
      while ((comment = walker.nextNode())) {
        comments.push(comment as Comment);
      }
      comments.forEach((c) => c.remove());
    });

    // Step 4: 최종 HTML 수집
    const html = await page.content();

    await browser.close();

    if (!html || html.length < 200) {
      throw new Error("복제 실패: 유효한 HTML을 가져올 수 없습니다");
    }

    console.log(`[ReferenceCloner] 복제 완료: ${normalizedUrl} (${Math.round(html.length / 1024)}KB)`);

    return { html, baseUrl };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
