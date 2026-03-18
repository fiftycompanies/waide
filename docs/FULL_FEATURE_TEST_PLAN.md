# Waide 전체 기능 테스트 기획서

> 작성일: 2026-03-17
> 작성자: Claude Code Review Agent
> 대상 서비스: Waide AI Marketing Platform (ai-marketer)
> 테스트 도구: Playwright

---

## 1. 테스트 범위 및 전략

### 1-1. 테스트 영역

| 영역 | 라우트 그룹 | 인증 요구 | 우선순위 |
|------|-----------|---------|---------|
| 퍼블릭 (랜딩/분석) | `(public)` | 없음 | P0 |
| 인증 (로그인/회원가입) | `(public)`, `auth/` | 없음→세션 | P0 |
| 어드민 대시보드 | `(dashboard)` | admin 역할 | P0 |
| 콘텐츠 관리 | `(dashboard)/contents` | admin 역할 | P1 |
| 키워드 관리 | `(dashboard)/keywords` | admin 역할 | P1 |
| 고객 포트폴리오 | `(dashboard)/ops/clients` | admin 역할 | P1 |
| 발행 관리 | `(dashboard)/publish` | admin 역할 | P2 |
| 성과 분석 | `(dashboard)/analytics` | admin 역할 | P2 |
| CRM/영업 | `(dashboard)/ops/analysis-logs` | admin 역할 | P2 |
| 설정/관리 | `(dashboard)/ops/*`, `settings/*` | admin/super_admin | P3 |
| 크론 작업 | `api/cron/*` | CRON_SECRET | P3 |
| API 라우트 | `api/*` | 혼합 | P1 |

### 1-2. 테스트 전략

- **E2E (Playwright)**: 페이지 렌더링, 네비게이션, 폼 동작, 에러 핸들링
- **API 테스트**: 주요 API 엔드포인트 응답 검증
- **인증 플로우**: 로그인/로그아웃/역할 기반 접근 제어
- **데이터 플로우**: 서버 액션 → UI 반영 검증

---

## 2. 플로우별 테스트 시나리오

### 2-1. 퍼블릭 플로우 (P0)

#### TC-PUB-001: 랜딩 페이지 렌더링
- **경로**: `/`
- **기대 결과**:
  - 페이지 정상 로딩
  - URL 입력 폼 표시
  - "무료 분석 시작" 버튼 표시
  - 100점 마케팅 종합 진단 문구 표시

#### TC-PUB-002: 분석 요청 플로우
- **경로**: `/` → `/analysis/loading` → `/analysis/[id]`
- **동작**: URL 입력 → 제출
- **기대 결과**:
  - 로딩 페이지 전환
  - 분석 ID 생성 확인 (API 응답)
  - 폴링 중 로딩 애니메이션 표시
  - 120초 타임아웃 동작

#### TC-PUB-003: 분석 결과 페이지
- **경로**: `/analysis/[id]`
- **기대 결과**:
  - 매장 요약 정보 표시
  - 마케팅 점수 게이지 표시
  - 탭 네비게이션 동작 (리뷰/메뉴/이미지/점수)
  - 키워드 섹션 표시
  - CTA 버튼 표시 (전화/카카오/상담신청)

#### TC-PUB-004: 분석 결과 보완 패널
- **경로**: `/analysis/[id]` → [보완하기] 클릭
- **기대 결과**:
  - 슬라이드 패널 열림
  - 키워드 태그 편집 (최대 5개)
  - 강점/어필/타겟 필드 편집
  - [재분석하기] 버튼 동작
  - 재분석 후 로딩 페이지로 이동 (id 파라미터 포함)

#### TC-PUB-005: 분석 결과 - pending/analyzing 상태 리다이렉트
- **경로**: `/analysis/[id]` (status: analyzing)
- **기대 결과**: `/analysis/loading?url=...&id=[id]` 로 리다이렉트

