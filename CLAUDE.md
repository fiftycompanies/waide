# Waide (AI Hospitality Aide) — 서비스 IA

> 최종 업데이트: 2026-03-01
> 버전: Phase E-3-2 완료 (구글 검색 순위 추적 — Serper API 연동)

---

## 1. 절대 규칙

1. 모든 데이터는 client_id FK로 연결. clients가 최상위 부모.
2. 브랜드 생성: clients INSERT → brand_personas INSERT (트랜잭션)
3. shadcn/UI 작업: 반드시 cd apps/web 후 실행
4. DB CHECK 제약 먼저 확인:
   - jobs.priority: 'high'/'medium'/'low' (소문자)
   - jobs.trigger_type: 'USER'/'SCHEDULER'/'AGENT' (대문자)
   - contents.publish_status: 'draft'/'review'/'approved'/'published'/'rejected'
   - clients.client_type: 'company'/'sub_client'
   - keywords.status: 'active'/'paused'/'archived'/'queued'/'refresh'/'suggested' (051 확장)
   - keywords.priority: 'critical'/'high'/'medium'/'low'
   - accounts.platform: 'naver'/'tistory'/'brunch' (소문자)
5. contents.account_id FK → blog_accounts(id) (accounts 아님!)
6. PL/pgSQL 변수명: v_ 접두어
7. HTML 테이블: Link 금지 → <tr onClick> 패턴
8. 슬랙 실패해도 파이프라인 블로킹 금지
9. 에이전트 프롬프트: agent_prompts 테이블에서 동적 로딩
10. 질문하지 말고 합리적으로 판단하여 진행. 완료 후 결과만 요약.
11. 매 작업 완료 시 이 CLAUDE.md도 함께 업데이트할 것.
12. 인증 이중 구조: 어드민=HMAC-SHA256 (admins 테이블), 고객=Supabase Auth (users 테이블). 절대 혼용 금지.
13. users.role CHECK: 'super_admin'/'admin'/'sales'/'client_owner'/'client_member'
14. subscriptions.status CHECK: 'trial'/'active'/'past_due'/'cancelled'/'expired'

---

## 2. 서비스 개요

**Waide** = AI Hospitality Aide — B2B 마케팅 자동화 SaaS
- 타겟: 숙박/음식점/카페 등 로컬 비즈니스
- 핵심 기능: 블로그 콘텐츠 자동 생성 + SEO 노출 관리 + 성과 추적
- 수익 모델: 월 구독 (콘텐츠 자동 발행 서비스)

### 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16.1.6 (App Router) + React + Tailwind CSS + shadcn/ui |
| 백엔드 | Next.js API Routes + Server Actions |
| DB | Supabase (PostgreSQL) |
| ORM | Prisma (빌드용) + Supabase Client (실제 쿼리) |
| AI | Claude API (Haiku 4.5 — 콘텐츠 생성, 이미지 분석) |
| 에이전트 | Python (LangGraph), OMC 3-티어 라우팅 |
| 크론 | Vercel Cron |
| 알림 | Slack Webhook API |
| 인증 | Supabase Auth (고객 포털) + HMAC-SHA256 (어드민) — 이중 인증 |
| 배포 | Vercel (icn1 서울, 프로덕션 배포 완료) |
| 외부 API | 네이버 검색, 광고, DataLab, 플레이스 |

### 5대 에이전트 + Analyst

| 에이전트 | 역할 | 슬랙 페르소나 |
|---------|------|-------------|
| CMO (김이사) | 캠페인 전략, 키워드 스코어링 | 👔 김이사 (전략총괄) |
| RND (김연구원) | SERP 분석, 경쟁사 리서치, AEO 시뮬레이션 | 🔬 김연구원 (데이터분석) |
| COPYWRITER (박작가) | SEO/AEO 원고 작성 (2500자+, D.I.A+) | ✍️ 박작가 (콘텐츠팀) |
| QC (검수봇) | 품질 검수 (2000자+, 7항목 비교표) | 🕵️ QC 검수봇 |
| PUBLISHER (발행팀) | 발행 준비, 계정 선택 | 🚀 발행팀 |
| Analyst | 계정 등급, 키워드 난이도, 발행 추천 매칭 | 📊 분석봇 |

---

## 3. 전체 라우트 맵

### 3-1. 퍼블릭 (Public) — 다크 테마

| 경로 | 페이지명 | 목적 | 데이터 소스 |
|------|---------|------|-----------|
| `/` | 랜딩페이지 | 분석 유도 (URL 입력) | 없음 (정적) |
| `/analysis/[id]` | 분석 결과 | 마케팅 점수 + 키워드 + 개선포인트 + CTA | `brand_analyses` |
| `/analysis/[id]/loading` | 분석 로딩 | 분석 진행 애니메이션 | polling |
| `/login` | 통합 로그인 | 단일 폼 (아이디/이메일 자동 구분) | Supabase Auth / HMAC |
| `/signup` | 고객 회원가입 | 이메일 가입 + 초대 토큰 | `users`, `invitations` |
| `/invite/[token]` | 초대 수락 | 초대 검증 → 가입 리다이렉트 | `invitations` |

### 3-2. 고객 포털 (Portal) — 라이트 테마

| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/portal` | 포털 대시보드 (KPI 4종 + 브랜드 요약 + 최근 활동 타임라인) | `keywords`, `contents`, `brand_analyses`, `clients` (brand_persona), `sales_agents` |
| `/portal/keywords` | 키워드 관리 (활성/AI추천/보관 탭 + 승인/거절) | `keywords`, `brand_analyses` (keyword_strategy) |
| `/portal/contents` | 콘텐츠 현황 (필터 + 상세보기 + QC 결과) | `contents` (metadata: qc_result, rewrite_history) |
| `/portal/reports` | 월간 리포트 (발행추이 차트 + 키워드성장 차트 + 순위현황 + AI활동) | `contents`, `keywords`, `agent_execution_logs`, `serp_results`, `brand_analyses` |
| `/portal/settings` | 설정 (프로필, 비밀번호, 구독) | `users`, `subscriptions`, `sales_agents` |

> 포털 키워드 승인/거절: `approveSuggestedKeyword()`, `rejectSuggestedKeyword()` — keyword-expansion-actions.ts
> 포털 순위 섹션: keyword_visibility 테이블 사용 (E-3-1에서 수정, serp_results는 client_id 없어 사용 불가) — SERP 크론 실행 시 자동 표시

### 3-3. 어드민 (Admin) — 라이트 테마

#### 비즈니스
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/dashboard` | B2B KPI (MRR, 고객수, 이탈률, 평균점수) + SEO 운영 현황 | `subscriptions`, `clients`, `brand_analyses`, `daily_visibility_summary`, `keywords`, `contents`, `jobs` |
| `/ops/revenue` | 매출 관리 (MRR/ARR, 플랜 분포, 트렌드, 최근 변동) | `subscriptions`, `products`, `clients` |
| `/ops/churn` | 이탈 관리 (At Risk 목록, 이탈률, 유지율) | `clients`, `subscriptions`, `brand_analyses` |

