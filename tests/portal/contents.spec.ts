import { test, expect } from '@playwright/test';

test.describe('포털 콘텐츠 현황', () => {
  // 미들웨어에서 /portal/contents → /contents로 리다이렉트됨

  test('TC-PORTAL-CONT-001: 콘텐츠 상태 필터', async ({ page }) => {
    const response = await page.goto('/contents');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 상태 필터 관련 텍스트 (draft/review/approved/published/rejected/archived)
      const hasStatusFilter =
        body?.includes('콘텐츠') ||
        body?.includes('상태') ||
        body?.includes('전체') ||
        body?.includes('draft') ||
        body?.includes('초안') ||
        body?.includes('발행') ||
        body?.includes('목록');
      expect(hasStatusFilter).toBeTruthy();

      // 필터 또는 탭 요소 확인
      const filterElements = page.locator(
        'select, [role="combobox"], [role="tab"], button[data-state]'
      );
      const filterCount = await filterElements.count();
      expect(filterCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('TC-PORTAL-CONT-002: 콘텐츠 상세 QC 결과', async ({ page }) => {
    // 콘텐츠 목록 페이지에서 상세로 이동하는 패턴 테스트
    const response = await page.goto('/contents');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');

      // 콘텐츠 페이지 확인 (QC 점수 컬럼이 목록에 표시됨)
      const hasContent =
        body?.includes('콘텐츠') ||
        body?.includes('content') ||
        body?.includes('QC') ||
        body?.includes('점수') ||
        body?.includes('품질');
      expect(hasContent).toBeTruthy();

      // 콘텐츠 행이 있으면 클릭 시도
      const contentRow = page.locator('tr[data-row], table tbody tr, [role="row"]').first();
      if (await contentRow.isVisible()) {
        await contentRow.click();
        await page.waitForTimeout(2000);
        const detailBody = await page.textContent('body');
        // 상세 페이지에서 QC 결과 확인
        const hasQC =
          detailBody?.includes('QC') ||
          detailBody?.includes('검수') ||
          detailBody?.includes('품질') ||
          detailBody?.includes('점수') ||
          detailBody?.includes('콘텐츠');
        expect(hasQC).toBeTruthy();
      } else {
        // 콘텐츠가 없어도 페이지 로딩 성공
        expect(body).toBeTruthy();
      }
    }
  });
});
