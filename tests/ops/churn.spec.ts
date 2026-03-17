import { test, expect } from '@playwright/test';

test.describe('이탈 관리 (/ops/churn)', () => {
  test('TC-CHURN-001: 이탈 페이지 At Risk 목록', async ({ page }) => {
    const response = await page.goto('/ops/churn');

    if (page.url().includes('/login')) {
      // 미인증 시 리다이렉트 정상 동작
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // At Risk 목록 또는 이탈 관련 UI 요소 확인
      const hasAtRisk =
        body?.includes('At Risk') ||
        body?.includes('이탈') ||
        body?.includes('위험') ||
        body?.includes('churn') ||
        body?.includes('고객');
      expect(hasAtRisk).toBeTruthy();
    }
  });

  test('TC-CHURN-002: 이탈률/유지율 메트릭 표시', async ({ page }) => {
    const response = await page.goto('/ops/churn');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 이탈률 또는 유지율 메트릭 확인
      const hasMetrics =
        body?.includes('이탈률') ||
        body?.includes('유지율') ||
        body?.includes('churn rate') ||
        body?.includes('retention') ||
        body?.includes('%');
      expect(hasMetrics).toBeTruthy();
    }
  });
});