#### 고객 관리
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/clients` | 고객 포트폴리오 (카드뷰, 상태필터, At Risk 감지) | `clients`, `subscriptions`, `brand_analyses`, `sales_agents` |
| `/ops/clients/[id]` | 고객 상세 (8탭: 개요/키워드/콘텐츠/분석/순위/페르소나/구독/온보딩) | `clients`, `subscriptions`, `brand_analyses`, `keywords`, `contents`, `keyword_visibility`, `daily_visibility_summary` |
| `/ops/onboarding` | 온보딩 관리 (체크리스트, 진행률) | `clients` (onboarding_checklist JSONB) |
| `/ops/brands` | 분석된 브랜드 목록 | `brand_analyses` |
| `/ops/brands/[id]` | 마케팅 점수 + 개선포인트 | `brand_analyses` |

#### 키워드 관리
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/keywords` | 전체 키워드 + 검색량 + 난이도 | `keywords`, `keyword_difficulty` |
| `/ops/keywords/[id]` | 순위추이 + SERP + 관련 콘텐츠 | `keywords`, `serp_results`, `keyword_visibility` |

#### 콘텐츠 관리
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/contents` | 전체 콘텐츠 + QC 점수 + 상태 | `contents` |
| `/ops/contents/[id]` | 본문 보기/편집 + QC 결과 | `contents` |

#### 분석/성과
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/analytics` | 노출점유율, SERP 추이, 트렌드 | `daily_visibility_summary`, `serp_results`, `keyword_visibility` |

#### 자동화 관리
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/recommendations` | 키워드↔계정 매칭 + 수락/거절 | `publishing_recommendations`, `account_grades`, `keyword_difficulty` |
| `/ops/jobs` | 콘텐츠 생성/발행 작업 상태 | `jobs` |

#### 리소스
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/accounts` | 블로그 계정 + 등급 | `blog_accounts`, `account_grades` |
| `/ops/sources` | 소스 라이브러리 (크롤링/수동) | `content_sources` |
| `/ops/campaigns` | 키워드 그룹 캠페인 | `campaigns`, `campaign_keywords` |
| `/ops/prompts` | 콘텐츠 타입별 프롬프트 | `content_prompts` |

#### 영업/CRM
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/analysis-logs` | 분석 로그 목록 (CRM 파이프라인 + 영업사원/계정 인라인 할당) | `brand_analyses`, `sales_agents`, `clients`, `consultation_requests` |
| `/ops/analysis-logs/[id]` | 분석 상세 (4탭: 분석/SEO/키워드/활동기록) + 영업사원/계정 할당 | `brand_analyses`, `consultation_requests`, `sales_agents`, `clients` |
| `/ops/sales-agents` | 영업사원 관리 + 배포URL 추적링크 + 성과 + 성과요약 테이블 | `sales_agents`, `brand_analyses`, `consultation_requests`, `subscriptions`, `clients` |
| `/ops/products` | 상품/패키지 CRUD + 구독 수 | `products`, `subscriptions` |

#### 설정/운영
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/settings` | API키, 슬랙 연동, 기본값 | `settings` |
| `/ops/scoring-settings` | 모든 가중치 수정 | `settings` (scoring_weights JSONB) |

---

## 4. 서비스 플로우

### 4-1. 고객 유입 플로우 (퍼블릭)

```
[영업사원 링크 전송] → https://waide.kr/?ref=SALES01&place=네이버플레이스URL
  ↓ ref 쿠키 저장 (30일)
[랜딩페이지] → URL 입력 → POST /api/analyze
  ↓ 15~30초 로딩
[분석 결과] → 매장요약 | SEO진단+키워드순위 | 탭(리뷰/메뉴/이미지/점수) | 키워드 | 전략 | 개선
  ↓ CTA
[전화 상담] / [카카오톡] / [무료 상담 신청] → consultation_requests INSERT → 슬랙 알림
```

### 4-2. 데이터 수집 플로우 (자동화)

```
[Vercel Cron 매일] → /api/cron/daily-serp
  ├─ 네이버 검색 API → serp_results INSERT
  ├─ visibility 점수 → keyword_visibility INSERT
  └─ daily_visibility_summary 집계

[검색량 수집] (분기별/수동)
  ├─ 네이버 광고 API (5개 배치) → keywords.monthlySearchVolume UPDATE
  └─ DataLab 폴백
```

### 4-3. 콘텐츠 생성 플로우

```
[ANALYST] → account_grades + keyword_difficulty + publishing_recommendations
  ↓
[/ops/recommendations] → 운영자 [수락]
  ↓ acceptRecommendation()
status='accepted' + jobs INSERT (CONTENT_CREATE)
  ↓
[COPYWRITER] → 타입 결정 → 프롬프트 조회 → 소스 매칭 → AI 생성 → contents INSERT
  ↓
[QC] → 70점+ PASS → status:'ready' / 70점 미만 FAIL → 재생성
  ↓
[발행] (Phase D 미구현) → 슬랙 컨펌 → 블로그 발행
```

### 4-4. 영업사원 트래킹 + CRM 플로우

```
[/ops/sales-agents] → 등록 → ref_code 생성 → 링크 복사
  ↓
[고객 접속] → 쿠키 ref → 분석 완료 시 brand_analyses.sales_ref 연결
  ↓
[상담 신청] → consultation_requests INSERT + brand_analyses CRM 자동연동
  ├─ 연락처 자동 채움 (contact_name/phone/email)
  ├─ lead_status 'new' → 'contacted' 자동 승격
  ├─ 시스템 노트 추가
  └─ 슬랙 DM + alerts 채널 알림
  ↓
[/ops/analysis-logs] → CRM 파이프라인 관리
  ├─ lead_status 변경 (new→contacted→consulting→contracted→active→churned)
  ├─ 연락처 인라인 수정
  ├─ 코멘트 타임라인
  └─ 고객(clients) 연결
```

---

## 5. 데이터 아키텍처

### 5-1. DB 테이블 → 페이지 매핑

