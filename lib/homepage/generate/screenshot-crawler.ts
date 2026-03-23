/**
 * screenshot-crawler.ts
 * 스크린샷 전용 크롤러
 *
 * 패러다임: "HTML 크롤링 완전 폐기. 스크린샷만 캡처."
 * 레퍼런스 URL → Playwright 렌더링 → JPEG 스크린샷(상단/중간) 반환
 *
 * 기존 homepage-crawler.ts의 HTML 파싱을 일체 하지 않는다.
 * 오직 시각적 스크린샷만 캡처하여 Vision AI에 전달한다.
 */

import {
  loadPlaywright,
  getRandomUserAgent,
} from "@/lib/crawlers/playwright-base";
import { validateReferenceUrl } from "./url-validator";

// ── 타입 ─────────────────────────────────────────────────────────────────────

export interface ScreenshotSet {
  /** 상단부 (Hero + Nav) — 1440×900, base64 JPEG */
  top: string;
  /** 중간부 (주요 섹션들) — 1440×최대2700, base64 JPEG. 없으면 null */
  middle: string | null;
  /** 700px 단위 세로 크롭 (최대 5개), base64 JPEG */
  crops: string[];
  /** 원본 URL */
  url: string;
}

// ── 메인 함수 ─────────────────────────────────────────────────────────────────

/**
 * 레퍼런스 URL의 스크린샷만 캡처한다.
 * HTML 파싱, CSS 추출, DOM 분석 일체 없음.
 */
export async function captureScreenshots(url: string): Promise<ScreenshotSet> {
  // URL 정규화
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  // URL 사전 검증 (DNS/서버 다운 감지 → Playwright 기동 방지)
  console.log(`[ScreenshotCrawler] URL 사전 검증: ${normalizedUrl}`);
  normalizedUrl = await validateReferenceUrl(normalizedUrl);

  const pw = await loadPlaywright();
  if (!pw) {
    throw new Error("Playwright가 설치되어 있지 않습니다. npm install playwright 실행 후 재시도하세요.");
  }

  const browser = await pw.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      locale: "ko-KR",
      timezoneId: "Asia/Seoul",
      viewport: { width: 1440, height: 900 },
    });

    const page = await context.newPage();

    // networkidle 시도 → 실패 시 load + 대기 폴백
    try {
      await page.goto(normalizedUrl, {
        waitUntil: "networkidle",
        timeout: 40000,
      });
    } catch {
      console.log("[ScreenshotCrawler] networkidle 실패, load 폴백 시도");
      await page.goto(normalizedUrl, {
        waitUntil: "load",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);
    }

    // 렌더링 완료 대기 (이미지, 폰트 등)
    await page.waitForTimeout(2000);

    // 풀페이지 높이 측정
    const fullHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`[ScreenshotCrawler] 페이지 높이: ${fullHeight}px`);

    // 뷰포트를 풀 페이지 높이로 확장 — clip이 전체 영역에서 작동하도록
    const captureHeight = Math.min(fullHeight, 4000);
    await page.setViewportSize({ width: 1440, height: captureHeight });
    await page.waitForTimeout(1000);

    const screenshots: string[] = [];

    // 상단부 (Hero + Nav) — 가장 중요
    const topBuffer = await page.screenshot({
      clip: { x: 0, y: 0, width: 1440, height: 900 },
      type: "jpeg",
      quality: 90,
    });
    screenshots.push(topBuffer.toString("base64"));

    // 중간부 (주요 섹션들)
    let middleBase64: string | null = null;
    if (fullHeight > 900) {
      const midHeight = Math.min(2700, fullHeight - 900);
      const midBuffer = await page.screenshot({
        clip: { x: 0, y: 900, width: 1440, height: midHeight },
        type: "jpeg",
        quality: 80,
      });
      middleBase64 = midBuffer.toString("base64");
    }

    // 700px 단위 크롭 (최대 5개) — Tailwind CSS 생성용
    const crops = await captureCrops(page, fullHeight);

    await context.close();

    console.log(
      `[ScreenshotCrawler] 캡처 완료: top=1440×900, middle=${middleBase64 ? `1440×${Math.min(2700, fullHeight - 900)}` : "없음"}, crops=${crops.length}개`
    );

    return {
      top: screenshots[0],
      middle: middleBase64,
      crops,
      url: normalizedUrl,
    };
  } finally {
    await browser.close();
  }
}

// ── 700px 크롭 캡처 ──────────────────────────────────────────────────────────

const CROP_HEIGHT = 700;
const MAX_CROPS = 5;

/**
 * 페이지를 700px 높이 단위로 세로 크롭하여 캡처한다.
 * 최대 5개까지만 캡처 (5 × 700px = 3500px 커버).
 */
async function captureCrops(
  page: { screenshot: (opts: Record<string, unknown>) => Promise<Buffer> },
  totalHeight: number
): Promise<string[]> {
  const cropCount = Math.min(MAX_CROPS, Math.ceil(totalHeight / CROP_HEIGHT));
  const results: string[] = [];

  for (let i = 0; i < cropCount; i++) {
    const y = i * CROP_HEIGHT;
    const height = Math.min(CROP_HEIGHT, totalHeight - y);
    if (height <= 0) break;

    const buffer = await page.screenshot({
      clip: { x: 0, y, width: 1440, height },
      type: "jpeg",
      quality: 85,
    });
    results.push(buffer.toString("base64"));
  }

  console.log(
    `[ScreenshotCrawler] 크롭 캡처: ${results.length}개 × ${CROP_HEIGHT}px (전체 ${totalHeight}px)`
  );

  return results;
}
