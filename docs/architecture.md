# Waide — 전체 아키텍처 문서

> 최종 업데이트: 2026-03-07
> 버전: Phase DEV-0 (AI 오케스트레이션 셋업)

---

## 1. 프로젝트 개요

**Waide** (AI Hospitality Aide) — B2B SEO+AEO 마케팅 자동화 SaaS

- **목표**: 로컬 비즈니스(숙박/음식점/카페)의 검색 노출(SEO) + AI 답변 노출(AEO)을 자동화
- **타겟 고객**: 마케팅 대행사, 프랜차이즈 본사, 개별 사업자
- **핵심 가치**: 분석 → 키워드/질문 확장 → 콘텐츠 자동 생성 → 다채널 배포 → SERP+AI 추적 → 피드백 루프
- **수익 모델**: 월 구독 (콘텐츠 자동 발행 서비스)

---

## 2. 기존 서비스 구조 (현재 상태)

### 2-1. 디렉토리 구조

```
waide/
├── apps/web/                    # Next.js 16.1.6 (App Router)
│   ├── app/
│   │   ├── (public)/            # 퍼블릭 (다크 테마)
│   │   │   ├── page.tsx         # 랜딩페이지
│   │   │   ├── login/           # 통합 로그인
│   │   │   ├── signup/          # 회원가입
│   │   │   ├── invite/[token]/  # 초대 수락
│   │   │   └── analysis/        # 분석 결과 + 로딩
│   │   ├── (dashboard)/         # 어드민 (라이트 테마)
│   │   │   ├── dashboard/       # B2B KPI 대시보드
│   │   │   ├── keywords/        # 키워드 관리
│   │   │   ├── campaigns/plan/  # 캠페인 기획
│   │   │   ├── ops/             # 운영 (clients, contents, jobs, ...)
│   │   │   └── settings/        # 설정
│   │   ├── (portal)/            # 고객 포털 (라이트 테마)
│   │   │   └── portal/          # 대시보드/키워드/콘텐츠/리포트/설정
│   │   └── api/                 # API Routes
│   │       ├── analyze/         # 브랜드 분석
│   │       ├── consultation/    # 상담 신청
│   │       ├── cron/            # 크론 잡
│   │       └── portal/          # 포털 API
│   ├── components/              # React 컴포넌트
│   │   ├── dashboard/           # 사이드바, 브랜드카드
│   │   ├── portal/              # 포털 셸
│   │   ├── keywords/            # 키워드 UI
│   │   ├── ops/                 # 운영 UI
│   │   ├── ui/                  # shadcn/ui 공통 컴포넌트
│   │   └── ...
│   └── lib/                     # 서버 로직
│       ├── actions/             # Server Actions (30+ 파일)
│       ├── supabase/            # Supabase 클라이언트
│       ├── auth/                # 인증 헬퍼
│       ├── pdf/                 # PDF 생성
│       ├── email/               # 이메일 발송
│       ├── slack/               # Slack 알림
│       ├── utils/               # 유틸리티
│       └── *.ts                 # 핵심 엔진 (에이전트, 분석, SERP 등)
│
├── agents/                      # Python AI 에이전트 (LangGraph)
├── scripts/migrations/          # SQL 마이그레이션 (001~056)
├── public/                      # 정적 파일 (폰트, 이미지)
├── ai-team/                     # AI 에이전트 역할 정의 (Phase DEV-0)
├── tasks/                       # 작업 큐 (Phase DEV-0)
├── prompts/                     # 에이전트 프롬프트 (Phase DEV-0)
├── docs/                        # 설계 문서
├── CLAUDE.md                    # 서비스 IA + 절대 규칙
├── MASTER_ROADMAP.md            # 전체 Phase 로드맵
└── vercel.json                  # Vercel 배포 설정
```

### 2-2. 주요 페이지 목록

#### 퍼블릭 (다크 테마)

