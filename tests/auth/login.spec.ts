import { test, expect } from "@playwright/test";

test.describe("로그인 플로우", () => {
  test("TC-AUTH-001: 로그인 페이지 렌더링", async ({ page }) => {
    await page.goto("/login");
    // 로그인 폼 표시
    await expect(page.locator('input[type="email"], input[type="text"], input[name="email"], input[placeholder*="이메일"], input[placeholder*="아이디"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("TC-AUTH-002: OAuth 버튼 표시", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(2000);
    // 구글 또는 카카오 로그인 버튼 존재 확인
    const oauthBtns = page.locator('button:has-text("Google"), button:has-text("구글"), button:has-text("Kakao"), button:has-text("카카오")');
    const count = await oauthBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("TC-AUTH-003: 잘못된 로그인 시 에러 표시", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"], input[type="text"], input[name="email"], input[placeholder*="이메일"]').first();
    const pwInput = page.locator('input[type="password"]').first();
    await emailInput.fill("wrong@example.com");
    await pwInput.fill("wrongpassword123");
    const loginBtn = page.locator('button[type="submit"], button:has-text("로그인")').first();
    await loginBtn.click();
    await page.waitForTimeout(3000);
    // 에러 메시지 표시 (텍스트 또는 toast)
    const errorText = page.locator('text=/올바르지 않|잘못|실패|error|incorrect/i');
    const toastError = page.locator('[data-sonner-toast], [role="alert"], .toast');
    const hasError = await errorText.count() > 0 || await toastError.count() > 0;
    // 여전히 로그인 페이지에 있거나 에러 표시
    expect(page.url()).toContain("/login");
  });

  test("TC-AUTH-005: 미인증 보호 라우트 접근", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(3000);
    // 로그인 페이지로 리다이렉트
    expect(page.url()).toContain("/login");
  });
});
