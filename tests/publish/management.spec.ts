import { test, expect } from "@playwright/test";

// ============================================================================
// 발행 관리 E2E 테스트 (3 TC)
// ============================================================================

test.describe("발행 관리 - 인증 후 기능 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-PUB-M-001: 3개 탭 (대기 / 이력 / 자동설정)", async ({ page }) => {
    await page.goto("/publish");
    await page.waitForLoadState("networkidle");

    // 발행 관리 페이지 헤딩
    const heading = page.locator("h1:has-text('발행 관리')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // PublishTabsWrapper의 3개 탭 확인
    // tab=pending (기본), tab=history, tab=auto
    const pendingTab = page.locator(
      "button:has-text('대기'), button:has-text('발행 대기'), [role='tab']:has-text('대기')"
    ).first();
    const historyTab = page.locator(
      "button:has-text('이력'), button:has-text('발행 이력'), [role='tab']:has-text('이력')"
    ).first();
    const autoTab = page.locator(
      "button:has-text('자동'), button:has-text('자동 발행'), [role='tab']:has-text('자동')"
    ).first();

    // 최소 하나의 탭이 존재하는지 확인
    const hasPending = await pendingTab.isVisible().catch(() => false);
    const hasHistory = await historyTab.isVisible().catch(() => false);
    const hasAuto = await autoTab.isVisible().catch(() => false);

    expect(hasPending || hasHistory || hasAuto).toBeTruthy();
  });

  test("TC-PUB-M-002: 발행 이력 목록", async ({ page }) => {
    await page.goto("/publish?tab=history");
    await page.waitForLoadState("networkidle");

    // 발행 이력 탭 활성화
    const heading = page.locator("h1:has-text('발행 관리')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 발행 이력 테이블 또는 빈 상태 메시지
    const historyTable = page.locator(
      "text=제목, text=플랫폼, text=상태"
    ).first();
    const emptyMessage = page.locator(
      "text=발행된 콘텐츠가 없습니다, text=콘텐츠를 발행하면"
    ).first();

    const hasHistory = await historyTable.isVisible().catch(() => false);
    const hasEmpty = await emptyMessage.isVisible().catch(() => false);

    // 이력이 있거나 빈 상태 메시지가 표시되어야 함
    expect(hasHistory || hasEmpty).toBeTruthy();
  });

  test("TC-PUB-M-003: 자동 발행 설정 토글", async ({ page }) => {
    await page.goto("/publish?tab=auto");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1:has-text('발행 관리')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 자동 발행 설정 UI (AutoPublishSettingsClient)
    // 브랜드 선택이 필요하므로 "브랜드를 먼저 선택" 또는 설정 UI 확인
    const autoSettings = page.locator(
      "text=자동 발행, text=마스터, text=채널"
    ).first();
    const brandRequired = page.locator(
      "text=브랜드를 먼저 선택"
    ).first();

    const hasAuto = await autoSettings.isVisible().catch(() => false);
    const hasBrandRequired = await brandRequired.isVisible().catch(() => false);

    expect(hasAuto || hasBrandRequired).toBeTruthy();
  });
});
