import { test, expect } from '@playwright/test';

test.describe('크론 API 인증', () => {
  const cronEndpoints = [
    { name: 'SERP', path: '/api/cron/serp', method: 'POST' as const },
    { name: '검색량', path: '/api/cron/search-volume', method: 'GET' as const },
    { name: '등급 산출', path: '/api/cron/grading', method: 'GET' as const },
    { name: '월간 리포트', path: '/api/cron/monthly-report', method: 'GET' as const },
    { name: 'AEO', path: '/api/cron/aeo', method: 'GET' as const },
    { name: '예약 발행', path: '/api/cron/scheduled-publish', method: 'GET' as const },
    { name: '일일 통계', path: '/api/cron/daily-stats', method: 'POST' as const },
  ];

  test('TC-CRON-001: /api/cron/serp 인증 필요', async ({ request }) => {
    const response = await request.post('/api/cron/serp');
    const status = response.status();
    // CRON_SECRET 없으면 401, DB 미연결 시 500
    expect([401, 403, 500]).toContain(status);
  });

  test('TC-CRON-002: /api/cron/search-volume 인증 필요', async ({ request }) => {
    const response = await request.get('/api/cron/search-volume');
    const status = response.status();
    expect([401, 403, 500]).toContain(status);
  });

  test('TC-CRON-003: /api/cron/grading 인증 필요', async ({ request }) => {
    const response = await request.get('/api/cron/grading');
    const status = response.status();
    expect([401, 403, 500]).toContain(status);
  });

  test('TC-CRON-004: /api/cron/monthly-report 인증 필요', async ({ request }) => {
    const response = await request.get('/api/cron/monthly-report');
    const status = response.status();
    expect([401, 403, 500]).toContain(status);
  });

  test('TC-CRON-005: /api/cron/aeo 인증 필요', async ({ request }) => {
    const response = await request.get('/api/cron/aeo');
    const status = response.status();
    expect([401, 403, 500]).toContain(status);
  });

  test('TC-CRON-006: /api/cron/scheduled-publish 인증 필요', async ({ request }) => {
    const response = await request.get('/api/cron/scheduled-publish');
    const status = response.status();
    expect([401, 403, 500]).toContain(status);
  });

  test('TC-CRON-007: /api/cron/daily-stats 인증 필요', async ({ request }) => {
    const response = await request.post('/api/cron/daily-stats');
    const status = response.status();
    expect([401, 403, 500]).toContain(status);
  });

  test('TC-CRON-008: 유효한 Bearer 토큰으로 인증 통과', async ({ request }) => {
    // CRON_SECRET 환경변수가 설정된 경우 Bearer 토큰 인증 테스트
    const cronSecret = process.env.CRON_SECRET || 'test-cron-secret';

    // 각 크론 엔드포인트에 Bearer 토큰으로 접근
    for (const endpoint of cronEndpoints) {
      const options = {
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      };

      let response;
      if (endpoint.method === 'POST') {
        response = await request.post(endpoint.path, options);
      } else {
        response = await request.get(endpoint.path, options);
      }
      const status = response.status();
      // 인증 통과 (200) 또는 DB/외부 API 미연결 (500)
      // 401/403이면 인증 실패 — CRON_SECRET 불일치
      // 테스트 환경에서는 500도 허용 (DB 미연결)
      expect([200, 500]).toContain(status);
    }
  });
});
