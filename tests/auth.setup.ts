import { test as setup } from "@playwright/test";
import { loginViaUI } from "./fixtures/auth";
import {
  TEST_ADMIN,
  TEST_SALES,
  TEST_CLIENT,
  STORAGE_STATE,
} from "./fixtures/test-data";

// ── Admin (super_admin) 인증 상태 저장 ──────────────────────────────────────
setup("authenticate as admin", async ({ page }) => {
  await loginViaUI(page, TEST_ADMIN.email, TEST_ADMIN.password);
  // 어드민 대시보드 도달 확인
  await page.waitForURL((url) => url.pathname.includes("/dashboard"), {
    timeout: 15000,
  });
  await page.context().storageState({ path: STORAGE_STATE.admin });
});

// ── Sales 인증 상태 저장 ────────────────────────────────────────────────────
setup("authenticate as sales", async ({ page }) => {
  await loginViaUI(page, TEST_SALES.email, TEST_SALES.password);
  // 영업 역할도 대시보드로 리다이렉트
  await page.waitForURL(
    (url) =>
      url.pathname.includes("/dashboard") ||
      url.pathname.includes("/ops"),
    { timeout: 15000 }
  );
  await page.context().storageState({ path: STORAGE_STATE.sales });
});

// ── Client (client_owner) 인증 상태 저장 ────────────────────────────────────
setup("authenticate as client", async ({ page }) => {
  await loginViaUI(page, TEST_CLIENT.email, TEST_CLIENT.password);
  // 고객 포털로 리다이렉트
  await page.waitForURL((url) => url.pathname.includes("/portal"), {
    timeout: 15000,
  });
  await page.context().storageState({ path: STORAGE_STATE.portal });
});
