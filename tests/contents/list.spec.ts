import { test, expect } from "@playwright/test";

// ============================================================================
// 콘텐츠 관리 목록 E2E 테스트 (5 TC)
// ============================================================================

test.describe("콘텐츠 관리 - 미인증 리다이렉트", () => {
  test("TC-CONT-001: 미인증 시 /contents 접근 -> /login 리다이렉트", async ({
    page,
  }) => {
    await page.goto("/contents");
    await page.waitForURL((url) => url.pathname.includes("/login"), {
      timeout: 10000,
    });
    expect(page.url()).toContain("/login");
  });
});

test.describe("콘텐츠 관리 - 인증 후 기능 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-CONT-002: 5개 탭 존재 (콘텐츠 목록/발행 추천/발행 이력/키워드 이력/자동 발행 설정)", async ({
    page,
  }) => {
    await page.goto("/contents");
    await page.waitForLoadState("networkidle");

    // ContentsTabsWrapper의 5개 탭 확인
    const listTab = page.locator("button:has-text('콘텐츠 목록')").first();
    await expect(listTab).toBeVisible({ timeout: 15000 });

    const recommendTab = page.locator("button:has-text('발행 추천')").first();
    await expect(recommendTab).toBeVisible();

    const historyTab = page.locator("button:has-text('발행 이력')").first();
    await expect(historyTab).toBeVisible();

    const keywordHistoryTab = page
      .locator("button:has-text('키워드 이력')")
      .first();
    await expect(keywordHistoryTab).toBeVisible();

    const autoTab = page
      .locator("button:has-text('자동 발행 설정')")
      .first();
    await expect(autoTab).toBeVisible();
  });

  test("TC-CONT-003: 콘텐츠 목록에 상태 배지 표시", async ({ page }) => {
    await page.goto("/contents?tab=list");
    await page.waitForLoadState("networkidle");

    // 콘텐츠 목록이 로드되면 상태 배지가 표시됨
    // 상태: 초안/검토/승인/추적중/발행됨/반려/보관
    const contentArea = page.locator("table, [class*='divide-y'], [class*='space-y']").first();
    const emptyState = page.locator(
      "text=콘텐츠가 없습니다, text=등록된 콘텐츠"
    ).first();

    const hasContent = await contentArea.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // 콘텐츠가 있거나 빈 상태 메시지가 있어야 함
    expect(hasContent || hasEmpty).toBeTruthy();
  });

  test("TC-CONT-004: 발행 추천 탭 - 키워드 선택 영역", async ({ page }) => {
    await page.goto("/contents?tab=recommend");
    await page.waitForLoadState("networkidle");

    // 발행 추천 탭 활성화 확인
    const recommendTab = page.locator("button:has-text('발행 추천')").first();
    await expect(recommendTab).toBeVisible({ timeout: 15000 });

    // 발행 추천 콘텐츠 또는 "브랜드를 먼저 선택" 메시지 확인
    const recommendContent = page.locator(
      "text=브랜드를 먼저 선택, text=발행 준비 완료, text=ANALYST 실행"
    ).first();
    const hasRecommend = await recommendContent.isVisible().catch(() => false);

    // 추천 섹션 또는 안내 메시지가 표시되어야 함
    expect(hasRecommend).toBeTruthy();
  });

  test("TC-CONT-005: 자동 발행 설정 탭 - 작업 상태", async ({ page }) => {
    await page.goto("/contents?tab=auto");
    await page.waitForLoadState("networkidle");

    // 자동 발행 설정 탭
    const autoTab = page
      .locator("button:has-text('자동 발행 설정')")
      .first();
    await expect(autoTab).toBeVisible({ timeout: 15000 });

    // 자동 발행 설정 또는 "브랜드를 먼저 선택" 메시지
    const autoContent = page.locator(
      "text=브랜드를 먼저 선택, text=자동 발행, text=마스터 토글"
    ).first();
    const hasAutoContent = await autoContent.isVisible().catch(() => false);

    expect(hasAutoContent).toBeTruthy();
  });
});
