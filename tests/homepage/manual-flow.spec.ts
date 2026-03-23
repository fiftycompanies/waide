import { test, expect, type Page } from "@playwright/test";

// ── 설정 ─────────────────────────────────────────────────────────────────────
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin1234";
const TEST_RESULT_URL = "https://example.com/test-homepage";

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function adminLogin(page: Page) {
  await page.goto("/login");
  const emailInput = page
    .locator('input[type="text"][placeholder*="email"], input[type="email"]')
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(ADMIN_USERNAME);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });
}

// ── 테스트 ───────────────────────────────────────────────────────────────────

test.describe("홈페이지 수동 제작 플로우", () => {
  test.describe.configure({ mode: "serial" });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await adminLogin(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("① 어드민 신청 관리 페이지 접속", async () => {
    await page.goto("/ops/homepage-requests");
    await page.waitForLoadState("networkidle");

    // 페이지 제목 확인
    const heading = page.locator("h1, h2").first();
    await expect(heading).toContainText("제작 신청", { timeout: 10000 });

    // 통계 카드 존재 확인 (최소 1개)
    const statCards = page.locator("text=전체");
    await expect(statCards.first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: "test-results/01-page-loaded.png" });
  });

  test("② [접수확인] 버튼 동작 확인", async () => {
    await page.goto("/ops/homepage-requests");
    await page.waitForLoadState("networkidle");

    // pending 상태 행 찾기
    const confirmBtn = page.locator('button:has-text("접수확인")').first();
    const hasPending = await confirmBtn.isVisible().catch(() => false);

    if (!hasPending) {
      console.log("⚠️ pending 상태 신청 건이 없음 — 접수확인 테스트 skip");
      test.skip(true, "pending 상태 신청 건 없음");
      return;
    }

    await confirmBtn.click();

    // 상태 변경 확인: "제작중" 배지 출현 또는 toast
    await page.waitForTimeout(2000);
    const success =
      (await page.locator('text="제작중"').count()) > 0 ||
      (await page.locator('[data-sonner-toast]').count()) > 0;

    await page.screenshot({ path: "test-results/02-confirm-done.png" });
    expect(success).toBeTruthy();
  });

  test("③ [결과물 등록] 모달 → URL 입력 → 저장", async () => {
    await page.goto("/ops/homepage-requests");
    await page.waitForLoadState("networkidle");

    // reviewing(제작중) 상태의 [결과물 등록] 버튼 찾기
    const registerBtn = page
      .locator('button:has-text("결과물 등록")')
      .first();
    const hasReviewing = await registerBtn.isVisible().catch(() => false);

    if (!hasReviewing) {
      console.log(
        "⚠️ reviewing 상태 신청 건이 없음 — 결과물 등록 테스트 skip"
      );
      test.skip(true, "reviewing 상태 신청 건 없음");
      return;
    }

    await registerBtn.click();

    // 모달 열림 확인
    const modal = page.locator(
      '[role="dialog"], .fixed.inset-0, div:has(> input[placeholder*="URL"])'
    );
    await expect(modal.first()).toBeVisible({ timeout: 5000 });

    // URL 입력
    const urlInput = page
      .locator('input[placeholder*="URL"], input[type="url"]')
      .first();
    await urlInput.fill(TEST_RESULT_URL);

    // 메모 입력 (있으면)
    const memoInput = page.locator("textarea").first();
    if (await memoInput.isVisible().catch(() => false)) {
      await memoInput.fill("E2E 테스트 결과물");
    }

    // 저장 버튼 클릭
    const saveBtn = page
      .locator(
        'button:has-text("저장"), button:has-text("등록"), button:has-text("확인")'
      )
      .last();
    await saveBtn.click();

    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/03-register-done.png" });

    // completed 상태로 변경 확인
    const completedBadge = page.locator('text="완료"');
    const toastSuccess = page.locator('[data-sonner-toast]');
    const success =
      (await completedBadge.count()) > 0 ||
      (await toastSuccess.count()) > 0;
    expect(success).toBeTruthy();
  });

  test("④ [전달] 버튼 → delivered 상태 전환", async () => {
    await page.goto("/ops/homepage-requests");
    await page.waitForLoadState("networkidle");

    // completed 상태의 [전달] 버튼 찾기
    const deliverBtn = page.locator('button:has-text("전달")').first();
    const hasCompleted = await deliverBtn.isVisible().catch(() => false);

    if (!hasCompleted) {
      console.log("⚠️ completed 상태 신청 건이 없음 — 전달 테스트 skip");
      test.skip(true, "completed 상태 신청 건 없음");
      return;
    }

    await deliverBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "test-results/04-deliver-done.png" });

    // delivered(전달) 상태 확인 — STATUS_CONFIG.delivered.label = "전달"
    const deliveredBadge = page.locator('span.rounded-full:has-text("전달")');
    const toastSuccess = page.locator('[data-sonner-toast]');
    const success =
      (await deliveredBadge.count()) > 0 ||
      (await toastSuccess.count()) > 0;
    expect(success).toBeTruthy();
  });

  test("⑤ [보기] 버튼 → result_url 새 탭 열림 확인", async () => {
    await page.goto("/ops/homepage-requests");
    await page.waitForLoadState("networkidle");

    // delivered 또는 completed 상태의 [보기] 버튼 찾기
    const viewBtn = page.locator('button:has-text("보기")').first();
    const hasViewable = await viewBtn.isVisible().catch(() => false);

    if (!hasViewable) {
      console.log("⚠️ 보기 가능한 신청 건이 없음 — 보기 테스트 skip");
      test.skip(true, "보기 가능한 신청 건 없음");
      return;
    }

    // 새 탭 열림 감지
    const [newPage] = await Promise.all([
      page.context().waitForEvent("page", { timeout: 5000 }).catch(() => null),
      viewBtn.click(),
    ]);

    await page.screenshot({ path: "test-results/05-view-done.png" });

    if (newPage) {
      const newUrl = newPage.url();
      console.log(`✅ 새 탭 URL: ${newUrl}`);
      // result_url이나 /homepage/ 경로로 이동했는지 확인
      expect(
        newUrl.includes("example.com") ||
          newUrl.includes("/homepage/") ||
          newUrl.includes("vercel.app")
      ).toBeTruthy();
      await newPage.close();
    } else {
      // 새 탭 대신 같은 페이지에서 라우팅된 경우
      const currentUrl = page.url();
      console.log(`ℹ️ 라우팅 URL: ${currentUrl}`);
    }
  });
});
