import { test, expect } from "@playwright/test";

test.describe("역할 기반 접근 제어 (RBAC)", () => {
  test("TC-AUTH-007: 미인증 시 어드민 라우트 차단", async ({ page }) => {
    const protectedRoutes = [
      "/dashboard",
      "/keywords",
      "/contents",
      "/publish",
      "/analytics",
      "/ops/clients",
      "/ops/onboarding",
      "/ops/revenue",
      "/ops/analysis-logs",
      "/blog-accounts",
      "/sources",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/login");
    }
  });

  test("퍼블릭 라우트는 인증 없이 접근 가능", async ({ page }) => {
    const publicRoutes = ["/", "/login", "/signup"];

    for (const route of publicRoutes) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(500);
      // /login이나 /signup에서 다른 곳으로 리다이렉트되지 않음 (미인증)
    }
  });
});