| 테이블 | 사용 페이지 | 주요 용도 |
|--------|-----------|----------|
| `clients` | /ops/clients, /ops/dashboard | 하위업체(고객) 관리 |
| `keywords` | /ops/keywords, /keywords, /ops/analytics, /ops/recommendations | 키워드 + 검색량 + AI 추천(suggested) + 메타데이터 |
| `serp_results` | /ops/keywords/[id], /ops/analytics | SERP 순위 (일별) |
| `keyword_visibility` | /ops/keywords/[id], /ops/analytics | 키워드별 visibility 점수 |
| `daily_visibility_summary` | /ops/dashboard, /ops/analytics | 일별 집계 (노출률, 점유율) |
| `blog_accounts` | /ops/accounts, /ops/recommendations | 블로그 계정 관리 |
| `account_grades` | /ops/accounts, /ops/recommendations | 계정 등급 (S/A/B/C) |
| `keyword_difficulty` | /ops/keywords, /ops/recommendations | 키워드 난이도 (S/A/B/C) |
| `publishing_recommendations` | /ops/recommendations | 발행 추천 (계정↔키워드 매칭) |
| `contents` | /ops/contents, /ops/jobs | 생성된 콘텐츠 |
| `content_sources` | /ops/sources | 소스 라이브러리 (크롤링/수동) |
| `content_prompts` | /ops/prompts | 콘텐츠 타입별 프롬프트 |
| `jobs` | /ops/jobs | 작업 큐 (생성/발행/분석) |
| `campaigns` | /ops/campaigns | 키워드 그룹 캠페인 |
| `campaign_keywords` | /ops/campaigns | 캠페인-키워드 매핑 |
| `brand_analyses` | /ops/brands, /analysis/[id], /ops/analysis-logs | 브랜드 분석 결과 + CRM 파이프라인 |
| `consultation_requests` | (슬랙 알림) | 상담 신청 |
| `sales_agents` | /ops/sales-agents | 영업사원 |
| `settings` | /ops/settings, /ops/scoring-settings | 설정 (API키, 가중치) |
| `admins` | 인증 | 어드민 계정 |
| `users` | /portal/settings, /login, /signup | 고객 포털 사용자 (Supabase Auth 연동) |
| `invitations` | /invite/[token], /signup | 초대 토큰 (7일 만료) |
| `products` | /ops/products | 서비스 패키지 (상품) |
| `subscriptions` | /ops/products, /portal/settings | 고객 구독 (product_id FK) |
| `scoring_criteria` | lib/scoring-engine.ts | 채점 기준 (마케팅 점수/QC 룰 기반) |
| `agent_execution_logs` | lib/agent-runner.ts | 에이전트 실행 로그 (비용/성과 추적) |
| `content_benchmarks` | lib/agent-chain.ts | 콘텐츠 벤치마크 캐시 (7일 TTL) |

### 5-2. API 라우트 맵

| API 경로 | 메서드 | 기능 |
|----------|--------|------|
| `/api/analyze` | POST | 브랜드 분석 시작 → `brand_analyses` INSERT |
| `/api/analyze/[id]` | GET | 분석 상태/결과 조회 |
| `/api/analyze/[id]/edit` | POST | 분석 결과 수정 |
| `/api/brand/analyze` | POST | 브랜드 분석 (내부) |
| `/api/consultation` | POST | 상담 신청 → `consultation_requests` INSERT + CRM 자동연동 (연락처/상태/노트) |
| `/api/cron/serp` | GET | 일일 SERP 수집 크론 |
| `/api/cron/search-volume` | GET | 검색량 수집 크론 |
| `/api/cron/grading` | GET | 계정 등급/난이도 산출 크론 |

### 5-3. Server Actions 맵 (lib/actions/)

| 파일 | 주요 함수 | DB 테이블 |
|------|----------|----------|
| `dashboard-actions.ts` | getBusinessDashboardData() | subscriptions, clients, brand_analyses, sales_agents |
| `client-portfolio-actions.ts` | getClientPortfolio(), getClientDetail(), updateOnboardingChecklist() | clients, subscriptions, brand_analyses, contents, sales_agents |
| `revenue-actions.ts` | getRevenueData() | subscriptions, products, clients |
| `analytics-actions.ts` | getVisibilityKpi(), getOpsSerp() | daily_visibility_summary, serp_results, keywords |
| `brand-actions.ts` | getBrands(), getSelectedClientId() | clients, settings |
| `analysis-brand-actions.ts` | analyzeBrand(), getBrandAnalysisKpi() | brand_analyses |
| `content-source-actions.ts` | getContentSources(), createContentSource() | content_sources |
| `recommendation-actions.ts` | getRecommendationsList(), acceptRecommendation() | publishing_recommendations, account_grades, jobs |
| `ops-actions.ts` | getJobs(), getContents() | jobs, contents, blog_accounts |
| `content-prompt-actions.ts` | getPrompts(), updatePrompt() | content_prompts |
| `url-crawl-action.ts` | crawlUrl() | (외부 fetch) |
| `blog-account-actions.ts` | getAccounts() | blog_accounts |
| `campaign-actions.ts` | getCampaigns() | campaigns, campaign_keywords |
| `keyword-actions.ts` | getKeywords(), getSerpByKeyword(), updateKeywordStatus(), triggerClientSerpCheck(), getClientRankings() | keywords, serp_results, keyword_visibility, daily_visibility_summary |
| `keyword-expansion-actions.ts` | expandNicheKeywords(), getClientMainKeywords(), approveSuggestedKeyword(), rejectSuggestedKeyword(), bulkApproveSuggestedKeywords() | keywords |
| `keyword-strategy-actions.ts` | generateKeywordStrategy(), getKeywordStrategy() | keywords, brand_analyses, clients |
| `content-generate-actions.ts` | generateContentV2(), processContentJobs() | contents, jobs, clients, content_sources, content_benchmarks |
| `analysis-log-actions.ts` | getAnalysisLogs(), getAnalysisLogDetail(), updateLeadStatus(), addAnalysisNote(), updateAnalysisContact(), linkAnalysisToClient(), getAnalysisStats(), assignSalesAgent(), assignToClient(), getClientsList() | brand_analyses, sales_agents, clients, consultation_requests |
| `settings-actions.ts` | getSettings(), getScoringWeights(), getAnalysisOptions() | settings |
| `admin-actions.ts` | getAdmin() | admins |
| `auth-actions.ts` | portalSignIn(), portalSignUp(), portalSignOut(), inviteUser(), getClientUsers(), updateUserProfile(), changeUserPassword() | users, invitations (Supabase Auth) |
| `portal-actions.ts` | getPortalDashboard(), getPortalKeywords(), getPortalContents(), getPortalReport(), getPortalSettings(), getPortalDashboardV2(), getPortalKeywordsV2(), getPortalContentsV2(), getPortalReportV2() | brand_analyses, contents, keywords, keyword_rankings, subscriptions, sales_agents, clients, agent_execution_logs, serp_results |
| `product-actions.ts` | getProducts(), createProduct(), updateProduct(), deleteProduct(), createSubscription(), updateSubscription(), cancelSubscription(), getClientSubscription() | products, subscriptions, clients |
| `persona-actions.ts` | updatePersona(), addManualStrength(), removeManualStrength(), regeneratePersona(), getPersona() | clients (brand_persona JSONB) |

### 5-4. AI 인프라 (lib/)

