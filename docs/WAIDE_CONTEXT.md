# Waide 프로젝트 컨텍스트

> 최종 업데이트: 2026-03-11
> 소스 코드 기반 자동 생성

---

## 1. 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16.1.6 (App Router) + React + Tailwind CSS + shadcn/ui |
| 백엔드 | Next.js Server Actions + API Routes |
| DB | Supabase (PostgreSQL), `createAdminClient()` — service_role key, RLS 바이패스 |
| AI | Claude API (Haiku 4.5), 프롬프트 동적 로딩 (agent_prompts 테이블) |
| 인증 | 이중 구조: Supabase Auth (포털) + HMAC-SHA256 (어드민) |
| 배포 | Vercel (icn1 서울) |
| PDF | @react-pdf/renderer (NotoSansKR 한글 폰트) |
| 이메일 | Resend + @react-email/components |

---

## 2. 포털 페이지 라우트

| 경로 | 파일 | 설명 |
|------|------|------|
| `/portal` | `app/(portal)/portal/page.tsx` | 대시보드 — 긴급배너, KPI 4종, 건강점수카드(블로그/SEO/SERP/플레이스), 브랜드 요약, 온보딩 체크리스트, 키워드 순위, 점유율, AEO 스코어, 최근 활동 |
| `/portal/serp` | `app/(portal)/portal/serp/page.tsx` | SERP 트래킹 — 키워드 순위 테이블, 스파크라인, 30일 차트, 키워드 추가/삭제, 누락 키워드 배너 |
| `/portal/blog` | `app/(portal)/portal/blog/page.tsx` | 블로그 관리 통합 — 4탭(블로그목록/AI작성/자동발행설정/콘텐츠관리), server component + `PortalBlogUnifiedClient` |
| `/portal/blog/write` | `app/(portal)/portal/blog/write/page.tsx` | AI 블로그 작성 V2 — 4단계 플로우(키워드선택/제목생성/본문편집+SEO체크/발행설정+예약발행), `PortalWriteV2Client` |
| `/portal/blog/[id]` | `app/(portal)/portal/blog/[id]/page.tsx` | 발행글 상세 — `PortalBlogPostDetail` (본문 미리보기, 발행 후 순위 추이 차트, AI 인사이트, 발행 이력, AI 보완 작성 버튼) |
| `/portal/keywords` | `app/(portal)/portal/keywords/page.tsx` | 키워드 관리 — 5탭(활성/AI추천/보관/검색량조회/키워드전략), 승인/거절, 키워드 추가, AI 추천 받기 |
| `/portal/reports` | `app/(portal)/portal/reports/page.tsx` | 분석 리포트 — 월간 성과 요약, 발행vs순위 상관 차트, 발행추이 차트, 키워드 성장, 순위 현황, AEO 노출, PDF 다운로드 |
| `/portal/notifications` | `app/(portal)/portal/notifications/page.tsx` | 알림 센터 — 알림 피드(5종류), 알림 설정(종류별 토글+이메일), `PortalNotificationsClient` |
| `/portal/settings` | `app/(portal)/portal/settings/page.tsx` | 설정 — 프로필, 비밀번호, 구독 정보 |
| `/portal/analysis` | `app/(portal)/portal/analysis/page.tsx` | **리다이렉트** → `/portal` |
| `/portal/contents` | `app/(portal)/portal/contents/page.tsx` | **리다이렉트** → `/portal/blog?tab=contents` |
| `/portal/write` | `app/(portal)/portal/write/page.tsx` | **리다이렉트** → `/portal/blog/write` |

### 포털 레이아웃/유틸

- `app/(portal)/layout.tsx` — 포털 레이아웃 (meta 태그로 clientId 전달, unreadNotificationCount 서버 조회 → PortalShell prop)
- `app/(portal)/portal/loading.tsx` — 로딩 스피너
- `app/(portal)/portal/error.tsx` — 에러 바운더리

---

## 3. 포털 컴포넌트

