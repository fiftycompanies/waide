# Waide AI Marketer - 전체 QA 테스트 기획서

> 최종 업데이트: 2026-03-17
> 총 TC: ~310 (Unit 141 + E2E 169)

---

## 1. 테스트 인프라

| 도구 | 용도 | 설정 파일 |
|------|------|----------|
| Vitest | 유닛/통합 테스트 | `vitest.config.ts` |
| Playwright | E2E 브라우저 테스트 | `playwright.config.ts` |
| jsdom | DOM 시뮬레이션 | vitest 환경 |

### 테스트 실행 명령

```bash
npm run test          # Vitest 유닛 테스트
npm run test:watch    # Vitest 워치 모드
npm run test:e2e      # Playwright E2E
npm run test:all      # 전체 (Vitest + Playwright)
```

### 디렉토리 구조

```
tests/
├── setup.ts                    # 글로벌 셋업 (env, mocks)
├── mocks/
│   ├── supabase.ts             # Supabase 클라이언트 모킹
│   └── external-apis.ts        # 외부 API 모킹
├── fixtures/
│   ├── auth.ts                 # Playwright 인증 fixture
│   └── test-data.ts            # 테스트 상수
├── auth.setup.ts               # Playwright 인증 셋업
├── unit/                       # Vitest 유닛 테스트 (26파일)
│   ├── auth/
│   ├── data/
│   ├── lib/
│   ├── dashboard/
│   ├── keywords/
│   ├── contents/
│   ├── publish/
│   ├── crm/
│   ├── clients/
│   ├── ops/
│   ├── portal/
│   ├── errors/
│   └── cron/
├── public/                     # E2E 퍼블릭 (6파일)
├── auth/                       # E2E 인증/RBAC (2파일)
├── dashboard/                  # E2E 대시보드 (1파일)
├── keywords/                   # E2E 키워드 (1파일)
├── contents/                   # E2E 콘텐츠 (2파일)
├── publish/                    # E2E 발행 (2파일)
├── analytics/                  # E2E 분석 (1파일)
├── crm/                        # E2E CRM (2파일)
├── clients/                    # E2E 고객 (2파일)
├── ops/                        # E2E 운영 (4파일)
├── settings/                   # E2E 설정 (1파일)
├── portal/                     # E2E 포털 (5파일)
├── api/                        # E2E API (5파일)
├── navigation/                 # E2E 내비게이션 (2파일)
└── errors/                     # E2E 에러 (1파일)
```

---

## 2. Unit 테스트 (Vitest) — 26파일, ~141 TC

### 2-1. 순수 로직 (외부 의존 없음)

| TC-ID | 파일 | TC수 | 검증 항목 |
|-------|------|------|----------|
| U-AUTH-001~007 | `unit/auth/helpers.test.ts` | 7 | hasRole, isAdmin, isClient, isSales, isAdminRole, isClientRole, getEffectiveClientId |
| U-AUTH-008~012 | `unit/auth/session.test.ts` | 5 | HMAC 토큰 생성/검증, 만료, 변조, 잘못된 형식 |
| U-AUTH-013~020 | `unit/auth/middleware.test.ts` | 8 | 라우트 분류 (public/admin/portal/auth), 패턴 매칭 |
| U-SCHED-001~005 | `unit/lib/scheduler.test.ts` | 5 | verifyCronAuth (유효/무효/미설정/누락/형식) |
| U-MD-001~004 | `unit/lib/publishers/markdown-to-html.test.ts` | 4 | MD→HTML, FAQ/Article/LocalBusiness Schema |
| U-PROMPT-001~004 | `unit/lib/prompt-loader.test.ts` | 4 | {var}, {{var}} 치환, 혼합, 미정의 변수 |
| U-CRON-001~010 | `unit/cron/cron-config.test.ts` | 10 | 7개 크론 경로/스케줄, 중복 없음, 리전 검증 |

### 2-2. 데이터 무결성

| TC-ID | 파일 | TC수 | 검증 항목 |
|-------|------|------|----------|
| U-CHECK-001~024 | `unit/data/check-constraints.test.ts` | 24 | 16개 테이블 CHECK 제약조건 (유효값/무효값) |
| U-FK-001~008 | `unit/data/fk-chains.test.ts` | 8 | FK 체인 (clients→keywords→contents→publications 등) |

### 2-3. 서버 액션 (DB 모킹)

