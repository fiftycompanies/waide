import { test, expect } from "@playwright/test";

test.describe("디자인랩 (/templates/premium)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/templates/premium");
  });

  // -- 페이지 로딩 --

  test("페이지 로딩 성공 (200 OK)", async ({ page }) => {
    const response = await page.goto("/templates/premium");
    expect(response?.status()).toBe(200);
  });

  test("타이틀에 디자인랩 포함", async ({ page }) => {
    await expect(page).toHaveTitle(/디자인랩/);
  });

  // -- 주요 섹션 존재 --

  test("Hero 섹션 존재", async ({ page }) => {
    // framer-motion 애니메이션으로 인해 초기 opacity가 0일 수 있으므로 DOM 존재 확인
    await expect(
      page.locator("text=DESIGNLAB").first()
    ).toBeAttached({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { level: 1 })
    ).toBeAttached({ timeout: 10000 });
  });

  test("About 섹션 존재", async ({ page }) => {
    await expect(page.locator("section#about")).toBeAttached();
    await expect(page.getByText("About designlab")).toBeAttached();
  });

  test("01 BrandPartners 섹션 존재", async ({ page }) => {
    await expect(
      page.getByText("High-end Brand")
    ).toBeAttached();
    await expect(
      page.getByText("하이엔드 브랜드들이 먼저 선택한 공간 파트너")
    ).toBeAttached();
  });

  test("04 QualityCompare 섹션 존재", async ({ page }) => {
    await expect(page.locator("section#quality")).toBeAttached();
    await expect(
      page.getByText("High-end 3D Quality")
    ).toBeAttached();
  });

  test("06 Partnership 섹션 존재", async ({ page }) => {
    await expect(
      page.getByText("High-end Partnership")
    ).toBeAttached();
  });

  test("Footer 존재", async ({ page }) => {
    await expect(page.locator("footer")).toBeAttached();
    await expect(
      page.getByText("designlab. All Rights Reserved.")
    ).toBeAttached();
  });

  // -- Hero CTA 버튼 --

  test("Hero CTA: 서비스 신청하기 버튼 존재", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "서비스 신청하기" })
    ).toBeAttached();
  });

  test("Hero CTA: 포트폴리오 보러가기 버튼 존재", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "포트폴리오 보러가기" })
    ).toBeAttached();
  });

  test("Hero CTA: 서비스 신청하기 링크 href 확인", async ({ page }) => {
    const ctaLink = page.getByRole("link", { name: "서비스 신청하기" });
    await expect(ctaLink).toHaveAttribute("href", "#contact");
  });

  test("Hero CTA: 포트폴리오 보러가기 링크 href 확인", async ({ page }) => {
    const ctaLink = page.getByRole("link", { name: "포트폴리오 보러가기" });
    await expect(ctaLink).toHaveAttribute("href", "#portfolio");
  });

  // -- Before/After 슬라이더 --

  test("Before/After 슬라이더 존재", async ({ page }) => {
    // About 섹션 내에 cursor-ew-resize 슬라이더 존재
    const slider = page.locator("div.cursor-ew-resize");
    await expect(slider).toBeAttached();

    // BEFORE, AFTER 텍스트 존재
    await expect(
      page.locator("section#about").getByText("BEFORE")
    ).toBeAttached();
    await expect(
      page.locator("section#about").getByText("AFTER")
    ).toBeAttached();
  });

  test("슬라이더 안내 텍스트 존재", async ({ page }) => {
    await expect(
      page.getByText("아이콘을 왼쪽으로 움직여보세요")
    ).toBeAttached();
  });

  // -- 플로팅 CTA --

  test("스크롤 후 플로팅 CTA 표시", async ({ page }) => {
    // 300px 스크롤
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

    // "상담 신청하기" 텍스트가 포함된 플로팅 요소가 나타남
    await expect(page.getByText("상담 신청하기").first()).toBeAttached();
  });

  // -- 브랜드 파트너 --

  test("브랜드 파트너 카드 존재", async ({ page }) => {
    // 브랜드 파트너 캐러셀의 스크롤 가능한 컨테이너
    const scrollContainer = page.locator("div.overflow-x-auto");
    await expect(scrollContainer.first()).toBeAttached();
  });

  test("파트너십 브랜드 로고 표시", async ({ page }) => {
    // 06 Partnership 섹션의 브랜드 이름들 (PartnershipSection 하드코딩)
    await expect(page.getByText("Cassina")).toBeAttached();
    await expect(page.getByText("Minotti")).toBeAttached();
    await expect(page.getByText("Poliform")).toBeAttached();
  });

  // -- 04 QualityCompare 이미지 --

  test("QualityCompare: BEFORE/3D IMAGE/AFTER 라벨 존재", async ({
    page,
  }) => {
    const qualitySection = page.locator("section#quality");

    await expect(qualitySection.getByText("BEFORE")).toBeAttached();
    await expect(qualitySection.getByText("3D IMAGE")).toBeAttached();
    await expect(qualitySection.getByText("AFTER")).toBeAttached();
  });

  test("QualityCompare: 이미지 로딩", async ({ page }) => {
    const qualitySection = page.locator("section#quality");
    const images = qualitySection.locator("img");

    const count = await images.count();
    expect(count).toBe(3);
  });

  // -- 넘버링 섹션 확인 --

  test("섹션 넘버링 01~09 존재", async ({ page }) => {
    // 각 섹션의 넘버링 텍스트 확인
    const numbers = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];
    for (const num of numbers) {
      await expect(
        page.locator(`p:text-is("${num}")`).first()
      ).toBeAttached();
    }
  });

  // -- Showroom 섹션 --

  test("Showroom/Contact 섹션 존재", async ({ page }) => {
    await expect(page.locator("section#contact")).toBeAttached();
    await expect(page.getByText("designlab showroom")).toBeAttached();
  });

  // -- 서브페이지 --

  test("포트폴리오 서브페이지 로딩", async ({ page }) => {
    const response = await page.goto("/templates/premium/portfolio");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "포트폴리오" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "메인으로 돌아가기" })
    ).toBeVisible();
  });

  test("쇼룸 서브페이지 로딩", async ({ page }) => {
    const response = await page.goto("/templates/premium/showroom");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "쇼룸" })
    ).toBeVisible();
    await expect(page.getByText("서울시 성수동")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "메인으로 돌아가기" })
    ).toBeVisible();
  });

  test("서브페이지에서 메인으로 돌아가기 동작", async ({ page }) => {
    await page.goto("/templates/premium/portfolio");
    await page.getByRole("link", { name: "메인으로 돌아가기" }).click();
    await page.waitForURL("**/templates/premium");
    await expect(page).toHaveURL(/\/templates\/premium$/);
  });
});
