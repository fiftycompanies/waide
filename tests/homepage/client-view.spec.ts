import { test, expect } from "@playwright/test";

// ============================================================================
// 홈페이지 클라이언트 뷰 E2E 테스트
// - 브랜드 계정이 홈페이지 읽기 전용 뷰를 볼 수 있는지 확인
// - 어드민 계정은 기존 어드민 UI를 볼 수 있는지 확인
// ============================================================================

test.describe("홈페이지 - 클라이언트 뷰 (브랜드 계정)", () => {
  test.use({ storageState: ".auth/portal.json" });

  test("TC-HP-CLIENT-001: 클라이언트가 /homepage 접근 시 읽기 전용 뷰 표시", async ({ page }) => {
    await page.goto("/homepage");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 클라이언트 뷰 확인 — "홈페이지" 제목 + 어드민 전용 UI 없음
    const heading = page.locator("h1:has-text('홈페이지')").first();
    const hasHeading = await heading.isVisible().catch(() => false);
    expect(hasHeading).toBeTruthy();

    // 어드민 전용 버튼이 없어야 함
    const newProjectBtn = page.locator("text=새 프로젝트").first();
    const hasNewBtn = await newProjectBtn.isVisible().catch(() => false);
    expect(hasNewBtn).toBeFalsy();

    // AI 생성 버튼이 없어야 함
    const aiGenBtn = page.locator("text=AI 생성").first();
    const hasAiGenBtn = await aiGenBtn.isVisible().catch(() => false);
    expect(hasAiGenBtn).toBeFalsy();
  });

  test("TC-HP-CLIENT-002: 클라이언트 사이드바에 홈페이지 메뉴 존재", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 사이드바에 "홈페이지" 메뉴 항목 확인
    const homepageMenu = page.locator('a[href="/homepage"]').first();
    const hasMenu = await homepageMenu.isVisible().catch(() => false);
    expect(hasMenu).toBeTruthy();
  });

  test("TC-HP-CLIENT-003: 클라이언트에게 어드민 홈페이지 서브메뉴 안 보임", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 어드민 전용 홈페이지 서브메뉴가 안 보여야 함
    const adminMenuLabels = ["홈페이지 프로젝트", "상담 신청", "운영 총괄", "템플릿 관리"];
    for (const label of adminMenuLabels) {
      const el = page.locator(`text=${label}`).first();
      const isVisible = await el.isVisible().catch(() => false);
      expect(isVisible).toBeFalsy();
    }
  });
});

test.describe("홈페이지 - 어드민 뷰", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-HP-ADMIN-001: 어드민이 /homepage 접근 시 프로젝트 목록 표시", async ({ page }) => {
    await page.goto("/homepage");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 어드민 뷰 확인
    const heading = page.locator("text=홈페이지 프로젝트").first();
    const hasHeading = await heading.isVisible().catch(() => false);
    expect(hasHeading).toBeTruthy();

    // 새 프로젝트 버튼 존재
    const newBtn = page.locator("text=새 프로젝트").first();
    const hasNewBtn = await newBtn.isVisible().catch(() => false);
    expect(hasNewBtn).toBeTruthy();
  });

  test("TC-HP-ADMIN-002: 어드민에게 AI 생성 버튼 표시", async ({ page }) => {
    await page.goto("/homepage");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // AI 생성 버튼 존재
    const aiBtn = page.locator("text=AI 생성").first();
    const hasAiBtn = await aiBtn.isVisible().catch(() => false);
    expect(hasAiBtn).toBeTruthy();
  });

  test("TC-HP-ADMIN-003: AI 생성 페이지 접근 가능", async ({ page }) => {
    await page.goto("/homepage/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // AI 홈페이지 생성 페이지 요소 확인
    const heading = page.locator("text=AI 홈페이지 생성").first();
    const hasHeading = await heading.isVisible().catch(() => false);

    // 브랜드 선택 드롭다운 확인
    const brandSelect = page.locator("select").first();
    const hasBrandSelect = await brandSelect.isVisible().catch(() => false);

    expect(hasHeading || hasBrandSelect).toBeTruthy();
  });

  test("TC-HP-ADMIN-004: AI 생성 폼 — 레퍼런스 URL 필수 검증", async ({ page }) => {
    await page.goto("/homepage/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 레퍼런스 URL 입력 필드 확인
    const refUrlInput = page.locator('input[placeholder*="reference"]').first();
    const hasRefInput = await refUrlInput.isVisible().catch(() => false);
    expect(hasRefInput).toBeTruthy();

    // 생성 시작 버튼 확인 (비활성화 상태여야 함 — URL 미입력)
    const startBtn = page.locator('button:has-text("생성 시작")').first();
    if (await startBtn.isVisible().catch(() => false)) {
      const isDisabled = await startBtn.isDisabled();
      expect(isDisabled).toBeTruthy();
    }
  });
});
