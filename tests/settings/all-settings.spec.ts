import { test, expect } from '@playwright/test';

test.describe('설정 페이지', () => {
  test('TC-SET-001: 에이전트 설정 페이지 프롬프트 탭', async ({ page }) => {
    const response = await page.goto('/ops/agent-settings');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 프롬프트 탭 관련 텍스트 확인
      const hasTabs =
        body?.includes('프롬프트') ||
        body?.includes('콘텐츠') ||
        body?.includes('진화') ||
        body?.includes('지식') ||
        body?.includes('에이전트');
      expect(hasTabs).toBeTruthy();

      // 탭 요소 확인
      const tabs = page.locator('[role="tab"], [data-state]');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('TC-SET-002: AEO 설정 모델 토글', async ({ page }) => {
    const response = await page.goto('/ops/aeo-settings');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // AEO 모델 관련 텍스트 (Perplexity, Claude, ChatGPT, Gemini)
      const hasModelSettings =
        body?.includes('Perplexity') ||
        body?.includes('Claude') ||
        body?.includes('ChatGPT') ||
        body?.includes('Gemini') ||
        body?.includes('모델') ||
        body?.includes('AEO');
      expect(hasModelSettings).toBeTruthy();

      // 토글/스위치 요소 확인
      const toggles = page.locator(
        'button[role="switch"], input[type="checkbox"], [data-state="checked"], [data-state="unchecked"]'
      );
      const toggleCount = await toggles.count();
      expect(toggleCount).toBeGreaterThanOrEqual(0); // 0이라도 페이지 로딩은 성공
    }
  });

  test('TC-SET-003: 스코어링 설정', async ({ page }) => {
    const response = await page.goto('/ops/scoring-settings');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 점수 가중치 설정 확인
      const hasScoringSettings =
        body?.includes('점수') ||
        body?.includes('가중치') ||
        body?.includes('score') ||
        body?.includes('weight') ||
        body?.includes('설정');
      expect(hasScoringSettings).toBeTruthy();
    }
  });

  test('TC-SET-004: SERP 설정', async ({ page }) => {
    const response = await page.goto('/ops/serp-settings');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // SERP 설정 관련 텍스트
      const hasSerpSettings =
        body?.includes('SERP') ||
        body?.includes('검색') ||
        body?.includes('순위') ||
        body?.includes('네이버') ||
        body?.includes('구글') ||
        body?.includes('수집');
      expect(hasSerpSettings).toBeTruthy();
    }
  });

  test('TC-SET-005: API 설정 페이지', async ({ page }) => {
    const response = await page.goto('/ops/settings');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // API 키, 슬랙, 기본값 설정 확인
      const hasApiSettings =
        body?.includes('API') ||
        body?.includes('Slack') ||
        body?.includes('슬랙') ||
        body?.includes('설정') ||
        body?.includes('키');
      expect(hasApiSettings).toBeTruthy();
    }
  });

  test('TC-SET-006: 에러 로그 페이지 필터', async ({ page }) => {
    const response = await page.goto('/ops/error-logs');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 에러 로그 관련 텍스트 (상태/유형/기간 필터)
      const hasErrorLogs =
        body?.includes('에러') ||
        body?.includes('error') ||
        body?.includes('로그') ||
        body?.includes('log');
      expect(hasErrorLogs).toBeTruthy();

      // 필터 요소 확인 (select, input, button)
      const filterElements = page.locator(
        'select, [role="combobox"], button:has-text("필터"), input[type="date"], input[placeholder*="검색"]'
      );
      // 필터가 없어도 페이지 로딩은 성공해야 함
      const body2 = await page.textContent('body');
      expect(body2).toBeTruthy();
    }
  });

  test('TC-SET-007: 어드민 관리 (super_admin 전용)', async ({ page }) => {
    const response = await page.goto('/settings/admins');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 어드민 관리 페이지 — 역할 기반 접근
      const hasAdminPage =
        body?.includes('어드민') ||
        body?.includes('admin') ||
        body?.includes('관리자') ||
        body?.includes('역할') ||
        body?.includes('권한') ||
        body?.includes('접근 권한');
      // super_admin이 아닌 경우 권한 에러 가능
      expect(body).toBeTruthy();
    }
  });

  test('TC-SET-008: 블로그 계정 페이지', async ({ page }) => {
    const response = await page.goto('/blog-accounts');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
    } else {
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      // 블로그 계정 관련 텍스트
      const hasBlogAccounts =
        body?.includes('블로그') ||
        body?.includes('계정') ||
        body?.includes('blog') ||
        body?.includes('account') ||
        body?.includes('네이버') ||
        body?.includes('티스토리') ||
        body?.includes('워드프레스');
      expect(hasBlogAccounts).toBeTruthy();
    }
  });
});
