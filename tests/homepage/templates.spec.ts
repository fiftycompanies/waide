import { test, expect } from "@playwright/test";

// ============================================================================
// 홈페이지 템플릿 관리 E2E 테스트 (Phase 4 + Phase 7)
// ============================================================================

test.describe("홈페이지 템플릿 관리 - 인증 후 기능 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-HP-TPL-001: 템플릿 관리 페이지 접근", async ({ page }) => {
    await page.goto("/homepage/templates");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 페이지 제목
    const heading = page.locator("text=템플릿 관리").first();
    const hasHeading = await heading.isVisible().catch(() => false);
    expect(hasHeading).toBeTruthy();
  });

  test("TC-HP-TPL-002: 3개 템플릿 카드 표시", async ({ page }) => {
    await page.goto("/homepage/templates");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    const templates = ["모던 미니멀", "내추럴 우드", "프리미엄 다크"];
    let visibleCount = 0;
    for (const name of templates) {
      const el = page.locator(`text=${name}`).first();
      if (await el.isVisible().catch(() => false)) visibleCount++;
    }

    expect(visibleCount).toBe(3);
  });

  test("TC-HP-TPL-003: 템플릿 색상/폰트/레이아웃 스펙 표시", async ({ page }) => {
    await page.goto("/homepage/templates");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 각 템플릿의 상세 스펙 라벨
    const specLabels = ["색상", "폰트", "레이아웃", "ID"];
    let visibleCount = 0;
    for (const label of specLabels) {
      const el = page.locator(`text=${label}`).first();
      if (await el.isVisible().catch(() => false)) visibleCount++;
    }

    expect(visibleCount).toBeGreaterThanOrEqual(3);
  });

  test("TC-HP-TPL-004: 템플릿 카드 클릭 시 선택 상태 토글", async ({ page }) => {
    await page.goto("/homepage/templates");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 첫 번째 템플릿 카드 클릭
    const firstCard = page.locator(".cursor-pointer").first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(500);

      // border-blue-500 클래스가 적용되는지 확인 (선택 상태)
      const hasSelectedBorder = await firstCard.evaluate((el) =>
        el.classList.contains("border-blue-500")
      ).catch(() => false);

      expect(hasSelectedBorder).toBeTruthy();

      // 다시 클릭하면 해제
      await firstCard.click();
      await page.waitForTimeout(500);

      const isDeselected = await firstCard.evaluate((el) =>
        !el.classList.contains("border-blue-500")
      ).catch(() => false);

      expect(isDeselected).toBeTruthy();
    }
  });

  test("TC-HP-TPL-005: 템플릿 ID 코드 블록 표시 (modern-minimal, natural-wood, premium-dark)", async ({ page }) => {
    await page.goto("/homepage/templates");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    const ids = ["modern-minimal", "natural-wood", "premium-dark"];
    let visibleCount = 0;
    for (const id of ids) {
      const el = page.locator(`code:has-text("${id}")`).first();
      if (await el.isVisible().catch(() => false)) visibleCount++;
    }

    expect(visibleCount).toBe(3);
  });
});