| 파일 | 주요 함수/역할 | 의존 테이블 |
|------|-------------|-----------|
| `agent-runner.ts` | runAgent() — 에이전트 공통 실행 엔진 (프롬프트 로딩 → 템플릿 치환 → Claude API → 로그 저장) | agent_prompts, agent_execution_logs |
| `agent-chain.ts` | runAgentChain() — 에이전트 체이닝 헬퍼 (이전 결과 → 다음 context 주입) | agent_execution_logs |
| `scoring-engine.ts` | loadCriteria(), scoreItem(), calculateMarketingScoreFromCriteria() — 채점 기준 테이블 기반 점수 산출 | scoring_criteria |
| `competitor-collector.ts` | collectCompetitors() — 네이버 로컬 검색 API 경쟁사 TOP5 수집 | (외부 API) |
| `analysis-agent-chain.ts` | runAnalysisAgentChain() — 분석 후 4단계 에이전트 체인 (경쟁사→페르소나→SEO코멘트→개선플랜) | brand_analyses, clients |
| `naver-suggest-collector.ts` | collectNaverSuggestions(), extractPlaceFeatureKeywords() — 네이버 자동완성/연관검색어 수집 + 매장 특성 키워드 추출 | (외부 API) |
| `content-benchmark.ts` | getBenchmark(), generateBenchmark() — 상위노출 글 TOP5 수집 + RND 벤치마킹 + 7일 캐시 | content_benchmarks, (외부 API) |
| `content-pipeline-v2.ts` | createContentV2() — 벤치마크+페르소나+중복회피+AEO 기반 콘텐츠 생성 | clients, contents, content_sources, brand_analyses |
| `content-qc-v2.ts` | runQcV2() — 8항목 100점 검수 (AEO 15점 포함) + 벤치마크 비교 + metadata 저장 | contents, clients, content_benchmarks |
| `content-rewrite-loop.ts` | runRewriteLoop() — QC FAIL 시 최대 2회 재작성 + metadata.rewrite_history 기록 | contents, clients |
| `google-serp-api.ts` | searchGoogle(), findGoogleRank() — Serper API 구글 검색 순위 조회 (SERPER_API_KEY 없으면 skip) | (외부 API) |
| `google-serp-collector.ts` | collectGoogleSerpForKeyword(), collectGoogleSerpAll() — 구글 SERP 수집 + DB 저장 | keywords, keyword_visibility |

---

## 6. 점수 체계

### 6-1. 마케팅 종합 점수 (100점) — brand_analyses

| 영역 | 배점 | 상태 |
|------|------|------|
| 네이버 리뷰/평판 | 20 | 구현 |
| 네이버 키워드 노출 | 25 (플레이스 15 + 블로그 10) | 구현 |
| 구글 키워드 노출 | 15 | 미구현 |
| 이미지 품질 | 10 | Vision AI 구현 |
| 온라인 채널 완성도 | 15 | 구현 |
| SEO/AEO 준비도 | 15 | 구현 |

> 네이버 키워드 노출 세부:
> - 플레이스(로컬) 15점: keyword_rankings 1위→100, ~3→95, ~5→85, ~10→70, ~20→40, ~50→10, 평균 환산
> - 블로그 10점: 메인 키워드 블로그 검색 TOP3→10, ~10→7, ~30→4, 미노출→0

### 6-2. 계정 등급 (100점) — account_grades

- 검색량 가중 노출 50% + 노출률 30% + 콘텐츠 보유량 20%
- 등급: S(80+), A(60+), B(40+), C(나머지)

### 6-3. 키워드 난이도 (100점) — keyword_difficulty

- 검색량 규모 40% + 경쟁도(compIdx) 30% + SERP 상위 점유 30%
- 등급: S(80+), A(60+), B(40+), C(나머지)

### 6-4. 발행 추천 매칭 — publishing_recommendations

1. 차단: 이미 노출 중인 계정/최근 7일 동일 키워드 발행 계정 제외
2. 점수: 등급매칭(35%) + 발행이력(25%) + 키워드관련성(25%) + 검색량가중(15%)

### 6-5. QC 검수 (100점)

- 글자수(20) + 해요체(15) + 키워드밀도(15) + H2구조(10) + 이미지(10) + 금지표현(10) + 비교표(10) + CTA(5) + 해시태그(5)
- FAIL: 70점 미만 또는 해요체 60% 미만

### 핵심 알고리즘 공식

- 노출 점유율: max(0, (21-rank)/20×100), 가중 = Σ(점수×검색량)/Σ(100×검색량)×100%
- 계정 등급: exposure_rate×35 + rank_quality×35 + consistency×20 + volume_bonus×10
- 키워드 난이도: search_demand×30 + competition×40 + exposure_gap×30
- 발행 매칭: 100 - |grade차이|×25 + 보너스(최대+30) - 페널티(최대-50)

---

## 7. 외부 API 의존성

| API | 용도 | 비용 |
|-----|------|------|
| 네이버 검색 API (`/v1/search/blog`) | SERP 순위 수집 | 무료 (25,000/일) |
| 네이버 광고 API (키워드도구) | 검색량 조회 | 무료 |
| 네이버 DataLab API | 검색 트렌드 폴백 | 무료 |
| 네이버 플레이스 GraphQL API (`pcmap-api.place.naver.com/graphql`) | 매장 정보 + 리뷰 수집 | 무료 |
| 네이버 로컬 검색 API (`/v1/search/local`) | 키워드 순위 체크 (50위) | 무료 (25,000/일) |
| Claude API (Haiku 4.5) | 콘텐츠 생성 + 이미지 분석 + 대표사진 진단 | ~40원/콘텐츠, ~100원/이미지분석 |
| Serper API (`google.serper.dev/search`) | 구글 검색 순위 조회 | 월 2,500건 무료 |
| Slack API (Webhook) | 알림 발송 | 무료 |

---

## 8. 구현 상태

### 완료

