# 포털 vs 어드민 구조 분석 보고서

> 작성일: 2026-03-13
> 목적: 포털/어드민 간 기능 중복·누락·불일치 파악 → 이후 포털 고도화 기획 기초자료

---

## 1. 전체 라우트 구조 비교표

### 1-1. 어드민 라우트 (`app/(dashboard)/`)

| 그룹 | 경로 | 페이지명 | 역할 제한 |
|------|------|---------|----------|
| **서비스** | `/dashboard` | 대시보드 (B2B KPI + SEO 현황) | 전체 |
| | `/keywords` | 키워드 관리 (4탭: 키워드/질문/검색량/검색량조회) | 전체 |
| | `/keywords/[id]` | 키워드 상세 | 전체 |
| | `/contents` | 콘텐츠 관리 (3탭: 목록/생성/작업) | 전체 |
| | `/contents/[id]` | 콘텐츠 상세 에디터 | 전체 |
| | `/contents/[id]/publish` | 발행 위저드 (3단계) | 전체 |
| | `/publish` | 발행 관리 (3탭: 대기/이력/자동설정) | admin+ |
| | `/analytics` | 성과 분석 (4탭: SEO/AEO/경쟁/Citation) | 전체 |
| **고객관리** | `/clients` | 고객 포트폴리오 (카드뷰) | 전체 |
| | `/clients/[id]` | 고객 상세 (10탭) | 전체 |
| | `/brands` | 브랜드 관리 | 전체 |
| | `/brands/[id]` | 브랜드 상세 | 전체 |
| | `/ops/onboarding` | 온보딩 관리 | 전체 |
| | `/accounts` | 계정 관리 → `/ops/accounts-management` | admin+ |
| **비즈니스** | `/ops/revenue` | 매출 관리 (MRR/ARR) | admin+ |
| | `/ops/churn` | 이탈 관리 | admin+ |
| | `/ops/products` | 상품 관리 | admin+ |
| | `/ops/points` | 포인트 관리 (3탭: 잔액/거래/설정) | admin+ |
| **영업CRM** | `/ops/analysis-logs` | 분석 로그 (CRM 파이프라인) | 전체 |
| | `/ops/analysis-logs/[id]` | 분석 로그 상세 (4탭) | 전체 |
| | `/ops/sales-agents` | 영업사원 관리 | admin+ |
| **리소스** | `/blog-accounts` | 블로그 계정 + 등급 | admin+ |
| | `/sources` | 소스 라이브러리 | admin+ |
| | `/ops/scheduler` | 자동 스케줄러 | admin+ |
| **설정** | `/ops/agent-settings` | 에이전트 설정 (4탭) | admin+ |
| | `/ops/scoring-settings` | 점수 가중치 | admin+ |
| | `/ops/serp-settings` | SERP 설정 | admin+ |
| | `/ops/aeo-settings` | AEO 추적 설정 | admin+ |
| | `/ops/settings` | API 설정 | admin+ |
| | `/ops/error-logs` | 에러 로그 | admin+ |
| | `/settings/admins` | 어드민 관리 | super_admin |
| | `/settings/account` | 계정 설정 | 전체 |

> admin+ = super_admin, admin, viewer

### 1-2. 포털 라우트 (`app/(portal)/`)

| 경로 | 페이지명 | 대응 어드민 기능 |
|------|---------|---------------|
| `/portal` | 대시보드 (KPI + 브랜드 요약 + 네이버/구글 현황) | `/dashboard` (부분 대응) |
| `/portal/serp` | SERP 트래킹 (순위 스파크라인 + 필터) | `/analytics` SEO 탭 (부분 대응) |
| `/portal/blog` | 블로그 관리 허브 | `/contents` 목록 탭 (부분 대응) |
| `/portal/blog/[id]` | 블로그 상세 | `/contents/[id]` (부분 대응) |
| `/portal/blog/write` | 블로그 작성 (AI 보조) | **어드민 없음** |
| `/portal/keywords` | 키워드 관리 (5탭: 활성/AI추천/보관/검색량/전략) | `/keywords` (부분 대응) |
| `/portal/contents` | 콘텐츠 현황 | `/contents` 목록 탭 (중복) |
| `/portal/reports` | 월간 리포트 (차트 + 순위 + AEO) | `/analytics` (부분 대응) |
| `/portal/analysis` | 브랜드 분석 결과 | `/brands/[id]` (부분 대응) |
| `/portal/notifications` | 알림 센터 | **어드민 없음** |
| `/portal/settings` | 설정 (프로필/비밀번호/구독) | `/settings/account` (부분 대응) |
| `/portal/write` | 빠른 작성 | **어드민 없음** |

