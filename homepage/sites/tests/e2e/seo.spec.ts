import { test, expect, Page } from "@playwright/test";

// -- 헬퍼 함수 --

async function checkMetaTags(page: Page) {
  // title 태그 존재
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);

  // meta description 존재
  const description = page.locator('meta[name="description"]');
  await expect(description).toBeAttached();
  const descContent = await description.getAttribute("content");
  expect(descContent).toBeTruthy();
  expect(descContent!.length).toBeGreaterThan(0);

  // og:title 존재
  const ogTitle = page.locator('meta[property="og:title"]');
  await expect(ogTitle).toBeAttached();
  const ogTitleContent = await ogTitle.getAttribute("content");
  expect(ogTitleContent).toBeTruthy();
}

async function checkJsonLd(page: Page) {
  const jsonLdScripts = page.locator('script[type="application/ld+json"]');
  const count = await jsonLdScripts.count();
  expect(count).toBeGreaterThan(0);

  // 첫 번째 JSON-LD가 유효한 JSON인지 확인
  const firstScript = await jsonLdScripts.first().textContent();
  expect(firstScript).toBeTruthy();
  const parsed = JSON.parse(firstScript!);
  expect(parsed["@context"]).toBe("https://schema.org");
}

async function checkResponsiveViewport(
  page: Page,
  width: number,
  height: number
) {
  await page.setViewportSize({ width, height });
  // 뷰포트 변경 후 페이지가 정상 렌더링되는지 확인
  // body의 첫 자식 요소(메인 컨테이너)가 뷰포트 너비를 초과하지 않는지 확인
  // 단, 캐러셀 등 의도적인 가로 스크롤은 overflow-x-auto로 처리되므로 무시
  const hasNoHorizontalScroll = await page.evaluate(() => {
    // html 요소에 수평 스크롤바가 있는지 확인
    const html = document.documentElement;
    const hasScrollbar = html.scrollWidth > html.clientWidth + 20;
    return !hasScrollbar;
  });
  expect(hasNoHorizontalScroll).toBe(true);
}

// -- 테스트 데이터 --

const pages = [
  {
    name: "인덱스",
    path: "/",
    titlePattern: /인테리어 포트폴리오/,
    hasJsonLd: false, // 인덱스 페이지는 JSON-LD 없음
  },
  {
    name: "리모델리아",
    path: "/templates/remodeling",
    titlePattern: /리모델리아/,
    hasJsonLd: true,
  },
  {
    name: "벽지마스터",
    path: "/templates/wallpaper",
    titlePattern: /벽지마스터/,
    hasJsonLd: true,
  },
  {
    name: "디자인랩",
    path: "/templates/premium",
    titlePattern: /디자인랩/,
    hasJsonLd: true,
  },
  {
    name: "리모델리아 포트폴리오",
    path: "/templates/remodeling/portfolio",
    titlePattern: /포트폴리오.*리모델리아/,
    hasJsonLd: true,
  },
  {
    name: "리모델리아 상담문의",
    path: "/templates/remodeling/contact",
    titlePattern: /상담 문의.*리모델리아/,
    hasJsonLd: true,
  },
  {
    name: "벽지마스터 시공사례",
    path: "/templates/wallpaper/gallery",
    titlePattern: /시공사례.*벽지마스터/,
    hasJsonLd: true,
  },
  {
    name: "벽지마스터 견적문의",
    path: "/templates/wallpaper/estimate",
    titlePattern: /견적 문의.*벽지마스터/,
    hasJsonLd: true,
  },
  {
    name: "디자인랩 포트폴리오",
    path: "/templates/premium/portfolio",
    titlePattern: /포트폴리오.*디자인랩/,
    hasJsonLd: true,
  },
  {
    name: "디자인랩 쇼룸",
    path: "/templates/premium/showroom",
    titlePattern: /쇼룸.*디자인랩/,
    hasJsonLd: true,
  },
];

// -- 메타 태그 테스트 --

test.describe("SEO: 메타 태그", () => {
  for (const p of pages) {
    test(`${p.name} (${p.path}): title 태그 존재`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page).toHaveTitle(p.titlePattern);
    });
  }

  // 메인 3개 사이트 + 인덱스만 meta description 체크
  for (const p of pages.slice(0, 4)) {
    test(`${p.name} (${p.path}): meta description 존재`, async ({
      page,
    }) => {
      await page.goto(p.path);
      const description = page.locator('meta[name="description"]');
      await expect(description).toBeAttached();
      const content = await description.getAttribute("content");
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(10);
    });
  }

  // OG 태그: 메인 3개 사이트
  for (const p of pages.slice(1, 4)) {
    test(`${p.name} (${p.path}): og:title 존재`, async ({ page }) => {
      await page.goto(p.path);
      await checkMetaTags(page);
    });
  }
});

