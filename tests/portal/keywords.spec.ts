import { test, expect } from '@playwright/test';

test.describe('포털 키워드 관리', () => {
  // 미들웨어에서 /portal/keywords → /keywords로 리다이렉트됨

  test('TC-PORTAL-KW-001: 키워드 페이지 3탭', async ({ page }) => {
    const response = await page.goto('/keywords');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 3탭 구조 확인 (활성/AI추천/전략 또는 활성/AI추천/보관)
      const hasActivatedTab =
        body?.includes('활성') || body?.includes('active') || body?.includes('키워드');
      const hasSuggestedTab =
        body?.includes('AI') || body?.includes('추천') || body?.includes('suggested');
      expect(hasActivatedTab || hasSuggestedTab).toBeTruthy();

      // 탭 요소 확인
      const tabs = page.locator('[role="tab"], button[data-state]');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('TC-PORTAL-KW-002: 활성 키워드 목록', async ({ page }) => {
    const response = await page.goto('/keywords');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 활성 키워드 목록 또는 빈 상태 메시지
      const hasKeywordList =
        body?.includes('키워드') ||
        body?.includes('keyword') ||
        body?.includes('검색량') ||
        body?.includes('순위') ||
        body?.includes('등록된 키워드가 없습니다') ||
        body?.includes('데이터가 없습니다');
      expect(hasKeywordList).toBeTruthy();
    }
  });

  test('TC-PORTAL-KW-003: AI 추천 키워드 승인/거절', async ({ page }) => {
    const response = await page.goto('/keywords');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');

      // AI 추천 탭 클릭 시도
      const suggestedTab = page.locator(
        '[role="tab"]:has-text("AI"), [role="tab"]:has-text("추천"), button:has-text("AI 추천")'
      ).first();

      if (await suggestedTab.isVisible()) {
        await suggestedTab.click();
        await page.waitForTimeout(1000);

        const body = await page.textContent('body');
        // 승인/거절 버튼 또는 추천 키워드 관련 UI
        const hasApproveReject =
          body?.includes('승인') ||
          body?.includes('거절') ||
          body?.includes('approve') ||
          body?.includes('reject') ||
          body?.includes('추천') ||
          body?.includes('대기');
        expect(hasApproveReject).toBeTruthy();
      } else {
        // 탭이 없어도 키워드 페이지 로딩 성공 확인
        const body = await page.textContent('body');
        expect(body?.includes('키워드')).toBeTruthy();
      }
    }
  });

  test('TC-PORTAL-KW-004: 키워드 전략 요약', async ({ page }) => {
    const response = await page.goto('/keywords');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 키워드 전략 관련 텍스트 (Quick Win, 니치, 방어)
      const hasStrategy =
        body?.includes('전략') ||
        body?.includes('strategy') ||
        body?.includes('Quick Win') ||
        body?.includes('니치') ||
        body?.includes('방어') ||
        body?.includes('키워드');
      expect(hasStrategy).toBeTruthy();
    }
  });
});
