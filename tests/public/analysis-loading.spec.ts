import { test, expect } from "@playwright/test";

test.describe("분석 로딩 페이지", () => {
  const LOADING_URL = "/analysis/loading?url=https%3A%2F%2Fm.place.naver.com%2Frestaurant%2F12345678%2Fhome";

  test("TC-LOAD-001: Loading page shows animation/spinner", async ({ page }) => {
    // API 요청을 모킹하여 분석 시작 응답 반환
    await page.route("**/api/analyze", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "test-analysis-001", status: "pending" }),
      });
    });

    // 폴링 요청도 pending 상태로 유지
    await page.route("**/api/analyze/test-analysis-001", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "analyzing" }),
      });
    });

    await page.goto(LOADING_URL);

    // 로딩 애니메이션/스피너 존재 확인
    const spinner = page.locator(".animate-spin, .animate-pulse, [class*='animate']");
    await expect(spinner.first()).toBeVisible({ timeout: 10000 });

    // 진행률 텍스트 표시 확인 (예: "0%" 또는 프로그레스 바)
    const progressText = page.locator("text=/\\d+%/");
    await expect(progressText.first()).toBeVisible({ timeout: 10000 });

    // 분석 단계 텍스트 표시 확인
    const stepTexts = page.locator("text=/매장 정보|수집|분석|키워드|AI/");
    await expect(stepTexts.first()).toBeVisible({ timeout: 10000 });
  });

  test("TC-LOAD-002: Polling calls GET /api/analyze/[id] periodically", async ({ page }) => {
    let pollCount = 0;

    // POST /api/analyze 모킹
    await page.route("**/api/analyze", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "test-analysis-002", status: "pending" }),
        });
      } else {
        route.continue();
      }
    });

    // GET /api/analyze/[id] 폴링 카운트 (항상 analyzing 상태 반환)
    await page.route("**/api/analyze/test-analysis-002", (route) => {
      pollCount++;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "analyzing" }),
      });
    });

    await page.goto(LOADING_URL);

    // 6초 대기: 2초 간격 폴링이므로 최소 2~3회 호출 예상
    await page.waitForTimeout(6000);

    expect(pollCount).toBeGreaterThanOrEqual(2);
  });

  test("TC-LOAD-003: Redirect to result page on analysis complete", async ({ page }) => {
    const analysisId = "test-analysis-003";
    let pollCount = 0;

    // POST /api/analyze 모킹
    await page.route("**/api/analyze", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: analysisId, status: "pending" }),
        });
      } else {
        route.continue();
      }
    });

    // GET /api/analyze/[id] — 2번째 폴링에서 completed 반환
    await page.route(`**/api/analyze/${analysisId}`, (route) => {
      pollCount++;
      if (pollCount >= 2) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "completed" }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "analyzing" }),
        });
      }
    });

    // 분석 결과 페이지 모킹 (리다이렉트 시 404 방지)
    await page.route(`**/analysis/${analysisId}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><h1>분석 결과</h1></body></html>",
      });
    });

    await page.goto(LOADING_URL);

    // 분석 완료 후 결과 페이지로 리다이렉트
    await page.waitForURL(`**/analysis/${analysisId}**`, { timeout: 15000 });
    expect(page.url()).toContain(`/analysis/${analysisId}`);
  });

  test("TC-LOAD-004: 120 second timeout shows error message", async ({ page }) => {
    // setTimeout 오버라이드를 페이지 로드 전에 주입 (120초 → 2초 단축)
    await page.addInitScript(() => {
      const origSetTimeout = window.setTimeout;
      window.setTimeout = function (fn: TimerHandler, delay?: number, ...args: unknown[]) {
        if (delay && delay >= 100000) {
          return origSetTimeout(fn as (...args: unknown[]) => void, 2000, ...args);
        }
        return origSetTimeout(fn as (...args: unknown[]) => void, delay, ...args);
      } as typeof setTimeout;
    });

    // POST /api/analyze 모킹
    await page.route("**/api/analyze", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "test-timeout-id", status: "pending" }),
        });
      } else {
        route.continue();
      }
    });

    // 폴링 응답을 항상 analyzing으로 유지 (타임아웃 유발)
    await page.route("**/api/analyze/test-timeout-id", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "analyzing" }),
      });
    });

    await page.goto(LOADING_URL);

    // 에러 메시지 표시 확인 (시간이 초과되었어요 등)
    const errorMessage = page.locator("text=/시간.*초과|타임아웃|timeout|분석 실패/i");
    await expect(errorMessage.first()).toBeVisible({ timeout: 15000 });

    // 다시 시도하기 버튼 확인
    const retryButton = page.getByRole("button", { name: /다시.*시도|재시도|홈으로/i });
    await expect(retryButton.first()).toBeVisible();
  });
});
