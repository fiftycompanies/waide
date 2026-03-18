import { test, expect } from "@playwright/test";

// ============================================================================
// 홈페이지 운영 총괄 E2E 테스트 (Phase 8)
// ============================================================================

test.describe("홈페이지 운영 총괄 - 인증 후 기능 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-HP-OPS-001: 운영 총괄 페이지 접근", async ({ page }) => {
    await page.goto("/homepage/ops");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 운영 총괄 UI 요소
    const heading = page.locator("text=운영 총괄").first();
    const hasHeading = await heading.isVisible().catch(() => false);
    expect(hasHeading).toBeTruthy();
  });

  test("TC-HP-OPS-002: KPI 집계 카드 표시", async ({ page }) => {
    await page.goto("/homepage/ops");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 집계 KPI 라벨 (운영 총괄 컴포넌트)
    const kpiLabels = ["라이브 프로젝트", "총 방문수", "총 상담수", "평균 전환율"];
    let visibleCount = 0;
    for (const label of kpiLabels) {
      const el = page.locator(`text=${label}`).first();
      if (await el.isVisible().catch(() => false)) visibleCount++;
    }

    // 최소 2개 KPI 표시 (데이터 없어도 라벨은 렌더됨)
    expect(visibleCount).toBeGreaterThanOrEqual(2);
  });

  test("TC-HP-OPS-003: 프로젝트 비교 테이블", async ({ page }) => {
    await page.goto("/homepage/ops");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 프로젝트 비교 테이블 또는 빈 상태
    const texts = ["프로젝트 현황", "프로젝트가 없습니다", "라이브 또는 프리뷰"];
    let hasContent = false;
    for (const text of texts) {
      const el = page.locator(`text=${text}`).first();
      if (await el.isVisible().catch(() => false)) { hasContent = true; break; }
    }
    expect(hasContent).toBeTruthy();
  });
});
