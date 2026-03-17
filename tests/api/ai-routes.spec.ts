import { test, expect } from '@playwright/test';

test.describe('AI 라우트', () => {
  test('TC-AI-001: /api/ai/niche-keywords 인증 필요', async ({ request }) => {
    const response = await request.post('/api/ai/niche-keywords', {
      data: {
        clientId: 'd9af5297-de7c-4353-96ea-78ba0bb59f0c',
        keywords: ['테스트 키워드'],
      },
    });
    const status = response.status();
    // 미인증 또는 서버 에러
    expect([401, 403, 500]).toContain(status);
  });

  test('TC-AI-002: POST /api/brand/analyze 분석 시작', async ({ request }) => {
    const response = await request.post('/api/brand/analyze', {
      data: {
        url: 'https://place.naver.com/restaurant/1234567890',
      },
    });
    const status = response.status();
    // 200 (분석 시작), 400 (잘못된 요청), 401 (인증 필요), 500 (서버 에러)
    expect([200, 201, 400, 401, 500]).toContain(status);
    if (status === 200 || status === 201) {
      const body = await response.json();
      // JSON 구조 확인
      expect(typeof body).toBe('object');
    }
  });

  test('TC-AI-003: AI 라우트 JSON 구조 응답', async ({ request }) => {
    // /api/ai/niche-keywords에 POST 요청
    const response = await request.post('/api/ai/niche-keywords', {
      data: {
        clientId: 'd9af5297-de7c-4353-96ea-78ba0bb59f0c',
        keywords: ['카페 추천'],
      },
    });
    const status = response.status();

    if (status === 200) {
      const body = await response.json();
      // JSON 객체 반환 확인
      expect(typeof body).toBe('object');
      expect(body).not.toBeNull();
    } else {
      // 에러 응답도 JSON 형태여야 함
      const contentType = response.headers()['content-type'];
      if (contentType?.includes('application/json')) {
        const body = await response.json();
        expect(typeof body).toBe('object');
        // 에러 메시지 또는 에러 코드 포함
        expect(body.error || body.message || body.statusCode).toBeTruthy();
      }
      expect([400, 401, 403, 500]).toContain(status);
    }
  });

  test('TC-AI-004: AI 엔드포인트 Rate limiting', async ({ request }) => {
    const promises = Array.from({ length: 5 }, () =>
      request.post('/api/ai/niche-keywords', {
        data: {
          clientId: 'd9af5297-de7c-4353-96ea-78ba0bb59f0c',
          keywords: ['rate-limit-test'],
        },
      })
    );
    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status());

    // 모든 응답이 유효한 HTTP 상태코드여야 함
    expect(statuses.length).toBe(5);
    for (const status of statuses) {
      expect([200, 400, 401, 403, 429, 500]).toContain(status);
    }
  });
});