| 파일 | 설명 |
|------|------|
| `components/portal/portal-shell.tsx` | 포털 셸 (네비게이션 7항목: 대시보드/SERP트래킹/블로그관리/키워드관리/분석리포트/알림센터/설정, unreadNotificationCount 뱃지) |
| `components/portal/portal-blog-unified-client.tsx` | 블로그 관리 통합 (4탭: 블로그목록/AI작성/자동발행설정/콘텐츠관리) |
| `components/portal/portal-blog-post-detail.tsx` | 발행글 상세 (본문 미리보기, 발행 후 순위 추이 차트(Recharts), AI 인사이트, 발행 이력, AI 보완 작성 버튼) |
| `components/portal/portal-notifications-client.tsx` | 알림 센터 (알림 피드 5종류, 타입별 아이콘/CTA, 알림 설정 토글, 상대시간 표시) |
| `components/portal/portal-serp-client.tsx` | SERP 트래킹 (키워드 순위 테이블, 스파크라인, 30일 차트, 키워드 추가/삭제) |
| `components/portal/portal-pending.tsx` | client_id 미연결 사용자 대기 화면 |
| `components/portal/portal-contents-client.tsx` | 콘텐츠 현황 클라이언트 컴포넌트 |
| `components/portal/portal-blog-client.tsx` | 블로그 관리 클라이언트 컴포넌트 |
| `components/portal/portal-write-client.tsx` | 콘텐츠 작성 클라이언트 컴포넌트 (V1, 유지) |
| `components/portal/portal-write-v2-client.tsx` | AI 블로그 작성 V2 (4단계: 키워드선택/제목생성/본문편집+SEO체크/발행설정+예약발행) |
| `components/portal/analysis-required-banner.tsx` | 분석 시작 배너 (URL 입력 + runBrandAnalysis + 완료 시 인라인 결과 표시) |
| `components/analysis/ScoreGauge.tsx` | 공유 점수 게이지 (dark/light variant, SVG 원형 차트) |
| `components/analysis/AnalysisResultView.tsx` | 공유 분석 결과 뷰 (portal/public variant, compact 모드) |
| `components/portal/keyword-detail-modal.tsx` | 키워드 상세 모달 |
| `components/portal/keyword-occupancy-section.tsx` | 키워드 점유율 섹션 (진행바 + 칩) |
| `components/portal/publish-url-modal.tsx` | 발행 URL 입력 모달 |
| `components/portal/kakao-floating-button.tsx` | 카카오톡 플로팅 버튼 |

---

## 4. Server Actions (lib/actions/)

### 포털 관련

| 파일 | 주요 함수 |
|------|----------|
| `portal-actions.ts` | `getPortalDashboardV2()`, `getPortalKeywordsV2()`, `getPortalContentsV2()`, `getPortalReportV2()`, `getPortalSettings()`, `getPortalPointBalance()`, `getPortalHealthScore()`, `getPortalUrgentBannerCondition()`, `getPortalSerpPage()` |
| `keyword-expansion-actions.ts` | `approveSuggestedKeyword()`, `rejectSuggestedKeyword()`, `bulkApproveSuggestedKeywords()` |
| `campaign-planning-actions.ts` | `suggestKeywordsForClient()`, `addManualKeyword()`, `triggerContentGeneration()` |
| `keyword-actions.ts` | `updateKeywordStatus()`, `createKeyword()`, `triggerClientSerpCheck()`, `getClientRankings()` |
| `analysis-brand-actions.ts` | `runBrandAnalysis()`, `getAnalysisStatus()`, `getBrandAnalysis()` |
| `auth-actions.ts` | `portalSignIn()`, `portalSignUp()`, `portalSignOut()`, `updateUserProfile()`, `changeUserPassword()` |
| `question-actions.ts` | `getPortalQuestions()` |
| `notification-actions.ts` | `getNotifications()`, `getUnreadCount()`, `markAllRead()`, `markRead()`, `createNotification()`, `getNotificationSettings()`, `updateNotificationSettings()` |

### 어드민 관련