#### TC-PUB-006: 분석 결과 - 상담 신청 모달
- **경로**: `/analysis/[id]` → 상담 신청 버튼
- **기대 결과**:
  - 모달 표시
  - 이름/전화번호/이메일 입력
  - 제출 후 성공 메시지 표시
  - HTTP 응답 코드 검증

---

### 2-2. 인증 플로우 (P0)

#### TC-AUTH-001: 이메일 로그인
- **경로**: `/login`
- **동작**: 이메일 + 비밀번호 입력 → 로그인
- **기대 결과**:
  - 로그인 폼 표시
  - 성공: `/dashboard` 리다이렉트
  - 실패: 에러 메시지 표시

#### TC-AUTH-002: OAuth 로그인 버튼 표시
- **경로**: `/login`
- **기대 결과**:
  - 구글 로그인 버튼 표시
  - 카카오 로그인 버튼 표시
  - 클릭 시 OAuth 프로바이더로 리다이렉트

#### TC-AUTH-003: 회원가입
- **경로**: `/signup`
- **기대 결과**:
  - 가입 폼 표시 (이메일/비밀번호/이름/전화번호)
  - 비밀번호 최소 6자 검증
  - 성공 시 이메일 인증 안내 또는 자동 로그인

#### TC-AUTH-004: 로그아웃
- **동작**: 사이드바 로그아웃 클릭
- **기대 결과**: `/login` 리다이렉트, 세션 쿠키 삭제

#### TC-AUTH-005: 미인증 보호 라우트 접근
- **경로**: `/dashboard` (로그인 안 된 상태)
- **기대 결과**: `/login?redirect=/dashboard` 리다이렉트

#### TC-AUTH-006: 비밀번호 재설정
- **경로**: `/auth/reset-password`
- **기대 결과**: 비밀번호 입력 폼 표시, 8자 이상 검증

#### TC-AUTH-007: 역할 기반 접근 제어 (RBAC)
- **검증**: admin 역할 → 대시보드 접근 가능
- **검증**: client 역할 → 대시보드 접근 시 `/login` 리다이렉트

---

### 2-3. 어드민 대시보드 플로우 (P0)

#### TC-DASH-001: 대시보드 메인
- **경로**: `/dashboard`
- **기대 결과**:
  - KPI 카드 4종 표시 (MRR, 고객수, 이탈률, 평균점수)
  - 브랜드 셀렉터 표시
  - SEO 운영 현황 섹션 표시
  - AEO 섹션 표시 (브랜드 선택 시)

#### TC-DASH-002: 브랜드 셀렉터 동작
- **동작**: 브랜드 드롭다운에서 특정 브랜드 선택
- **기대 결과**:
  - 대시보드 데이터 해당 브랜드로 필터링
  - BrandInfoCard 표시 (이름/상태/플랜/담당자)

#### TC-DASH-003: 사이드바 네비게이션
- **기대 결과**:
  - 6그룹 메뉴 표시 (서비스/고객관리/비즈니스/영업CRM/리소스/설정)
  - 각 메뉴 클릭 시 해당 페이지 이동
  - 역할 기반 메뉴 필터링 동작

---

### 2-4. 콘텐츠 관리 플로우 (P1)

#### TC-CONT-001: 콘텐츠 목록
- **경로**: `/contents`
- **기대 결과**:
  - 3탭 표시 (목록/생성/작업현황)
  - 콘텐츠 테이블 표시 (제목/상태/키워드/날짜)
  - 상태 필터 동작 (draft/approved/published 등)

#### TC-CONT-002: 콘텐츠 상세
- **경로**: `/contents/[id]`
- **기대 결과**:
  - Breadcrumb 표시
  - 콘텐츠 본문 에디터 표시
  - 블로그 계정 목록 표시 (is_active 필터링)
  - QC 결과 섹션 표시 (metadata.qc_result)