| 경로 | 페이지 | 목적 |
|------|--------|------|
| `/` | 랜딩페이지 | 무료 분석 유도 (URL 입력) |
| `/analysis/[id]` | 분석 결과 | 마케팅 점수 + 키워드 + 개선포인트 |
| `/login` | 통합 로그인 | 아이디(어드민)/이메일(고객) 자동 구분 |
| `/signup` | 회원가입 | 이메일 가입 + 초대 토큰 |

#### 어드민 (라이트 테마)

| 경로 | 페이지 | 데이터 |
|------|--------|--------|
| `/dashboard` | B2B KPI 대시보드 | subscriptions, clients, brand_analyses |
| `/ops/clients` | 고객 포트폴리오 | clients, subscriptions |
| `/ops/clients/[id]` | 고객 상세 (10탭) | clients + 관련 테이블 전체 |
| `/ops/contents` | 콘텐츠 관리 | contents |
| `/ops/contents/[id]` | 콘텐츠 에디터 | contents |
| `/ops/keywords` | 키워드 관리 | keywords, keyword_difficulty |
| `/ops/keywords/[id]` | 키워드 상세 | keywords, serp_results, keyword_visibility |
| `/campaigns/plan` | 캠페인 기획 | keywords, contents, jobs |
| `/ops/analytics` | 성과 분석 | daily_visibility_summary, serp_results |
| `/ops/jobs` | 작업 큐 | jobs |
| `/ops/recommendations` | 발행 추천 | publishing_recommendations |
| `/ops/accounts` | 블로그 계정 | blog_accounts, account_grades |
| `/ops/analysis-logs` | CRM 분석 로그 | brand_analyses, consultation_requests |
| `/ops/sales-agents` | 영업사원 관리 | sales_agents |
| `/ops/revenue` | 매출 관리 | subscriptions, products |
| `/ops/churn` | 이탈 관리 | clients, subscriptions |
| `/ops/onboarding` | 온보딩 관리 | clients |
| `/ops/products` | 상품 관리 | products, subscriptions |
| `/ops/error-logs` | 에러 로그 | error_logs |
| `/ops/settings` | 시스템 설정 | settings |

#### 고객 포털 (라이트 테마)

| 경로 | 페이지 | 데이터 |
|------|--------|--------|
| `/portal` | 대시보드 | keywords, contents, brand_analyses |
| `/portal/keywords` | 키워드 관리 | keywords |
| `/portal/contents` | 콘텐츠 현황 | contents |
| `/portal/reports` | 월간 리포트 | contents, keywords, keyword_visibility |
| `/portal/settings` | 설정 | users, subscriptions |

### 2-3. Server Actions (lib/actions/)

| 파일 | 핵심 함수 |
|------|----------|
| dashboard-actions.ts | getBusinessDashboardData() |
| client-portfolio-actions.ts | getClientPortfolio(), getClientDetail() |
| revenue-actions.ts | getRevenueData() |
| analytics-actions.ts | getVisibilityKpi(), getOpsSerp() |
| brand-actions.ts | getBrands(), getSelectedClientId() |
| analysis-brand-actions.ts | analyzeBrand(), getBrandAnalysisKpi() |
| content-source-actions.ts | getContentSources(), createContentSource() |
| recommendation-actions.ts | getRecommendationsList(), acceptRecommendation() |
| ops-actions.ts | getJobs(), getContents() |
| content-prompt-actions.ts | getPrompts(), updatePrompt() |
| campaign-actions.ts | getCampaigns(), createCampaignWithJob() |
| campaign-planning-actions.ts | suggestKeywordsForClient(), triggerContentGeneration() |
| keyword-actions.ts | getKeywords(), triggerClientSerpCheck(), getClientRankings() |
| keyword-expansion-actions.ts | expandNicheKeywords(), approveSuggestedKeyword() |
| keyword-strategy-actions.ts | generateKeywordStrategy() |
| content-generate-actions.ts | generateContentV2(), processContentJobs() |
| analysis-log-actions.ts | getAnalysisLogs(), updateLeadStatus() |
| settings-actions.ts | getSettings(), getScoringWeights() |
| admin-actions.ts | getAdmin() |
| auth-actions.ts | portalSignIn(), portalSignUp(), inviteUser() |
| portal-actions.ts | getPortalDashboardV2(), getPortalKeywordsV2() |
| product-actions.ts | getProducts(), createSubscription() |
| persona-actions.ts | updatePersona(), regeneratePersona() |
| report-actions.ts | generateAndSendReport(), getReportDeliveries() |
| error-log-actions.ts | logError(), getErrorLogs() |
| client-account-actions.ts | linkClientAccount(), inviteClientUser() |
| user-management-actions.ts | (사용자 관리) |