- Phase 1: 기반 구축 (DB, 셀렉터, 사이드바, N_SERP, Analytics, Tavily, Slack)
- Phase 2-A~F: DB 스키마 보완, 에이전트 강화, 프롬프트 동적 로딩, 풀사이클 파이프라인
- Phase 3-1~12: 어드민 시스템, 브랜드 CRUD, URL 크롤링, SERP 스케줄러, CSV 대량등록, 실데이터 마이그레이션, 노출 점유율, 대시보드 개편, 계정-키워드 매칭, 전체 브랜드 모드, 네이버 검색광고 API
- Phase C: 영업사원 추적 (ref + 슬랙 DM + 성과), 이미지 분석 (Vision AI), 점수 가중치 어드민 설정
- 발행추천 수락 → Job 자동 생성 (acceptRecommendation)
- 소스 라이브러리 CRUD (content_sources.tags 수정 완료)
- 빈 데이터 UI 처리 (KPI "--", SERP "누적 중", 추천 "ANALYST 실행 필요")
- 랜딩 카피 변경 (무료 플레이스 점검 + 홈페이지 제작 이벤트)
- SEO 결격 사유 진단 (7항목: 리뷰답글률/대표사진/키워드밀도/영업시간/메뉴/편의시설/SNS)
- 키워드 순위 체크 (네이버 로컬 검색 API, TOP 3, 50위까지)
- 분석결과 전문가 진단 2-카드 UI (SEO 진단 + 키워드 순위)
- 이미지 수집 버그 수정 (origin 필드 미인식 + Photo API 404 → pcmap HTML 파싱)
- parseUrl 버그 수정 (place.naver.com URL 패턴 누락)
- 분석 로그 CRM 1단계 (lead_status 파이프라인, 연락처, 코멘트 JSONB, 상세 5탭, 상담 자동연동, 사이드바 영업/CRM 섹션)
- 분석 캐시 제거 (같은 URL도 매번 새 분석, 영업사원별 독립 레코드)
- 이미지 수집 강화 (origin 우선, 모바일 home 폴백, 수집/분석 분리, collection_failed 상태 추적)
- 마케팅 점수 키워드 노출 개선 (25점 = 플레이스 15 + 블로그 10, keyword_rankings 연동, 점수 산출 순서 재배치)
- 플레이스 데이터 수집 GraphQL 전환 (Summary API deprecated → pcmap-api GraphQL, 리뷰/메뉴/영업시간/편의시설/이미지/블로그리뷰 정상 수집)
- Vercel 배포 준비 (vercel.json icn1 리전, next.config images.remotePatterns, baseUrl 연산자우선순위 수정, DEPLOY.md 가이드)
- CRM 2단계: 영업사원 인라인 할당 (목록/상세), 브랜드 계정 할당 (목록/상세), 활동기록 탭 통합 (상담이력+코멘트→타임라인), 상태변경 시스템 노트 자동 기록
- 플레이스 순위 점수 상향 (TOP10 70%, TOP3 95%, 1위 100%)
- SNS/채널 미연동 시 블로그/홈페이지 제작 유도 CTA (분석 결과 페이지)
- 영업사원 배포 URL 기반 링크 생성 + 복사 버튼 (sales-agents 테이블)
- 분석 결과 링크 복사 버튼 (analysis-logs 상세)
- Phase E-1: 인증 시스템 + 고객 포털 + 상품관리
  - 이중 인증: Supabase Auth (고객 포털) + HMAC-SHA256 (어드민) — middleware 이중 검증
  - 통합 로그인 (고객/어드민 탭 전환), 회원가입, 초대 페이지
  - 고객 포털 5페이지 (대시보드, 키워드, 콘텐츠, 리포트, 설정) — 모바일 하단탭 지원
  - 상품 관리 CRUD + 구독 관리 (products/subscriptions 테이블)
  - DB: users, invitations, products, subscriptions 테이블 + clients 확장 (042~044)
  - lib/auth.ts: getCurrentUser(), hasRole(), isAdmin(), isClient() 헬퍼
  - portal-actions.ts: 포털 데이터 5개 액션 (dashboard/keywords/contents/report/settings)
- Phase E-2: B2B 대시보드 개편 + 고객 포트폴리오 + 매출/이탈/온보딩
  - 대시보드 B2B KPI 섹션 (MRR, Active 고객수, 이탈률, 평균 마케팅점수, 상태 분포, 월간 목표, At Risk 알림, 영업 성과)
  - 고객 포트폴리오 카드뷰 (/ops/clients) — 상태필터(Active/Onboarding/At Risk/Churned), 검색, 정렬
  - 고객 상세 7탭 (/ops/clients/[id]) — 개요/키워드/콘텐츠/분석이력/페르소나/구독/온보딩
  - 매출 페이지 (/ops/revenue) — MRR/ARR, 플랜 분포, 6개월 트렌드, 최근 변동
  - 이탈 관리 (/ops/churn) — At Risk 목록, 심각도(high/medium), 이탈률/유지율
  - 온보딩 관리 (/ops/onboarding) — 7항목 체크리스트, 진행률, 클라이언트별 관리
  - 사이드바 7그룹 재편 (비즈니스/고객관리/SEO운영/콘텐츠/영업CRM/리소스/설정)
  - 영업사원 성과 테이블 (담당고객/Active/신규계약/MRR기여/At Risk)
  - Server Actions: dashboard-actions.ts, client-portfolio-actions.ts, revenue-actions.ts
  - At Risk 자동감지: 점수하락≥15, 포털 미접속≥30일, 계약만료≤30일, 키워드하락≥50%
- Vercel 프로덕션 배포 + 인증 버그픽스 (2026-02-27)
  - Vercel 배포 URL: https://web-five-gold-12.vercel.app
  - clients.brand_name → name 별칭 (PostgREST `brand_name:name`) 17개 파일 수정
  - 통합 로그인: 탭 제거, 단일 폼 (아이디=어드민, 이메일=고객 자동 구분)
  - 어드민↔포털 리디렉트 루프 방지 (middleware 크로스 인증 차단)
  - 회원가입 updated_at NOT NULL 에러 수정 (created_at/updated_at/full_name 추가)
  - portal↔login 리디렉트 루프 수정 (client_id 없는 사용자 인라인 대기 페이지)
  - 서버 컴포넌트에서 signOut 쿠키 삭제 불가 → PortalPendingPage 클라이언트 컴포넌트 대체
  - DB: subscriptions에 product_id/mrr/expires_at 등 6컬럼 수동 추가 (043 IF NOT EXISTS 문제)
  - DB: clients에 onboarding_checklist(JSONB)/contact_name(TEXT) 컬럼 수동 추가
  - 테스트 데이터: products 2건, users 2건, subscriptions 3건 (MRR ₩750,000)
- Phase F-1: AI 인프라 — 에이전트 실행 엔진 + 기준 테이블 (2026-02-28)
  - DB 마이그레이션 6개 (045~050): scoring_criteria, agent_execution_logs, content_benchmarks, clients.brand_persona, agent_prompts 확장, 프롬프트 시딩
  - lib/agent-runner.ts: 에이전트 공통 실행 엔진 (프롬프트 로딩 → {{variable}} 치환 → Claude API → 로그 저장 → 비용 추적)
  - lib/agent-chain.ts: 에이전트 체이닝 헬퍼 (순차 실행, 이전 결과 → 다음 context 주입)
  - lib/scoring-engine.ts: scoring_criteria 테이블 기반 채점 엔진 (기존 하드코딩 폴백 유지)
  - place-analyzer.ts: calculateMarketingScore()에 scoring-engine 연동 (try → 폴백)
  - agent_prompts 10개 시딩 (CMO 3, RND 3, COPYWRITER 2, QC 1, ANALYST 0 — 기존 유지)
  - clients.brand_persona JSONB 컬럼 추가 (CMO가 생성한 페르소나 저장)
- Phase F-2: 분석 고도화 — 경쟁사 분석 + 페르소나 + SEO 코멘트 + 개선포인트 (2026-02-28)
  - lib/competitor-collector.ts: 네이버 로컬 검색 API 경쟁사 TOP5 수집 (checkKeywordRankings 패턴 재사용)
  - lib/analysis-agent-chain.ts: 분석 후 4단계 에이전트 체인 (RND 경쟁사→CMO 페르소나→CMO SEO코멘트→CMO 개선플랜)
  - place-analyzer.ts: runFullAnalysis()에 에이전트 체인 연동 (DB 저장 후, 슬랙 알림 전)
  - 분석 결과 페이지 3개 신규 섹션: 경쟁사 비교 분석, AI SEO 진단 코멘트, 개선 액션플랜 (조건부 렌더링)
  - lib/actions/persona-actions.ts: 페르소나 CRUD (updatePersona, addManualStrength, removeManualStrength, regeneratePersona)
  - 어드민 클라이언트 상세 7탭 (/ops/clients/[id]): 기존 6탭 + 페르소나 탭 (표시/수정/강점관리/재생성)
  - 고객 포털 대시보드: 브랜드 한줄 정리 (one_liner), AI 개선 제안 (improvement_plan), SEO 진단 코멘트
  - portal-actions.ts: getPortalDashboard()에 brand_persona + analysis_result AI 해석 데이터 추가
  - analysis_result JSONB에 에이전트 결과 spread 저장 (competitor_analysis, seo_comments, improvement_plan)
  - 모든 에이전트 관련 기능: ANTHROPIC_API_KEY 미설정 시 graceful skip, 기존 분석 영향 없음
