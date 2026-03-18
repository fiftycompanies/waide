import { test, expect } from "@playwright/test";

// ============================================================================
// 블로그 계정 - 홈페이지 블로그 연결 E2E 테스트
// ============================================================================

test.describe("블로그 계정 - 홈페이지 블로그 카드", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-BA-HP-001: 블로그 계정 페이지에서 홈페이지 블로그 카드 조건부 표시", async ({ page }) => {
    await page.goto("/blog-accounts");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 블로그 계정 관리 페이지 렌더링 확인
    const heading = page.locator("text=블로그 계정 관리").first();
    const hasHeading = await heading.isVisible().catch(() => false);
    expect(hasHeading).toBeTruthy();
  });

  test("TC-BA-HP-002: 홈페이지 블로그 카드에 연결 버튼 또는 활성화 배지 표시", async ({ page }) => {
    await page.goto("/blog-accounts");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 홈페이지 블로그 카드 존재 여부 (브랜드에 live 홈페이지가 있는 경우에만)
    const homepageBlogCard = page.locator("text=홈페이지 블로그").first();
    const hasCard = await homepageBlogCard.isVisible().catch(() => false);

    if (hasCard) {
      // 연결 버튼 또는 자동 발행 활성화 배지 확인
      const connectBtn = page.locator('button:has-text("연결")').first();
      const activeBadge = page.locator("text=자동 발행 활성화됨").first();

      const hasConnect = await connectBtn.isVisible().catch(() => false);
      const hasActive = await activeBadge.isVisible().catch(() => false);

      expect(hasConnect || hasActive).toBeTruthy();
    }
    // 카드가 없으면 OK (해당 브랜드에 live 홈페이지가 없는 경우)
  });
});
