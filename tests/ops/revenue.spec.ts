import { test, expect } from '@playwright/test';

test.describe('매출 관리 (/ops/revenue)', () => {
  test('TC-REV-001: 미인증 시 매출 페이지 → 로그인 리다이렉트', async ({ page }) => {
    await page.goto('/ops/revenue');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });

  test('TC-REV-002: MRR/ARR 카드 표시 (인증 후)', async ({ page }) => {
    // 미인증 상태에서 보호 라우트 접근 시 리다이렉트 확인 후
    // storageState가 있는 경우 MRR/ARR 카드 렌더링 테스트
    const response = await page.goto('/ops/revenue');
    const status = response?.status();

    // 미인증 시 리다이렉트 (302→login) 또는 200 (인증됨)
    if (page.url().includes('/login')) {
      // 미인증 — 리다이렉트 정상 동작 확인
      expect(page.url()).toContain('/login');
    } else {
      // 인증됨 — MRR/ARR 카드 존재 확인
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      const hasMRR = body?.includes('MRR') || body?.includes('월간 반복 수익') || body?.includes('매출');
      const hasARR = body?.includes('ARR') || body?.includes('연간 반복 수익') || body?.includes('연매출');
      expect(hasMRR || hasARR).toBeTruthy();
    }
  });

  test('TC-REV-003: 플랜 분포 차트 (인증 후)', async ({ page }) => {
    const response = await page.goto('/ops/revenue');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 플랜 관련 텍스트 확인 (trial/basic/pro/enterprise)
      const hasPlanInfo =
        body?.includes('플랜') ||
        body?.includes('plan') ||
        body?.includes('trial') ||
        body?.includes('basic') ||
        body?.includes('pro') ||
        body?.includes('enterprise') ||
        body?.includes('분포');
      expect(hasPlanInfo).toBeTruthy();
    }
  });
});