// -- JSON-LD 구조화 데이터 테스트 --

test.describe("SEO: JSON-LD 구조화 데이터", () => {
  for (const p of pages.filter((p) => p.hasJsonLd)) {
    test(`${p.name} (${p.path}): JSON-LD 존재 및 유효`, async ({
      page,
    }) => {
      await page.goto(p.path);
      await checkJsonLd(page);
    });
  }

  test("리모델리아: LocalBusiness JSON-LD 포함", async ({ page }) => {
    await page.goto("/templates/remodeling");
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();

    let hasLocalBusiness = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (text) {
        const data = JSON.parse(text);
        if (data["@type"] === "HomeAndConstructionBusiness") {
          hasLocalBusiness = true;
          expect(data.name).toBeTruthy();
          expect(data.telephone).toBeTruthy();
          expect(data.url).toBeTruthy();
          break;
        }
      }
    }
    expect(hasLocalBusiness).toBe(true);
  });

  test("리모델리아: FAQ JSON-LD 포함", async ({ page }) => {
    await page.goto("/templates/remodeling");
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();

    let hasFaq = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (text) {
        const data = JSON.parse(text);
        if (data["@type"] === "FAQPage") {
          hasFaq = true;
          expect(data.mainEntity.length).toBeGreaterThan(0);
          break;
        }
      }
    }
    expect(hasFaq).toBe(true);
  });

  test("리모델리아: BreadcrumbList JSON-LD 포함", async ({ page }) => {
    await page.goto("/templates/remodeling");
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();

    let hasBreadcrumb = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (text) {
        const data = JSON.parse(text);
        if (data["@type"] === "BreadcrumbList") {
          hasBreadcrumb = true;
          expect(data.itemListElement.length).toBeGreaterThan(0);
          break;
        }
      }
    }
    expect(hasBreadcrumb).toBe(true);
  });

  test("벽지마스터: LocalBusiness JSON-LD 포함", async ({ page }) => {
    await page.goto("/templates/wallpaper");
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();

    let hasLocalBusiness = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (text) {
        const data = JSON.parse(text);
        if (data["@type"] === "HomeAndConstructionBusiness") {
          hasLocalBusiness = true;
          expect(data.name).toBeTruthy();
          break;
        }
      }
    }
    expect(hasLocalBusiness).toBe(true);
  });

  test("디자인랩: LocalBusiness JSON-LD 포함", async ({ page }) => {
    await page.goto("/templates/premium");
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();

    let hasLocalBusiness = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (text) {
        const data = JSON.parse(text);
        if (data["@type"] === "HomeAndConstructionBusiness") {
          hasLocalBusiness = true;
          expect(data.name).toBeTruthy();
          break;
        }
      }
    }
    expect(hasLocalBusiness).toBe(true);
  });
});

// -- 반응형 뷰포트 테스트 --

test.describe("SEO: 반응형 뷰포트", () => {
  const viewports = [
    { name: "mobile (375px)", width: 375, height: 812 },
    { name: "tablet (768px)", width: 768, height: 1024 },
    { name: "desktop (1280px)", width: 1280, height: 720 },
  ];

  const mainPages = [
    { name: "인덱스", path: "/" },
    { name: "리모델리아", path: "/templates/remodeling" },
    { name: "벽지마스터", path: "/templates/wallpaper" },
    { name: "디자인랩", path: "/templates/premium" },
  ];

  for (const vp of viewports) {
    for (const p of mainPages) {
      test(`${p.name} @ ${vp.name}: 수평 오버플로 없음`, async ({
        page,
      }) => {
        await page.setViewportSize({
          width: vp.width,
          height: vp.height,
        });
        await page.goto(p.path);
        await page.waitForLoadState("networkidle");

        await checkResponsiveViewport(page, vp.width, vp.height);
      });
    }
  }
});

// -- HTML lang 속성 --

test.describe("SEO: HTML lang 속성", () => {
  test("html 태그에 lang=ko 설정", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("ko");
  });
});

// -- 페이지 응답 상태 테스트 --

test.describe("SEO: 페이지 응답 상태 코드", () => {
  for (const p of pages) {
    test(`${p.name} (${p.path}): 200 OK`, async ({ page }) => {
      const response = await page.goto(p.path);
      expect(response?.status()).toBe(200);
    });
  }
});