| 파일 | 주요 함수 |
|------|----------|
| `dashboard-actions.ts` | `getBusinessDashboardData()` |
| `client-portfolio-actions.ts` | `getClientPortfolio()`, `getClientDetail()`, `updateOnboardingChecklist()` |
| `revenue-actions.ts` | `getRevenueData()` |
| `analytics-actions.ts` | `getVisibilityKpi()`, `getOpsSerp()` |
| `brand-actions.ts` | `getBrands()`, `getSelectedClientId()` |
| `content-source-actions.ts` | `getContentSources()`, `createContentSource()` |
| `recommendation-actions.ts` | `getRecommendationsList()`, `acceptRecommendation()` |
| `ops-actions.ts` | `getJobs()`, `getContents()` |
| `content-prompt-actions.ts` | `getPrompts()`, `updatePrompt()` |
| `blog-account-actions.ts` | `getAccounts()` |
| `campaign-actions.ts` | `getCampaigns()`, `createCampaignWithJob()` |
| `keyword-strategy-actions.ts` | `generateKeywordStrategy()`, `getKeywordStrategy()` |
| `content-generate-actions.ts` | `generateContentV2()`, `processContentJobs()` |
| `analysis-log-actions.ts` | `getAnalysisLogs()`, `getAnalysisLogDetail()`, `updateLeadStatus()`, `assignSalesAgent()` |
| `settings-actions.ts` | `getSettings()`, `getScoringWeights()` |
| `admin-actions.ts` | `getAdmin()` |
| `product-actions.ts` | `getProducts()`, `createSubscription()`, `cancelSubscription()` |
| `persona-actions.ts` | `updatePersona()`, `regeneratePersona()` |
| `report-actions.ts` | `getMonthlyReportData()`, `generateAndSendReport()` |
| `point-actions.ts` | `initializeClientPoints()`, `spendPoints()`, `grantPoints()` |
| `error-log-actions.ts` | `logError()`, `getErrorLogs()` |
| `aeo-tracking-actions.ts` | `runAEOTracking()`, `calculateAEOScore()`, `getAEODashboardData()` |
| `publish-actions.ts` | `executePublish()`, `checkAutoPublish()`, `getAutoPublishSettings()` |
| `prompt-registry-actions.ts` | `getPromptRegistryAction()`, `savePromptAction()` |
| `knowledge-actions.ts` | `runKnowledgeLearning()`, `getKnowledgeStats()` |
| `keyword-volume-actions.ts` | `queryKeywordVolume()`, `updateKeywordVolumes()` |
| `refinement-actions.ts` | `refineAnalysis()`, `applyAnalysisToProject()` |
| `client-account-actions.ts` | `linkClientAccount()`, `unlinkClientAccount()`, `inviteClientUser()` |
| `entity-content-actions.ts` | `generateEntityContent()` |
| `url-crawl-action.ts` | `crawlUrl()` |

---

## 5. Supabase 클라이언트

| 파일 | 용도 |
|------|------|
| `lib/supabase/service.ts` | `createAdminClient()` — service_role key, RLS 바이패스, Server Actions용 |
| `lib/supabase/server.ts` | `createClient()` — 서버 컴포넌트용 (cookies 기반) |
| `lib/supabase/client.ts` | `createClient()` — 클라이언트 컴포넌트용 (브라우저) |
| `lib/supabase/middleware.ts` | 미들웨어용 Supabase 클라이언트 |
| `lib/supabase/index.ts` | 공통 export |

---

## 6. 주요 DB 테이블 (코드에서 확인)

### 핵심 테이블