| TC-ID | 파일 | TC수 | 검증 항목 |
|-------|------|------|----------|
| U-DASH-001~003 | `unit/dashboard/dashboard-actions.test.ts` | 3 | B2B KPI, 기본값, At-risk 감지 |
| U-KW-001~004 | `unit/keywords/keyword-actions.test.ts` | 4 | CRUD, 상태 전이, 필터링 |
| U-KW-EXP-001~004 | `unit/keywords/keyword-expansion-actions.test.ts` | 4 | 니치 키워드 승인/거절/일괄/확장 |
| U-KW-Q-001~004 | `unit/keywords/question-actions.test.ts` | 4 | 질문 생성(3소스), 수동추가, 삭제, 필터 |
| U-CONT-GEN-001~004 | `unit/contents/content-generate-actions.test.ts` | 4 | 콘텐츠 생성, 포인트 차감, 환불, Job 처리 |
| U-QC-001~003 | `unit/contents/content-qc-v2.test.ts` | 3 | QC 100점/70점미만/해요체 FAIL |
| U-PUB-001~006 | `unit/publish/publish-actions.test.ts` | 6 | 발행, 재시도(max3), 자동발행, 설정 |
| U-PUB-MD-001~003 | `unit/publish/markdown-to-html.test.ts` | 3 | HTML 변환, Schema, canonical |
| U-CRM-001~005 | `unit/crm/analysis-log-actions.test.ts` | 5 | CRM 목록, 상태변경, 노트, 에이전트 할당, 통계 |
| U-CLIENT-001~006 | `unit/clients/client-portfolio-actions.test.ts` | 6 | 포트폴리오, 상세, 온보딩, 필터(상태/온보딩/검색) |
| U-PROD-001~004 | `unit/ops/product-actions.test.ts` | 4 | 상품 CRUD, 구독 생성/취소 |
| U-PT-001~005 | `unit/ops/point-actions.test.ts` | 5 | 포인트 초기화/차감/부족/충전/환불 |
| U-SCORE-001~003 | `unit/lib/scoring-engine.test.ts` | 3 | 마케팅 점수(100점), 계정등급, 키워드난이도 |
| U-MENTION-001~003 | `unit/lib/crawlers/mention-detector.test.ts` | 3 | 브랜드 감지/미감지/다중 |
| U-AEO-001~004 | `unit/lib/aeo-tracking-actions.test.ts` | 4 | AEO 점수공식, 라운드로빈, 추적, 대시보드 |
| U-REWRITE-001~002 | `unit/lib/content-rewrite-loop.test.ts` | 2 | 재작성 루프(2회 재시도, PASS 시 중단) |
| U-ERR-001~004 | `unit/errors/error-log-actions.test.ts` | 4 | 에러 로깅, 필터, 상태전이, 통계 |

---

## 3. E2E 테스트 (Playwright) — 36파일, ~169 TC

### 3-1. 퍼블릭 (미인증)

| TC-ID | 파일 | TC수 | 검증 항목 |
|-------|------|------|----------|
| E-PUB-001~006 | `public/landing.spec.ts` | 6 | URL 입력, 빈 제출, 분석 시작, ref 쿠키, place 파라미터, CTA |
| E-LOAD-001~004 | `public/analysis-loading.spec.ts` | 4 | 로딩 애니메이션, 폴링, 리다이렉트, 120초 타임아웃 |
| E-RESULT-001~011 | `public/analysis-result.spec.ts` | 11 | 점수, SEO진단, 키워드, 경쟁사, 이미지, 개선, CTA, 페르소나, 보완, 프로젝트 시작, 최소데이터 |
| E-CONSULT-001~002 | `public/consultation.spec.ts` | 2 | 상담 폼 검증, 제출 |
| E-INVITE-001~003 | `public/invite.spec.ts` | 3 | 유효 토큰, 만료 토큰, 수락→가입 |
| E-ONBOARD-001~003 | `public/onboarding-refine.spec.ts` | 3 | 분석 요약, 편집, 반영하기 |

### 3-2. 인증/RBAC

| TC-ID | 파일 | TC수 | 검증 항목 |
|-------|------|------|----------|
| E-AUTH-001~007 | `auth/login.spec.ts` | 7 | 폼 렌더, OAuth 버튼, 잘못된 인증, 리다이렉트 |
| E-RBAC-001~007 | `auth/rbac.spec.ts` | 7 | 보호 라우트 리다이렉트, 퍼블릭 접근, 크론 인증, 포털→대시보드 |

### 3-3. 어드민 (인증 필요)