#### TC-CONT-003: 콘텐츠 생성 탭
- **경로**: `/contents?tab=create`
- **기대 결과**:
  - 키워드 선택 UI 표시
  - 콘텐츠 유형 선택 표시
  - [콘텐츠 생성] 버튼 동작
  - 포인트 잔액 확인 (부족 시 에러)

#### TC-CONT-004: 작업 현황 탭
- **경로**: `/contents?tab=jobs`
- **기대 결과**:
  - Job 목록 테이블 표시
  - 상태 배지 표시 (PENDING/IN_PROGRESS/DONE/FAILED)
  - 빈 상태 시 EmptyState 컴포넌트

---

### 2-5. 키워드 관리 플로우 (P1)

#### TC-KW-001: 키워드 목록
- **경로**: `/keywords`
- **기대 결과**:
  - 5탭 표시 (활성/AI추천/전략/질문/검색량)
  - 활성 키워드 테이블 (키워드/검색량/순위/상태)

#### TC-KW-002: AI 추천 키워드
- **경로**: `/keywords?tab=suggested`
- **기대 결과**:
  - 추천 키워드 목록 표시
  - 승인/거절 버튼 동작
  - 일괄 승인 동작

#### TC-KW-003: 검색량 조회
- **경로**: `/keywords?tab=volume`
- **기대 결과**:
  - 키워드 입력 폼 표시
  - 검색량 조회 결과 테이블
  - 체크박스 선택 → 키워드 등록

#### TC-KW-004: 니치 키워드 패널
- **경로**: `/keywords` → 니치 키워드 확장 버튼
- **기대 결과**:
  - AI 분석 패널 표시
  - 난이도/기회/사유 표시
  - 일괄 등록 기능

---

### 2-6. 고객 포트폴리오 플로우 (P1)

#### TC-CLIENT-001: 고객 목록
- **경로**: `/ops/clients`
- **기대 결과**:
  - 카드뷰 표시
  - 상태 필터 (Active/Onboarding/At Risk/Churned)
  - 검색 동작
  - 정렬 동작

#### TC-CLIENT-002: 고객 상세
- **경로**: `/ops/clients/[id]`
- **기대 결과**:
  - 10탭 표시 (개요/키워드/콘텐츠/분석/순위/페르소나/구독/온보딩/계정/리포트)
  - 각 탭 데이터 정상 로딩
  - 플레이스 통계 (서버 액션 통해 조회)

#### TC-CLIENT-003: 온보딩 관리
- **경로**: `/ops/onboarding`
- **기대 결과**:
  - 온보딩 중인 클라이언트 목록
  - 체크리스트 표시
  - 체크 토글 → 저장 동작

---

### 2-7. 발행 관리 플로우 (P2)

#### TC-PUB-001: 발행 허브
- **경로**: `/publish`
- **기대 결과**:
  - 3탭 표시 (대기/이력/자동설정)
  - 대기 탭: 발행 대기 콘텐츠 목록
  - 이력 탭: publications 테이블 기반 이력
  - 자동 설정 탭: 마스터 토글, 채널별 ON/OFF

#### TC-PUB-002: 콘텐츠 발행 위저드
- **경로**: `/contents/[id]/publish`
- **기대 결과**:
  - 3스텝 위저드 (확인→채널→결과)
  - 플랫폼 선택 (Tistory/WordPress/Medium)
  - 계정 드롭다운

---

### 2-8. 성과 분석 플로우 (P2)

#### TC-ANAL-001: 분석 페이지
- **경로**: `/analytics`
- **기대 결과**:
  - 4탭 표시 (SEO 분석/AEO 노출/경쟁 분석/Citation 분석)
  - SEO 탭: 노출 KPI, 트렌드 차트
  - AEO 탭: 점수, 모델별 분석

#### TC-ANAL-002: SEO 분석 탭
- **경로**: `/analytics?tab=seo`
- **기대 결과**:
  - 키워드 노출률 차트
  - SERP 추적 데이터 표시

