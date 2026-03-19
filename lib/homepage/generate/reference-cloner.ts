/**
 * reference-cloner.ts
 * 레퍼런스 사이트 DOM 복제 크롤러
 *
 * 패러다임: "생성 금지, 복제 후 교체만"
 * 1. Playwright로 완전 렌더링된 HTML 수집
 * 2. <link>/<script> 원본 유지 (Vercel 배포 시 정상 로딩)
 * 3. 상대경로를 절대경로로 변환 (이미지, 인라인 bg)
 * 4. 내부 링크를 # 으로 무력화 (단일 페이지)
 * 5. 트래킹 스크립트만 제거
 */

import {
  createStealthBrowser,
} from "@/lib/crawlers/playwright-base";

// ── 반환 타입 ──────────────────────────────────────────────────────────────────

export interface CloneResult {
  /** Vercel 배포용 HTML (외부 CSS/JS는 원본 URL 유지) */
  html: string;
  /** 레퍼런스 사이트 base URL (상대경로 변환용) */
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

    // Step 2: 상대경로 → 절대경로 변환 + 내부 링크 무력화 (Playwright 내에서)
    // CSS/JS <link>/<script>는 원본 유지 (Vercel 배포 시 브라우저가 정상 로딩)
    const patchResult2 = await page.evaluate((baseOrigin: string) => {
      let imgFixed = 0;
      let linkFixed = 0;

      // 1. <link rel="stylesheet"> href 상대경로 → 절대경로 (태그 자체는 유지)
      const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
      for (const link of cssLinks) {
        const href = link.getAttribute("href");
        if (href && !href.startsWith("http") && !href.startsWith("//") && !href.startsWith("data:")) {
          try {
            link.setAttribute("href", new URL(href, baseOrigin).href);
          } catch { /* ignore */ }
        }
      }

      // 2. <script src> 상대경로 → 절대경로 (태그 자체는 유지)
      const scripts = document.querySelectorAll("script[src]");
      for (const script of scripts) {
        const src = script.getAttribute("src");
        if (src && !src.startsWith("http") && !src.startsWith("//") && !src.startsWith("data:")) {
          try {
            script.setAttribute("src", new URL(src, baseOrigin).href);
          } catch { /* ignore */ }
        }
      }

      // 3. <img> src/srcset 상대경로 → 절대경로
      const imgs = document.querySelectorAll("img");
      for (const img of imgs) {
        const src = img.getAttribute("src");
        if (src && !src.startsWith("http") && !src.startsWith("data:") && !src.startsWith("//")) {
          try {
            img.setAttribute("src", new URL(src, baseOrigin).href);
            imgFixed++;
          } catch {
            img.setAttribute("src", `${baseOrigin}/${src.replace(/^\//, "")}`);
            imgFixed++;
          }
        }
        const srcset = img.getAttribute("srcset");
        if (srcset) {
          const converted = srcset.replace(
            /(\S+)(\s+\d+[wx])/g,
            (_m: string, u: string, desc: string) => {
              if (u.startsWith("http") || u.startsWith("data:") || u.startsWith("//")) return u + desc;
              try { return new URL(u, baseOrigin).href + desc; }
              catch { return `${baseOrigin}/${u.replace(/^\//, "")}` + desc; }
            }
          );
          img.setAttribute("srcset", converted);
        }
      }

      // 4. <source srcset> 상대경로 → 절대경로
      const sources = document.querySelectorAll("source[srcset]");
      for (const source of sources) {
        const srcset = source.getAttribute("srcset");
        if (srcset && !srcset.startsWith("http") && !srcset.startsWith("data:")) {
          try {
            source.setAttribute("srcset", new URL(srcset, baseOrigin).href);
          } catch { /* ignore */ }
        }
      }

      // 5. 인라인 style background-image 상대경로 → 절대경로
      const styledEls = document.querySelectorAll("[style]");
      for (const el of styledEls) {
        const style = el.getAttribute("style") || "";
        if (style.includes("url(")) {
          const fixed = style.replace(
            /url\(\s*(['"]?)(?!data:|https?:|\/\/)(.*?)\1\s*\)/gi,
            (_m: string, q: string, p1: string) => {
              try { return `url(${q}${new URL(p1, baseOrigin).href}${q})`; }
              catch { return `url(${q}${baseOrigin}/${p1.replace(/^\//, "")}${q})`; }
            }
          );
          el.setAttribute("style", fixed);
        }
      }

      // 6. 내부 링크 무력화 (단일 페이지이므로)
      const anchors = document.querySelectorAll("a[href]");
      for (const a of anchors) {
        const href = a.getAttribute("href") || "";
        // 앵커 링크(#section) → 유지
        if (href.startsWith("#")) continue;
        // 외부 링크(https://...) → 유지
        if (href.startsWith("http://") || href.startsWith("https://")) continue;
        // tel:, mailto: → 유지
        if (href.startsWith("tel:") || href.startsWith("mailto:")) continue;
        // javascript: → 유지
        if (href.startsWith("javascript:")) continue;
        // 그 외 내부 링크 (/, /sub/page, page.html 등) → # 으로 무력화
        a.setAttribute("href", "#");
        linkFixed++;
      }

      return { imgFixed, linkFixed };
    }, baseUrl);

    console.log(`[ReferenceCloner] 상대경로 변환: 이미지 ${patchResult2.imgFixed}건, 내부링크 무력화 ${patchResult2.linkFixed}건`);

    // Step 3: 트래킹/분석 스크립트만 제거 (기능 JS는 유지)
    await page.evaluate(() => {
      const trackingPatterns = [
        "gtag", "ga(", "fbq(", "kakaoPixel", "dataLayer",
        "naver.wcslog", "_satellite", "amplitude", "mixpanel",
        "hotjar", "clarity", "googletagmanager",
      ];

      const scripts = document.querySelectorAll("script");
      for (const script of scripts) {
        const src = script.getAttribute("src") || "";
        const content = script.textContent || "";

        // 트래킹 관련 외부 스크립트 제거
        const isTrackingSrc = trackingPatterns.some((p) => src.includes(p))
          || src.includes("analytics")
          || src.includes("gtag")
          || src.includes("googletagmanager");
        if (src && isTrackingSrc) {
          script.remove();
          continue;
        }

        // 트래킹 관련 인라인 스크립트 제거
        const isTrackingInline = trackingPatterns.some((p) => content.includes(p));
        if (!src && isTrackingInline) {
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