### 2-4. API Routes

| 경로 | 메서드 | 기능 |
|------|--------|------|
| `/api/analyze` | POST | 브랜드 분석 시작 |
| `/api/analyze/[id]` | GET | 분석 상태/결과 조회 |
| `/api/analyze/[id]/edit` | POST | 분석 결과 수정 |
| `/api/brand/analyze` | POST | 브랜드 분석 (내부) |
| `/api/consultation` | POST | 상담 신청 |
| `/api/cron/serp` | GET | 일일 SERP 수집 |
| `/api/cron/search-volume` | GET | 검색량 수집 |
| `/api/cron/grading` | GET | 계정 등급/난이도 산출 |
| `/api/cron/monthly-report` | GET/POST | 월간 리포트 |
| `/api/portal/report-pdf` | GET | PDF 다운로드 |

---

## 3. 통합 후 목표 구조 (SEO + AEO)

### 3-1. 서비스 플로우

```
브랜드 분석 → 프로젝트 자동 생성 → 키워드+질문 확장
→ SEO 콘텐츠 + AEO 콘텐츠 생성 → 다채널 배포
→ SERP 추적 + AI 답변 추적 → AEO Score → 피드백 루프
```

상세 플로우: MASTER_ROADMAP.md 섹션 2 참조.

### 3-2. 메뉴 구조 (IA)

```
─── SEO & AEO ───
📊 대시보드        (탭: 종합 | SEO 성과 | AEO 성과 | 진화지식)
🔑 키워드 관리     (탭: 활성 키워드 | AI 추천 | 질문 확장 | 검색량 조회)
📝 콘텐츠 관리     (탭: 콘텐츠 목록 | 새 콘텐츠 생성 | 작업 현황)
📌 발행 관리       (탭: 발행 대기 | 발행 이력 | 자동 발행 설정)
📈 성과 분석       (탭: SERP 순위 | AEO 노출 | 경쟁 분석 | Citation 분석)

─── 내부 관리 (어드민만) ───
🏢 고객 포트폴리오
🏪 브랜드 관리
🔗 온보딩
👤 계정 관리
💰 매출 관리
⚠️ 이탈 관리
📋 영업 CRM
📚 리소스

─── 설정 ───
🤖 에이전트 설정   (탭: 프롬프트 관리 | 진화지식 | 에이전트 상태)
⚙️ 시스템 설정
🚨 에러 로그
```

---

## 4. 에이전트 구조

### 4-1. 3 Squad × 14 에이전트

```
                    CTO Agent (오케스트레이터)
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Analysis         Content           Tracking
   Squad            Squad             Squad
   │                │                 │
   ├─ Keyword       ├─ SEO Writer     ├─ SERP Crawler
   ├─ Question      ├─ AEO Writer     ├─ LLM Crawler
   ├─ Competitor    ├─ QC Agent       ├─ Mention Detector
   └─ Gap Analyzer  ├─ Publisher      └─ Score Calculator
                    └─ Community Writer (홀드)
```

### 4-2. 기존 에이전트 → 신규 에이전트 매핑

