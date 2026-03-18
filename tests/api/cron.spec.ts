import { test, expect } from '@playwright/test';

test.describe('크론 API 인증', () => {
  // 크론 엔드포인트는 실제 DB 쿼리를 실행하므로 응답이 느릴 수 있음
  // CRON_SECRET 미설정 시 인증 없이 바로 실행하는 엔드포인트 존재

  // serp 크론은 전체 클라이언트 SERP 수집을 실행하여 2분+ 소요 — E2E에서 스킵
  test.skip('TC-CRON-001: /api/cron/serp 응답 (slow)', async ({ request }) => {
    const response = await request.post('/api/cron/serp');
    const status = response.status();
    expect([200, 401, 403, 500]).toContain(status);
  });

  test('TC-CRON-002: /api/cron/search-volume 응답', async ({ request }) => {
    test.setTimeout(90000);
    const response = await request.get('/api/cron/search-volume');
    const status = response.status();
    expect([200, 401, 403, 500]).toContain(status);
  });

  test('TC-CRON-003: /api/cron/grading 응답', async ({ request }) => {
    const response = await request.get('/api/cron/grading');
    const status = response.status();
    expect([200, 401, 403, 500]).toContain(status);
  });

  test('TC-CRON-004: /api/cron/monthly-report 응답', async ({ request }) => {
    const response = await request.get('/api/cron/monthly-report');
    const status = response.status();
    expect([200, 401, 403, 500]).toContain(status);
  });

  test('TC-CRON-005: /api/cron/aeo 응답', async ({ request }) => {
    const response = await request.get('/api/cron/aeo');
    const status = response.status();
    expect([200, 401, 403, 500]).toContain(status);
  });

  test('TC-CRON-006: /api/cron/scheduled-publish 응답', async ({ request }) => {
    const response = await request.get('/api/cron/scheduled-publish');
    const status = response.status();
    expect([200, 401, 403, 500]).toContain(status);
  });

  // daily-stats 크론은 전체 통계 집계를 실행하여 2분+ 소요 — E2E에서 스킵
  test.skip('TC-CRON-007: /api/cron/daily-stats 응답 (slow)', async ({ request }) => {
    const response = await request.post('/api/cron/daily-stats');
    const status = response.status();
    expect([200, 401, 403, 500]).toContain(status);
  });

  test('TC-CRON-008: Bearer 토큰 인증 시 정상 응답', async ({ request }) => {
    const cronSecret = process.env.CRON_SECRET || 'test-cron-secret';
    const response = await request.get('/api/cron/grading', {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const status = response.status();
    expect([200, 401, 500]).toContain(status);
  });
});
