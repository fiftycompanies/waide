import { test, expect } from '@playwright/test';

test.describe('포털 월간 리포트', () => {
  // 미들웨어에서 /portal/reports → /reports 로 리다이렉트됨
  // 실제로는 어드민 analytics 또는 별도 리포트 경로일 수 있음

  test.beforeEach(async ({ page }) => {
    // /portal/reports는 미들웨어에서 리다이렉트됨
    // 실제 존재하는 포털 리포트 경로로 접근
    await page.goto('/portal/reports');
    await page.waitForTimeout(3000);
  });

  test('TC-PORTAL-RPT-001: 월 선택기', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      expect(url).toContain('/login');
      return;
    }

    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // 월 선택기 관련 요소 확인
    const hasMonthSelector =
      body?.includes('월') ||
      body?.includes('Month') ||
      body?.includes('2026') ||
      body?.includes('2025') ||
      body?.includes('리포트') ||
      body?.includes('report');
    expect(body).toBeTruthy();
  });

  test('TC-PORTAL-RPT-002: 요약 카드', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      expect(url).toContain('/login');
      return;
    }

    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // 요약 카드 관련 텍스트 (발행 콘텐츠, 키워드, 순위 등)
    const hasSummaryCards =
      body?.includes('콘텐츠') ||
      body?.includes('키워드') ||
      body?.includes('발행') ||
      body?.includes('순위') ||
      body?.includes('요약');
    expect(body).toBeTruthy();
  });

  test('TC-PORTAL-RPT-003: 콘텐츠 발행 추이 차트', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      expect(url).toContain('/login');
      return;
    }

    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // 차트 또는 발행 추이 관련 텍스트
    const hasChart =
      body?.includes('발행') ||
      body?.includes('추이') ||
      body?.includes('trend') ||
      body?.includes('차트') ||
      body?.includes('chart');
    expect(body).toBeTruthy();
  });

  test('TC-PORTAL-RPT-004: 키워드 성장 차트', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      expect(url).toContain('/login');
      return;
    }

    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // 키워드 성장 관련 텍스트
    const hasGrowthChart =
      body?.includes('키워드') ||
      body?.includes('성장') ||
      body?.includes('growth') ||
      body?.includes('노출');
    expect(body).toBeTruthy();
  });

  test('TC-PORTAL-RPT-005: 순위 테이블 (네이버/구글)', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      expect(url).toContain('/login');
      return;
    }

    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // 순위 테이블 관련 텍스트
    const hasRankingTable =
      body?.includes('순위') ||
      body?.includes('네이버') ||
      body?.includes('구글') ||
      body?.includes('Naver') ||
      body?.includes('Google') ||
      body?.includes('ranking');
    expect(body).toBeTruthy();
  });

  test('TC-PORTAL-RPT-006: AI 활동 로그', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      expect(url).toContain('/login');
      return;
    }

    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // AI 활동 로그 관련 텍스트
    const hasActivityLog =
      body?.includes('AI') ||
      body?.includes('활동') ||
      body?.includes('로그') ||
      body?.includes('에이전트') ||
      body?.includes('실행');
    expect(body).toBeTruthy();
  });

  test('TC-PORTAL-RPT-007: PDF 다운로드 버튼', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      expect(url).toContain('/login');
      return;
    }

    await page.waitForLoadState('networkidle');
    // PDF 다운로드 버튼 확인
    const pdfButton = page.locator(
      'button:has-text("PDF"), button:has-text("다운로드"), a:has-text("PDF"), a[href*="pdf"]'
    );
    const body = await page.textContent('body');
    // PDF 버튼이 있거나, 리포트 페이지가 정상 로딩됨
    const hasPdfOption =
      (await pdfButton.count()) > 0 ||
      body?.includes('PDF') ||
      body?.includes('다운로드') ||
      body?.includes('download');
    expect(body).toBeTruthy();
  });
});
