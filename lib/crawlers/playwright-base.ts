/**
 * playwright-base.ts
 * Phase 4+5: Playwright 기반 LLM 크롤링 — 공통 유틸
 *
 * playwright 패키지: optional dependency
 * 설치 안 되어 있으면 dynamic import 실패 → graceful skip
 * aeo_tracking_settings.playwright_enabled = 'false' (기본) → 호출 시 null return
 */

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Playwright dynamic loader — 미설치 시 null 반환
 * Turbopack 번들링 방지를 위해 Function() 사용
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadPlaywright(): Promise<any | null> {
  try {
    const moduleName = "playwright";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pw = await (Function("m", "return import(m)")(moduleName) as Promise<any>).catch(() => null);
    return pw;
  } catch {
    console.log("[Playwright] package not installed, skipping");
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createStealthBrowser(proxyUrl?: string): Promise<{ browser: any; context: any } | null> {
  try {
    const pw = await loadPlaywright();
    if (!pw) return null;

    const browser = await pw.chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contextOpts: any = {
      userAgent: getRandomUserAgent(),
      locale: "ko-KR",
      timezoneId: "Asia/Seoul",
    };

    if (proxyUrl) {
      contextOpts.proxy = { server: proxyUrl };
    }

    const context = await browser.newContext(contextOpts);
    return { browser, context };
  } catch (error) {
    console.error("[Playwright] browser launch error:", error);
    return null;
  }
}

export async function randomDelay(minMs: number = 500, maxMs: number = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));
}
