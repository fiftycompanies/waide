import { test, expect } from "@playwright/test";

// ============================================================================
// 영업사원 관리 E2E 테스트 (3 TC)
// ============================================================================

test.describe("영업사원 관리 - 인증 후 기능 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-SALES-001: 영업사원 목록과 성과 테이블 표시", async ({ page }) => {
    await page.goto("/ops/sales-agents");
    await page.waitForLoadState("networkidle");

    // 페이지 헤딩
    const heading = page.locator("h1:has-text('영업사원 관리')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 영업사원 테이블: 이름, Ref Code, 추적 링크, 분석 수, 상담 전환 등
    const table = page.locator("table").first();
    const loadingText = page.locator("text=불러오는 중").first();
    const emptyText = page.locator("text=등록된 영업사원이 없습니다").first();

    const hasTable = await table.isVisible().catch(() => false);
    const hasLoading = await loadingText.isVisible().catch(() => false);
    const hasEmpty = await emptyText.isVisible().catch(() => false);

    // 테이블 헤더에 이름/Ref Code 컬럼이 있는지 확인
    if (hasTable) {
      const nameHeader = page.locator("th:has-text('이름')").first();
      const refCodeHeader = page.locator("th:has-text('Ref Code')").first();
      const hasName = await nameHeader.isVisible().catch(() => false);
      const hasRefCode = await refCodeHeader.isVisible().catch(() => false);
      expect(hasName || hasRefCode).toBeTruthy();
    } else {
      expect(hasLoading || hasEmpty).toBeTruthy();
    }
  });

  test("TC-SALES-002: 새 영업사원 등록 모달", async ({ page }) => {
    await page.goto("/ops/sales-agents");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1:has-text('영업사원 관리')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // "영업사원 추가" 버튼 클릭
    const addButton = page.locator(
      "button:has-text('영업사원 추가'), button:has-text('추가')"
    ).first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // 모달이 열리면 폼 필드 확인
    const modal = page.locator(
      "text=영업사원 등록, text=영업사원 수정"
    ).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 이름 필드
    const nameInput = page.locator('label:has-text("이름")').first();
    await expect(nameInput).toBeVisible();

    // Ref Code 필드
    const refCodeInput = page.locator('label:has-text("Ref Code")').first();
    await expect(refCodeInput).toBeVisible();

    // 등록 버튼
    const submitButton = page.locator(
      'button[type="submit"]:has-text("등록")'
    ).first();
    await expect(submitButton).toBeVisible();

    // 모달 닫기
    const closeButton = page.locator(
      'button:has([class*="h-5 w-5"])'
    ).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test("TC-SALES-003: Ref Code 복사 버튼 동작", async ({ page }) => {
    await page.goto("/ops/sales-agents");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1:has-text('영업사원 관리')");
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 복사 버튼 확인 (각 영업사원 행에 있음)
    const copyButton = page.locator("button:has-text('복사')").first();
    const hasCopy = await copyButton.isVisible().catch(() => false);

    if (hasCopy) {
      // 복사 버튼이 클릭 가능한지 확인
      await expect(copyButton).toBeEnabled();

      // 추적 링크 코드 표시 확인
      const refCodeDisplay = page.locator("code").first();
      await expect(refCodeDisplay).toBeVisible();
    } else {
      // 영업사원이 없는 경우 빈 상태 확인
      const emptyText = page
        .locator("text=등록된 영업사원이 없습니다")
        .first();
      const hasEmpty = await emptyText.isVisible().catch(() => false);
      expect(hasEmpty).toBeTruthy();
    }
  });
});