### 1-3. 라우트 대응 요약

| 구분 | 수량 |
|------|------|
| 어드민 전용 라우트 | 28개 |
| 포털 전용 라우트 | 12개 |
| 기능 대응 (부분 포함) | 7쌍 |
| 어드민에만 있는 기능 | 21개 (고객관리/비즈니스/CRM/리소스/설정 전체) |
| 포털에만 있는 기능 | 5개 (blog/write, notifications, analysis, serp 전용뷰, write) |

---

## 2. 데이터 불일치 목록

### 2-1. 서버 액션 분리 현황

| 영역 | 어드민 액션 파일 | 포털 액션 파일 | 공유 여부 |
|------|----------------|---------------|----------|
| 키워드 | `keyword-actions.ts` | `portal-actions.ts` + `keyword-actions.ts` 직접 호출 | **혼용** |
| 콘텐츠 | `ops-actions.ts`, `content-generate-actions.ts` | `portal-actions.ts` | 분리 |
| 분석 | `analytics-actions.ts`, `aeo-tracking-actions.ts` | `portal-actions.ts` | 분리 |
| 대시보드 | `dashboard-actions.ts` | `portal-actions.ts` | 분리 |
| 발행 | `publish-actions.ts` | 없음 | 어드민 전용 |
| 설정 | `settings-actions.ts` | `portal-actions.ts` (getPortalSettings) | 분리 |

### 2-2. 동일 데이터 다른 쿼리 패턴

| 데이터 | 어드민 쿼리 | 포털 쿼리 | 불일치 |
|--------|-----------|----------|--------|
| **키워드 목록** | `keyword-actions.ts` → `keywords` 전체 (client_id 필터 선택적) | `portal-actions.ts` → `getPortalKeywordsV2()` (client_id 필수) | 필터 방식 차이 |
| **콘텐츠 목록** | `ops-actions.ts` → `getContents()` (status 필터 다양) | `portal-actions.ts` → `getPortalContentsV2()` (최근 50건) | 포털 50건 제한 |
| **순위 데이터** | `keyword-actions.ts` → `keyword_visibility` + `daily_visibility_summary` | `portal-actions.ts` → `keyword_visibility` 직접 | 집계 테이블 미사용 |
| **AEO 데이터** | `aeo-tracking-actions.ts` → 전용 함수 5개 | `portal-actions.ts` → `getPortalAEOScoreQuick()` | 포털은 요약만 |
| **마케팅 점수** | `brand-actions.ts` → `brand_analyses` | `portal-actions.ts` → `brand_analyses` | 동일 |

### 2-3. 컬럼 참조 차이

| 컬럼 | 어드민 사용 | 포털 사용 | 비고 |
|------|-----------|----------|------|
| `keywords.is_primary` | `keyword-actions.ts` (setPrimaryKeyword, addKeywordWithPrimary) | `portal-actions.ts` (select, order), `portal-keywords-client.tsx` (UI) | 양쪽 사용 |
| `keyword_visibility.place_rank_pc/mo` | 미사용 | `portal-actions.ts` (getPortalPlaceAndVisibilityData) | **포털에만 사용** |
| `keyword_visibility.naver_mention_count/google_mention_count` | 미사용 | `portal-actions.ts` (getPortalPlaceAndVisibilityData) | **포털에만 사용** |
| `place_stats_history` | 미사용 | `portal-actions.ts` (getPortalPlaceAndVisibilityData) | **포털에만 사용** |
| `contents.metadata` (qc_result) | `ops-actions.ts` (목록 표시) | `portal-actions.ts` (상세 표시) | 양쪽 사용 |
| `client_points` | `point-actions.ts` (CRUD) | `portal-actions.ts` (잔액 읽기만) | 권한 차이 |

### 2-4. 인증·권한 차이

| 항목 | 어드민 | 포털 |
|------|--------|------|
| 인증 방식 | HMAC-SHA256 (`admin_session` 쿠키) | Supabase Auth (`sb-*` 쿠키) |
| client_id 획득 | `getSelectedClientId()` (쿠키, 선택적) | `user.client_id` (DB, 고정) |
| 전체 브랜드 모드 | 있음 (client_id=null → 전체 조회) | **없음** (항상 본인 데이터만) |
| RLS | 없음 (어플리케이션 레벨 필터) | 없음 (어플리케이션 레벨 필터) |
| 데이터 쓰기 | 전체 테이블 쓰기 가능 | keywords(승인/거절/추가), users(프로필), client_points(차감) 한정 |