#### TC-ANAL-003: AEO 노출 탭
- **경로**: `/analytics?tab=aeo`
- **기대 결과**:
  - AEO Visibility Score 표시
  - 모델별 언급 통계
  - 최근 질문/응답 데이터

---

### 2-9. CRM/영업 플로우 (P2)

#### TC-CRM-001: 분석 로그 목록
- **경로**: `/ops/analysis-logs`
- **기대 결과**:
  - 분석 로그 테이블 표시
  - lead_status 파이프라인 표시
  - 영업사원 인라인 할당
  - 고객 연결 버튼

#### TC-CRM-002: 분석 로그 상세
- **경로**: `/ops/analysis-logs/[id]`
- **기대 결과**:
  - 4탭 (분석/SEO/키워드/활동기록)
  - 연락처 인라인 수정
  - 코멘트 타임라인

#### TC-CRM-003: 영업사원 관리
- **경로**: `/ops/sales-agents`
- **기대 결과**:
  - 영업사원 목록 표시
  - ref_code 기반 링크 복사
  - 성과 요약 테이블

---

### 2-10. 설정/관리 플로우 (P3)

#### TC-SET-001: 에이전트 프롬프트 설정
- **경로**: `/ops/agent-settings`
- **기대 결과**:
  - 4탭 (프롬프트/콘텐츠프롬프트/진화지식/프롬프트관리)
  - 프롬프트 카드 확장/축소
  - 저장/복원 버튼

#### TC-SET-002: AEO 설정
- **경로**: `/ops/aeo-settings`
- **기대 결과**:
  - 4카드 표시 (모델/추적/크론/Playwright)
  - 모델 ON/OFF 토글
  - 수치 입력 검증

#### TC-SET-003: 에러 로그
- **경로**: `/ops/error-logs`
- **기대 결과**:
  - 통계 카드 4종
  - 필터 (상태/유형/기간)
  - 상세 모달

#### TC-SET-004: 어드민 관리 (super_admin)
- **경로**: `/settings/admins`
- **기대 결과**:
  - 어드민 목록 표시
  - 역할 변경 (super_admin/admin/sales/viewer)

---

### 2-11. API 엔드포인트 테스트 (P1)

#### TC-API-001: POST /api/analyze
- **기대 결과**: 200 + { id, existing: false }

#### TC-API-002: GET /api/analyze/[id]
- **기대 결과**: 200 + 분석 데이터 (status, basic_info 등)

#### TC-API-003: POST /api/analyze/[id]/edit (인증 없음 → 주의)
- **기대 결과**: 200 + { success: true }

#### TC-API-004: POST /api/analyze/[id]/refine
- **기대 결과**: 200 + { success: true }

#### TC-API-005: POST /api/consultation
- **기대 결과**: 200 + { success: true }

#### TC-API-006: POST /api/ai/generate-content (인증 필요)
- **기대 결과**: 200 + 생성된 콘텐츠

#### TC-API-007: GET /api/cron/serp (CRON_SECRET 필요)
- **기대 결과**: 401 (시크릿 없이) / 200 (시크릿 포함)

---

### 2-12. 에러 핸들링 테스트

#### TC-ERR-001: 404 페이지
- **경로**: `/nonexistent-page`
- **기대 결과**: 커스텀 404 페이지 표시

#### TC-ERR-002: 존재하지 않는 분석 ID
- **경로**: `/analysis/nonexistent-uuid`
- **기대 결과**: 홈으로 리다이렉트 또는 에러 표시

#### TC-ERR-003: 존재하지 않는 콘텐츠 ID
- **경로**: `/contents/nonexistent-uuid`
- **기대 결과**: not-found 페이지 표시

#### TC-ERR-004: 존재하지 않는 클라이언트 ID
- **경로**: `/ops/clients/nonexistent-uuid`
- **기대 결과**: not-found 페이지 표시

---

## 3. 데이터 연결 검증 매트릭스

### 3-1. 주요 데이터 플로우

