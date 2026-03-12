/**
 * gemini-crawler.ts
 * Phase 4+5: Gemini Playwright 기반 크롤링
 *
 * 기본 비활성 (aeo_tracking_settings.playwright_enabled = 'false')
 * GOOGLE_SESSION_COOKIE 없으면 null return
 */

import type { LLMAnswer } from "./perplexity-crawler";
import { createStealthBrowser, randomDelay } from "./playwright-base";

export async function crawlGemini(question: string): Promise<LLMAnswer | null> {
  const sessionCookie = process.env.GOOGLE_SESSION_COOKIE;
  if (!sessionCookie) {
    console.log("[Gemini Crawler] GOOGLE_SESSION_COOKIE not set, skipping");
    return null;
  }

  const browserPack = await createStealthBrowser(process.env.PROXY_URL);
  if (!browserPack) return null;

  const { browser, context } = browserPack;

  try {
    // 쿠키 복원
    const cookies = sessionCookie.split(";").map((c: string) => {
      const [name, ...valueParts] = c.trim().split("=");
      return {
        name: name.trim(),
        value: valueParts.join("=").trim(),
        domain: ".google.com",
        path: "/",
      };
    });
    await context.addCookies(cookies);

    const page = await context.newPage();
    await page.goto("https://gemini.google.com", { waitUntil: "networkidle", timeout: 30000 });
    await randomDelay(2000, 4000);

    // 질문 입력
    const textarea = await page.waitForSelector('textarea, [contenteditable="true"], rich-textarea', { timeout: 15000 });
    if (!textarea) {
      console.error("[Gemini Crawler] textarea not found");
      return null;
    }

    await textarea.click();
    await randomDelay(300, 800);
    await page.keyboard.type(question, { delay: 50 + Math.random() * 100 });
    await randomDelay(500, 1000);

    // 전송
    await page.keyboard.press("Enter");
    await randomDelay(5000, 8000);

    // 답변 완료 대기
    await page.waitForFunction(
      () => {
        const loading = document.querySelector("[aria-label*='loading'], .loading-indicator");
        return !loading;
      },
      { timeout: 60000 }
    ).catch(() => { /* timeout ok */ });

    await randomDelay(1000, 2000);

    // 답변 텍스트 추출
    const extractedText = await page.evaluate(() => {
      const responseElements = document.querySelectorAll("model-response, .model-response-text, message-content");
      const last = responseElements[responseElements.length - 1];
      return last?.textContent?.trim() || "";
    });

    if (!extractedText) {
      console.error("[Gemini Crawler] empty response");
      return null;
    }

    return {
      response_text: extractedText,
      sources: [],
      crawl_method: "playwright",
    };
  } catch (error) {
    console.error("[Gemini Crawler] error:", error);
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}