| 테이블 | 용도 | 주요 컬럼/특이사항 |
|--------|------|-------------------|
| `clients` | 고객사 (최상위 부모) | brand_persona JSONB, onboarding_checklist JSONB, metadata JSONB |
| `users` | 포털 사용자 (Supabase Auth) | client_id FK → clients, role CHECK |
| `keywords` | SEO 키워드 | status: active/suggested/paused/archived, metadata JSONB |
| `contents` | 생성된 콘텐츠 | metadata JSONB (qc_score, qc_result), content_type CHECK, scheduled_at TIMESTAMPTZ |
| `brand_analyses` | 브랜드 분석 결과 | analysis_result JSONB, status: pending/analyzing/completed/failed/converted |
| `keyword_visibility` | 키워드 노출 점수 | client_id 보유, keywords FK 조인으로 키워드명 매핑 |
| `blog_accounts` | 블로그 계정 | platform: naver/tistory/wordpress/medium/brunch |
| `publications` | 발행 이력 | status: pending/publishing/published/failed |
| `subscriptions` | 고객 구독 | plan_name: trial/basic/pro/enterprise |

### 분석/추적 테이블

| 테이블 | 용도 |
|--------|------|
| `serp_results` | SERP 순위 (일별) — client_id 없음! |
| `daily_visibility_summary` | 일별 노출 집계 |
| `aeo_scores` | AEO Visibility Score |
| `llm_answers` | LLM 응답 (AEO 추적) |
| `mentions` | 브랜드 언급 감지 |
| `questions` | 질문 엔진 (3소스: LLM/PAA/네이버) |

### 비즈니스 테이블

| 테이블 | 용도 |
|--------|------|
| `products` | 서비스 패키지 |
| `client_points` | 고객 포인트 잔액 |
| `point_transactions` | 포인트 거래 이력 |
| `sales_agents` | 영업사원 |
| `consultation_requests` | 상담 신청 |
| `report_deliveries` | 월간 리포트 발송 이력 |
| `admin_users` | 어드민 계정 |
| `invitations` | 초대 토큰 (7일 만료) |
| `error_logs` | 에러 모니터링 |
| `notifications` | 알림 (5종류: rank_drop/rank_rise/publish_complete/quota_warning/auto_publish_confirm, is_read 플래그) |
| `notification_settings` | 알림 설정 (client_id UNIQUE, settings JSONB: 종류별 토글 + email_enabled) |

### 인프라 테이블

| 테이블 | 용도 |
|--------|------|
| `jobs` | 작업 큐 (CONTENT_CREATE 등) |
| `agent_prompts` | 에이전트 프롬프트 (동적 로딩) |
| `agent_execution_logs` | 에이전트 실행 로그 |
| `content_benchmarks` | 벤치마크 캐시 (7일 TTL) |
| `scoring_criteria` | 채점 기준 |
| `settings` | 전역 설정 (API키, 가중치) |
| `auto_publish_settings` | 자동 발행 설정 (settings JSONB: keyword_pool, schedule, confirm_count) |
| `evolving_knowledge` | 진화지식 패턴 |

---

## 7. 아키텍처 원칙

1. **모든 데이터는 `client_id` FK로 연결** — `clients`가 최상위 부모
2. **Server Actions에서 `createAdminClient()` 사용** — service_role key, RLS 바이패스
3. **포털 clientId 전달** — PortalShell에서 hidden meta 태그 → 클라이언트 컴포넌트에서 DOM 쿼리
4. **이중 인증** — 어드민=HMAC-SHA256, 포털=Supabase Auth, 절대 혼용 금지
5. **프롬프트 동적 로딩** — agent_prompts 테이블에서 런타임 로딩 (코드 하드코딩 금지)
6. **JSONB 업데이트** — SELECT → spread → UPDATE 순서
7. **keyword_visibility 사용** — serp_results에는 client_id 없음, 클라이언트별 순위 데이터는 keyword_visibility 테이블 사용
8. **알림 비차단 설계** — 모든 createNotification 호출은 try/catch 래핑, 실패해도 서비스 파이프라인 블로킹 금지

---

## 8. API Routes (Phase 4 추가)

| API 경로 | 메서드 | 기능 |
|----------|--------|------|
| `/api/portal/post-insight` | POST | AI 인사이트 코멘트 (Claude Haiku, 발행 7일+ 경과 콘텐츠, contents.metadata.insight 캐시) |