| TC-ID | 파일 | TC수 | 검증 항목 |
|-------|------|------|----------|
| E-DASH-001~008 | `dashboard/main.spec.ts` | 8 | KPI, 브랜드셀렉터, SEO/AEO, 타임라인, At-risk |
| E-KW-001~010 | `keywords/list.spec.ts` | 10 | 5탭, CRUD, 검색, AI추천, 전략, 질문, 검색량 |
| E-CONT-001~005 | `contents/list.spec.ts` | 5 | 3탭, 상태배지, 생성, 작업 |
| E-CONT-D-001~004 | `contents/detail.spec.ts` | 4 | 에디터, QC, 발행URL, 재작성 |
| E-PUB-W-001~003 | `publish/wizard.spec.ts` | 3 | 3단계 위저드, 플랫폼 선택, 결과 |
| E-PUB-M-001~003 | `publish/management.spec.ts` | 3 | 3탭, 이력, 자동설정 |
| E-ANAL-001~005 | `analytics/tabs.spec.ts` | 5 | 4탭 (SEO/AEO/경쟁/Citation) |
| E-CRM-001~006 | `crm/analysis-logs.spec.ts` | 6 | 목록, 상태변경, 할당, 연결, 상세 |
| E-SALES-001~003 | `crm/sales-agents.spec.ts` | 3 | 영업사원 목록, 생성, ref 복사 |
| E-CLIENT-001~005 | `clients/portfolio.spec.ts` | 5 | 카드뷰, 필터, 검색, 정렬 |
| E-CLIENT-D-001~011 | `clients/detail.spec.ts` | 11 | 10탭 상세 |
| E-REV-001~003 | `ops/revenue.spec.ts` | 3 | MRR/ARR, 플랜분포, 트렌드 |
| E-CHURN-001~002 | `ops/churn.spec.ts` | 2 | At-risk, 이탈률 |
| E-PROD-001~003 | `ops/products.spec.ts` | 3 | 상품 CRUD |
| E-POINTS-001~002 | `ops/points.spec.ts` | 2 | 3탭 포인트 |
| E-SET-001~008 | `settings/all-settings.spec.ts` | 8 | 에이전트/AEO/스코어링/SERP/API/에러로그/어드민/블로그계정 |

### 3-4. 포털 (client_owner 인증)

| TC-ID | 파일 | TC수 | 검증 항목 |
|-------|------|------|----------|
| E-PORTAL-001~006 | `portal/dashboard.spec.ts` | 6 | KPI, 점수, AEO, 포인트, 타임라인 |
| E-PORTAL-KW-001~004 | `portal/keywords.spec.ts` | 4 | 3탭, 승인/거절, 전략 |
| E-PORTAL-CONT-001~002 | `portal/contents.spec.ts` | 2 | 상태필터, 상세 |
| E-PORTAL-RPT-001~007 | `portal/reports.spec.ts` | 7 | 차트, 순위, PDF |
| E-PORTAL-SET-001~003 | `portal/settings.spec.ts` | 3 | 프로필, 비밀번호, 구독 |

### 3-5. API 라우트

| TC-ID | 파일 | TC수 | 검증 항목 |
|-------|------|------|----------|
| E-API-ANALYZE-001~007 | `api/analyze.spec.ts` | 7 | 분석 CRUD, 수정, 보완, rate limit |
| E-API-CONSULT-001~002 | `api/consultation.spec.ts` | 2 | 상담 신청 |
| E-CRON-001~008 | `api/cron.spec.ts` | 8 | 7개 크론 인증 |
| E-API-PORTAL-001~002 | `api/portal.spec.ts` | 2 | PDF, OAuth |
| E-AI-001~004 | `api/ai-routes.spec.ts` | 4 | AI 엔드포인트 |

### 3-6. 네비게이션/에러

| TC-ID | 파일 | TC수 | 검증 항목 |
|-------|------|------|----------|
| E-NAV-001~009 | `navigation/redirects.spec.ts` | 9 | URL 리다이렉트 매핑 |
| E-SIDEBAR-001~004 | `navigation/sidebar.spec.ts` | 4 | 사이드바 메뉴 |
| E-ERR-001~007 | `errors/error-handling.spec.ts` | 7 | 에러 바운더리, 404, API 에러 |

---

## 4. 오류 수정 우선순위

| 우선순위 | 기준 | 대응 |
|---------|------|------|
| P0 | 플로우 차단 (로그인 불가, 분석 불가 등) | 즉시 수정 |
| P1 | 기능 저하 (데이터 미표시, 잘못된 계산 등) | 테스트 완료 후 수정 |
| P2 | 외관/UX (레이아웃 깨짐, 텍스트 오류 등) | 별도 이슈로 기록 |

---

## 5. 최종 검증 체크리스트

- [ ] `npm run test` (Vitest) → 전체 통과
- [ ] `npx playwright test` → 전체 통과
- [ ] `tsc --noEmit` → 타입 에러 없음
- [ ] 발견된 P0/P1 버그 모두 수정
- [ ] git add/commit/push
- [ ] Vercel 자동 배포 확인

---

## 6. 테스트 통계 요약

| 구분 | 파일수 | TC수 |
|------|--------|------|
| Unit (Vitest) | 26 | ~141 |
| E2E (Playwright) | 36 | ~169 |
| **합계** | **62** | **~310** |
