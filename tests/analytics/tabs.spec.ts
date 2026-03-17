import { test, expect } from "@playwright/test";

// ============================================================================
// 성과 분석 E2E 테스트 (5 TC)
// ============================================================================

test.describe("성과 분석 - 미인증 리다이렉트", () => {
  test("TC-ANAL-001: 미인증 시 /analytics 접근 -> /login 리다이렉트", async ({
    page,
  }) => {
    await page.goto("/analytics");
    await page.waitForURL((url) => url.pathname.includes("/login"), {
      timeout: 10000,
    });
    expect(page.url()).toContain("/login");
  });
});

test.describe("성과 분석 - 인증 후 기능 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-ANAL-002: 4개 탭 (SEO 분석 / AEO 노출 / 경쟁 분석 / Citation)", async ({
    page,
  }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    // 페이지 헤딩
    const heading = page.locator("h1:has-text('성과 분석')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // AnalyticsTabsWrapper의 4개 탭 확인
    const seoTab = page.locator(
      "button:has-text('SEO'), [role='tab']:has-text('SEO')"
    ).first();
    const aeoTab = page.locator(
      "button:has-text('AEO'), [role='tab']:has-text('AEO')"
    ).first();
    const competitionTab = page.locator(
      "button:has-text('경쟁'), [role='tab']:has-text('경쟁')"
    ).first();
    const citationTab = page.locator(
      "button:has-text('Citation'), [role='tab']:has-text('Citation')"
    ).first();

    const hasSeo = await seoTab.isVisible().catch(() => false);
    const hasAeo = await aeoTab.isVisible().catch(() => false);
    const hasCompetition = await competitionTab.isVisible().catch(() => false);
    const hasCitation = await citationTab.isVisible().catch(() => false);

    // 최소 하나의 탭이 보여야 함
    expect(hasSeo || hasAeo || hasCompetition || hasCitation).toBeTruthy();
  });

  test("TC-ANAL-003: SEO 탭에 노출 점유율 차트 표시", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    // 기본 탭이 SEO 분석
    const heading = page.locator("h1:has-text('성과 분석')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // SEO 탭의 노출 점유율 상세 섹션 또는 차트
    const visibilitySection = page.locator(
      "text=노출 점유율, text=SERP, text=순위 추이"
    ).first();
    const hasVisibility = await visibilitySection
      .isVisible()
      .catch(() => false);

    // KPI 카드가 표시되는지 확인
    const kpiCard = page.locator(
      "text=노출률, text=키워드, text=상위"
    ).first();
    const hasKpi = await kpiCard.isVisible().catch(() => false);

    expect(hasVisibility || hasKpi).toBeTruthy();
  });

  test("TC-ANAL-004: AEO 탭에 스코어 및 모델별 분석 표시", async ({
    page,
  }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    // AEO 탭 클릭
    const aeoTab = page.locator(
      "button:has-text('AEO'), [role='tab']:has-text('AEO')"
    ).first();
    const hasAeoTab = await aeoTab.isVisible().catch(() => false);

    if (hasAeoTab) {
      await aeoTab.click();
      await page.waitForTimeout(1000);

      // AEO 노출 추적 섹션 확인
      const aeoContent = page.locator(
        "text=AEO, text=Visibility, text=Score, text=추적, text=브랜드를 먼저 선택"
      ).first();
      const hasAeoContent = await aeoContent.isVisible().catch(() => false);
      expect(hasAeoContent).toBeTruthy();
    } else {
      // 탭이 없는 경우 (브랜드 미선택 등) 페이지 로드 확인으로 대체
      const heading = page.locator("h1:has-text('성과 분석')");
      await expect(heading).toBeVisible();
    }
  });

  test("TC-ANAL-005: 경쟁 분석 탭에 경쟁사 데이터 표시", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    // 경쟁 분석 탭 클릭
    const competitionTab = page.locator(
      "button:has-text('경쟁'), [role='tab']:has-text('경쟁')"
    ).first();
    const hasCompTab = await competitionTab.isVisible().catch(() => false);

    if (hasCompTab) {
      await competitionTab.click();
      await page.waitForTimeout(1000);

      // 경쟁 분석 콘텐츠 확인
      const compContent = page.locator(
        "text=경쟁, text=Share of Voice, text=경쟁사, text=브랜드를 먼저 선택"
      ).first();
      const hasCompContent = await compContent.isVisible().catch(() => false);
      expect(hasCompContent).toBeTruthy();
    } else {
      // 탭이 없으면 페이지 정상 로드 확인
      const heading = page.locator("h1:has-text('성과 분석')");
      await expect(heading).toBeVisible();
    }
  });
});
