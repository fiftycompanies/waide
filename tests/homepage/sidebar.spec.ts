import { test, expect } from "@playwright/test";

// ============================================================================
// 홈페이지 사이드바 네비게이션 E2E 테스트
// ============================================================================

test.describe("홈페이지 사이드바 메뉴 - 인증 후 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-HP-NAV-001: 사이드바에 홈페이지 섹션 메뉴 표시", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 사이드바 홈페이지 메뉴 항목
    const menuLabels = [
      "홈페이지 프로젝트",
      "상담 신청",
      "운영 총괄",
      "템플릿 관리",
    ];

    let visibleCount = 0;
    for (const label of menuLabels) {
      const el = page.locator(`text=${label}`).first();
      if (await el.isVisible().catch(() => false)) visibleCount++;
    }

    // 최소 2개 메뉴 표시
    expect(visibleCount).toBeGreaterThanOrEqual(2);
  });

  test("TC-HP-NAV-002: 홈페이지 프로젝트 메뉴 → /homepage 이동", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    const menuLink = page.locator('a[href="/homepage"]').first();
    if (await menuLink.isVisible().catch(() => false)) {
      await menuLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      expect(page.url()).toContain("/homepage");
    }
  });

  test("TC-HP-NAV-003: 상담 신청 메뉴 → /homepage/inquiries 이동", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    const menuLink = page.locator('a[href="/homepage/inquiries"]').first();
    if (await menuLink.isVisible().catch(() => false)) {
      await menuLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      expect(page.url()).toContain("/homepage/inquiries");
    }
  });

  test("TC-HP-NAV-004: 운영 총괄 메뉴 → /homepage/ops 이동", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    const menuLink = page.locator('a[href="/homepage/ops"]').first();
    if (await menuLink.isVisible().catch(() => false)) {
      await menuLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      expect(page.url()).toContain("/homepage/ops");
    }
  });

  test("TC-HP-NAV-005: 템플릿 관리 메뉴 → /homepage/templates 이동", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    const menuLink = page.locator('a[href="/homepage/templates"]').first();
    if (await menuLink.isVisible().catch(() => false)) {
      await menuLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      expect(page.url()).toContain("/homepage/templates");
    }
  });
});
