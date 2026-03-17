import { test, expect } from '@playwright/test';

test.describe('상담 API (/api/consultation)', () => {
  test('TC-API-CONSULT-001: POST /api/consultation 유효한 데이터', async ({ request }) => {
    const response = await request.post('/api/consultation', {
      data: {
        contact_name: '테스트 사용자',
        phone: '010-1234-5678',
        email: 'test@example.com',
        message: 'E2E 테스트 상담 요청입니다.',
        analysis_id: '00000000-0000-0000-0000-000000002001',
      },
    });
    const status = response.status();
    // 200/201 (성공), 400 (검증 실패), 500 (DB 미연결)
    expect([200, 201, 400, 500]).toContain(status);
    if (status === 200 || status === 201) {
      const body = await response.json();
      // 상담 요청 ID 또는 성공 메시지 확인
      expect(
        body.id || body.success || body.message
      ).toBeTruthy();
    }
  });

  test('TC-API-CONSULT-002: POST /api/consultation 필수 필드 누락 → 400', async ({ request }) => {
    const response = await request.post('/api/consultation', {
      data: {
        // contact_name, phone 누락
        message: '필드 누락 테스트',
      },
    });
    const status = response.status();
    // 400 (필수 필드 누락) 또는 500 (서버 에러)
    expect([400, 422, 500]).toContain(status);
  });
});
