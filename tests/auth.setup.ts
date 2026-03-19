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

// ── Sales 인증 상태 저장 (Supabase Auth 계정 없으면 skip) ─────────────────────
setup("authenticate as sales", async ({ page }) => {
  try {
    await loginViaUI(page, TEST_SALES.email, TEST_SALES.password);
    await page.waitForURL(
      (url) =>
        url.pathname.includes("/dashboard") ||
        url.pathname.includes("/ops"),
      { timeout: 15000 }
    );
    await page.context().storageState({ path: STORAGE_STATE.sales });
  } catch {
    console.warn("[auth.setup] Sales 계정 로그인 실패 — sales 의존 테스트 skip됩니다");
  }
});

// ── Client (client_owner) 인증 상태 저장 (Supabase Auth 계정 없으면 skip) ────
setup("authenticate as client", async ({ page }) => {
  try {
    await loginViaUI(page, TEST_CLIENT.email, TEST_CLIENT.password);
    await page.waitForURL((url) => url.pathname.includes("/portal"), {
      timeout: 15000,
    });
    await page.context().storageState({ path: STORAGE_STATE.portal });
  } catch {
    console.warn("[auth.setup] Client 계정 로그인 실패 — portal 의존 테스트 skip됩니다");
  }
});