| 기존 (Waide) | 신규 (통합) | 변경 |
|-------------|-----------|------|
| CMO (김이사) | CTO Agent + Gap Analyzer | 전략 → 오케스트레이션 |
| RND (김연구원) | Keyword Agent + Competitor Agent | 분석 확장 |
| COPYWRITER (박작가) | SEO Writer + AEO Writer | 유형별 분리 |
| QC (검수봇) | QC Agent | AEO 기준 추가 |
| PUBLISHER (발행팀) | Publisher | 다채널 확장 |
| Analyst | Score Calculator | AEO Score 추가 |
| - | Question Agent | 신규 |
| - | LLM Crawler | 신규 |
| - | Mention Detector | 신규 |

### 4-3. 병렬 실행 구조

```
[콘텐츠 생성 지시]
  │ CTO Agent
  ├─ [병렬 1] Analysis: Keyword + Question + Competitor
  ├─ [대기]
  ├─ [병렬 2] Content: SEO Writer + AEO Writer
  ├─ [직렬] QC Agent
  └─ [병렬 3] Tracking: SERP + LLM + Mention (배포 후)
```

---

## 5. DB 테이블 관계도

### 5-1. 기존 테이블 (26개)

```
clients (최상위 루트)
├── keywords (client_id FK)
│   ├── keyword_difficulty (keyword_id FK)
│   ├── keyword_visibility (keyword_id FK, client_id FK)
│   └── serp_results (keyword_id FK)
├── contents (client_id FK)
│   └── content_sources (client_id FK)
├── blog_accounts (client_id FK)
│   └── account_grades (account_id FK)
├── brand_analyses (client_id FK)
│   └── consultation_requests (analysis_id FK)
├── campaigns (client_id FK)
│   └── campaign_keywords (campaign_id FK, keyword_id FK)
├── jobs (client_id FK)
├── publishing_recommendations (client_id FK)
├── subscriptions (client_id FK, product_id FK)
├── users (client_id FK)
├── report_deliveries (client_id FK)
└── daily_visibility_summary (client_id FK)

products (독립)
sales_agents (독립)
admins (독립)
admin_users (독립)
invitations (독립)
settings (독립)
scoring_criteria (독립)
agent_prompts (독립)
agent_execution_logs (client_id FK)
content_prompts (독립)
content_benchmarks (keyword FK)
error_logs (client_id nullable)
```

### 5-2. 신규 예정 테이블 (Phase 3~5)

```
questions (client_id FK, keyword_id FK)        -- Phase 3: 질문 확장
llm_answers (client_id FK, question_id FK)     -- Phase 5: AI 답변 수집
mentions (client_id FK, llm_answer_id FK)      -- Phase 5: 브랜드 언급
aeo_scores (client_id FK)                      -- Phase 5: AEO Score 집계
```

### 5-3. 핵심 FK 구조

```
모든 비즈니스 데이터 → client_id FK → clients.id
콘텐츠 → account_id FK → blog_accounts.id (NOT accounts!)
구독 → product_id FK → products.id
사용자 → client_id FK → clients.id (1:N 직접 연결)
```

---

## 6. 크론 잡 목록

### 기존 크론

| 크론 | 경로 | 주기 | 내용 |
|------|------|------|------|
| SERP 수집 | `/api/cron/serp` | 매일 | 네이버+구글 순위 수집 |
| 검색량 수집 | `/api/cron/search-volume` | 분기별/수동 | 네이버 광고 API |
| 계정 등급 | `/api/cron/grading` | 수동 | 계정 등급/키워드 난이도 |
| 월간 리포트 | `/api/cron/monthly-report` | 매월 1일 | PDF 생성 + 이메일 발송 |

### 신규 예정 크론

| 크론 | 경로 | 주기 | Phase | 내용 |
|------|------|------|-------|------|
| AEO 추적 | `/api/cron/aeo` | 매일 | 5 | LLM 답변 수집 + 브랜드 추출 + AEO Score |

