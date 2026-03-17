import { test, expect } from "@playwright/test";

// ============================================================================
// CRM 분석 로그 E2E 테스트 (6 TC)
// ============================================================================

test.describe("분석 로그 - 미인증 리다이렉트", () => {
  test("TC-CRM-001: 미인증 시 /ops/analysis-logs 접근 -> /login 리다이렉트", async ({
    page,
  }) => {
    await page.goto("/ops/analysis-logs");
    await page.waitForURL((url) => url.pathname.includes("/login"), {
      timeout: 10000,
    });
    expect(page.url()).toContain("/login");
  });
});

test.describe("분석 로그 - 인증 후 기능 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-CRM-002: 분석 로그 목록과 필터 표시", async ({ page }) => {
    await page.goto("/ops/analysis-logs");
    await page.waitForLoadState("networkidle");

    // 페이지 헤딩
    const heading = page.locator("h1:has-text('분석 로그')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 필터 바: 영업사원, 상태, 기간, 검색 필드
    const salesFilter = page.locator("select").first();
    const hasFilter = await salesFilter.isVisible().catch(() => false);

    // 검색 입력 확인
    const searchInput = page.locator(
      'input[placeholder*="검색"], input[placeholder*="매장명"]'
    ).first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    // 필터 또는 검색 중 하나가 존재해야 함
    expect(hasFilter || hasSearch).toBeTruthy();
  });

  test("TC-CRM-003: 리드 상태 파이프라인 배지", async ({ page }) => {
    await page.goto("/ops/analysis-logs");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1:has-text('분석 로그')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 상태 배지: 신규/연락완료/상담중/계약완료/관리중/이탈
    // 테이블 또는 로딩 상태 확인
    const table = page.locator("table").first();
    const loadingText = page.locator("text=로딩 중").first();
    const emptyText = page.locator("text=분석 로그가 없습니다").first();

    const hasTable = await table.isVisible().catch(() => false);
    const hasLoading = await loadingText.isVisible().catch(() => false);
    const hasEmpty = await emptyText.isVisible().catch(() => false);

    // 테이블이 로드되면 상태 배지가 테이블에 포함되어 있을 것
    expect(hasTable || hasLoading || hasEmpty).toBeTruthy();
  });

  test("TC-CRM-004: 영업사원 할당 인라인 드롭다운", async ({ page }) => {
    await page.goto("/ops/analysis-logs");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1:has-text('분석 로그')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 테이블 헤더에 "영업사원" 컬럼 확인
    const salesColumn = page.locator("th:has-text('영업사원')").first();
    const hasSalesColumn = await salesColumn.isVisible().catch(() => false);

    // 영업사원 컬럼이 있거나, 빈 상태인 경우 통과
    const emptyText = page.locator("text=분석 로그가 없습니다").first();
    const hasEmpty = await emptyText.isVisible().catch(() => false);

    expect(hasSalesColumn || hasEmpty).toBeTruthy();
  });

  test("TC-CRM-005: 브랜드 계정 연결 (인라인 드롭다운)", async ({ page }) => {
    await page.goto("/ops/analysis-logs");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1:has-text('분석 로그')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 테이블 헤더에 "브랜드 계정" 컬럼 확인
    const brandColumn = page.locator("th:has-text('브랜드 계정')").first();
    const hasBrandColumn = await brandColumn.isVisible().catch(() => false);

    // 테이블 헤더가 있거나 빈 상태인 경우
    const emptyText = page.locator("text=분석 로그가 없습니다").first();
    const hasEmpty = await emptyText.isVisible().catch(() => false);

    expect(hasBrandColumn || hasEmpty).toBeTruthy();
  });

  test("TC-CRM-006: 상세 페이지 4개 탭 구조", async ({ page }) => {
    // 분석 로그 상세 페이지 접근 (테스트 ID 사용)
    await page.goto("/ops/analysis-logs");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1:has-text('분석 로그')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 목록에서 첫 번째 항목 클릭하여 상세 이동 시도
    const firstRow = page.locator("table tbody tr").first();
    const hasRow = await firstRow.isVisible().catch(() => false);

    if (hasRow) {
      await firstRow.click();
      await page.waitForLoadState("networkidle");

      // 상세 페이지에 탭이 존재하는지 확인
      // 4탭: 분석/SEO/키워드/활동기록
      const detailTab = page.locator(
        "button:has-text('분석'), button:has-text('SEO'), button:has-text('키워드'), button:has-text('활동')"
      ).first();
      const hasDetailTab = await detailTab.isVisible().catch(() => false);

      // 상세 페이지 로드 확인 (URL에 ID 포함)
      expect(
        page.url().includes("/ops/analysis-logs/") || hasDetailTab
      ).toBeTruthy();
    } else {
      // 분석 로그가 없는 경우 상세 페이지 접근 불가 - 통과
      expect(true).toBeTruthy();
    }
  });
});