- Phase F-3: 키워드 고도화 — 니치 키워드 확장 + 공략 전략 (2026-02-28)
  - lib/naver-suggest-collector.ts: 네이버 자동완성 API + 연관검색어 HTML 파싱 + 매장 특성 키워드 추출
  - scripts/migrations/051_keywords_extension.sql: keywords 테이블 확장 (status에 'suggested' 추가, metadata JSONB, source TEXT)
  - lib/actions/keyword-expansion-actions.ts: 니치 키워드 확장 (네이버 수집 → RND 에이전트 → keywords 저장 + 승인/거절/일괄승인)
  - lib/actions/keyword-strategy-actions.ts: CMO 키워드 공략 전략 (Quick Win/니치/방어 분류 + 월간 로드맵 → analysis_result JSONB 저장)
  - components/keywords/keyword-strategy-section.tsx: 키워드 전략 UI (발굴+전략 버튼, 3열 카드, 로드맵)
  - keywords-client.tsx: AI 추천 탭 (suggested 상태 필터, 승인/거절 버튼, 일괄 승인, content_angle 표시)
  - /keywords 페이지: 전략 섹션 추가 (KeywordStrategySection 컴포넌트)
  - /portal/keywords: 키워드 전략 요약 카드 (Quick Win/니치/방어)
  - portal-actions.ts: getPortalKeywords()에 analysis_result.keyword_strategy 연동
  - recommendation-actions.ts: 발행 추천 전략 연동 TODO (Phase F-3 연계)
  - GSC 키워드 자동 발견 구조 TODO 유지 (Phase E-3 예정)
- Phase F-4: 콘텐츠 품질 고도화 — 벤치마킹 + 작성 v2 + QC v2 + 재작성 루프 (2026-02-28)
  - lib/content-benchmark.ts: 네이버 블로그 검색 TOP5 수집 → RND 벤치마킹 → content_benchmarks 7일 캐시
  - lib/content-pipeline-v2.ts: 벤치마크+페르소나+중복회피+AEO 기반 COPYWRITER v2 콘텐츠 생성
  - lib/content-qc-v2.ts: QC v2 8항목 100점 검수 (AEO 15점 포함, 벤치마크 비교, 중복 체크)
  - lib/content-rewrite-loop.ts: QC FAIL → COPYWRITER 재작성 → 재검수 루프 (최대 2회)
  - lib/actions/content-generate-actions.ts: 통합 함수 generateContentV2() + Job 처리 processContentJobs()
  - contents.metadata JSONB 컬럼 추가 (052 마이그레이션): qc_score, qc_pass, qc_result, rewrite_history 저장
  - 콘텐츠 상세 페이지: QC v2 결과 섹션 (항목별 점수, 벤치마크 비교, 재작성 이력, 확장/축소)
  - 콘텐츠 목록 페이지: QC 점수 컬럼 추가
  - Content 인터페이스에 metadata 필드 추가
  - 파이프라인 흐름: RND 벤치마킹 → COPYWRITER v2 → QC v2 → FAIL 시 재작성(최대2회) → PASS/수동검토
- Phase INT-1: SQL 마이그레이션 점검 + F1~F4 통합 가동 검증 (2026-02-28)
  - scripts/migrations/run_all_f1_f4.sql: 045~052 통합 멱등 마이그레이션 (BEGIN~COMMIT 트랜잭션)
  - 050 버그 수정: UNIQUE(agent_type, task) 제약 추가 + 10개 INSERT에 ON CONFLICT DO UPDATE 적용
  - 051 버그 수정: keywords 전용 constraint 드롭 (pg_constraint + pg_class 조인, 다른 테이블 영향 방지)
  - scripts/test-integration.ts: 통합 검증 스크립트 (dry-run/live 모드, 5 시나리오)
  - 환경변수 감사: ANTHROPIC_API_KEY graceful skip 검증 완료 (모든 F1-F4 entry point)
  - TypeScript 빌드 검증: tsc --noEmit 0 에러
- Phase P-1: 포털 MVP — 고객용 핵심 4화면 (2026-03-01)
  - /portal 대시보드 고도화: KPI 4종 (활성키워드/이번달콘텐츠/AI추천대기/평균QC점수) + 브랜드 요약 + 최근 활동 타임라인
  - /portal/keywords 키워드 관리 고도화: 3탭(활성/AI추천/보관) + 승인/거절 버튼 + 키워드 전략 섹션
  - /portal/contents 콘텐츠 현황 고도화: 상태 필터 5종 + 상세 보기 (본문 미리보기 + QC 검수 결과 + 재작성 이력)
  - /portal/reports 월간 리포트 고도화: 월 선택기 + 요약 카드 3종 + 콘텐츠 발행 추이 Bar 차트 + 키워드 성장 Line 차트 + 순위 현황 + AI 활동 로그
  - portal-actions.ts: V2 서버 액션 4개 추가 (getPortalDashboardV2, getPortalKeywordsV2, getPortalContentsV2, getPortalReportV2)
  - portal-shell.tsx: 네비게이션 라벨 업데이트 (키워드 관리/콘텐츠 현황/월간 리포트)
  - 기존 V1 함수 하위 호환 유지 — 기존 코드 동작 영향 없음
  - 순위 섹션: serp_results 데이터 있으면 표시, 없으면 "순위 추적 준비 중" — E-3 SERP 추적 구현 후 자동 활성화
  - TypeScript 빌드 검증: tsc --noEmit 0 에러
- Phase E-3-1: SERP 추적 검증 + 포털 연결 (2026-03-01)
  - SERP 인프라 전체 감사: serp-collector.ts, naver-search-api.ts, cron/serp, keyword-actions.ts 점검 완료
  - 포털 리포트 순위 데이터 버그 수정: getPortalReportV2()가 serp_results(client_id 없음) 대신 keyword_visibility(client_id 보유) 테이블 사용하도록 수정
  - keyword_visibility → keywords 테이블 조인으로 키워드명 매핑 추가
  - triggerClientSerpCheck(clientId): 고객사별 SERP 수집 서버 액션 추가 (collectSerpAll(clientId) 래핑)
  - getClientRankings(clientId): 고객사 순위 현황 조회 서버 액션 추가 (keywords + daily_visibility_summary 통합)
  - 어드민 클라이언트 상세 (/ops/clients/[id]): "순위" 탭 추가 (8탭 → 개요/키워드/콘텐츠/분석이력/순위/페르소나/구독/온보딩)
  - 순위 탭: 요약 카드 4종 (노출키워드/노출률/TOP3·10/평균순위) + 순위 테이블 + [순위 체크 실행] 버튼
  - TypeScript 빌드 검증: tsc --noEmit 0 에러
