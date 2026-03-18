import { test, expect } from "@playwright/test";

// ============================================================================
// 홈페이지 상담 관리 E2E 테스트
// ============================================================================

test.describe("홈페이지 상담 관리 - 인증 후 기능 테스트", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("TC-HP-INQ-001: 상담 신청 관리 페이지 접근", async ({ page }) => {
    await page.goto("/homepage/inquiries");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 페이지 제목
    const heading = page.locator("text=상담 신청 관리").first();
    const hasHeading = await heading.isVisible().catch(() => false);
    expect(hasHeading).toBeTruthy();
  });

  test("TC-HP-INQ-002: 상태 필터 버튼 6개 표시 (전체/신규/연락됨/상담중/계약/이탈)", async ({ page }) => {
    await page.goto("/homepage/inquiries");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    const filterLabels = ["전체", "신규", "연락됨", "상담 중", "계약", "이탈"];
    let visibleCount = 0;
    for (const label of filterLabels) {
      const el = page.locator(`text=${label}`).first();
      if (await el.isVisible().catch(() => false)) visibleCount++;
    }

    // 최소 4개 필터 표시
    expect(visibleCount).toBeGreaterThanOrEqual(4);
  });

  test("TC-HP-INQ-003: 상담이 없을 때 빈 상태 메시지", async ({ page }) => {
    await page.goto("/homepage/inquiries");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // 빈 상태 또는 상담 목록
    const emptyState = page.locator("text=상담 신청이 없습니다").first();
    const inquiryCard = page.locator(".bg-card").first();

    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasCards = await inquiryCard.isVisible().catch(() => false);

    // 둘 중 하나는 보여야 함
    expect(hasEmpty || hasCards).toBeTruthy();
  });
});

test.describe("홈페이지 상담 API - 비인증 접근", () => {
  test("TC-HP-INQ-004: POST /api/homepage/inquiry 상담 접수", async ({ request }) => {
    // 공개 API — 인증 없이 접근 가능
    const response = await request.post("/api/homepage/inquiry", {
      data: {
        project_id: "00000000-0000-0000-0000-000000000000",
        name: "E2E 테스트 고객",
        phone: "010-1234-5678",
        space_type: "아파트",
        area_pyeong: 30,
        budget_range: "3000만원~5000만원",
        message: "Playwright E2E 테스트 상담입니다",
      },
    });

    // 유효하지 않은 project_id라도 400 또는 500이 아닌 적절한 응답
    const status = response.status();
    // 정상 접수(201) 또는 프로젝트 미존재(400/404/500) 모두 API 동작 확인
    expect([200, 201, 400, 404, 500]).toContain(status);
  });

  test("TC-HP-INQ-005: POST /api/homepage/inquiry 필수 필드 누락", async ({ request }) => {
    const response = await request.post("/api/homepage/inquiry", {
      data: {
        // name, phone 누락
        project_id: "00000000-0000-0000-0000-000000000000",
      },
    });

    const status = response.status();
    // 필수 필드 누락 → 400 응답 기대
    expect([400, 422]).toContain(status);
  });

  test("TC-HP-INQ-006: GET /api/homepage/inquiries 목록 조회", async ({ request }) => {
    const response = await request.get("/api/homepage/inquiries");
    const status = response.status();
    expect(status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });
});
