import { test as base, expect } from "@playwright/test";
import {
  TEST_ADMIN,
  TEST_SALES,
  TEST_CLIENT,
  STORAGE_STATE,
} from "./test-data";
import type { Page, BrowserContext } from "@playwright/test";

// ── 로그인 헬퍼 ────────────────────────────────────────────────────────────
async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");

  // 이메일 입력 (type="text" 필드, placeholder에 email 포함)
  const emailInput = page
    .locator(
      'input[type="text"][placeholder*="email"], input[type="email"], input[name="email"]'
    )
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(email);

  // 비밀번호 입력
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  // 로그인 버튼 클릭
  const submitBtn = page
    .locator('button[type="submit"], button:has-text("로그인")')
    .first();
  await submitBtn.click();

  // 로그인 완료 대기 — /login 페이지를 벗어날 때까지
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });
}

// ── Fixture 타입 정의 ───────────────────────────────────────────────────────
type AuthFixtures = {
  adminPage: Page;
  salesPage: Page;
  portalPage: Page;
};

// ── base test 확장 ──────────────────────────────────────────────────────────
export const test = base.extend<AuthFixtures>({
  // super_admin 역할 — 어드민 대시보드 접근
  adminPage: async ({ browser }, use) => {
    const context: BrowserContext = await browser.newContext({
      storageState: STORAGE_STATE.admin,
    });
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
    await context.close();
  },

  // sales 역할 — 영업 CRM 접근
  salesPage: async ({ browser }, use) => {
    const context: BrowserContext = await browser.newContext({
      storageState: STORAGE_STATE.sales,
    });
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
    await context.close();
  },

  // client_owner 역할 — 고객 포털 접근
  portalPage: async ({ browser }, use) => {
    const context: BrowserContext = await browser.newContext({
      storageState: STORAGE_STATE.portal,
    });
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
    await context.close();
  },
});

export { expect, loginViaUI };
