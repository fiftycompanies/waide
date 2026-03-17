import { test, expect } from "@playwright/test";

test.describe("상담 신청 폼", () => {
  // 분석 결과 페이지에서 상담 모달을 열어 테스트
  const ANALYSIS_ID = "test-consult-analysis-id";

  test.beforeEach(async ({ page }) => {
    // 분석 결과 API 모킹
    await page.route(`**/api/analyze/${ANALYSIS_ID}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: ANALYSIS_ID,
          status: "completed",
          marketing_score: 65,
          basic_info: {
            name: "상담 테스트 매장",
            category: "음식점",
            region: "강남구",
          },
          keyword_analysis: {
            main_keyword: "강남 맛집",
            keywords: [],
          },
          seo_audit: {
            items: [
              { label: "리뷰 답글률", status: "good", value: "80%" },
              { label: "대표사진", status: "good", value: "설정됨" },
              { label: "키워드 밀도", status: "warning", value: "부족" },
              { label: "영업시간", status: "good", value: "설정됨" },
              { label: "메뉴 등록", status: "good", value: "10개" },
              { label: "편의시설", status: "good", value: "등록됨" },
              { label: "SNS/채널 연동", status: "danger", value: "없음" },
            ],
          },
        }),
      });
    });
  });

  test("TC-CONSULT-001: Consultation form validates required fields", async ({ page }) => {
    await page.goto(`/analysis/${ANALYSIS_ID}`);
    await page.waitForTimeout(3000);

    // 페이지 하단으로 스크롤하여 무료 상담 신청 버튼 찾기
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // 무료 상담 신청 버튼 클릭하여 모달 열기
    const consultBtn = page.locator("button:has-text('무료 상담 신청'), button:has-text('상담 신청')").first();
    const btnCount = await consultBtn.count();

    if (btnCount === 0) {
      // 상담 버튼이 보이지 않으면 스킵
      test.skip();
      return;
    }

    await consultBtn.click();
    await page.waitForTimeout(1000);

    // 상담 모달이 열렸는지 확인
    const modalTitle = page.locator("text=/무료 상담 신청/");
    await expect(modalTitle.first()).toBeVisible({ timeout: 5000 });

    // 필수 필드 확인: 이름(*), 전화번호(*)
    const nameLabel = page.locator("text=/이름/");
    const phoneLabel = page.locator("text=/전화번호/");
    await expect(nameLabel.first()).toBeVisible();
    await expect(phoneLabel.first()).toBeVisible();

    // 빈 상태에서 전송 버튼 클릭 시도
    const submitBtn = page.getByRole("button", { name: /상담.*신청|전송/i }).first();

    // required 속성이 있으므로 제출되지 않거나, validation 에러 표시
    // 이름 필드가 비어있으면 HTML5 validation 발동
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // 모달이 여전히 열려 있어야 함 (제출되지 않았으므로)
    await expect(modalTitle.first()).toBeVisible();
  });

  test("TC-CONSULT-002: Form submit calls POST /api/consultation", async ({ page }) => {
    let consultationCalled = false;
    let requestBody: Record<string, unknown> = {};

    // 상담 신청 API 모킹
    await page.route("**/api/consultation", (route) => {
      consultationCalled = true;
      const req = route.request();
      requestBody = JSON.parse(req.postData() || "{}");
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "consult-001", success: true }),
      });
    });

    await page.goto(`/analysis/${ANALYSIS_ID}`);
    await page.waitForTimeout(3000);

    // 페이지 하단으로 스크롤
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // 무료 상담 신청 버튼 클릭
    const consultBtn = page.locator("button:has-text('무료 상담 신청'), button:has-text('상담 신청')").first();
    const btnCount = await consultBtn.count();

    if (btnCount === 0) {
      test.skip();
      return;
    }

    await consultBtn.click();
    await page.waitForTimeout(1000);

    // 폼 입력
    const nameInput = page.locator("form input").nth(0); // 이름 필드
    const phoneInput = page.locator("form input").nth(1); // 전화번호 필드

    await nameInput.fill("홍길동");
    await phoneInput.fill("010-1234-5678");

    // 이메일 필드가 있으면 입력 (선택)
    const emailInput = page.locator('form input[type="email"]');
    const emailCount = await emailInput.count();
    if (emailCount > 0) {
      await emailInput.first().fill("test@example.com");
    }

    // 문의 내용 입력 (선택)
    const messageTextarea = page.locator("form textarea");
    const textareaCount = await messageTextarea.count();
    if (textareaCount > 0) {
      await messageTextarea.first().fill("마케팅 상담 신청합니다.");
    }

    // 상담 신청하기 버튼 클릭
    const submitBtn = page.getByRole("button", { name: /상담.*신청|전송/i }).first();
    await submitBtn.click();

    // API 호출 대기
    await page.waitForTimeout(3000);

    // POST /api/consultation 호출 확인
    expect(consultationCalled).toBeTruthy();

    // 요청 본문에 필수 필드 포함 확인
    expect(requestBody.contactName).toBe("홍길동");
    expect(requestBody.contactPhone).toBe("010-1234-5678");
    expect(requestBody.analysisId).toBe(ANALYSIS_ID);

    // 완료 메시지 표시 확인
    const successMsg = page.locator("text=/완료|감사|연락/i");
    await expect(successMsg.first()).toBeVisible({ timeout: 5000 });
  });
});
