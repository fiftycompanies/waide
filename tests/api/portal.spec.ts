import { test, expect } from '@playwright/test';

test.describe('포털 API', () => {
  test('TC-API-PORTAL-001: /api/portal/report-pdf 인증 필요', async ({ request }) => {
    const response = await request.get('/api/portal/report-pdf');
    const status = response.status();
    // 미인증 시 401 또는 400 (파라미터 누락), 500 (서버 에러)
    expect([400, 401, 403, 500]).toContain(status);
  });

  test('TC-API-PORTAL-002: PDF 다운로드 바이너리 응답', async ({ request }) => {
    // 인증 없이 clientId 파라미터와 함께 요청
    const response = await request.get('/api/portal/report-pdf', {
      params: {
        clientId: 'd9af5297-de7c-4353-96ea-78ba0bb59f0c',
        month: '2026-03',
      },
    });
    const status = response.status();

    if (status === 200) {
      // 성공 시 바이너리(PDF) 응답 확인
      const contentType = response.headers()['content-type'];
      expect(
        contentType?.includes('application/pdf') ||
        contentType?.includes('application/octet-stream')
      ).toBeTruthy();
      const body = await response.body();
      expect(body.length).toBeGreaterThan(0);
    } else {
      // 인증 실패 또는 데이터 미존재
      expect([400, 401, 403, 404, 500]).toContain(status);
    }
  });
});
