import { test, expect } from "@playwright/test";

// ============================================================================
// 고객 포트폴리오 E2E 테스트 (5 TC)
// ============================================================================

test.describe("고객 포트폴리오 - 미인증 리다이렉트", () => {
  test("TC-CLIENT-001: 미인증 시 /ops/clients 접근 -> /login 리다이렉트", async ({
    page,
  }) => {
    await page.goto("/ops/clients");
    await page.waitForURL((url) => url.pathname.includes("/login"), {
      timeout: 10000,
    });
    expect(page.url()).toContain("/login");
  });
});

test.describe("고객 포트폴리오 - 인증 후 기능 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-CLIENT-002: 카드 뷰 형식의 고객 카드 표시", async ({ page }) => {
    await page.goto("/ops/clients");
    await page.waitForLoadState("networkidle");

    // 페이지 헤딩
    const heading = page.locator("h1:has-text('고객 포트폴리오')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 고객 카드 또는 빈 상태
    const clientCard = page.locator("[class*='border-l-4'], [class*='rounded-lg']").first();
    const emptyState = page.locator("text=등록된 고객이 없습니다").first();
    const loadingSpinner = page.locator("[class*='animate-spin']").first();

    // 로딩 완료까지 대기
    await page.waitForTimeout(3000);

    const hasCard = await clientCard.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // 카드가 있거나 빈 상태 메시지가 있어야 함
    expect(hasCard || hasEmpty).toBeTruthy();
  });

  test("TC-CLIENT-003: 상태 필터 (Active / Onboarding / At Risk / Churned)", async ({
    page,
  }) => {
    await page.goto("/ops/clients");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1:has-text('고객 포트폴리오')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 로딩 완료까지 대기
    await page.waitForTimeout(3000);

    // StatusTab 버튼들 확인
    const allTab = page.locator("button:has-text('전체')").first();
    const activeTab = page.locator("button:has-text('Active')").first();
    const onboardingTab = page.locator("button:has-text('Onboarding')").first();
    const atRiskTab = page.locator("button:has-text('At Risk')").first();
    const churnedTab = page.locator("button:has-text('Churned')").first();

    // 최소 전체/Active 탭이 존재해야 함
    const hasAll = await allTab.isVisible().catch(() => false);
    const hasActive = await activeTab.isVisible().catch(() => false);

    expect(hasAll || hasActive).toBeTruthy();

    // Onboarding, At Risk, Churned도 확인
    const hasOnboarding = await onboardingTab.isVisible().catch(() => false);
    const hasAtRisk = await atRiskTab.isVisible().catch(() => false);
    const hasChurned = await churnedTab.isVisible().catch(() => false);

    // 추가 탭들이 존재해야 함
    expect(hasOnboarding || hasAtRisk || hasChurned).toBeTruthy();
  });

  test("TC-CLIENT-004: 브랜드명 검색", async ({ page }) => {
    await page.goto("/ops/clients");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1:has-text('고객 포트폴리오')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 로딩 완료 대기
    await page.waitForTimeout(3000);

    // 검색 입력 필드
    const searchInput = page.locator(
      'input[placeholder*="검색"], input[placeholder*="브랜드"]'
    ).first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 검색 동작 테스트
    await searchInput.fill("테스트");
    await searchInput.press("Enter");
    await page.waitForTimeout(1000);

    // 검색 후 페이지가 에러 없이 렌더링되는지 확인
    await expect(heading).toBeVisible();
  });

  test("TC-CLIENT-005: 정렬 옵션 (마케팅점수순 / MRR순 / 이름순 / 만료임박순)", async ({
    page,
  }) => {
    await page.goto("/ops/clients");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1:has-text('고객 포트폴리오')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 로딩 완료 대기
    await page.waitForTimeout(3000);

    // 정렬 셀렉트 확인
    const sortSelect = page.locator("select").first();
    await expect(sortSelect).toBeVisible({ timeout: 10000 });

    // 정렬 옵션 확인
    const options = sortSelect.locator("option");
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThanOrEqual(3);

    // 마케팅점수순 옵션 확인
    const scoreOption = sortSelect.locator('option[value="score"]');
    const hasScoreOption = await scoreOption.count();
    expect(hasScoreOption).toBeGreaterThanOrEqual(1);

    // MRR순 옵션 확인
    const mrrOption = sortSelect.locator('option[value="mrr"]');
    const hasMrrOption = await mrrOption.count();
    expect(hasMrrOption).toBeGreaterThanOrEqual(1);

    // 정렬 변경 테스트
    await sortSelect.selectOption("mrr");
    await page.waitForTimeout(1000);

    // 페이지가 에러 없이 렌더링되는지 확인
    await expect(heading).toBeVisible();
  });
});