- Phase E-3-2: 구글 검색 순위 추적 — Serper API 연동 (2026-03-01)
  - lib/google-serp-api.ts: Serper API 래퍼 (searchGoogle, findGoogleRank) — SERPER_API_KEY 없으면 graceful skip
  - lib/google-serp-collector.ts: 구글 SERP 수집 모듈 (collectGoogleSerpForKeyword, collectGoogleSerpAll)
  - triggerClientSerpCheck(): 네이버 + 구글 병렬 수집 (Promise.allSettled, 한쪽 실패해도 다른 쪽 진행)
  - ClientRanking 인터페이스: rank_google 필드 추가
  - getClientRankings(): current_rank_google 포함하여 반환
  - 어드민 순위 탭: 네이버 | 구글 | 검색량 | 수집일 컬럼 구성 (기존 PC/MO 대신 네이버/구글 병렬)
  - 포털 월간 리포트: 순위 테이블에 네이버/구글 컬럼 추가 (rank_google 포함)
  - getPortalReportV2(): keyword_visibility.rank_google + keywords.current_rank_google 폴백
  - 구글 순위 저장: keywords.current_rank_google (기존 컬럼) + keyword_visibility.rank_google (053 마이그레이션)
  - scripts/migrations/053_keyword_visibility_google.sql: rank_google, visibility_score_google 컬럼 추가
  - 환경변수: SERPER_API_KEY (Serper.dev API 키)
  - SERP 추적 현황: 네이버 ✅ / 구글 ✅ / GSC 예정 / AEO 예정
  - TypeScript 빌드 검증: tsc --noEmit 0 에러

### 설계 원칙

1. **점수 = 룰 기반 고정** — 마케팅 점수(100점), 계정 등급, 키워드 난이도는 모두 Python/SQL 규칙 기반. AI는 해석·코멘트만 생성.
2. **프롬프트 = agent_prompts 테이블 동적 로딩** — 에이전트 프롬프트는 코드에 하드코딩 금지. DB에서 런타임 로딩.
3. **브랜드 페르소나 = 모든 후속 작업의 기반** — brand_personas 레코드가 CMO 전략 → COPYWRITER 톤앤매너 → QC 기준에 일관되게 적용.

### 에이전트 프롬프트 목록 (agent_prompts 테이블)

#### 기존 프롬프트 (Phase 2 시딩)

| # | agent | task | 설명 |
|---|-------|------|------|
| 1 | CMO | campaign_strategy | 캠페인 전략 수립 (STP 포지셔닝, 키워드 선정) |
| 2 | CMO | keyword_scoring | 키워드 스코어링 (검색량/경쟁도/관련성 평가) |
| 3 | RND | serp_analysis | SERP 분석 (상위 콘텐츠 패턴, 경쟁사 리서치) |
| 4 | RND | deep_research | 딥리서치 (Tavily 웹검색 + 팩트 발굴) |
| 5 | COPYWRITER | blog_list | 추천형(list) 블로그 콘텐츠 (비교표+해시태그) |
| 6 | COPYWRITER | blog_review | 리뷰형(review) 블로그 콘텐츠 (시간순 경험+별점) |
| 7 | COPYWRITER | blog_info | 정보형(info) 블로그 콘텐츠 (체크리스트+요약표) |
| 8 | QC | quality_check | 품질 검수 (9항목 100점, 해요체/키워드밀도/금지표현) |
| 9 | ANALYST | account_grading | 계정 등급 산출 (S/A/B/C, 노출률+검색량 가중) |
| 10 | ANALYST | keyword_difficulty | 키워드 난이도 산출 (S/A/B/C, 검색량+경쟁도+SERP 점유) |

#### Phase F-1 신규 프롬프트 (050 시딩)

| # | agent | task | 설명 | 실행 엔진 |
|---|-------|------|------|---------|
| 11 | CMO | brand_persona | 브랜드 페르소나 생성 (플레이스 데이터 → 13항목 JSON) | agent-runner.ts |
| 12 | RND | competitor_analysis | 경쟁사 TOP5 비교 분석 (SERP 기반) | agent-runner.ts |
| 13 | CMO | seo_diagnosis_comment | SEO 진단 업종 맞춤 코멘트 (7항목 해석) | agent-runner.ts |
| 14 | CMO | improvement_plan | 개선포인트 전략 액션플랜 (1주/1개월/3개월 로드맵) | agent-runner.ts |
| 15 | CMO | keyword_strategy | 키워드 공략 전략 (단기/중기/장기 분류) | agent-runner.ts |
| 16 | RND | niche_keyword_expansion | 니치 키워드 확장 (롱테일+시즌+질문형) | agent-runner.ts |
| 17 | RND | content_benchmark | 상위노출 글 벤치마킹 (패턴분석 → COPYWRITER 브리프) | agent-runner.ts |
| 18 | COPYWRITER | content_create_v2 | 벤치마크 기반 콘텐츠 작성 (해요체+AEO+비교표) | agent-runner.ts |
| 19 | COPYWRITER | content_rewrite | QC 피드백 반영 재작성 | agent-runner.ts |
| 20 | QC | qc_review_v2 | 상세 검수 9항목 100점 + AEO + 자연스러움 | agent-runner.ts |

### 다음 작업: Phase F (AI 고도화)

| 순서 | Phase | 핵심 내용 | 상태 |
|------|-------|----------|------|
| 1 | **F-1** | AI 인프라 — 에이전트 실행 엔진 + 기준 테이블 + 프롬프트 시딩 | ✅ 완료 |
| 2 | **F-2** | 분석 고도화 — 경쟁사 분석 + 페르소나 + SEO 코멘트 + 개선포인트 | ✅ 완료 |
| 3 | **F-3** | 키워드 고도화 — 니치 키워드 확장 + 공략 전략 + 키워드 UI 개편 | ✅ 완료 |
| 4 | **F-4** | 콘텐츠 품질 고도화 — 벤치마킹 + 작성 v2 + QC v2 + 재작성 루프 | ✅ 완료 |

### 미구현 (우선순위 순)

| # | 기능 | 우선순위 |
|---|------|---------|
| 1 | **Phase D: 자동 발행 관리** (슬랙 컨펌 → 블로그 발행) | 높음 (다음) |
| 3 | **Vercel 도메인 연결** (커스텀 도메인 + SSL) | 높음 |
| 4 | **AEO 기능** (AI 인용률 — ChatGPT/Gemini 브랜드 언급 체크) | 중간 |
| 5 | **구글 상위노출** (마케팅점수 15점 자리 비어있음) | 중간 |
| 6 | **홈페이지 SEO/AEO 분석** (크롤링 → meta/schema/heading) | 중간 |
| 7 | **검색량 트렌드 차트** (DataLab 12개월) | 낮음 |
| 8 | **소셜 로그인** (카카오/구글/네이버 OAuth) | 낮음 |
| 9 | **소스 매칭 AI** (규칙 기반 → AI 업그레이드) | 나중 |