---

## 3. 포털에 없는 기능 (어드민 전용)

### 3-1. 핵심 운영 기능

| # | 기능 | 어드민 경로 | 중요도 | 포털 제공 필요성 |
|---|------|-----------|--------|----------------|
| 1 | **캠페인 기획** (AI 키워드 추천 + 콘텐츠 생성 트리거) | `/contents?tab=create` | 높음 | 중 — 고객이 직접 콘텐츠 요청하려면 필요 |
| 2 | **작업 대기열 모니터링** (Job 상태 확인) | `/contents?tab=jobs` | 중간 | 높음 — "내 콘텐츠 진행 상황" 확인 |
| 3 | **발행 관리** (대기/이력/자동발행 설정) | `/publish` | 높음 | 중 — 자동 발행 ON/OFF는 고객이 제어해야 |
| 4 | **블로그 계정 관리** (CRUD + 연동 테스트) | `/blog-accounts` | 높음 | 높음 — 고객이 본인 블로그 연동해야 |
| 5 | **발행 위저드** (콘텐츠 → 플랫폼 선택 → 발행) | `/contents/[id]/publish` | 높음 | 중 — 수동 발행 제어 |
| 6 | **콘텐츠 상세 편집** (마크다운 에디터 + QC) | `/contents/[id]` | 중간 | 낮음 — 포털 blog/write로 대체 가능 |

### 3-2. 분석·추적 기능

| # | 기능 | 어드민 경로 | 포털 제공 필요성 |
|---|------|-----------|----------------|
| 7 | **경쟁사 분석** (점유율 비교) | `/analytics?tab=competition` | 중 — 요약 수준으로 제공 가능 |
| 8 | **Citation 분석** (인용 출처 추적) | `/analytics?tab=citation` | 낮음 |
| 9 | **AEO 상세 분석** (질문별 LLM 응답 상세) | `/analytics?tab=aeo` | 중 — 요약은 이미 리포트에 존재 |
| 10 | **진화지식 학습** (에이전트 패턴 분석) | `/ops/agent-settings` | 낮음 — 내부 운영 기능 |
| 11 | **질문 엔진** (키워드→질문 생성/편집) | `/keywords?tab=questions` | 낮음 — 읽기 전용으로 포털 이미 제공 |

### 3-3. 관리·설정 기능 (포털 제공 불필요)

| # | 기능 | 어드민 경로 | 비고 |
|---|------|-----------|------|
| 12 | 고객 포트폴리오 | `/clients` | 어드민 전용 |
| 13 | 매출/이탈/온보딩 관리 | `/ops/revenue`, `/ops/churn`, `/ops/onboarding` | 어드민 전용 |
| 14 | 영업 CRM | `/ops/analysis-logs`, `/ops/sales-agents` | 어드민 전용 |
| 15 | 포인트/상품/구독 관리 | `/ops/points`, `/ops/products` | 어드민 전용 |
| 16 | 시스템 설정 전체 | `/ops/settings`, `/ops/aeo-settings` 등 | 어드민 전용 |
| 17 | 에러 로그 | `/ops/error-logs` | 어드민 전용 |

---

## 4. 포털에만 있는 기능 (어드민에 없음)

| # | 기능 | 포털 경로 | 설명 | 어드민 대응 필요성 |
|---|------|---------|------|-----------------|
| 1 | **SERP 트래킹 전용 대시보드** | `/portal/serp` | 키워드별 스파크라인, 플랫폼 필터, 위험도 필터, 수동 순위체크 | 낮음 — 어드민은 `/analytics` SEO 탭으로 충분 |
| 2 | **블로그 작성 (AI 보조)** | `/portal/blog/write` | 키워드 선택 → AI 콘텐츠 생성 → 편집 → 저장 | 중 — 어드민 `/contents?tab=create`와 유사하나 UX 다름 |
| 3 | **알림 센터** | `/portal/notifications` | 순위 변동, 콘텐츠 발행, 마일스톤 알림 | 낮음 — 어드민은 슬랙으로 대체 |
| 4 | **네이버/구글 현황 섹션** | `/portal` (대시보드 내) | PlaceRankCard + StatCard(리뷰/블로그/저장) + ExposureTable | **중** — 데이터는 있으나 어드민 UI 미구현 |
| 5 | **헬스스코어 + 긴급 배너** | `/portal` (대시보드 내) | 4요소 종합 건강점수 (A~F) + 순위하락/미발행/포인트부족 경고 | 낮음 — 어드민은 At Risk으로 대체 |
| 6 | **마케팅 점수 원형 차트** | `/portal` (대시보드 내) | 6영역 점수 시각화 + 브랜드 강점/약점 태그 | 낮음 — 어드민 고객 상세에 유사 기능 |
| 7 | **구독 정보 표시** | `/portal/settings` | 현재 플랜명, 상태, 기능 목록 | 낮음 — 어드민은 `/ops/clients/[id]` 구독 탭 |
| 8 | **place_stats_history 30일 차트** | `/portal` (대시보드 내) | 방문자리뷰/블로그리뷰/저장수 30일 추이 (StatCard 모달) | **중** — 이 데이터를 어드민에서도 볼 수 없음 |