| 플로우 | 시작점 | 데이터 경유 | 최종 표시 |
|--------|--------|-----------|----------|
| 분석→CRM | POST /api/analyze | brand_analyses | /ops/analysis-logs |
| 분석→프로젝트 | /analysis/[id] → [프로젝트 시작] | clients, keywords, brand_persona | /ops/clients/[id] |
| 키워드→콘텐츠 | /keywords → 콘텐츠 생성 | keywords → contents | /contents |
| 콘텐츠→발행 | /contents/[id] → 발행 | contents → publications | /publish |
| SERP→분석 | /api/cron/serp | keyword_visibility | /analytics |
| AEO→점수 | /api/cron/aeo | llm_answers → mentions → aeo_scores | /analytics?tab=aeo |
| 리포트→이메일 | /api/cron/monthly-report | report_deliveries | /ops/clients/[id] 리포트 탭 |

### 3-2. FK 참조 무결성 검증

| 부모 테이블 | 자식 테이블 | FK 컬럼 | 검증 포인트 |
|-----------|-----------|--------|-----------|
| clients | keywords | client_id | 키워드 목록에서 브랜드 필터 |
| clients | contents | client_id | 콘텐츠 목록에서 브랜드 필터 |
| keywords | contents | keyword_id | 콘텐츠 상세에서 키워드 표시 |
| blog_accounts | contents | account_id | 콘텐츠 상세에서 계정 표시 |
| contents | publications | content_id | 발행 이력에서 콘텐츠 제목 |
| clients | aeo_scores | client_id | AEO 점수 브랜드별 |
| clients | subscriptions | client_id | 구독 정보 표시 |

---

## 4. 테스트 환경 설정

### 4-1. 필수 환경변수

```bash
NEXT_PUBLIC_SUPABASE_URL=<supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_KEY=<service_key>
BASE_URL=http://localhost:3000
```

### 4-2. 테스트 계정

| 역할 | 아이디 | 비밀번호 | 용도 |
|------|--------|---------|------|
| super_admin | admin | admin1234 | 전체 기능 테스트 |
| (이메일 계정) | test@example.com | - | OAuth 테스트 |

### 4-3. 테스트 데이터

- 최소 1개 활성 클라이언트 (client_id: d9af5297-de7c-4353-96ea-78ba0bb59f0c)
- 최소 1개 활성 키워드
- 최소 1개 콘텐츠
- 최소 1개 블로그 계정

---

## 5. 코드 리뷰에서 발견된 수정 사항 요약

### 5-1. 수정 완료 (이번 리뷰에서 Fix)

| # | 파일 | 이슈 | 수정 내용 |
|---|------|------|----------|
| 1 | `contents/[id]/page.tsx` | `a.status === "active"` 항상 빈 배열 | `a.is_active`로 수정 |
| 2 | `auth/callback/route.ts` | Open redirect via `next` 파라미터 | 경로 검증 추가 |
| 3 | `middleware.ts` | client 역할이 어드민 라우트 접근 | `ADMIN_ALLOWED_ROLES`로 수정 |
| 4 | `analyze/[id]/retry/route.ts` | maxDuration=10 너무 짧음 | maxDuration=300 |
| 5 | `cron/search-volume/route.ts` | 검색량 `?? volumes[0]` 잘못된 폴백 | 폴백 제거 |
| 6 | `keyword-actions.ts` (2곳) | 동일 검색량 폴백 버그 | 폴백 제거 |
| 7 | `analysis/[id]/page.tsx` | 로딩 리다이렉트 시 id 누락 | `&id=${id}` 추가 |
| 8 | `cron/aeo/route.ts` | maxDuration/dynamic 누락 | export 추가 |
| 9 | `cron/grading/route.ts` | loadWeights null crash | DEFAULT_WEIGHTS 폴백 |
| 10 | `cron/serp/route.ts` | `date` 컬럼명 오류 | `measured_at` 수정 |
| 11 | `ops-actions.ts` | `publishing_accounts` 잘못된 테이블 조인 | `blog_accounts!account_id` 수정 |
| 12 | `refinement-actions.ts` (2곳) | 실패 시 basic_info 덮어쓰기 | 기존 데이터 보존 |
| 13 | `report-actions.ts` | 리포트 ai_model 잘못된 컬럼 | llm_answers 조인 수정 |
| 14 | `report-actions.ts` | topQuestions에 brand_name 사용 | question 텍스트 매핑 |
| 15 | `report-actions.ts` | unmatchedQuestions 비교 로직 오류 | answer_id 기반 비교 |
| 16 | `ops/onboarding/page.tsx` | createAdminClient 클라이언트 import | 제거 |
| 17 | `ops/clients/[id]/page.tsx` | createAdminClient 클라이언트 사용 | 서버 액션으로 교체 |
| 18 | `retry/route.ts` | basic_info 덮어쓰기 | 기존 데이터 보존 |

