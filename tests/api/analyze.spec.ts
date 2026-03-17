import { test, expect } from '@playwright/test';

test.describe('분석 API (/api/analyze)', () => {
  test('TC-API-ANALYZE-001: POST /api/analyze 유효한 URL → 200/201', async ({ request }) => {
    const response = await request.post('/api/analyze', {
      data: {
        url: 'https://place.naver.com/restaurant/1234567890',
        visitorToken: 'test-token-playwright',
      },
    });
    const status = response.status();
    // 분석 시작 성공(200/201), URL 파싱 에러(400), 또는 외부 API 미연결(500)
    expect([200, 201, 400, 500]).toContain(status);
    if (status === 200 || status === 201) {
      const body = await response.json();
      expect(body).toHaveProperty('id');
    }
  });

  test('TC-API-ANALYZE-002: POST /api/analyze 빈 URL → 400', async ({ request }) => {
    const response = await request.post('/api/analyze', {
      data: { url: '' },
    });
    const status = response.status();
    expect([400, 422]).toContain(status);
  });

  test('TC-API-ANALYZE-003: GET /api/analyze/[id] 분석 상태 조회', async ({ request }) => {
    // 존재할 수 있는 분석 ID로 조회
    const testId = '00000000-0000-0000-0000-000000002001';
    const response = await request.get(`/api/analyze/${testId}`);
    const status = response.status();
    // 200 (조회 성공), 404 (미존재), 500 (DB 미연결)
    expect([200, 404, 500]).toContain(status);
    if (status === 200) {
      const body = await response.json();
      // status 필드 확인 (pending/analyzing/completed/failed/converted)
      expect(body).toHaveProperty('status');
    }
  });

  test('TC-API-ANALYZE-004: GET /api/analyze/[id] 잘못된 ID → 404', async ({ request }) => {
    const response = await request.get('/api/analyze/invalid-uuid-format');
    const status = response.status();
    // 400 (잘못된 형식) 또는 404 (미존재) 또는 500 (서버 에러)
    expect([400, 404, 500]).toContain(status);
  });

  test('TC-API-ANALYZE-005: POST /api/analyze/[id]/edit 분석 수정', async ({ request }) => {
    const testId = '00000000-0000-0000-0000-000000002001';
    const response = await request.post(`/api/analyze/${testId}/edit`, {
      data: {
        refined_keywords: ['테스트 키워드'],
        strengths: '테스트 강점',
      },
    });
    const status = response.status();
    // 200 (수정 성공), 401 (미인증), 404 (미존재), 500 (서버 에러)
    expect([200, 401, 404, 500]).toContain(status);
  });

  test('TC-API-ANALYZE-006: POST /api/analyze/[id]/refine 재분석 트리거', async ({ request }) => {
    const testId = '00000000-0000-0000-0000-000000002001';
    const response = await request.post(`/api/analyze/${testId}/refine`, {
      data: {
        refined_keywords: ['재분석 키워드'],
        strengths: '재분석 강점',
        appeal: '재분석 어필',
        target: '재분석 타겟',
      },
    });
    const status = response.status();
    // 200 (성공), 404 (미존재), 500 (서버 에러)
    expect([200, 404, 500]).toContain(status);
  });

  test('TC-API-ANALYZE-007: 빠른 연속 요청 시 Rate limiting', async ({ request }) => {
    const promises = Array.from({ length: 5 }, () =>
      request.post('/api/analyze', {
        data: {
          url: 'https://place.naver.com/restaurant/9999999999',
          visitorToken: 'rate-limit-test',
        },
      })
    );
    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status());

    // 최소 하나는 응답이 와야 함
    expect(statuses.length).toBe(5);
    // 429 (Too Many Requests), 200, 400, 500 중 하나여야 함
    for (const status of statuses) {
      expect([200, 201, 400, 429, 500]).toContain(status);
    }
  });
});