---

## 5. 공통 식별자 현황

### 5-1. 핵심 FK 체계

```
clients.id (UUID)
  ├── keywords.client_id
  ├── contents.client_id
  ├── keyword_visibility.client_id
  ├── daily_visibility_summary.client_id
  ├── brand_analyses.client_id
  ├── blog_accounts.client_id
  ├── publications.client_id
  ├── subscriptions.client_id
  ├── client_points.client_id
  ├── aeo_scores.client_id
  ├── auto_publish_settings.client_id
  ├── place_stats_history.client_id (Phase 4 신규)
  └── users.client_id (포털 사용자 연결)
```

### 5-2. 포털 ↔ 어드민 식별자 매핑

| 식별자 | 어드민 획득 방법 | 포털 획득 방법 | 일치 여부 |
|--------|----------------|---------------|----------|
| `client_id` | `getSelectedClientId()` (쿠키 기반, 선택적) | `user.client_id` (DB, 고정) | **같은 값** |
| `user_id` | 없음 (어드민은 admin_users.id 사용) | `user.id` (Supabase Auth UUID) | 체계 다름 |
| `keyword_id` | `keywords.id` | `keywords.id` | **동일** |
| `content_id` | `contents.id` | `contents.id` | **동일** |
| `blog_account_id` | `blog_accounts.id` | `blog_accounts.id` | **동일** |
| `analysis_id` | `brand_analyses.id` | `brand_analyses.id` | **동일** |

### 5-3. 데이터 격리 보장

| 검증 항목 | 상태 | 비고 |
|----------|------|------|
| 포털 쿼리에 client_id 필터 필수 적용 | **OK** | 모든 portal-actions 함수에 `.eq("client_id", clientId)` 확인 |
| RLS 정책 | **미적용** | 어플리케이션 레벨 필터링만 존재 |
| 포털에서 타 고객 데이터 접근 가능성 | **낮음** | client_id는 서버사이드에서 user.client_id로 결정 (클라이언트 조작 불가) |
| keyword-actions.ts 직접 호출 시 | **주의** | `setPrimaryKeyword(keywordId, clientId)` — clientId를 포털에서 전달, 서버에서 검증 필요 |

---

## 6. 즉시 수정 필요한 버그/불일치

### 6-1. 즉시 수정 (P0)

| # | 이슈 | 위치 | 설명 | 영향 |
|---|------|------|------|------|
| 1 | **keyword-actions 권한 미검증** | `lib/actions/keyword-actions.ts` | `setPrimaryKeyword`, `deactivateKeyword`, `addKeywordWithPrimary` — clientId를 파라미터로 받지만, 호출자가 해당 client의 소유자인지 서버에서 검증하지 않음 | 포털에서 clientId 위조 시 타 고객 키워드 조작 가능 (현재는 UI에서 clientId를 meta 태그로 주입하므로 실질적 위험 낮으나, API 직접 호출 시 취약) |
| 2 | **포털 콘텐츠 라우트 중복** | `/portal/contents` + `/portal/blog` | 두 경로가 유사한 콘텐츠 목록을 보여줌 (redirect 있으나 혼란) | UX 혼동 |

### 6-2. 단기 수정 (P1)

