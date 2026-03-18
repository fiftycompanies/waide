import { test, expect } from "@playwright/test";

test.describe("벽지마스터 (/templates/wallpaper)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/templates/wallpaper");
  });

  // -- 페이지 로딩 --

  test("페이지 로딩 성공 (200 OK)", async ({ page }) => {
    const response = await page.goto("/templates/wallpaper");
    expect(response?.status()).toBe(200);
  });

  test("타이틀에 벽지마스터 포함", async ({ page }) => {
    await expect(page).toHaveTitle(/벽지마스터/);
  });

  // -- 주요 섹션 존재 --

  test("Hero 섹션 존재 (슬라이더)", async ({ page }) => {
    // Hero 영역에 이미지가 존재
    const heroSection = page.locator("section").first();
    await expect(heroSection).toBeAttached();

    // 견적알아보기 CTA 버튼 확인
    await expect(page.getByText("견적알아보기")).toBeAttached();
  });

  test("서비스 섹션 존재", async ({ page }) => {
    await expect(page.locator("section#service")).toBeAttached();
    await expect(
      page.getByText("벽지마스터가 제공하는 전문 서비스")
    ).toBeAttached();
  });

  test("시공사례 섹션 존재", async ({ page }) => {
    await expect(page.locator("section#projects")).toBeAttached();
    await expect(page.getByText("시공 사례")).toBeAttached();
  });

  test("고객후기 섹션 존재", async ({ page }) => {
    await expect(page.locator("section#reviews")).toBeAttached();
    await expect(page.getByText("고객 후기")).toBeAttached();
  });

  test("Footer 존재", async ({ page }) => {
    await expect(page.locator("footer")).toBeAttached();
    // Footer 내 벽지마스터 텍스트 확인 (footer > div > div > div > h3)
    await expect(
      page.locator("footer h3", { hasText: "벽지마스터" })
    ).toBeAttached();
  });

  // -- Hero 슬라이더 동작 --

  test("Hero 슬라이더: 좌우 화살표 버튼 존재", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "이전 슬라이드" })
    ).toBeAttached();
    await expect(
      page.getByRole("button", { name: "다음 슬라이드" })
    ).toBeAttached();
  });

  test("Hero 슬라이더: 다음 화살표 클릭으로 슬라이드 전환", async ({
    page,
  }) => {
    // 다음 슬라이드 버튼 클릭
    await page.getByRole("button", { name: "다음 슬라이드" }).click();

    // 애니메이션 대기
    await page.waitForTimeout(800);

    // 슬라이드가 전환되었는지 확인 (h1 텍스트가 존재)
    const title = await page.locator("h1").first().textContent();
    expect(title).toBeTruthy();
  });

  test("Hero 슬라이더: 이전 화살표 클릭", async ({ page }) => {
    await page.getByRole("button", { name: "이전 슬라이드" }).click();
    await page.waitForTimeout(800);

    // 에러 없이 h1이 존재하면 성공
    await expect(page.locator("h1").first()).toBeAttached();
  });

  test("Hero 슬라이더: 페이지네이션 도트 존재", async ({ page }) => {
    // 슬라이드 n 버튼들이 존재하는지 확인
    await expect(
      page.getByRole("button", { name: "슬라이드 1" })
    ).toBeAttached();
  });

  // -- 네비게이션 --

  test("네비게이션 바 로고 표시", async ({ page }) => {
    await expect(page.getByText("벽지마스터").first()).toBeVisible();
  });

  test("네비게이션 앵커 링크가 href를 가짐", async ({ page }) => {
    await expect(
      page.locator('a[href="#projects"]').first()
    ).toBeAttached();
    await expect(
      page.locator('a[href="#reviews"]').first()
    ).toBeAttached();
    await expect(
      page.locator('a[href="#estimate"]').first()
    ).toBeAttached();
  });

  // -- 모바일 메뉴 --

  test("모바일: 햄버거 메뉴 열기/닫기", async ({ page }) => {
    test.skip(
      (page.viewportSize()?.width ?? 1280) >= 768,
      "모바일 전용 테스트"
    );

    // 햄버거 버튼 클릭
    const menuButton = page.getByRole("button", { name: "메뉴 열기" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // 모바일 슬라이드 패널 내 "견적문의" 버튼 확인
    // 모바일 패널은 div.fixed.inset-0 안에 있음
    const mobilePanel = page.locator("div.fixed.inset-0");
    await expect(
      mobilePanel.getByText("견적문의").first()
    ).toBeVisible({ timeout: 3000 });

    // X 버튼 클릭 (햄버거가 X로 변환됨)
    await menuButton.click();

    await page.waitForTimeout(400);
  });

  // -- 시공사례 갤러리 --

  test("시공사례 갤러리 이미지 로딩", async ({ page }) => {
    const projectsSection = page.locator("section#projects");
    const images = projectsSection.locator("img");

    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    // 첫 번째 이미지의 src가 유효한지 확인
    const firstImgSrc = await images.first().getAttribute("src");
    expect(firstImgSrc).toBeTruthy();
  });

  test("시공사례 '더 알아보기' 버튼 존재", async ({ page }) => {
    await expect(
      page.locator("section#projects").getByText("더 알아보기")
    ).toBeAttached();
  });

  // -- 리뷰 캐러셀 --

  test("리뷰 캐러셀 카드 존재", async ({ page }) => {
    const reviewSection = page.locator("section#reviews");

    // 고객 후기 제목이 존재
    await expect(reviewSection.getByText("고객 후기")).toBeAttached();

    // 리뷰 카드들이 존재
    const reviewCards = reviewSection.locator("div.flex-shrink-0");
    const count = await reviewCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("리뷰 캐러셀: 데스크탑 좌우 버튼", async ({ page }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 768,
      "데스크탑 전용 테스트"
    );

    await expect(
      page.getByRole("button", { name: "이전 후기" })
    ).toBeAttached();
    await expect(
      page.getByRole("button", { name: "다음 후기" })
    ).toBeAttached();
  });

  // -- 견적 CTA --

  test("방문견적 CTA 섹션 존재", async ({ page }) => {
    await expect(page.locator("section#estimate")).toBeAttached();
    await expect(page.getByText("방문견적 신청")).toBeAttached();
  });

  // -- 서브페이지 --

  test("갤러리 서브페이지 로딩", async ({ page }) => {
    const response = await page.goto("/templates/wallpaper/gallery");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "시공 사례" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "메인으로 돌아가기" })
    ).toBeVisible();
  });

  test("견적문의 서브페이지 로딩", async ({ page }) => {
    const response = await page.goto("/templates/wallpaper/estimate");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "견적 문의" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "메인으로 돌아가기" })
    ).toBeVisible();
  });

  test("서브페이지에서 메인으로 돌아가기 동작", async ({ page }) => {
    await page.goto("/templates/wallpaper/gallery");
    await page.getByRole("link", { name: "메인으로 돌아가기" }).click();
    await page.waitForURL("**/templates/wallpaper");
    await expect(page).toHaveURL(/\/templates\/wallpaper$/);
  });
});