---

## 7. 환경변수 목록

### 필수 (앱 실행에 필요)

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 |

### 선택 (없으면 해당 기능 skip)

| 변수 | 용도 | 없을 때 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | Claude API (에이전트) | AI 에이전트 비활성 |
| `SERPER_API_KEY` | 구글 SERP | 구글 순위 추적 skip |
| `RESEND_API_KEY` | 이메일 발송 | 이메일 skip |
| `CRON_SECRET` | 크론 잡 인증 | 인증 없이 통과 |
| `SLACK_WEBHOOK_URL` | Slack 알림 | 알림 skip |
| `SLACK_ERROR_WEBHOOK_URL` | Slack 에러 알림 | SLACK_WEBHOOK_URL 폴백 |
| `NAVER_AD_API_KEY` | 네이버 광고 API | 검색량 조회 skip |
| `NAVER_AD_SECRET_KEY` | 네이버 광고 API 시크릿 | 검색량 조회 skip |
| `NAVER_AD_CUSTOMER_ID` | 네이버 광고 고객 ID | 검색량 조회 skip |
| `REPORT_FROM_EMAIL` | 리포트 발신 이메일 | 기본값 사용 |

### 신규 예정

| 변수 | 용도 | Phase |
|------|------|-------|
| `PERPLEXITY_API_KEY` | Perplexity API (AEO 추적) | 5 |

---

## 8. 마이그레이션 이력

### 실행 완료 (001~044)

| 범위 | 내용 |
|------|------|
| 001~034 | 초기 스키마 ~ 기능 추가 |
| 035~037 | scoring_weights, sales_agents, image_analysis |
| 038~039 | content_sources.tags, seo_audit, keyword_rankings |
| 040 | CRM 1단계 (lead_status, notes, contact_*) |
| 042~044 | users, invitations, products, subscriptions, clients 확장 |

### SQL 생성 완료 (045~056) — Supabase에서 실행 필요

| 번호 | 내용 |
|------|------|
| 045 | scoring_criteria 테이블 + 시딩 |
| 046 | agent_execution_logs 테이블 |
| 047 | content_benchmarks 테이블 |
| 048 | clients.brand_persona JSONB 컬럼 |
| 049 | agent_prompts 확장 |
| 050 | agent_prompts 시딩 (10개) |
| 051 | keywords 확장 (suggested, metadata, source) |
| 052 | contents.metadata JSONB 컬럼 |
| 053 | keyword_visibility에 rank_google 컬럼 |
| 054 | clients.metadata + report_deliveries 테이블 |
| 055 | admin_users CHECK 재생성 (sales 역할) |
| 056 | error_logs 테이블 |

### 신규 예정 (057+)

| 번호 | 내용 | Phase |
|------|------|-------|
| 057 | questions 테이블 | 3 |
| 058 | llm_answers 테이블 | 5 |
| 059 | mentions 테이블 | 5 |
| 060 | aeo_scores 테이블 | 5 |
| 061+ | contents 확장 (content_type) | 4 |

---

## 9. 기술 스택 요약

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16.1.6 (App Router) + React + Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes + Server Actions |
| DB | Supabase (PostgreSQL) |
| ORM | Prisma (빌드용) + Supabase Client (실제 쿼리) |
| AI | Claude API (Haiku 4.5) |
| 에이전트 | Python (LangGraph) — agents/ 폴더 |
| 크론 | Vercel Cron |
| 알림 | Slack Webhook |
| 인증 | Supabase Auth (고객) + HMAC-SHA256 (어드민) |
| PDF | @react-pdf/renderer (NotoSansKR) |
| 이메일 | Resend + @react-email/components |
| 배포 | Vercel (icn1 서울) |
| SERP | 네이버 검색 API + Serper API (구글) |
| AEO | Perplexity API (Phase 5) |
