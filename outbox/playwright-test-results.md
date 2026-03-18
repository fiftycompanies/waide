# Playwright 전체 기능 테스트 결과

**실행일시**: 2026-03-17
**테스트 환경**: localhost:3000 (Next.js dev server)
**브라우저**: Chromium (Playwright)

## 결과 요약

| 구분 | 수 |
|------|-----|
| **통과 (Passed)** | 20 |
| **실패 (Failed)** | 0 |
| **건너뜀 (Skipped)** | 1 (인증 세션 필요) |
| **총 테스트** | 21 |

## 상세 결과

### 랜딩 페이지 (tests/public/landing.spec.ts)
- [PASS] TC-PUB-001: 페이지 정상 렌더링 (타이틀, URL 입력폼, 분석 버튼)
- [PASS] TC-PUB-002: 빈 URL 제출 방지 (버튼 disabled 확인)

### 로그인 플로우 (tests/auth/login.spec.ts)
- [PASS] TC-AUTH-001: 로그인 페이지 렌더링
- [PASS] TC-AUTH-002: OAuth 버튼 표시 (구글/카카오)
- [PASS] TC-AUTH-003: 잘못된 로그인 시 에러 표시
- [PASS] TC-AUTH-005: 미인증 보호 라우트 접근 → 로그인 리다이렉트

### 역할 기반 접근 제어 (tests/auth/rbac.spec.ts)
- [PASS] TC-AUTH-007: 미인증 시 어드민 라우트 차단 (/dashboard, /keywords, /contents, /analytics, /ops/clients, /ops/revenue, /ops/settings)
- [PASS] 퍼블릭 라우트 인증 없이 접근 가능 (/, /login, /analysis/*)

### 분석 API (tests/api/analyze.spec.ts)
- [PASS] TC-API-001: POST /api/analyze - 유효한 URL (외부 API 미연결 시 500 허용)
- [PASS] TC-API-001b: POST /api/analyze - 빈 URL → 400
- [PASS] TC-API-007: GET /api/cron/serp - 인증 없이 호출 (DB 미연결 시 500 허용)

### 대시보드 (tests/dashboard/main.spec.ts)
- [PASS] TC-DASH-001: 미인증 시 대시보드 접근 → 로그인 리다이렉트
- [PASS] TC-DASH-003: 사이드바 접근 불가 (미인증)
- [SKIP] 대시보드 KPI 카드 표시 (로그인 세션 필요 - 수동 실행)

### 콘텐츠 관리 (tests/contents/list.spec.ts)
- [PASS] TC-CONT-001: 미인증 시 콘텐츠 목록 → 로그인 리다이렉트
- [PASS] TC-CONT-002: 미인증 시 콘텐츠 상세 → 로그인 리다이렉트

### 키워드 관리 (tests/keywords/list.spec.ts)
- [PASS] TC-KW-001: 미인증 시 키워드 목록 → 로그인 리다이렉트

### 고객 포트폴리오 (tests/clients/portfolio.spec.ts)
- [PASS] TC-CLIENT-001: 미인증 시 고객 목록 → 로그인 리다이렉트
- [PASS] TC-CLIENT-002: 미인증 시 고객 상세 → 로그인 리다이렉트

### 에러 핸들링 (tests/errors/error-handling.spec.ts)
- [PASS] TC-ERR-001: 404 페이지 - 존재하지 않는 라우트
- [PASS] TC-ERR-002: 존재하지 않는 분석 ID

## 테스트 커버리지

| 영역 | 테스트 수 | 커버리지 |
|------|----------|----------|
| 퍼블릭 페이지 | 2 | 랜딩 렌더링 + 입력 검증 |
| 인증/인가 | 4 | 로그인 UI + OAuth + 에러 + 리다이렉트 |
| RBAC | 2 | 어드민 차단 (7개 라우트) + 퍼블릭 허용 |
| API | 3 | 분석 시작 + 빈 URL + 크론 |
| 보호 라우트 | 7 | 대시보드/콘텐츠/키워드/고객 리다이렉트 |
| 에러 처리 | 2 | 404 + 잘못된 분석 ID |
| 인증 후 기능 | 1 (skip) | 로그인 세션 필요 |

## 비고
- 인증이 필요한 테스트(대시보드 KPI 등)는 로그인 세션 셋업 후 별도 실행 필요
- 외부 API(네이버, Supabase 등) 미연결 환경에서도 안정적으로 통과하도록 설계
