/**
 * homepage-crawler.ts
 * 홈페이지 디자인 크롤링 오케스트레이터
 *
 * Layer 1: 브라우저 UA + 헤더 HTTP 요청 (80% 사이트 통과)
 * Layer 2: Playwright Stealth 폴백 (나머지 20%)
 * Layer 3: DOM 기반 디자인 추출 (cheerio)
 * Layer 4: 다중 URL 병합
 */

import axios from "axios";
import {
  getRandomUserAgent,
  createStealthBrowser,
} from "@/lib/crawlers/playwright-base";
import { extractDesignFromHTML } from "./design-extractor";
import { mergeDesignProfiles } from "./design-merger";
import type {
  HomepageDesignAnalysis,
  CrawlResult,
} from "./homepage-crawl-types";

// ── 브라우저 헤더 (Layer 1) ─────────────────────────────────────────────────

function buildBrowserHeaders(): Record<string, string> {
  return {
    "User-Agent": getRandomUserAgent(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    Connection: "keep-alive",
    "Cache-Control": "max-age=0",
  };
}

// ── Layer 1: Enhanced HTTP ──────────────────────────────────────────────────

async function fetchWithBrowserHeaders(url: string): Promise<{ html: string; method: "http" }> {
  const response = await axios.get(url, {
    headers: buildBrowserHeaders(),
    timeout: 15000,
    maxRedirects: 5,
    responseType: "text",
    // gzip 자동 해제
    decompress: true,
  });

  const html = typeof response.data === "string" ? response.data : String(response.data);

  if (!html || html.length < 100) {
    throw new Error("빈 페이지 응답");
  }

  return { html, method: "http" };
}

// ── Layer 2: Playwright Stealth ─────────────────────────────────────────────

async function fetchWithPlaywright(url: string): Promise<{
  html: string;
  method: "playwright";
  screenshotBase64: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser?: any;
}> {
  const result = await createStealthBrowser();
  if (!result) {
    throw new Error("Playwright를 사용할 수 없습니다 (미설치)");
  }

  const { browser, context } = result;

  try {
    const page = await context.newPage();
    // 데스크톱 뷰포트 설정
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // 추가 렌더링 대기 (이미지/폰트 로딩)
    await page.waitForTimeout(3000);

    const html = await page.content();

    if (!html || html.length < 100) {
      await browser.close();
      throw new Error("Playwright: 빈 페이지");
    }

    // 풀페이지 스크린샷 캡처 (최대 3000px 높이 제한)
    let screenshotBase64: string | null = null;
    try {
      const screenshot = await page.screenshot({
        fullPage: true,
        type: "jpeg",
        quality: 85,
        clip: { x: 0, y: 0, width: 1440, height: 3000 },
      });
      screenshotBase64 = screenshot.toString("base64");
      console.log(`[HomepageCrawler] 스크린샷 캡처 완료: ${url} (${Math.round(screenshotBase64!.length / 1024)}KB)`);
    } catch (ssError) {
      console.warn(`[HomepageCrawler] 스크린샷 캡처 실패 (계속 진행): ${(ssError as Error).message}`);
    }

    return { html, method: "playwright", screenshotBase64, page, browser };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// ── Playwright computed style 보강 ──────────────────────────────────────────

async function enrichWithComputedStyles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  analysis: HomepageDesignAnalysis
): Promise<HomepageDesignAnalysis> {
  try {
    const computed = await page.evaluate(() => {
      const body = document.body;
      const bodyStyle = getComputedStyle(body);
      const h1 = document.querySelector("h1");
      const h1Style = h1 ? getComputedStyle(h1) : null;

      return {
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        bodyFont: bodyStyle.fontFamily?.split(",")[0]?.trim().replace(/['"]/g, ""),
        h1Font: h1Style?.fontFamily?.split(",")[0]?.trim().replace(/['"]/g, "") || null,
        h1Color: h1Style?.color || null,
      };
    });

    // computed 결과로 보강 (기존 값이 null인 경우에만)
    if (!analysis.design.fonts.body && computed.bodyFont) {
      analysis.design.fonts.body = computed.bodyFont;
    }
    if (!analysis.design.fonts.heading && computed.h1Font) {
      analysis.design.fonts.heading = computed.h1Font;
    }
  } catch {
    // computed style 실패해도 무시
  }

  return analysis;
}

// ── 단일 URL 크롤링 ─────────────────────────────────────────────────────────

export async function crawlHomepageDesign(url: string): Promise<{
  success: boolean;
  data: HomepageDesignAnalysis | null;
  error: string | null;
}> {
  // URL 정규화
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  // Layer 1: Enhanced HTTP (스크린샷 없음)
  try {
    const { html } = await fetchWithBrowserHeaders(normalizedUrl);
    const analysis = await extractDesignFromHTML(html, normalizedUrl, "http", null);
    return { success: true, data: analysis, error: null };
  } catch (httpError) {
    const isBlocked =
      axios.isAxiosError(httpError) &&
      (httpError.response?.status === 403 ||
        httpError.response?.status === 406 ||
        httpError.response?.status === 429 ||
        httpError.code === "ECONNABORTED");

    if (!isBlocked) {
      // 403이 아닌 다른 에러(DNS, 404 등)는 Playwright로도 해결 안 됨
      const isRecoverable =
        axios.isAxiosError(httpError) &&
        (httpError.response?.status === 503 || httpError.code === "ETIMEDOUT");

      if (!isRecoverable) {
        const msg = httpError instanceof Error ? httpError.message : "HTTP 요청 실패";
        console.warn(`[HomepageCrawler] HTTP 실패 (non-recoverable): ${normalizedUrl} — ${msg}`);
        return { success: false, data: null, error: msg };
      }
    }

    console.log(`[HomepageCrawler] HTTP 차단, Playwright 폴백: ${normalizedUrl}`);
  }

  // Layer 2: Playwright Stealth
  try {
    const { html, screenshotBase64, page, browser } = await fetchWithPlaywright(normalizedUrl);
    let analysis = await extractDesignFromHTML(html, normalizedUrl, "playwright", screenshotBase64);

    // computed style 보강
    if (page) {
      analysis = await enrichWithComputedStyles(page, analysis);
    }
    if (browser) {
      await browser.close();
    }

    return { success: true, data: analysis, error: null };
  } catch (pwError) {
    const msg = pwError instanceof Error ? pwError.message : "Playwright 크롤링 실패";
    console.error(`[HomepageCrawler] Playwright도 실패: ${normalizedUrl} — ${msg}`);
    return { success: false, data: null, error: msg };
  }
}

// ── 다중 URL 크롤링 + 병합 ──────────────────────────────────────────────────

export async function crawlMultipleHomepages(urls: string[]): Promise<CrawlResult> {
  if (urls.length === 0) {
    throw new Error("크롤링할 URL이 없습니다.");
  }

  // 병렬 실행
  const results = await Promise.allSettled(urls.map(crawlHomepageDesign));

  const analyses: HomepageDesignAnalysis[] = [];
  const errors: { url: string; error: string }[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      if (result.value.success && result.value.data) {
        analyses.push(result.value.data);
      } else {
        errors.push({
          url: urls[i],
          error: result.value.error || "크롤링 실패",
        });
      }
    } else {
      errors.push({
        url: urls[i],
        error: result.reason?.message || "크롤링 예외 발생",
      });
    }
  });

  // 전부 실패
  if (analyses.length === 0) {
    const errorDetail = errors.map((e) => `${e.url}: ${e.error}`).join("; ");
    throw new Error(`모든 레퍼런스 크롤링 실패 — ${errorDetail}`);
  }

  // 병합
  const merged = mergeDesignProfiles(analyses);

  return { analyses, merged, errors };
}
