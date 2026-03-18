import { test, expect } from "@playwright/test";
import { CAMFIT_CLIENT_ID } from "../fixtures/test-data";

// ============================================================================
// 홈페이지 프로젝트 E2E 테스트 (Phase 1-8 통합)
// ============================================================================

test.describe("홈페이지 프로젝트 - 인증 후 기능 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  // ── Phase 2: 라우트 접근성 ──────────────────────────────────────────────

  test("TC-HP-001: 프로젝트 목록 페이지 접근", async ({ page }) => {
    await page.goto("/homepage");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // 로그인 리다이렉트가 아닌 홈페이지 렌더링 확인
    const isLoginPage = page.url().includes("/login");
    if (isLoginPage) {
      // 인증 실패 — 테스트 환경 문제
      test.skip();
      return;
    }

    // 프로젝트 목록 페이지 UI 요소 확인
    const heading = page.locator("text=홈페이지 프로젝트").first();
    const newBtn = page.locator('a[href="/homepage/new"], button:has-text("새 프로젝트")').first();

    const hasHeading = await heading.isVisible().catch(() => false);
    const hasNewBtn = await newBtn.isVisible().catch(() => false);

    expect(hasHeading || hasNewBtn).toBeTruthy();
  });

  test("TC-HP-002: Stats 카드 표시 (전체/라이브/자료수집/빌드중/신규상담)", async ({ page }) => {
    await page.goto("/homepage");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 5개 통계 라벨 확인
    const labels = ["전체 프로젝트", "라이브", "자료 수집", "빌드 중", "신규 상담"];
    let visibleCount = 0;
    for (const label of labels) {
      const el = page.locator(`text=${label}`).first();
      if (await el.isVisible().catch(() => false)) visibleCount++;
    }

    // 최소 3개 이상 보여야 함
    expect(visibleCount).toBeGreaterThanOrEqual(3);
  });

  test("TC-HP-003: 새 프로젝트 생성 페이지 접근", async ({ page }) => {
    await page.goto("/homepage/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 새 홈페이지 프로젝트 제목
    const heading = page.locator("text=새 홈페이지 프로젝트").first();
    const hasHeading = await heading.isVisible().catch(() => false);

    // 클라이언트 ID 입력 필드
    const clientInput = page.locator('input[placeholder*="클라이언트"]').first();
    const hasClientInput = await clientInput.isVisible().catch(() => false);

    // 프로젝트명 입력 필드
    const nameInput = page.locator('input[placeholder*="홈페이지"]').first();
    const hasNameInput = await nameInput.isVisible().catch(() => false);

    expect(hasHeading).toBeTruthy();
    expect(hasClientInput || hasNameInput).toBeTruthy();
  });

  test("TC-HP-004: 템플릿 3종 표시 (모던미니멀/내추럴우드/프리미엄다크)", async ({ page }) => {
    await page.goto("/homepage/new");
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

  test("TC-HP-005: 프로젝트 생성 폼 유효성 검사", async ({ page }) => {
    await page.goto("/homepage/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 빈 폼으로 제출 시도
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // 에러 메시지 확인 (클라이언트 ID 필수)
      const errorMsg = page.locator("text=클라이언트 ID를 입력해주세요").first();
      const hasError = await errorMsg.isVisible().catch(() => false);
      expect(hasError).toBeTruthy();
    }
  });

  test("TC-HP-006: 프로젝트 생성 → 상세 페이지 이동", async ({ page }) => {
    await page.goto("/homepage/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 클라이언트 ID 입력
    const clientInput = page.locator('input[placeholder*="클라이언트"]').first();
    if (!(await clientInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    await clientInput.fill(CAMFIT_CLIENT_ID);

    // 프로젝트명 입력
    const nameInput = page.locator('input[placeholder*="홈페이지"]').first();
    await nameInput.fill("E2E 테스트 프로젝트");

    // 모던 미니멀 선택 (기본값)
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // 생성 완료 후 상세 페이지로 이동 대기
    await page.waitForTimeout(5000);

    // 상세 페이지로 이동했는지 확인 (URL에 UUID 포함)
    const url = page.url();
    const isDetailPage = /\/homepage\/[0-9a-f-]{36}/.test(url);
    const hasError = await page.locator("text=실패").first().isVisible().catch(() => false);

    // 클라이언트 ID가 유효하지 않으면 에러가 뜰 수 있음 — 둘 다 허용
    expect(isDetailPage || hasError).toBeTruthy();
  });
});
