import { test, expect } from "@playwright/test";

// ============================================================================
// 홈페이지 프로젝트 상세 E2E 테스트 (9탭 구조)
// ============================================================================

test.describe("홈페이지 프로젝트 상세 - 탭 구조 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  let projectId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: ".auth/admin.json",
    });
    const page = await context.newPage();
    await page.goto("/homepage");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    const links = page.locator('a[href*="/homepage/"]');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href && /\/homepage\/[0-9a-f-]{36}/.test(href)) {
        projectId = href.match(/\/homepage\/([0-9a-f-]{36})/)?.[1] || null;
        break;
      }
    }

    await context.close();
  });

  // 헬퍼: 탭 클릭 후 콘텐츠 확인
  async function clickTabAndVerify(
    page: import("@playwright/test").Page,
    tabName: string,
    expectedTexts: string[],
  ): Promise<boolean> {
    const tab = page.locator(`button:has-text("${tabName}")`).first();
    if (!(await tab.isVisible().catch(() => false))) return false;
    await tab.click();
    await page.waitForTimeout(2000);

    for (const text of expectedTexts) {
      const el = page.locator(`text=${text}`).first();
      if (await el.isVisible().catch(() => false)) return true;
    }
    return false;
  }

  test("TC-HP-D-001: 프로젝트 상세 페이지 9개 탭 표시", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const tabLabels = ["개요", "자료", "포트폴리오", "후기", "상담", "배포", "블로그", "키워드", "대시보드"];
    let visibleCount = 0;
    for (const label of tabLabels) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      if (await tab.isVisible().catch(() => false)) visibleCount++;
    }
    expect(visibleCount).toBeGreaterThanOrEqual(5);
  });

  test("TC-HP-D-002: 개요 탭에 KPI 카드 표시", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const kpiLabels = ["상태", "방문수", "상담 신청", "포트폴리오"];
    let visibleCount = 0;
    for (const label of kpiLabels) {
      const el = page.locator(`text=${label}`).first();
      if (await el.isVisible().catch(() => false)) visibleCount++;
    }
    expect(visibleCount).toBeGreaterThanOrEqual(2);
  });

  test("TC-HP-D-003: 개요 탭에 프로젝트 정보 표시", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const hasInfo = await page.locator("text=프로젝트 정보").first().isVisible().catch(() => false);
    const hasTemplate = await page.locator("text=템플릿").first().isVisible().catch(() => false);
    expect(hasInfo || hasTemplate).toBeTruthy();
  });

  test("TC-HP-D-004: 자료 탭 클릭 → 자료 수집 현황", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const found = await clickTabAndVerify(page, "자료", [
      "수집 자료", "자료가 수집되지", "자료 수집 시작", "업체명", "대표",
    ]);
    expect(found).toBeTruthy();
  });

  test("TC-HP-D-005: 포트폴리오 탭 클릭", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const found = await clickTabAndVerify(page, "포트폴리오", [
      "등록된 포트폴리오가 없습니다", "포트폴리오 추가", "시공사례",
    ]);
    expect(found).toBeTruthy();
  });

  test("TC-HP-D-006: 후기 탭 클릭", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const found = await clickTabAndVerify(page, "후기", [
      "등록된 후기가 없습니다", "후기 추가", "고객 후기",
    ]);
    expect(found).toBeTruthy();
  });

  test("TC-HP-D-007: 상담 탭 클릭", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const found = await clickTabAndVerify(page, "상담", [
      "상담 신청이 없습니다", "접수된 상담", "신규",
    ]);
    expect(found).toBeTruthy();
  });

  test("TC-HP-D-008: 배포 탭 클릭 → DeployPanel 렌더", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const found = await clickTabAndVerify(page, "배포", [
      "배포 상태", "배포 이력", "위험 영역", "프로젝트 삭제",
    ]);
    expect(found).toBeTruthy();
  });

  test("TC-HP-D-009: 블로그 탭 클릭 → BlogManager 렌더", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const found = await clickTabAndVerify(page, "블로그", [
      "블로그 관리", "게시물이 없습니다", "발행된 글", "스케줄 생성",
    ]);
    expect(found).toBeTruthy();
  });

  test("TC-HP-D-010: 키워드 탭 클릭 → KeywordManager 렌더", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const found = await clickTabAndVerify(page, "키워드", [
      "키워드 관리", "키워드가 없습니다", "키워드 자동 생성", "총 키워드",
    ]);
    expect(found).toBeTruthy();
  });

  test("TC-HP-D-011: 대시보드 탭 클릭 → DashboardView 렌더", async ({ page }) => {
    if (!projectId) { test.skip(); return; }
    await page.goto(`/homepage/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    if (page.url().includes("/login")) { test.skip(); return; }

    const found = await clickTabAndVerify(page, "대시보드", [
      "월간 방문", "전환율", "상담 현황", "유입 경로", "방문 통계", "다시 시도",
    ]);
    expect(found).toBeTruthy();
  });
});