---

## 9. 핵심 ID / 환경변수

- Workspace: 2d716b35-407e-45bf-8941-60bce627d249
- 캠핏 client_id: d9af5297-de7c-4353-96ea-78ba0bb59f0c
- 어드민: admin / admin1234
- **Vercel 배포 URL**: https://web-five-gold-12.vercel.app (프로덕션)
- **Vercel 프로젝트**: fiftycompanies-projects/web, 리전: icn1 (서울)
- agents/.env: NSERP_EC2_URL, NSERP_EC2_SECRET, SUPABASE_URL/KEY, ANTHROPIC_API_KEY, SLACK_BOT_TOKEN, TAVILY_API_KEY
- apps/web/.env.local: SUPABASE URLs, NAVER_AD_API_KEY/SECRET_KEY/CUSTOMER_ID, ANTHROPIC_API_KEY, SERPER_API_KEY
- 배포 가이드: `apps/web/DEPLOY.md` (환경변수 전체 목록 + 배포 절차)
- 현재 실데이터: 키워드 174개, 콘텐츠 174건, 블로그 계정 4개, SERP 레코드 417건

---

## 10. 마이그레이션 현황

| 범위 | 내용 | 상태 |
|------|------|------|
| 001~034 | 초기 ~ 기능 추가 | 실행 완료 |
| 035 | scoring_weights JSONB | 확인 필요 |
| 036 | sales_agents 테이블 | 확인 필요 |
| 037 | brand_analyses.image_analysis JSONB | 확인 필요 |
| 038 | content_sources.tags 컬럼 추가 | 실행 완료 |
| 039 | brand_analyses.seo_audit + keyword_rankings JSONB | 실행 완료 |
| 040 | CRM 1단계: lead_status, notes JSONB, contact_*, last_activity_at | 실행 완료 |
| 042 | users 테이블 (Supabase Auth 연동) + invitations 테이블 | 실행 완료 |
| 043 | products + subscriptions 테이블 (IF NOT EXISTS → 컬럼 수동 추가) | 실행 완료 |
| 044 | clients 확장 (subscription_id, onboarding_status, health_score 등) | 실행 완료 |
| 045 | scoring_criteria 테이블 + 시딩 (마케팅 점수/QC 채점 기준 룰) | **SQL 생성 완료** |
| 046 | agent_execution_logs 테이블 (에이전트 실행 로그 + 비용 추적) | **SQL 생성 완료** |
| 047 | content_benchmarks 테이블 (벤치마크 캐시, 7일 TTL) | **SQL 생성 완료** |
| 048 | clients.brand_persona JSONB + persona_updated_at 컬럼 추가 | **SQL 생성 완료** |
| 049 | agent_prompts 확장 (task, system_prompt, model, temperature, max_tokens, output_schema, metadata) | **SQL 생성 완료** |
| 050 | agent_prompts 시딩 (10개 프롬프트: CMO 3, RND 3, COPYWRITER 2, QC 1) | **SQL 생성 완료** (★ ON CONFLICT 수정) |
| 051 | keywords 확장 (status CHECK에 'suggested' 추가, metadata JSONB, source TEXT) | **SQL 생성 완료** (★ pg_constraint 수정) |
| 052 | contents.metadata JSONB 컬럼 추가 (QC v2 결과, 재작성 이력 저장) | **SQL 생성 완료** |
| INT-1 | 045~052 통합 멱등 마이그레이션 (run_all_f1_f4.sql) | **SQL 생성 완료** |

> ⚠️ 045~052: scripts/migrations/ 디렉토리에 SQL 파일 생성. Supabase Dashboard에서 `run_all_f1_f4.sql` 실행 권장.

---

## 11. 반복 에러 패턴

- `violates check constraint` → CHECK 제약 먼저 확인 (섹션 1 참조)
- shadcn 설치 실패 → cd apps/web 후 실행
- brand_personas만 생성 → clients INSERT 누락 → 트랜잭션
- Hydration error → <tr onClick> 패턴, Radix UI SSR ID 불일치 → `dynamic(() => import(...), { ssr: false })` 사용
- contents.account_id FK → blog_accounts 참조
- SQL 변수명 충돌 → v_ 접두어
- bcrypt 해시 불일치 → bcryptjs로 통일
- `column X does not exist` → DB 마이그레이션 실행 확인
- supabase-py v2: `.not_("col", "is", None)` 에러 → `.filter("col", "not.is", "null")` 사용
- Prisma vs Supabase 불일치 → Prisma는 빌드용, 실제 쿼리는 Supabase Client
- 네이버 Summary API (`/p/api/place/summary/`) deprecated — 모든 필드 null 반환 → GraphQL API 사용 필수
- 네이버 플레이스 GraphQL: `pcmap-api.place.naver.com/graphql`, Origin: `m.place.naver.com`, `checkRedirect: false` 필수
- GraphQL 필드명: `visitorReviewsTotal`(리뷰수), `microReviews`(설명), `conveniences`(편의시설), `newBusinessHours`(영업시간), `fsasReviews`(블로그리뷰)
- Photo API (`/p/api/place/photo/`) 404 → pcmap HTML 파싱 폴백 → 모바일 home 페이지 최종 폴백
- parseUrl: `place.naver.com` URL 패턴 인식 안 됨 → 조건에 `place.naver.com` 추가 필수
- 이미지 phinf URL 추출: `ldb-phinf`뿐 아니라 `[a-z-]*phinf.pstatic.net` 패턴 사용
- 분석 캐시: `/api/analyze`와 `runFullAnalysis` 양쪽에서 dedup 제거 필수 (영업사원별 독립 분석)
- 이중 인증 미들웨어: 어드민 라우트는 HMAC 우선 → Supabase Auth 폴백, 포털 라우트는 Supabase Auth 전용
- 포털 데이터 전달: PortalShell에서 hidden meta 태그로 clientId/userId → 자식 클라이언트 컴포넌트에서 DOM 쿼리
- @supabase/ssr 사용 (NOT @supabase/auth-helpers-nextjs — deprecated)
- 로그인 라우트 충돌: `app/login/` (기존) vs `app/(public)/login/` → 기존 파일 삭제 완료
- 서버 컴포넌트에서 `supabase.auth.signOut()` → 쿠키 삭제 불가 (setAll이 try-catch에 잡힘) → 클라이언트 컴포넌트에서 처리 필수
- Portal↔Login 리디렉트 루프: client_id 없는 Supabase 사용자 → portal layout에서 redirect 금지, 인라인 대기 페이지 렌더링
- middleware에서 error 파라미터 있으면 Supabase 세션 리디렉트 건너뜀 (루프 방지)
- CREATE TABLE IF NOT EXISTS 함정: 테이블이 이미 존재하면 새 컬럼 무시됨 → ALTER TABLE ADD COLUMN IF NOT EXISTS로 수동 추가
- serp_results 테이블에는 client_id 컬럼 없음! content_id FK만 있음. 클라이언트별 순위 데이터는 keyword_visibility 테이블(client_id 보유) 사용 필수
