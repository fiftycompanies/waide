import { test, expect } from "@playwright/test";

test.describe("인덱스 페이지 (/)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("페이지 로딩 성공", async ({ page }) => {
    await expect(page).toHaveTitle(/인테리어 포트폴리오/);
  });

  test("헤더 타이틀 표시", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "인테리어 포트폴리오" })
    ).toBeVisible();
  });

  test("3개 템플릿 카드 표시", async ({ page }) => {
    // 각 사이트 이름이 보이는지 확인 (h2 텍스트)
    await expect(
      page.getByRole("heading", { name: "리모델리아" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "벽지마스터" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "디자인랩" }).first()
    ).toBeVisible();
  });

  test("리모델리아 카드 클릭 시 해당 페이지로 이동", async ({ page }) => {
    await page.getByRole("link", { name: /리모델리아/ }).first().click();
    await page.waitForURL("**/templates/remodeling");
    await expect(page).toHaveURL(/\/templates\/remodeling/);
  });

  test("벽지마스터 카드 클릭 시 해당 페이지로 이동", async ({ page }) => {
    await page.getByRole("link", { name: /벽지마스터/ }).first().click();
    await page.waitForURL("**/templates/wallpaper");
    await expect(page).toHaveURL(/\/templates\/wallpaper/);
  });

  test("디자인랩 카드 클릭 시 해당 페이지로 이동", async ({ page }) => {
    await page.getByRole("link", { name: /디자인랩/ }).first().click();
    await page.waitForURL("**/templates/premium");
    await expect(page).toHaveURL(/\/templates\/premium/);
  });

  test("각 카드에 설명 텍스트 표시", async ({ page }) => {
    await expect(
      page.getByText("기대와 설렘이 가득한 리모델링 경험")
    ).toBeVisible();
    await expect(
      page.getByText("후회없는 도배, 실무자들이 직접 시공")
    ).toBeVisible();
    await expect(
      page.getByText("공간이 생각과 행동, 삶을 바꿉니다")
    ).toBeVisible();
  });

  test("푸터 표시", async ({ page }) => {
    await expect(
      page.getByText("Interior Portfolio — Built with Next.js & Tailwind CSS")
    ).toBeVisible();
  });
});
