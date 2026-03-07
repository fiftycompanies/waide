/**
 * chatgpt-crawler.ts
 * Phase 4+5: ChatGPT Playwright 기반 크롤링
 *
 * 기본 비활성 (aeo_tracking_settings.playwright_enabled = 'false')
 * OPENAI_SESSION_COOKIE 없으면 null return
 */

import type { LLMAnswer } from "./perplexity-crawler";
import { createStealthBrowser, randomDelay } from "./playwright-base";

export async function crawlChatGPT(question: string): Promise<LLMAnswer | null> {
  const sessionCookie = process.env.OPENAI_SESSION_COOKIE;
  if (!sessionCookie) {
    console.log("[ChatGPT Crawler] OPENAI_SESSION_COOKIE not set, skipping");
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
        domain: ".openai.com",
        path: "/",
      };
    });
    await context.addCookies(cookies);

    const page = await context.newPage();
    await page.goto("https://chat.openai.com", { waitUntil: "networkidle", timeout: 30000 });
    await randomDelay(2000, 4000);

    // 질문 입력 영역 찾기
    const textarea = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 15000 });
    if (!textarea) {
      console.error("[ChatGPT Crawler] textarea not found");
      return null;
    }

    // 랜덤 딜레이로 타이핑
    await textarea.click();
    await randomDelay(300, 800);
    await page.keyboard.type(question, { delay: 50 + Math.random() * 100 });
    await randomDelay(500, 1000);

    // 전송
    await page.keyboard.press("Enter");
    await randomDelay(3000, 5000);

    // 답변 완료 대기 (stop generating 버튼 사라질 때까지)
    await page.waitForFunction(
      () => !document.querySelector('[aria-label*="Stop"]'),
      { timeout: 60000 }
    ).catch(() => { /* timeout ok */ });

    await randomDelay(1000, 2000);

    // 답변 텍스트 추출 (마지막 assistant 메시지)
    const extractedText = await page.evaluate(() => {
      const messages = document.querySelectorAll("[data-message-author-role='assistant']");
      const last = messages[messages.length - 1];
      return last?.textContent?.trim() || "";
    });

    if (!extractedText) {
      console.error("[ChatGPT Crawler] empty response");
      return null;
    }

    return {
      response_text: extractedText,
      sources: [],
      crawl_method: "playwright",
    };
  } catch (error) {
    console.error("[ChatGPT Crawler] error:", error);
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}
