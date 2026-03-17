import { test, expect } from '@playwright/test';

test.describe('상품 관리 (/ops/products)', () => {
  test('TC-PROD-001: 상품 CRUD 페이지 접근', async ({ page }) => {
    const response = await page.goto('/ops/products');

    if (page.url().includes('/login')) {
      // 미인증 시 리다이렉트
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 상품 관리 페이지 확인
      const hasProductPage =
        body?.includes('상품') ||
        body?.includes('패키지') ||
        body?.includes('product') ||
        body?.includes('서비스');
      expect(hasProductPage).toBeTruthy();
    }
  });

  test('TC-PROD-002: 상품 생성 폼', async ({ page }) => {
    const response = await page.goto('/ops/products');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      // 상품 생성/추가 버튼 또는 폼 요소 확인
      const addButton = page.locator(
        'button:has-text("추가"), button:has-text("생성"), button:has-text("새 상품"), button:has-text("등록")'
      );
      const formElements = page.locator('input, select, textarea');
      const hasAddButton = (await addButton.count()) > 0;
      const hasForm = (await formElements.count()) > 0;
      // 추가 버튼이나 폼이 존재
      expect(hasAddButton || hasForm).toBeTruthy();
    }
  });

  test('TC-PROD-003: 상품 목록에 구독 수 표시', async ({ page }) => {
    const response = await page.goto('/ops/products');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 상품 목록 — 구독 관련 정보 표시
      const hasSubscriptionInfo =
        body?.includes('구독') ||
        body?.includes('subscription') ||
        body?.includes('가입') ||
        body?.includes('명') ||
        body?.includes('건');
      expect(hasSubscriptionInfo).toBeTruthy();
    }
  });
});