| # | 이슈 | 위치 | 설명 |
|---|------|------|------|
| 3 | **place_stats_history 어드민 미연동** | `app/(dashboard)/` 전체 | Phase 4에서 포털용으로 추가한 place_stats_history 30일 데이터가 어드민 클라이언트 상세에서 조회 불가 |
| 4 | **mention_count 어드민 미표시** | `lib/actions/keyword-actions.ts` | keyword_visibility의 naver_mention_count/google_mention_count가 어드민 순위 탭에서 표시되지 않음 |
| 5 | **포털 콘텐츠 50건 제한** | `portal-actions.ts` getPortalContentsV2 | 콘텐츠 50건 초과 시 이전 콘텐츠 접근 불가 (페이지네이션 없음) |
| 6 | **포털 daily_visibility_summary 미사용** | `portal-actions.ts` | 어드민은 daily_visibility_summary 집계 테이블을 사용하나, 포털은 keyword_visibility 직접 쿼리 → 대량 데이터 시 성능 차이 |

### 6-3. 중기 개선 (P2)

| # | 이슈 | 설명 |
|---|------|------|
| 7 | **포털 발행 기능 부재** | 포털에서 블로그 작성은 가능하나 플랫폼 발행(Tistory/WordPress/Medium) 불가. 블로그 계정 연동 UI도 없음 |
| 8 | **포털 Job 상태 미표시** | 콘텐츠 생성 요청 후 진행 상태를 포털에서 확인할 방법 없음 (`getPortalActiveJobs` 함수는 존재하나 UI 미연결) |
| 9 | **자동발행 설정 포털 미노출** | `auto_publish_settings` 테이블 존재, 어드민에서 설정 가능하나 포털에서는 조회/변경 불가 |
| 10 | **RLS 미적용** | 전체 시스템에 Supabase RLS 정책 없음. 현재는 서버 액션의 client_id 필터에 의존. Supabase 클라이언트가 노출되면 보안 위험 |

---

## 부록: 포털 서버 액션 전체 목록

| 함수명 | 버전 | 읽기/쓰기 | 주요 테이블 |
|--------|------|----------|-----------|
| `getPortalDashboard` | V1 | R | brand_analyses, contents, subscriptions, clients, sales_agents |
| `getPortalKeywords` | V1 | R | brand_analyses, keyword_visibility |
| `getPortalContents` | V1 | R | contents |
| `getPortalReport` | V1 | R | brand_analyses, contents |
| `getPortalDashboardV2` | V2 | R | brand_analyses, keywords, contents, clients, keyword_visibility, sales_agents, client_points, aeo_scores, llm_answers |
| `getPortalKeywordsV2` | V2 | R | keywords, brand_analyses |
| `getPortalContentsV2` | V2 | R | contents, keywords |
| `getPortalReportV2` | V2 | R | contents, keywords, agent_execution_logs, keyword_visibility, brand_analyses, aeo_scores, mentions |
| `getPortalSettings` | - | R | users, subscriptions, clients, sales_agents |
| `getPortalActiveJobs` | - | R | jobs |
| `getPortalPointBalance` | - | R | client_points |
| `getPortalHealthScore` | Phase 2 | R | contents, brand_analyses, keywords, keyword_visibility |
| `getPortalUrgentBannerCondition` | Phase 2 | R | keywords, contents, client_points |
| `getPortalSerpPage` | Phase 2 | R | keywords, keyword_visibility, contents |
| `getPortalPublishStatusBreakdown` | Phase 2 | R | contents, client_points |
| `getPortalKeywordTop3WithDelta` | Phase 2 | R | keywords, keyword_visibility |
| `getPortalRecommendedActions` | Phase 2 | R | (내부 호출) |
| `getPortalPlaceAndVisibilityData` | Phase 4 | R | keywords, keyword_visibility, place_stats_history |
| `getPortalAEOScoreQuick` | 내부 | R | aeo_scores, llm_answers |

### 포털에서 직접 호출하는 쓰기 액션 (다른 파일)

| 함수명 | 파일 | 쓰기 테이블 |
|--------|------|-----------|
| `setPrimaryKeyword` | keyword-actions.ts | keywords |
| `deactivateKeyword` | keyword-actions.ts | keywords |
| `addKeywordWithPrimary` | keyword-actions.ts | keywords |
| `approveSuggestedKeyword` | keyword-expansion-actions.ts | keywords |
| `rejectSuggestedKeyword` | keyword-expansion-actions.ts | keywords |
| `bulkApproveSuggestedKeywords` | keyword-expansion-actions.ts | keywords |
| `updateUserProfile` | auth-actions.ts | users |
| `changeUserPassword` | auth-actions.ts | users (Supabase Auth) |