### 5-2. 주요 미수정 이슈 (아키텍처 변경 필요)

| # | 이슈 | 영향 | 권장 조치 |
|---|------|------|----------|
| 1 | HMAC 하드코딩 시크릿 폴백 | 보안 | 프로덕션에서 ADMIN_SESSION_SECRET 필수 설정 |
| 2 | 포털 미들웨어 리다이렉트 | 포털 비활성 | 포털 재활성화 시 미들웨어 수정 |
| 3 | 서버 액션 인증 미적용 | 권한 우회 | 전체 서버 액션에 auth guard 추가 |
| 4 | GraphQL injection (placeId) | 보안 | placeId 숫자만 허용 sanitize |
| 5 | analytics-tabs-wrapper 2탭만 | 기능 누락 | 경쟁/Citation 탭 추가 |

---

## 6. Playwright 테스트 실행 계획

### 6-1. 테스트 파일 구조

```
tests/
├── auth/
│   ├── login.spec.ts
│   ├── logout.spec.ts
│   └── rbac.spec.ts
├── public/
│   ├── landing.spec.ts
│   ├── analysis-result.spec.ts
│   └── analysis-loading.spec.ts
├── dashboard/
│   ├── main.spec.ts
│   ├── brand-selector.spec.ts
│   └── sidebar.spec.ts
├── contents/
│   ├── list.spec.ts
│   ├── detail.spec.ts
│   └── create.spec.ts
├── keywords/
│   ├── list.spec.ts
│   ├── suggested.spec.ts
│   └── volume.spec.ts
├── clients/
│   ├── portfolio.spec.ts
│   └── detail.spec.ts
├── publish/
│   ├── hub.spec.ts
│   └── wizard.spec.ts
├── analytics/
│   ├── seo.spec.ts
│   └── aeo.spec.ts
├── crm/
│   ├── analysis-logs.spec.ts
│   └── sales-agents.spec.ts
├── settings/
│   ├── agent-settings.spec.ts
│   ├── aeo-settings.spec.ts
│   └── error-logs.spec.ts
├── api/
│   ├── analyze.spec.ts
│   ├── consultation.spec.ts
│   └── cron.spec.ts
└── errors/
    ├── 404.spec.ts
    └── error-handling.spec.ts
```

### 6-2. 실행 명령

```bash
# 전체 테스트
npx playwright test

# 특정 플로우만
npx playwright test tests/auth/
npx playwright test tests/public/
npx playwright test tests/dashboard/

# UI 모드
npx playwright test --ui

# 특정 브라우저
npx playwright test --project=chromium
```

### 6-3. 테스트 우선순위 순서

1. **P0**: 퍼블릭 + 인증 + 대시보드 (핵심 플로우)
2. **P1**: 콘텐츠 + 키워드 + 고객 + API (주요 기능)
3. **P2**: 발행 + 분석 + CRM (부가 기능)
4. **P3**: 설정 + 크론 + 에러 핸들링 (관리 기능)
