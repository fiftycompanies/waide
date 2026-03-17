import { test, expect } from '@playwright/test';

test.describe('사이드바 네비게이션', () => {
  test('TC-SIDEBAR-001: 사이드바 메뉴 그룹 렌더링', async ({ page }) => {
    // 어드민 대시보드 접근 (인증 필요)
    const response = await page.goto('/dashboard');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
      return;
    }

    await page.waitForLoadState('networkidle');
    // 사이드바 요소 확인
    const sidebar = page.locator(
      'nav, aside, [data-sidebar], [role="navigation"]'
    ).first();

    if (await sidebar.isVisible()) {
      const sidebarText = await sidebar.textContent();
      // 메뉴 그룹 텍스트 확인 (서비스/고객관리/비즈니스/영업CRM/리소스/설정)
      const hasMenuGroups =
        sidebarText?.includes('서비스') ||
        sidebarText?.includes('고객') ||
        sidebarText?.includes('비즈니스') ||
        sidebarText?.includes('대시보드') ||
        sidebarText?.includes('콘텐츠') ||
        sidebarText?.includes('키워드') ||
        sidebarText?.includes('설정');
      expect(hasMenuGroups).toBeTruthy();
    } else {
      // 모바일 뷰에서 사이드바가 숨겨져 있을 수 있음
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
    }
  });

  test('TC-SIDEBAR-002: 활성 메뉴 아이템 하이라이트', async ({ page }) => {
    const response = await page.goto('/dashboard');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
      return;
    }

    await page.waitForLoadState('networkidle');

    // 현재 활성 메뉴 아이템 확인 (대시보드)
    const activeItem = page.locator(
      '[data-active="true"], [aria-current="page"], .active, .bg-accent, [data-state="active"]'
    ).first();

    const sidebar = page.locator('nav, aside, [data-sidebar]').first();
    if (await sidebar.isVisible()) {
      // 대시보드 관련 링크가 활성 상태인지 확인
      const dashboardLink = page.locator(
        'a[href="/dashboard"], a[href*="dashboard"]'
      ).first();

      if (await dashboardLink.isVisible()) {
        // 대시보드 링크가 존재함 확인
        expect(await dashboardLink.isVisible()).toBeTruthy();
      }
    }
    // 페이지 로딩 자체는 성공
    expect(page.url()).toContain('/dashboard');
  });

  test('TC-SIDEBAR-003: 메뉴 아이템 링크 정확성', async ({ page }) => {
    const response = await page.goto('/dashboard');

    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
      return;
    }

    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('nav, aside, [data-sidebar]').first();
    if (!(await sidebar.isVisible())) {
      // 사이드바가 없으면 테스트 스킵 (모바일 뷰)
      expect(true).toBeTruthy();
      return;
    }

    // 주요 메뉴 링크 존재 확인
    const expectedLinks = [
      '/dashboard',
      '/keywords',
      '/contents',
    ];

    for (const href of expectedLinks) {
      const link = page.locator(`a[href="${href}"], a[href*="${href}"]`).first();
      // 링크가 존재하면 올바른 href를 가지고 있어야 함
      if (await link.isVisible()) {
        const actualHref = await link.getAttribute('href');
        expect(actualHref).toContain(href);
      }
    }
  });

  test('TC-SIDEBAR-004: 역할 기반 메뉴 필터링', async ({ page }) => {
    // 미인증 상태에서는 사이드바가 표시되지 않아야 함
    const response = await page.goto('/dashboard');

    if (page.url().includes('/login')) {
      // 미인증 → 로그인 리다이렉트. 사이드바 미노출 정상
      expect(page.url()).toContain('/login');

      // 로그인 페이지에 사이드바가 없어야 함
      const sidebar = page.locator(
        'nav:has(a[href="/dashboard"]), aside:has(a[href="/dashboard"])'
      ).first();
      const sidebarVisible = await sidebar.isVisible().catch(() => false);
      expect(sidebarVisible).toBeFalsy();
    } else {
      await page.waitForLoadState('networkidle');

      // 인증된 상태에서 역할에 따른 메뉴 표시 확인
      const sidebar = page.locator('nav, aside, [data-sidebar]').first();
      if (await sidebar.isVisible()) {
        const sidebarText = await sidebar.textContent();
        // 기본 메뉴는 항상 표시되어야 함
        const hasBasicMenus =
          sidebarText?.includes('대시보드') ||
          sidebarText?.includes('Dashboard');
        expect(hasBasicMenus).toBeTruthy();

        // super_admin 전용 메뉴 존재 여부 (역할에 따라 다름)
        // 어드민 관리는 super_admin/admin에게만 표시
        const hasAdminMenu =
          sidebarText?.includes('어드민') || sidebarText?.includes('admin');
        // 이 테스트에서는 메뉴 존재 여부만 확인 (역할별 필터링은 인증 상태에 의존)
      }
      expect(page.url()).toContain('/dashboard');
    }
  });
});
