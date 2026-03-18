import { test, expect } from "@playwright/test";

test.describe("리모델리아 (/templates/remodeling)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/templates/remodeling");
  });

  // -- 페이지 로딩 --

  test("페이지 로딩 성공 (200 OK)", async ({ page }) => {
    const response = await page.goto("/templates/remodeling");
    expect(response?.status()).toBe(200);
  });

  test("타이틀에 리모델리아 포함", async ({ page }) => {
    await expect(page).toHaveTitle(/리모델리아/);
  });

  // -- 주요 섹션 존재 --

  test("Hero 섹션 존재", async ({ page }) => {
    // Hero 이미지 (alt 텍스트로 확인)
    await expect(
      page.getByAltText("리모델리아 인테리어 메인 이미지")
    ).toBeAttached();
  });

  test("BrandIntro 섹션 존재", async ({ page }) => {
    await expect(page.locator("section#service")).toBeAttached();
    await expect(
      page.getByText("기대와 설렘이 가득한")
    ).toBeAttached();
  });

  test("Portfolio 섹션 존재", async ({ page }) => {
    await expect(page.locator("section#portfolio")).toBeAttached();
    await expect(
      page.getByText("공간 활용도를 높인 30평대 아파트")
    ).toBeAttached();
  });

  test("Review 섹션 존재", async ({ page }) => {
    // ReviewSection uses id="contact"
    await expect(page.locator("section#contact")).toBeAttached();
    await expect(
      page.getByText("리모델리아와 함께한 분들의 후기")
    ).toBeAttached();
  });

  test("Footer 존재", async ({ page }) => {
    await expect(page.locator("footer")).toBeAttached();
    await expect(page.getByText("개인정보처리방침")).toBeAttached();
  });

  // -- 네비게이션 --

  test("네비게이션 바 로고 표시", async ({ page }) => {
    await expect(
      page.locator("header button", { hasText: "리모델리아" })
    ).toBeVisible();
  });

  test("데스크탑 네비게이션 링크 존재", async ({ page }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 768,
      "데스크탑 전용 테스트"
    );
    // Desktop nav is <nav class="hidden md:flex ...">
    const desktopNav = page.locator("header nav").first();
    await expect(desktopNav.getByText("포트폴리오")).toBeVisible();
    await expect(desktopNav.getByText("서비스 안내")).toBeVisible();
    await expect(desktopNav.getByText("견적 문의")).toBeVisible();
    await expect(desktopNav.getByText("상담신청")).toBeVisible();
  });

  test("네비게이션 앵커 링크가 href를 가짐", async ({ page }) => {
    const portfolioLink = page.locator('a[href="#portfolio"]').first();
    await expect(portfolioLink).toBeAttached();

    const serviceLink = page.locator('a[href="#service"]').first();
    await expect(serviceLink).toBeAttached();

    const contactLink = page.locator('a[href="#contact"]').first();
    await expect(contactLink).toBeAttached();
  });

  // -- 모바일 햄버거 메뉴 --

  test("모바일: 햄버거 메뉴 열기/닫기", async ({ page }) => {
    test.skip(
      (page.viewportSize()?.width ?? 1280) >= 768,
      "모바일 전용 테스트"
    );

    // 햄버거 버튼 클릭
    const menuButton = page.getByRole("button", { name: /메뉴/ });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // 모바일 오버레이 내 상담신청 링크 확인 (모바일 전용)
    // 모바일 오버레이는 두번째 nav 안에 있음
    const mobileOverlay = page.locator("div.fixed.inset-0");
    await expect(mobileOverlay.getByText("상담신청")).toBeVisible({ timeout: 3000 });

    // 닫기 버튼 클릭
    const closeButton = page.getByRole("button", { name: /메뉴 닫기/ });
    await closeButton.click();

    // 잠시 대기
    await page.waitForTimeout(400);
  });

  // -- 플로팅 버튼 --

  test("스크롤 후 플로팅 버튼 표시", async ({ page }) => {
    // 500px 이상 스크롤
    await page.evaluate(() => window.scrollTo(0, 600));

    // 맨 위로 스크롤 버튼 확인 (scrollY > 400 이후 표시)
    await expect(
      page.getByRole("button", { name: "맨 위로 스크롤" })
    ).toBeVisible({ timeout: 5000 });

    // 카카오톡 상담 버튼 확인 (aria-label)
    await expect(
      page.getByLabel("카카오톡 상담")
    ).toBeVisible({ timeout: 5000 });
  });

  // -- 포트폴리오 이미지 --

  test("포트폴리오 이미지 로딩", async ({ page }) => {
    const portfolioSection = page.locator("section#portfolio");
    const images = portfolioSection.locator("img");

    // 최소 1개 이상의 이미지가 존재
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    // 첫 번째 이미지의 src가 유효한지 확인
    const firstImgSrc = await images.first().getAttribute("src");
    expect(firstImgSrc).toBeTruthy();
  });

  // -- 서브페이지 --

  test("포트폴리오 서브페이지 로딩", async ({ page }) => {
    const response = await page.goto("/templates/remodeling/portfolio");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "포트폴리오" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "메인으로 돌아가기" })
    ).toBeVisible();
  });

  test("상담문의 서브페이지 로딩", async ({ page }) => {
    const response = await page.goto("/templates/remodeling/contact");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "상담 문의" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "메인으로 돌아가기" })
    ).toBeVisible();
  });

  test("서브페이지에서 메인으로 돌아가기 동작", async ({ page }) => {
    await page.goto("/templates/remodeling/portfolio");
    await page.getByRole("link", { name: "메인으로 돌아가기" }).click();
    await page.waitForURL("**/templates/remodeling");
    await expect(page).toHaveURL(/\/templates\/remodeling$/);
  });
});
