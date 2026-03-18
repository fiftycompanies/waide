> **공통 필수 지침**: ~/Desktop/claude/CLAUDE.md 의 규칙을 반드시 준수할 것 (파일 생성 시 날짜 접두사 등)

## ⚠️ Git 커밋 규칙 (절대 위반 금지)
- 모든 git 작업(add/commit/push)은 반드시 루트 디렉토리 기준으로 실행
- apps/web 안에서 git 명령어 실행 금지
- Vercel 배포는 루트 레포(fiftycompanies/waide) main 브랜치 push로 자동 트리거됨
- apps/web/.git 이 존재하면 즉시 제거 후 루트 기준으로 작업

## ⚠️ 파일 구조 규칙 — 단일 소스 (절대 위반 금지)
- **소스 코드 원본은 루트에만 존재** — `app/`, `lib/`, `components/`, `public/`, `prisma/`, `middleware.ts`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `package.json`
- `apps/web/`의 위 파일들은 루트를 가리키는 심볼릭 링크 (`../../app` 등)
- `apps/web/`에만 존재하는 파일: `.env.local`, `.env`, `CLAUDE.md`, `.claude/`, `DEPLOY.md`, `node_modules/`
- 파일 편집은 루트 기준. `apps/web/`에서 편집해도 심볼릭 링크를 통해 동일 파일 수정됨
- Vercel은 루트에서 빌드 — 루트 파일이 실체이므로 동기화 문제 없음
- `apps/web/`에 별도 실체 파일 생성 절대 금지 (심볼릭 링크 구조 파괴)
- `tsconfig.json`의 `exclude`에 `"apps"` 포함 필수 — 이중 참조 방지

# Waide (AI Hospitality Aide) — 서비스 IA

> 최종 업데이트: 2026-03-18
> 버전: Phase PERSONA-1~3 완료 (브랜드 페르소나 고도화 — 크롤링 자동확보 + 업주 확인/보완)

---

## 1. 절대 규칙

1. 모든 데이터는 client_id FK로 연결. clients가 최상위 부모.
2. 브랜드 생성: clients INSERT → brand_personas INSERT (트랜잭션)
3. shadcn/UI 작업: 반드시 cd apps/web 후 실행
4. DB CHECK 제약 먼저 확인 (2026-03-08 DB 스냅샷 기준, 상세: `scripts/schema/check_constraints.sql`):
   - jobs.priority: 'critical'/'high'/'medium'/'low' (소문자)
   - jobs.trigger_type: 'USER'/'SCHEDULER'/'AGENT' (대문자)
   - contents.publish_status: 'draft'/'review'/'approved'/'published'/'rejected'/'archived'
   - contents.content_type: 'blog_list'/'blog_review'/'blog_info'/'aeo_qa'/'aeo_list'/'aeo_entity'/'single'/'list'/'review'/'info' (⚠️ DEFAULT='blog_post' 미포함 — 수정 필요)
   - clients.client_type: 'company'/'sub_client'/'platform'/'brand'/'shop'
   - clients.onboarding_status: 'pending'/'in_progress'/'completed'
   - clients.status: 'active'/'inactive'/'churned'
   - keywords.status: 'active'/'paused'/'archived'/'queued'/'refresh'/'suggested'
   - keywords.priority: 'critical'/'high'/'medium'/'low'
   - accounts.platform: 'naver'/'tistory'/'brunch'/'google'/'wordpress'/'youtube' (⚠️ medium 없음!)
   - blog_accounts.platform: 'naver'/'tistory'/'wordpress'/'medium'/'brunch'
   - blog_accounts.auth_type: 'manual'/'oauth'/'api_key'
   - publications.status: 'pending'/'publishing'/'published'/'failed'
   - publications.publish_type: 'manual'/'auto'
   - point_transactions.type: 'grant'/'spend'/'revoke'/'signup_bonus'/'refund'
   - subscriptions.status: 'trial'/'active'/'past_due'/'cancelled'/'paused' (⚠️ expired 없음!)
   - subscriptions.plan_name: 'trial'/'basic'/'pro'/'enterprise'
   - llm_answers.ai_model: 'perplexity'/'claude'/'chatgpt'/'gemini'
   - llm_answers.crawl_method: 'api'/'playwright'
   - mentions.sentiment: 'positive'/'neutral'/'negative' (detection_method CHECK 없음)
   - aeo_tracking_queue.status: 'pending'/'processing'/'completed'/'failed'
   - brand_analyses.status: 'pending'/'analyzing'/'completed'/'failed'/'converted'
   - questions.source: 'llm'/'paa'/'naver'/'manual'
5. contents.account_id FK → blog_accounts(id) (accounts 아님!)
6. PL/pgSQL 변수명: v_ 접두어
7. HTML 테이블: Link 금지 → <tr onClick> 패턴
8. 슬랙 실패해도 파이프라인 블로킹 금지
9. 에이전트 프롬프트: agent_prompts 테이블에서 동적 로딩
10. 질문하지 말고 합리적으로 판단하여 진행. 완료 후 결과만 요약.
11. 매 작업 완료 시 이 CLAUDE.md도 함께 업데이트할 것.
12. 인증 통합: Supabase Auth 단일 인증 (구글/카카오 OAuth). HMAC 폴백은 deprecated (기존 admin_users 사용자 전환 완료까지 유지). getAdminSession()은 Supabase Auth 우선 → HMAC 폴백 순서.
13. users.role CHECK: 'super_admin'/'admin'/'sales'/'client_owner'/'client_member'
14. subscriptions.status CHECK: 'trial'/'active'/'past_due'/'cancelled'/'paused'
15. admin_users.role CHECK: 'super_admin'/'admin'/'sales'/'viewer' — 사이드바 메뉴 자동 필터링
16. 고객 계정 연결: users.client_id FK → clients.id (client_users 별도 테이블 없음, 1:N 직접 연결)
17. DB 마이그레이션 작성 전 반드시 기존 스키마 확인: `scripts/schema/check_constraints.sql` + `scripts/schema/columns.sql` 파일로 현재 DB 스키마를 파악한 뒤 설계. CHECK 제약/컬럼 타입/기존 데이터 값/DEFAULT를 모르고 마이그레이션 작성 금지.
18. **★ /dashboard 단일 진입 (절대 위반 금지)**: 모든 인증된 사용자(super_admin/admin/sales/viewer/client_owner/client_member 모두)는 `/dashboard`로 진입. **고객(client_owner/client_member)을 `/portal`로 라우팅하는 코드 절대 금지.** 역할별 view/CRUD 권한 차이는 UI 컴포넌트 레벨에서 분기 (middleware에서 역할별 라우트 분리 금지). `/portal/*` 경로는 완전 제거(Phase AUTH-1 + UI-2) — 접근 시 `/dashboard`로 리다이렉트. middleware의 `ALL_VALID_ROLES`에 admin+client 역할 모두 포함 필수.

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
| 인증 | Supabase Auth 통합 (구글/카카오 OAuth) + HMAC 폴백(deprecated) |
| PDF | @react-pdf/renderer (서버사이드 Buffer 생성, NotoSansKR 한글 폰트) |
| 이메일 | Resend + @react-email/components (리포트 PDF 첨부 발송) |
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
| `/onboarding/refine` | 프로젝트 시작 | 분석 요약 + 보완 + [반영하기] | `brand_analyses`, `clients`, `keywords`, `users` |

### 3-2. 고객 포털 (Portal) — 라이트 테마

| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/portal` | 포털 대시보드 (KPI 4종 + 브랜드 요약 + 최근 활동 타임라인) | `keywords`, `contents`, `brand_analyses`, `clients` (brand_persona), `sales_agents` |
| `/portal/analysis` | 브랜드 분석 (마케팅 점수 + SEO 진단 + 키워드 + 개선 액션플랜) | `brand_analyses` |
| `/portal/keywords` | 키워드 관리 (활성/AI추천/보관 탭 + 승인/거절) | `keywords`, `brand_analyses` (keyword_strategy) |
| `/portal/contents` | 콘텐츠 현황 (필터 + 상세보기 + QC 결과) | `contents` (metadata: qc_result, rewrite_history) |
| `/portal/reports` | 월간 리포트 (발행추이 차트 + 키워드성장 차트 + 순위현황 + AI활동) | `contents`, `keywords`, `agent_execution_logs`, `serp_results`, `brand_analyses` |
| `/portal/settings` | 설정 (프로필, 비밀번호, 구독) | `users`, `subscriptions`, `sales_agents` |

> 포털 키워드 승인/거절: `approveSuggestedKeyword()`, `rejectSuggestedKeyword()` — keyword-expansion-actions.ts
> 포털 순위 섹션: keyword_visibility 테이블 사용 (E-3-1에서 수정, serp_results는 client_id 없어 사용 불가) — SERP 크론 실행 시 자동 표시

### 3-3. 어드민 (Admin) — 라이트 테마

#### 서비스 (SEO & AEO)
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/dashboard` | B2B KPI (MRR, 고객수, 이탈률, 평균점수) + SEO 운영 현황 | `subscriptions`, `clients`, `brand_analyses`, `daily_visibility_summary`, `keywords`, `contents`, `jobs` |
| `/keywords` | 키워드 관리 (활성/AI추천/전략) | `keywords`, `keyword_difficulty`, `brand_analyses` |
| `/contents` | 콘텐츠 관리 (3탭: 목록/새 생성/작업현황) | `contents`, `jobs`, `keywords` |
| `/contents/[id]` | 콘텐츠 상세 (본문 편집 + QC 결과) | `contents`, `blog_accounts` |
| `/contents/[id]/publish` | 발행 위저드 (3스텝: 확인→채널→URL) | `contents`, `blog_accounts` |
| `/publish` | 발행 관리 (3탭: 대기/이력/자동설정) | `contents`, `publishing_recommendations`, `account_grades` |
| `/analytics` | 성과 분석 (4탭: SEO 분석/AEO 노출/경쟁 분석/Citation 분석) | `daily_visibility_summary`, `serp_results`, `keyword_visibility`, `llm_answers`, `mentions`, `aeo_scores` |

#### 고객 관리
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/clients` → `/ops/clients` | 고객 포트폴리오 (카드뷰, 상태필터, At Risk 감지) | `clients`, `subscriptions`, `brand_analyses`, `sales_agents` |
| `/clients/[id]` → `/ops/clients/[id]` | 고객 상세 (10탭: 개요/키워드/콘텐츠/분석/순위/페르소나/구독/온보딩/계정/리포트) | `clients`, `subscriptions`, `brand_analyses`, `keywords`, `contents`, `keyword_visibility`, `daily_visibility_summary`, `report_deliveries` |
| `/ops/onboarding` | 온보딩 관리 (체크리스트, 진행률) | `clients` (onboarding_checklist JSONB) |
| `/brands` | 브랜드 관리 (분석 브랜드 목록) | `brand_analyses`, `clients` |
| `/brand-analysis` | 브랜드 분석 (7섹션: 기본정보/마케팅점수/개선포인트/키워드/AI추론/업주입력/포지셔닝) | `clients`, `brand_analyses`, `keywords` |
| `/accounts` → `/ops/accounts-management` | 계정 관리 (사용자 계정 CRUD) | `users` |

#### 비즈니스
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/revenue` | 매출 관리 (MRR/ARR, 플랜 분포, 트렌드, 최근 변동) | `subscriptions`, `products`, `clients` |
| `/ops/churn` | 이탈 관리 (At Risk 목록, 이탈률, 유지율) | `clients`, `subscriptions`, `brand_analyses` |
| `/ops/products` | 상품 관리 (패키지 CRUD) | `products`, `subscriptions` |

#### 영업 CRM
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/analysis-logs` | 분석 로그 목록 (CRM 파이프라인 + 영업사원/계정 인라인 할당) | `brand_analyses`, `sales_agents`, `clients`, `consultation_requests` |
| `/ops/analysis-logs/[id]` | 분석 상세 (4탭: 분석/SEO/키워드/활동기록) + 영업사원/계정 할당 | `brand_analyses`, `consultation_requests`, `sales_agents`, `clients` |
| `/ops/consultations` | 마케팅 상담 목록 (상담 파이프라인 + 담당자 인라인 배정 + 통계) | `consultation_requests`, `sales_agents` |
| `/ops/consultations/[id]` | 상담 상세 (연락처/활동기록/담당자/후속일정/분석연결) | `consultation_requests`, `sales_agents`, `brand_analyses` |
| `/ops/sales-agents` | 영업사원 관리 + 배포URL 추적링크 + 성과 + 성과요약 테이블 | `sales_agents`, `brand_analyses`, `consultation_requests`, `subscriptions`, `clients` |

#### 리소스
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/ops/blog-accounts` → `/blog-accounts` | 블로그 계정 + 등급 | `blog_accounts`, `account_grades` |
| `/ops/sources` → `/sources` | 소스 라이브러리 (크롤링/수동) | `content_sources` |
| `/ops/scheduler` | 자동 스케줄러 (크론, SERP, 검색량) | `settings` |

#### 설정
| 경로 | 페이지명 | 데이터 소스 |
|------|---------|-----------|
| `/settings/agents` → `/ops/agent-settings` | 에이전트 설정 (3탭: 프롬프트/콘텐츠프롬프트/진화지식) | `agent_prompts`, `content_prompts` |
| `/ops/aeo-settings` | AEO 추적 설정 (모델/반복/크론/Playwright) | `aeo_tracking_settings` |
| `/ops/scoring-settings` | 점수 가중치 설정 | `settings` (scoring_weights JSONB) |
| `/ops/serp-settings` | SERP 설정 | `settings` |
| `/ops/settings` | API 설정 (API키, 슬랙 연동, 기본값) | `settings` |
| `/ops/error-logs` | 에러 모니터링 (통계/필터/상세/상태관리) | `error_logs` |
| `/settings/admins` | 어드민 관리 (super_admin 전용) | `admin_users` |

#### URL 리디렉트 매핑 (이전 라우트 호환)
| 이전 경로 | 새 경로 | 비고 |
|----------|---------|------|
| `/ops/contents` | `/contents` | 탭 구조 통합 |
| `/ops/contents/[id]` | `/contents/[id]` | 상세 페이지 이전 |
| `/ops/contents/[id]/publish` | `/contents/[id]/publish` | 발행 위저드 이전 |
| `/ops/jobs` | `/contents?tab=jobs` | 작업현황 탭으로 흡수 |
| `/campaigns/plan` | `/contents?tab=create` | 캠페인 기획 흡수 |
| `/clients` | `/ops/clients` | 라우트 별칭 |
| `/clients/[id]` | `/ops/clients/[id]` | 라우트 별칭 |
| `/accounts` | `/ops/accounts-management` | 라우트 별칭 |
| `/settings/agents` | `/ops/agent-settings` | 라우트 별칭 |
| `/ops/blog-accounts` | `/blog-accounts` | 라우트 별칭 |
| `/ops/sources` | `/sources` | 라우트 별칭 |

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

### 4-2. AEO 추적 플로우

```
[수동] /analytics?tab=aeo → [추적 시작] 버튼 → runAEOTracking(clientId)
[자동] /api/cron/aeo (매일 04:00 KST, 기본 비활성) → runAEOTrackingBatch()
  ↓
[질문 선택] questions 테이블 → limitQuestionsByKeyword (round-robin)
  ↓
[LLM 크롤링] 질문 × 반복 × 모델
  ├─ Perplexity API (crawl_method='api', 2초 딜레이)
  ├─ Claude API (crawl_method='api', 1초 딜레이)
  ├─ ChatGPT Playwright (기본 비활성, 10초 딜레이)
  └─ Gemini Playwright (기본 비활성, 10초 딜레이)
  ↓ llm_answers INSERT
[언급 감지] detectMentions(응답텍스트, 브랜드명)
  ├─ LLM 분석 (Claude → JSON 구조화, 위치/감성/신뢰도)
  └─ 문자열 매칭 폴백 (confidence: 0.5)
  ↓ mentions INSERT
[점수 산출] calculateAEOScore()
  └─ score = Σ(model_weight × position_weight) / total_queries × 100
  ↓ aeo_scores UPSERT
[대시보드] AEO Visibility Score 표시
```

### 4-3. 데이터 수집 플로우 (자동화)

```
[Vercel Cron 매일] → /api/cron/daily-serp
  ├─ 네이버 검색 API → serp_results INSERT
  ├─ visibility 점수 → keyword_visibility INSERT
  └─ daily_visibility_summary 집계

[검색량 수집] (분기별/수동)
  ├─ 네이버 광고 API (5개 배치) → keywords.monthlySearchVolume UPDATE
  └─ DataLab 폴백
```

### 4-4. 콘텐츠 생성 플로우

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

### 4-4. 캠페인 기획 → 콘텐츠 생성 → 발행 → 추적 플로우

```
[캠페인 기획 /campaigns/plan]
  ├─ AI 추천 키워드 (suggestKeywordsForClient → Claude Haiku → status='suggested')
  ├─ 어드민 승인 → status='active' (approveSuggestedKeyword)
  ├─ 수동 키워드 입력 → status='active' (addManualKeyword)
  ├─ Style Transfer 참조 선택 (bestContents, 최대 3개)
  └─ [콘텐츠 생성 지시] 버튼 → triggerContentGeneration()
       ↓
  jobs INSERT (CONTENT_CREATE, PENDING)
       ↓
  processContentJobs() → generateContentV2()
  ├─ COPYWRITER v2 → QC v2 → 재작성(필요 시)
  └─ contents INSERT (draft → approved)
       ↓
[에디터 /ops/contents/[id]]
  ├─ 마크다운 복사 → 블로그 수동 발행
  └─ 발행 URL 입력 → updatePublishedUrl()
       ↓
  is_tracking=true, publish_status='published'
       ↓
[SERP 추적] (daily cron → 순위 → 대시보드)
```

### 4-5. 영업사원 트래킹 + CRM 플로우

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
| `report_deliveries` | /ops/clients/[id] (리포트 탭), /api/cron/monthly-report | 월간 리포트 발송 이력 |
| `content_benchmarks` | lib/agent-chain.ts | 콘텐츠 벤치마크 캐시 (7일 TTL) |
| `questions` | /keywords?tab=questions, /portal/keywords | 질문 엔진 (키워드→질문 자동 생성, 3소스: LLM/PAA/네이버) |
| `client_points` | /ops/points | 고객별 포인트 잔액 |
| `point_transactions` | /ops/points | 포인트 거래 이력 (grant/revoke/spend/signup_bonus) |
| `point_settings` | /ops/points | 포인트 설정 (가입보너스, 콘텐츠당 비용) |
| `error_logs` | /ops/error-logs | 에러 모니터링 로그 (client/server/api/cron) |
| `llm_answers` | /analytics?tab=aeo | LLM 응답 원문 (질문→AI모델→응답 텍스트, 소스 URL) |
| `mentions` | /analytics?tab=aeo, /analytics?tab=competition | 브랜드 언급 감지 결과 (위치, 감성, 신뢰도) |
| `aeo_scores` | /dashboard, /analytics?tab=aeo, /portal | AEO Visibility Score (주기별 가중 점수) |
| `aeo_tracking_queue` | (내부) | AEO 추적 큐 (1000+ 고객 확장성, 우선순위 처리) |
| `aeo_tracking_settings` | /ops/aeo-settings | AEO 추적 전역 설정 (모델/반복/크론/Playwright) |
| `publications` | /publish, /contents/[id]/publish | 발행 이력 (플랫폼, 상태, 재시도 횟수) |
| `auto_publish_settings` | /publish?tab=auto | 자동 발행 설정 (마스터 토글, 채널별 ON/OFF) |

**clients.brand_persona JSONB 구조 (v2):**
- 기존 flat 13필드 (one_liner, positioning, tone, strengths, ...) → 하위 호환 유지
- `ai_inferred`: { target_customer, tone, usp, content_direction, price_position } → 확인 여부 tracked
- `owner_input`: { brand_story, forbidden_content, awards_certifications, official_price_info }
- `content_strategy`: { blog: { tone, topics, forbidden_terms, ... } }
- `competitive_summary`: { market_position, top_competitors[] }
- `persona_version`: 2, `confirmation_status`: pending/partial/confirmed
- 접근: `getPersonaForPipeline()` (flat 변환), `normalizePersona()` (v1→v2 정규화)

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
| `/api/cron/monthly-report` | GET/POST | 월간 리포트 자동 발송 크론 (매월 1일) |
| `/api/cron/aeo` | GET | AEO 추적 크론 (매일 04:00 KST, 기본 비활성) |
| `/api/portal/report-pdf` | GET | PDF 리포트 다운로드 (어드민/포털) |

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
| `campaign-actions.ts` | getCampaigns(), createCampaignWithJob(), getActiveKeywordsForClient(), getBestRankContents() | campaigns, campaign_keywords, keywords, contents |
| `campaign-planning-actions.ts` | suggestKeywordsForClient(), addManualKeyword(), getActiveKeywordPool(), getSuggestedKeywords(), triggerContentGeneration() | keywords, contents, jobs, clients |
| `keyword-actions.ts` | getKeywords(), getSerpByKeyword(), updateKeywordStatus(), triggerClientSerpCheck(), getClientRankings() | keywords, serp_results, keyword_visibility, daily_visibility_summary |
| `keyword-expansion-actions.ts` | expandNicheKeywords(), getClientMainKeywords(), approveSuggestedKeyword(), rejectSuggestedKeyword(), bulkApproveSuggestedKeywords() | keywords |
| `keyword-strategy-actions.ts` | generateKeywordStrategy(), getKeywordStrategy() | keywords, brand_analyses, clients |
| `content-generate-actions.ts` | generateContentV2(), processContentJobs() | contents, jobs, clients, content_sources, content_benchmarks |
| `analysis-log-actions.ts` | getAnalysisLogs(), getAnalysisLogDetail(), updateLeadStatus(), addAnalysisNote(), updateAnalysisContact(), linkAnalysisToClient(), getAnalysisStats(), assignSalesAgent(), assignToClient(), getClientsList() | brand_analyses, sales_agents, clients, consultation_requests |
| `consultation-crm-actions.ts` | getConsultationList(), getConsultationDetail(), updateConsultationStatus(), addConsultationNote(), updateConsultationContact(), assignConsultationAgent(), updateConsultationFollowUp(), getConsultationStats() | consultation_requests, sales_agents, brand_analyses |
| `settings-actions.ts` | getSettings(), getScoringWeights(), getAnalysisOptions() | settings |
| `admin-actions.ts` | getAdmin() | admins |
| `auth-actions.ts` | portalSignIn(), portalSignUp(), portalSignOut(), inviteUser(), getClientUsers(), updateUserProfile(), changeUserPassword() | users, invitations (Supabase Auth) |
| `portal-actions.ts` | getPortalDashboard(), getPortalKeywords(), getPortalContents(), getPortalReport(), getPortalSettings(), getPortalDashboardV2(), getPortalKeywordsV2(), getPortalContentsV2(), getPortalReportV2() | brand_analyses, contents, keywords, keyword_rankings, subscriptions, sales_agents, clients, agent_execution_logs, serp_results |
| `product-actions.ts` | getProducts(), createProduct(), updateProduct(), deleteProduct(), createSubscription(), updateSubscription(), cancelSubscription(), getClientSubscription() | products, subscriptions, clients |
| `persona-actions.ts` | updatePersona(), addManualStrength(), removeManualStrength(), regeneratePersona(), getPersona() | clients (brand_persona JSONB) |
| `report-actions.ts` | getMonthlyReportData(), getReportSettings(), updateReportSettings(), getReportDeliveries(), generateAndSendReport(), resendReport() | clients (metadata JSONB), report_deliveries, keywords, contents, keyword_visibility |
| `question-actions.ts` | generateQuestions(), getQuestions(), addManualQuestion(), updateQuestion(), deleteQuestion(), regenerateQuestions(), generateAEOContents(), getPortalQuestions() | questions, contents |
| `point-actions.ts` | initializeClientPoints(), checkPointBalance(), spendPoints(), grantPoints(), revokePoints(), refundPoints(), canGenerateContent(), getPointSettings(), updatePointSettings(), getClientPointsList(), getPointTransactions() | client_points, point_transactions, point_settings |
| `error-log-actions.ts` | logError(), getErrorLogs(), getErrorLogDetail(), updateErrorStatus(), getErrorStats() | error_logs |
| `aeo-tracking-actions.ts` | getAEOSettings(), updateAEOSettings(), runAEOTracking(), runAEOTrackingBatch(), calculateAEOScore(), getAEODashboardData(), getAEOAnalyticsData(), getAEOCompetitionData(), getAEOCitationData(), getPortalAEOData(), getAEOTrackingPreview() | llm_answers, mentions, aeo_scores, aeo_tracking_queue, aeo_tracking_settings, questions |
| `entity-content-actions.ts` | generateEntityContent() | contents, clients |
| `publish-actions.ts` | executePublish(), retryPublish(), checkAutoPublish(), getAutoPublishSettings(), updateAutoPublishSettings(), getPublications(), testBlogConnection(), createApiKeyAccount(), setDefaultAccount(), getClientBlogAccounts() | publications, auto_publish_settings, blog_accounts, contents |
| `prompt-registry-actions.ts` | getPromptRegistryAction(), savePromptAction(), restoreDefaultAction() | agent_prompts (PROMPT_REGISTRY) |
| `knowledge-actions.ts` | runKnowledgeLearning(), getKnowledgeStats() | evolving_knowledge, contents, aeo_scores, mentions, keyword_visibility |
| `keyword-volume-actions.ts` | queryKeywordVolume(), registerKeywordsFromVolume(), updateKeywordVolumes(), checkNaverAdApiAvailable() | keywords |

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
| `pdf/generate-report.ts` | generateReportPdf() — 월간 리포트 PDF 생성 (@react-pdf/renderer) | (MonthlyReportData 입력) |
| `pdf/monthly-report-template.tsx` | MonthlyReportDocument — 4페이지 PDF 템플릿 (KPI, 콘텐츠, 순위, 계획) | - |
| `email/send-report.ts` | sendReportEmail() — Resend API로 리포트 이메일 발송 (PDF 첨부) | (외부 API) |
| `email/monthly-report-email.tsx` | MonthlyReportEmail — React Email 리포트 이메일 템플릿 | - |
| `prompt-loader.ts` | loadPromptTemplate(), fillPromptTemplate(), getPromptRegistry(), savePromptRegistry(), restorePromptDefault() — 프롬프트 동적 로딩 (agent_prompts DB 우선, DEFAULT_PROMPTS fallback) | agent_prompts |
| `crawlers/index.ts` | crawlLLM() — LLM 크롤링 라우터 (모델별 분기, MODEL_WEIGHTS, MODEL_RATE_LIMITS) | - |
| `crawlers/perplexity-crawler.ts` | crawlPerplexity() — Perplexity API 크롤링 (llama-3.1-sonar, citations 포함) | (외부 API) |
| `crawlers/claude-crawler.ts` | crawlClaude() — Claude API 크롤링 (Haiku 4.5) | (외부 API) |
| `crawlers/chatgpt-crawler.ts` | crawlChatGPT() — Playwright ChatGPT 크롤링 (기본 비활성) | (외부 API) |
| `crawlers/gemini-crawler.ts` | crawlGemini() — Playwright Gemini 크롤링 (기본 비활성) | (외부 API) |
| `crawlers/playwright-base.ts` | createStealthBrowser() — Playwright 공통 유틸 (UA 로테이션, 스텔스) | - |
| `crawlers/mention-detector.ts` | detectMentions() — 브랜드 언급 감지 (LLM 분석 + 문자열 매칭 폴백) | - |

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

### 6-6. AEO Visibility Score (100점) — aeo_scores

- 공식: `score = Σ(mention_weight × position_weight) / total_queries × 100`
- Position weights: 1위=1.0, 2위=0.7, 3위=0.4, 본문 언급=0.2
- Model weights: ChatGPT=1.0, Perplexity=0.8, Gemini=0.7, Claude=0.5
- Rate limits: Perplexity=2초, Claude=1초, Playwright=10초
- 추적 무료: AEO 추적은 포인트 차감 없음 (콘텐츠 생성만 포인트 차감)
- Round-robin: 키워드별 공평한 질문 선택 (limitQuestionsByKeyword)
- 우선순위 큐: 유료 고객(포인트 잔액 > 0) 먼저 처리

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
| Resend API | 리포트 이메일 발송 (PDF 첨부) | 월 100건 무료 |
| Perplexity API (`api.perplexity.ai`) | LLM 응답 크롤링 (AEO 추적) | 종량제 |

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
  - Vercel 배포 URL: https://waide.vercel.app
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
- Phase G-1: 월간 PDF 리포트 + 이메일 발송 + 어드민 설정 (2026-03-01)
  - scripts/migrations/054_report_deliveries.sql: clients.metadata JSONB + report_deliveries 테이블
  - lib/pdf/monthly-report-template.tsx: 4페이지 PDF 템플릿 (@react-pdf/renderer, NotoSansKR 한글 폰트)
  - lib/pdf/generate-report.ts: generateReportPdf() — PDF Buffer 생성
  - lib/email/monthly-report-email.tsx: React Email 리포트 이메일 템플릿 (Resend 발송용)
  - lib/email/send-report.ts: sendReportEmail() — Resend API 이메일 발송 (PDF 첨부, RESEND_API_KEY 없으면 graceful skip)
  - lib/actions/report-actions.ts: 리포트 전체 로직 (데이터 수집, 설정 CRUD, 발송 이력, 생성+발송)
  - 어드민 클라이언트 상세 (/ops/clients/[id]): "리포트" 탭 추가 (9탭)
    - 리포트 설정: ON/OFF 토글 + 수신 이메일 입력 + 저장
    - 수동 발송: [PDF 미리보기] + [리포트 생성 + 발송] 버튼
    - 발송 이력: report_deliveries 테이블 조회 (월, 발송일, 상태, 재발송 버튼)
  - clients.metadata.report_settings: { enabled: boolean, recipient_email: string | null } (기본 OFF)
  - app/api/cron/monthly-report/route.ts: 월간 리포트 자동 발송 크론 (매월 1일, 최대 10건/배치)
  - vercel.json: monthly-report 크론 추가 (0 0 1 * *)
  - app/api/portal/report-pdf/route.ts: PDF 다운로드 API (어드민 clientId 또는 포털 Supabase Auth)
  - 포털 월간 리포트: [PDF 다운로드] 버튼 추가
  - 패키지: @react-pdf/renderer, resend, @react-email/components
  - 한글 폰트: public/fonts/NotoSansKR-Regular.ttf, NotoSansKR-Bold.ttf
  - 환경변수: RESEND_API_KEY, CRON_SECRET, REPORT_FROM_EMAIL (모두 optional, 없으면 graceful skip)
  - TypeScript 빌드 검증: tsc --noEmit 0 에러
- Phase PIPE-1: 캠페인 기획 + 에디터 브릿지 (실전 파이프라인 UI) (2026-03-01)
  - lib/actions/campaign-planning-actions.ts: 캠페인 기획용 서버 액션 5개
    - suggestKeywordsForClient(clientId, count): AI(Claude Haiku) 키워드 추천 → keywords INSERT (status='suggested')
    - addManualKeyword(clientId, keyword): 수동 키워드 추가 (중복 체크, 바로 active)
    - getActiveKeywordPool(clientId): 활성 키워드 풀 (콘텐츠 수, 순위 포함)
    - getSuggestedKeywords(clientId): 추천 대기 키워드 목록
    - triggerContentGeneration(params): CONTENT_CREATE Job INSERT → processContentJobs()에서 처리
  - app/(dashboard)/campaigns/plan/page.tsx: 캠페인 기획 화면
  - components/campaigns/campaign-planning-client.tsx: 기획 클라이언트 컴포넌트
    - AI 추천 키워드 섹션: 추천 요청 → 승인/보류 (기존 approveSuggestedKeyword/rejectSuggestedKeyword 재사용)
    - 수동 키워드 입력 섹션: 즉시 active 등록
    - 활성 키워드 풀: 키워드 선택 → 콘텐츠/순위 현황 표시
    - Style Transfer 참조: 상위노출 베스트 글 선택 (최대 3개)
    - 생성 옵션: 콘텐츠 유형 + 추가 지시사항
    - 콘텐츠 생성 지시 버튼 → triggerContentGeneration → CONTENT_CREATE Job
  - 사이드바: "콘텐츠" 그룹에 "캠페인 기획" 메뉴 추가 (/campaigns/plan, Zap 아이콘)
  - 콘텐츠 목록 보강: 발행 URL 아이콘(ExternalLink) + 순위추적 아이콘(Radio) 표시
  - 에디터 브릿지: 기존 ContentEditor에 이미 구현됨 (마크다운 복사, 발행 URL → SERP 추적)
  - 키워드 확보 플로우: AI 추천(suggested) → 어드민 승인(active) → 콘텐츠 생성 가능
  - 콘텐츠 생성 플로우: 키워드 선택 → triggerContentGeneration → CONTENT_CREATE Job INSERT → processContentJobs() → generateContentV2() 파이프라인
  - 발행 플로우: 에디터에서 마크다운 복사 → 블로그 수동 발행 → URL 입력 → updatePublishedUrl() → is_tracking=true → 다음 SERP 크론에서 순위 추적
  - TypeScript 빌드 검증: tsc --noEmit 0 에러
- Phase UX-P0: P0 크리티컬 이슈 수정 (2026-03-04)
  - error.tsx 3개 추가: app/(public)/error.tsx, app/(dashboard)/error.tsx, app/(portal)/error.tsx
  - not-found.tsx 3개 추가: app/(public)/not-found.tsx, app/(dashboard)/not-found.tsx, app/(portal)/not-found.tsx
  - error.tsx: "use client", 한글 메시지, [다시 시도] reset() + [홈으로] 각 영역 홈 링크
  - not-found.tsx: 커스텀 404, 각 영역 홈 링크
  - /ops/contents clientId 필터: 이미 적용 확인 (getSelectedClientId() → getContents({clientId}) 전달됨)
  - /settings/page.tsx 정리: 미작동 섹션 제거 (프로필 목업/테마/알림 토글/요금제/계정삭제), "추가 설정 준비 중" 안내 카드 + /settings/account, /settings/admins 바로가기로 교체
  - 랜딩 페이지 Stats 정리: 근거 없는 "1,247+ 매장 분석 완료" → "100점 마케팅 종합 진단"으로 교체 (사실 기반)
  - npm run build 성공 (pre-existing @react-pdf/renderer 등 누락 → 설치 완료)
- Phase UX-P1: P1 UX 개선 (2026-03-04)
  - loading.tsx 13개 추가: 3 레이아웃 (public=dark spinner, dashboard/portal=skeleton) + 10 개별 페이지 (dashboard, clients, contents, analysis-logs, jobs, revenue, keywords, portal keywords/contents/reports)
  - EmptyState 공통 컴포넌트: components/ui/empty-state.tsx (icon, title, description, actionLabel, actionHref props)
  - EmptyState 적용: jobs(📭→Inbox 아이콘), contents(📭→FileText+캠페인기획 링크), portal dashboard(에러 상태 개선), portal contents(본문 없음 아이콘)
  - Breadcrumb 공통 컴포넌트: components/ui/breadcrumb.tsx (items: {label, href?}[])
  - Breadcrumb 적용: clients/[id], keywords/[id], contents/[id], analysis-logs/[id], brands/[id] — 기존 수동 뒤로가기 링크 교체
  - 사이드바 아이콘 중복 수정: "브랜드 관리" Building2 → Store 아이콘 (고객 포트폴리오와 구분)
  - 분석 로딩 120초 타임아웃 추가: analysis/loading/page.tsx — 무한 폴링 방지
  - dangerouslySetInnerHTML 제거: portal/contents → ReactMarkdown 컴포넌트로 교체
  - revenue 빈 상태 메시지 개선, dashboard 계정 성과 빈 상태 메시지 개선
  - npm run build 성공
- Phase STRUCT-1: 서비스 구조 전면 정리 (2026-03-05)
  - 역할 체계 확장: admin_users CHECK에 'sales' 역할 추가 (super_admin/admin/sales/viewer)
  - AdminPayload 타입 확장: role에 'sales' 추가
  - 역할 기반 사이드바 메뉴 필터링: 각 메뉴 항목에 roles[] 속성, 역할별 메뉴 자동 숨김
  - 메뉴 권한 매핑:
    - super_admin/admin/viewer: 전체 메뉴 접근
    - sales: 대시보드, 고객포트폴리오, 온보딩, 브랜드관리, 성과분석, 콘텐츠관리, 분석로그만
  - 어드민 관리 페이지: sales 역할 생성/변경 지원 (생성 폼 + 역할 셀렉트에 추가)
  - 고객 계정 연결: client-account-actions.ts (linkClientAccount/unlinkClientAccount/getLinkedAccount/inviteClientUser)
  - 고객 상세 10탭: 기존 9탭 + "계정" 탭 (포털 계정 연결/해제/초대)
  - 브랜드 정보 카드: 개별 브랜드 선택 시 대시보드 상단에 BrandInfoCard 표시 (이름/상태/온보딩/플랜/담당자)
  - 온보딩 체크 모달: 브랜드 선택 시 온보딩 미완료면 모달 표시 (세션당 1회)
  - 대시보드 레이아웃: getSelectedBrandInfo() 조회 → 온보딩 상태 체크 → 모달 렌더링
  - 대시보드 레이아웃: adminRole 서버에서 조회하여 sidebar에 prop 전달 (SSR 역할 필터링)
  - 마이그레이션: 055_admin_sales_role.sql (admin_users CHECK 재생성)
  - npm run build 성공
- Phase ERR-1: 에러 모니터링 시스템 (2026-03-05)
  - scripts/migrations/056_error_logs.sql: error_logs 테이블 (error_type CHECK: client/server/api/cron, status CHECK: new/acknowledged/resolved/ignored)
  - lib/actions/error-log-actions.ts: logError() (인증 불필요), getErrorLogs(), getErrorLogDetail(), updateErrorStatus(), getErrorStats()
  - lib/slack/error-notification.ts: Slack Webhook 에러 알림 (5분 중복 제거, SLACK_ERROR_WEBHOOK_URL)
  - lib/utils/error-handler.ts: withErrorLogging() 서버 액션 래퍼
  - 클라이언트 에러 바운더리 연동: app/(public)/error.tsx, app/(dashboard)/error.tsx, app/(portal)/error.tsx — logError() 호출
  - 크론 에러 연동: lib/scheduler.ts runScheduledTask() catch 블록, monthly-report/search-volume 개별 catch 블록
  - /ops/error-logs: 에러 로그 관리 페이지 (통계카드 4종, 상태/유형/기간 필터, 목록 테이블, 상세 모달)
  - 사이드바: "에러 로그" 메뉴 (super_admin/admin, ShieldAlert 아이콘)
  - Slack 알림: SLACK_ERROR_WEBHOOK_URL → SLACK_WEBHOOK_URL 순서 폴백 (둘 다 없으면 skip)
  - npm run build 성공
- Phase FIX-1: 페르소나 버그 수정 + 분석→페르소나 자동생성 + 포털 분석결과 표시 (2026-03-05)
  - persona-actions.ts: regeneratePersona 폴백 로직 (분석 없어도 클라이언트 기본 정보로 페르소나 생성)
  - /ops/clients/[id] OverviewTab: 마케팅 분석 실행 UI (URL 입력 + 분석 시작 + 3초 폴링 + 완료 자동 새로고침)
  - /ops/clients/[id] PersonaTab: 빈 상태 메시지 개선 (분석 실행 안내 문구)
  - analysis-brand-actions.ts: getAnalysisStatus() 폴링 함수 추가
  - place-analyzer.ts: runFullAnalysis 완료 시 clients.onboarding_status='analysis_done' 자동 업데이트
  - /portal 대시보드: 마케팅 종합 점수 원형 차트 + 6영역 점수 바 + 브랜드 강점/약점 태그 섹션
  - portal-actions.ts: getPortalDashboardV2에 scoreBreakdown/strengths/weaknesses 반환 추가
  - npm run build 성공
- Phase IA-1: IA 구조 변경 — SEO & AEO 메뉴 통합 + 탭 구조 (2026-03-07)
  - 사이드바 메뉴 6그룹 재편: 서비스(5)/고객관리(4)/비즈니스(3)/영업CRM(2)/리소스(3)/설정(6)
  - 서비스 메뉴 URL 변경: /contents(3탭: 목록/생성/작업), /publish(3탭: 대기/이력/자동), /analytics, /keywords
  - 발행 관리 신규 페이지: PublishTabsWrapper + 3탭 (대기/이력/자동발행설정)
  - 콘텐츠 관리 통합: campaigns/plan → /contents?tab=create 흡수, /ops/jobs → /contents?tab=jobs 흡수
  - 콘텐츠 상세 + 발행위저드: /contents/[id], /contents/[id]/publish
  - URL 리디렉트: /ops/contents→/contents, /ops/jobs→/contents?tab=jobs, /campaigns/plan→/contents?tab=create
  - 라우트 별칭: /clients→/ops/clients, /accounts→/ops/accounts-management, /settings/agents→/ops/agent-settings
  - 리소스 메뉴 URL: /ops/blog-accounts→/blog-accounts, /ops/sources→/sources
  - 내부 링크 전면 업데이트: contents-page-header, content-editor, client-detail, ops-page
  - shadcn/ui Checkbox + Textarea 컴포넌트 추가, @radix-ui/react-checkbox 설치
  - tsc --noEmit 통과 (npm run build는 Google Fonts TLS 차단으로 샌드박스에서 실패 — 코드 이슈 아님)
- Phase ONBOARD-1: 브랜드 분석 → 프로젝트 자동 생성 (2026-03-07)
  - scripts/migrations/057_brand_analyses_refinement.sql: brand_analyses에 refined_keywords/strengths/appeal/target/refinement_count/last_refined_at 컬럼 추가
  - 분석 결과 페이지: [보완하기] 버튼 + 슬라이드 패널 (키워드 태그 max5, 강점, 어필, 타겟) + [재분석하기] 버튼
  - 분석 결과 페이지: [프로젝트 시작하기] CTA (localStorage analysis_id 캐시 → login redirect → /onboarding/refine)
  - POST /api/analyze/[id]/refine: 보완 데이터 저장 + 재분석 트리거
  - lib/actions/refinement-actions.ts: refineAnalysis(), applyAnalysisToProject(), linkAnalysisToExistingClient()
  - /onboarding/refine: 프로젝트 시작 페이지 (분석 요약 + 4필드 편집 + [반영하기])
  - [반영하기] 플로우: clients INSERT → brand_analyses.client_id UPDATE → brand_persona JSONB → keywords INSERT × N → users.client_id UPDATE
  - 어드민 온보딩: [새 브랜드 분석] 버튼 + 모달 (URL 입력 + 기존 고객 연결 옵션)
  - 어드민 클라이언트 상세: [브랜드 추가 분석] 버튼 + 모달 (client_id 프리셋)
  - components/onboarding/: brand-analysis-modal, onboarding-actions, onboarding-refine-client
  - 로그인→회원가입 redirect 파라미터 전파, localStorage 폴백
  - 분석 로딩 페이지: 재분석 시 id 파라미터 지원 (새 분석 생략, 폴링만)
  - 온보딩 팝업 검증: onboarding_status='completed' 설정으로 팝업 자동 비활성화
  - tsc --noEmit 통과
- Phase 3: 질문 엔진 + 포인트 시스템 + AEO 콘텐츠 자동 생성 (2026-03-07)
  - scripts/migrations/058_question_engine_points.sql: questions, client_points, point_transactions, point_settings 테이블 + contents 확장 (content_type, question_id)
  - lib/actions/question-actions.ts: 질문 엔진 (3소스 병렬: Claude LLM 15~20개, Google PAA via Serper, 네이버 자동완성)
    - generateQuestions(), getQuestions(), addManualQuestion(), updateQuestion(), deleteQuestion(), regenerateQuestions()
    - generateAEOContents(): 선별 질문 → AI 유형 판단 (aeo_qa/aeo_list) → AEO 콘텐츠 마크다운 생성
    - 중복 제거: 정규화 + 포함 관계 체크
  - lib/actions/point-actions.ts: 포인트 시스템 (역할 기반 접근 제어)
    - initializeClientPoints(): 가입 시 보너스 포인트 지급
    - canGenerateContent(): admin/super_admin=무제한, sales/client_owner=포인트 차감
    - spendPoints(), grantPoints(), revokePoints(): 포인트 거래
    - getPointSettings(), updatePointSettings(): 전역 설정 (signup_bonus, cost_per_content)
  - components/questions/questions-tab.tsx: 질문 관리 UI (키워드 필터, 소스 필터, 체크박스 선택 max5, 인라인 편집, AEO 생성)
  - components/points/points-page-client.tsx: 포인트 관리 어드민 UI (3탭: 잔액/거래이력/설정)
  - app/(dashboard)/ops/points/page.tsx: 포인트 관리 페이지
  - app/(dashboard)/keywords/page.tsx: 질문 확장 탭 추가 (?tab=questions)
  - components/keywords/keywords-tabs-wrapper.tsx: 키워드/질문 탭 래퍼
  - app/(portal)/portal/keywords/page.tsx: 포털 질문 현황 탭 (읽기 전용)
  - app/(portal)/portal/page.tsx: 포털 대시보드 포인트 잔액 배너
  - campaign-planning-actions.ts: triggerContentGeneration에 포인트 체크 연동
  - campaign-planning-client.tsx: 포인트 부족 시 toast 에러 표시
  - keyword-expansion-actions.ts: approveSuggestedKeyword에 질문 자동 생성 트리거
  - refinement-actions.ts: applyAnalysisToProject에 포인트 초기화 + 질문 자동 생성 트리거
  - portal-actions.ts: getPortalDashboardV2에 pointBalance, getPortalPointBalance 추가
  - 사이드바: 비즈니스 그룹에 "포인트 관리" 메뉴 (super_admin/admin)
  - contents 테이블 확장: content_type CHECK ('blog_list'/'blog_review'/'blog_info'/'aeo_qa'/'aeo_list'), question_id FK
  - questions.source CHECK: 'llm'/'paa'/'naver'/'manual'
  - point_transactions.type CHECK: 'grant'/'revoke'/'spend'/'signup_bonus'
  - tsc --noEmit 통과
- Phase 4+5: LLM 크롤링 + Mention Detection + AEO Score + 추적 큐 (2026-03-07)
  - scripts/migrations/059_aeo_tracking.sql: llm_answers, mentions, aeo_scores, aeo_tracking_queue, aeo_tracking_settings 5개 테이블
  - lib/crawlers/: LLM 크롤링 모듈 (perplexity-crawler, claude-crawler, chatgpt-crawler, gemini-crawler, playwright-base, mention-detector, index)
  - lib/actions/aeo-tracking-actions.ts: AEO 추적 핵심 로직 (~700줄)
    - runAEOTracking(clientId): 단일 고객 수동 추적 (질문→LLM 크롤링→언급 감지→점수 산출)
    - runAEOTrackingBatch(): 크론 배치 (유료 우선, 전체 고객 순회)
    - calculateAEOScore(): 가중 점수 공식 (모델×위치 가중치)
    - getAEODashboardData/AnalyticsData/CompetitionData/CitationData: 대시보드/분석 데이터
    - limitQuestionsByKeyword(): Round-robin 질문 선택 (키워드별 공평 분배)
  - lib/actions/entity-content-actions.ts: 엔티티 정의 콘텐츠 생성 (aeo_entity 타입, 온보딩 시 무료)
  - lib/actions/point-actions.ts: refundPoints() 추가 (콘텐츠 생성 실패 시 자동 환불)
  - lib/actions/content-generate-actions.ts: 파이프라인 실패 시 자동 포인트 환불 로직
  - lib/actions/refinement-actions.ts: 프로젝트 생성 시 엔티티 콘텐츠 자동 생성 트리거
  - app/api/cron/aeo/route.ts: AEO 추적 크론 (매일 04:00 KST, 기본 비활성)
  - vercel.json: AEO 크론 추가 (0 4 * * *)
  - components/analytics/: aeo-tracking-section, aeo-competition-section, aeo-citation-section, analytics-tabs-wrapper
  - app/(dashboard)/analytics/page.tsx: 4탭 구조 (SEO 분석/AEO 노출/경쟁 분석/Citation 분석)
  - components/dashboard/aeo-dashboard-section.tsx: 대시보드 AEO 카드 (Score, 트렌드, 모델별 바, 최근 언급, 미노출 질문)
  - app/(dashboard)/dashboard/page.tsx: AEO 섹션 통합 (브랜드 모드 2열 그리드)
  - app/(dashboard)/ops/aeo-settings/page.tsx + components/settings/aeo-settings-client.tsx: AEO 설정 (4카드: 모델/추적/크론/Playwright)
  - components/ui/switch.tsx: Switch 컴포넌트 신규 생성
  - app/(portal)/portal/page.tsx: 포털 AEO Score 카드 (스코어, 트렌드, 모델별 카운트)
  - portal-actions.ts: getPortalDashboardV2에 aeoScore 필드 추가
  - 사이드바: 설정 그룹에 "AEO 설정" 메뉴 (super_admin/admin, Radio 아이콘)
  - Playwright: 코드 구현 완료 (chatgpt/gemini), 기본 비활성 (설정에서 활성화)
  - Turbopack 번들링 방지: `Function("m", "return import(m)")("playwright")` 트릭
  - 서비스 정책: AEO 추적=무료, 콘텐츠 생성=1포인트, admin/super_admin=무제한, 실패 시 자동 환불
  - tsc --noEmit 통과
- Phase 6: 자동 배포 엔진 — Tistory/WordPress/Medium (2026-03-07)
  - scripts/migrations/060_auto_publish.sql: blog_accounts 확장 + publications + auto_publish_settings 3개 테이블
  - blog_accounts 확장: auth_type, access_token, refresh_token, token_expires_at, api_key, api_secret, blog_id, platform_user_id, is_default, last_published_at, updated_at
  - platform CHECK 확장: 'naver'/'tistory'/'wordpress'/'medium'/'brunch'
  - auth_type CHECK: 'manual'/'oauth'/'api_key'
  - publications 테이블: content_id/client_id/blog_account_id FK, platform, external_url, external_post_id, status, publish_type, error_message, retry_count
  - auto_publish_settings 테이블: client_id UNIQUE, is_enabled, 플랫폼별 ON/OFF, publish_as_draft, add_canonical_url, add_schema_markup
  - lib/publishers/: 플랫폼별 퍼블리셔 모듈
    - index.ts: 공통 인터페이스 (PublishResult, BlogAccountForPublish, ContentForPublish, PublishOptions) + 라우터
    - tistory-publisher.ts: Tistory Open API /post/write, OAuth 토큰 교환, 블로그 정보 조회, 카테고리 조회
    - wordpress-publisher.ts: WordPress REST API /wp-json/wp/v2/posts, Basic Auth (Application Password)
    - medium-publisher.ts: Medium API /v1/users/{authorId}/posts, Integration Token, 마크다운 네이티브 지원
    - markdown-to-html.ts: marked 기반 MD→HTML 변환 + Schema.org 마크업 (FAQ/Article/LocalBusiness) + canonical 태그
  - lib/actions/publish-actions.ts: 발행 핵심 로직
    - executePublish(): 발행 실행 (계정 조회 → publications INSERT → publishContent() → 결과 저장 → contents UPDATE)
    - retryPublish(): 재시도 (최대 3회)
    - checkAutoPublish(): 자동 발행 트리거 (QC 통과 후, 활성 채널 순회, 기본 계정 선택)
    - getAutoPublishSettings() / updateAutoPublishSettings(): 자동 발행 설정 UPSERT
    - getPublications(): 발행 이력 조회 (joined content_title, account_name)
    - testBlogConnection(): 통합 연동 테스트 (플랫폼별 분기)
    - createApiKeyAccount(): API키/토큰 기반 계정 생성 (WordPress/Medium)
    - setDefaultAccount(): 기본 계정 토글
    - getClientBlogAccounts(): 플랫폼별 연결 계정 조회
  - app/api/auth/tistory/callback/route.ts: Tistory OAuth 콜백 (code→access_token 교환 → 블로그 정보 → blog_accounts INSERT)
  - components/blog-accounts/blog-accounts-client.tsx: API 연동 다이얼로그 (Tistory OAuth / WordPress API / Medium Token), 기본 계정 토글, 연동 테스트
  - app/(dashboard)/ops/contents/[id]/publish/publish-wizard.tsx: 발행 위저드 업그레이드 (수동 발행 + 자동 발행 2옵션, 플랫폼 선택, 계정 드롭다운, 결과 표시)
  - app/(dashboard)/publish/page.tsx: 발행 관리 3탭 업그레이드
    - 대기 탭: 기존 유지
    - 이력 탭: publications 테이블 연동 (플랫폼 아이콘, 수동/자동 유형, 상태 배지, 재시도 카운트)
    - 자동 탭: AutoPublishSettingsClient (마스터 토글, 채널별 ON/OFF, 발행 옵션)
  - components/publish/auto-publish-settings-client.tsx: 자동 발행 설정 UI (3카드: 토글/채널/옵션)
  - content-generate-actions.ts: QC 통과 후 checkAutoPublish() 자동 트리거 (실패해도 파이프라인 블로킹 없음)
  - 서비스 정책: 자동 발행=무료 (포인트 차감 없음), 기본 OFF, WordPress/Medium은 서버 env 불필요 (클라이언트 입력)
  - 환경변수: TISTORY_CLIENT_ID, TISTORY_CLIENT_SECRET, TISTORY_REDIRECT_URI (모두 optional)
  - tsc --noEmit 통과
- Phase 7-10: 프롬프트 편집 + 진화지식 + 니치 키워드 + 검색량 + 리포트 AEO (2026-03-07)
  - scripts/migrations/061_phase7_10.sql: evolving_knowledge 확장 (knowledge_type, title, description, evidence, confidence, is_active, learned_at) + keywords 확장 (monthly_search_volume, pc_volume, mobile_volume, competition, volume_updated_at)
  - lib/prompt-loader.ts: 프롬프트 동적 로딩 시스템 (agent_prompts 테이블 PROMPT_REGISTRY 타입, 10개 기본 프롬프트, DB 우선 + fallback)
    - loadPromptTemplate(agentKey): DB 조회 → 없으면 DEFAULT_PROMPTS fallback
    - fillPromptTemplate(template, vars): {variable} + {{variable}} 양식 치환
    - getPromptRegistry/savePromptRegistry/restorePromptDefault: 레지스트리 CRUD (버전 관리)
  - lib/actions/prompt-registry-actions.ts: 서버 액션 래퍼 (getPromptRegistryAction, savePromptAction, restoreDefaultAction)
  - components/ops/prompt-registry-client.tsx: 프롬프트 편집 UI (PromptCard 확장/축소, 변수 칩, 저장/복원, dirty state)
  - app/(dashboard)/ops/agent-settings/page.tsx: "프롬프트 관리" 탭 추가 (4탭: 프롬프트/콘텐츠프롬프트/진화지식/프롬프트관리)
  - lib/actions/knowledge-actions.ts: 진화지식 학습 (runKnowledgeLearning → Claude AI 패턴 분석 → evolving_knowledge INSERT)
  - components/analytics/knowledge-learning-section.tsx: 학습 실행 버튼 + 통계 카드 (패턴수, 마지막 학습, 범위)
  - lib/actions/keyword-volume-actions.ts: 네이버 검색량 API 래퍼 (queryKeywordVolume 5개 배치, registerKeywordsFromVolume, updateKeywordVolumes, checkNaverAdApiAvailable)
  - components/keywords/keyword-volume-tab.tsx: 검색량 조회 탭 (입력→조회→결과테이블→체크박스 선택→키워드 등록)
  - components/keywords/keywords-tabs-wrapper.tsx: "검색량 조회" 탭 추가
  - app/(dashboard)/keywords/page.tsx: volume 탭 지원 추가
  - components/keywords/niche-keyword-panel.tsx: 니치 키워드 AI 분석 패널 (난이도/기회/사유 + 체크박스 일괄 등록)
  - app/api/ai/niche-keywords/route.ts: 니치 키워드 AI 분석 API 라우트
  - lib/actions/report-actions.ts: AEOReportData 인터페이스 + getAEOReportData() 헬퍼 (aeo_scores, mentions, llm_answers 조회)
  - lib/pdf/monthly-report-template.tsx: AEO 노출 현황 페이지 추가 (Page 4, Score + 모델별 언급 + 상위 질문 + 미노출 질문)
  - app/(portal)/portal/reports/page.tsx: AEO 노출 현황 섹션 추가 (Score + 모델별 카드 + 상위 질문 리스트)
  - portal-actions.ts: getPortalReportV2에 AEO 데이터 (aeo_scores, mentions) 반환 추가
  - 프롬프트 DB 전환: question-actions.ts(3개), entity-content-actions.ts(1개), mention-detector.ts(1개), campaign-planning-actions.ts(1개) — 총 6개 하드코딩 프롬프트를 loadPromptTemplate+fillPromptTemplate으로 전환
  - 프롬프트 레지스트리 10개: question_engine, seo_writer, aeo_qa_writer, aeo_list_writer, aeo_entity_writer, qc_agent, cmo_strategy, niche_keyword, mention_detection, aeo_type_judge
  - tsc --noEmit 통과

- Phase AUTH-1: 인증 완전 통합 — Supabase Auth 단일화 + 구글/카카오 OAuth (2026-03-13)
  - scripts/migrations/064_auth_unification.sql: users.auth_provider 컬럼 + role CHECK에 viewer 추가 + handle_new_user 트리거 + admin_users DEPRECATED
  - lib/auth.ts: isAdminRole(), isClientRole(), getEffectiveClientId() 헬퍼 추가, UserRole에 'viewer' 추가
  - app/(public)/login/page.tsx: 구글/카카오 OAuth 버튼 추가 (Supabase Auth signInWithOAuth), 소셜 → 이메일 순서
  - app/auth/callback/route.ts: OAuth 콜백 (code→session 교환 → users.role 조회 → role 기반 리다이렉트)
  - lib/actions/auth-actions.ts: unifiedLogin() username 로그인 deprecated 메시지 추가
  - middleware.ts: Supabase Auth 기본 + HMAC deprecated 폴백, 포털↔어드민 역할 격리, /auth/callback 퍼블릭
  - lib/auth/admin-session.ts: getAdminSession() Supabase Auth 우선 → HMAC 폴백, AdminPayload 인터페이스 유지
  - lib/actions/admin-actions.ts: adminLogout() Supabase Auth + HMAC 쿠키 동시 클리어
  - 사전 조건: Supabase Dashboard에서 구글/카카오 OAuth provider 활성화 + 064 마이그레이션 실행 필요
  - tsc --noEmit 통과
- Phase PERSONA-1~3: 브랜드 페르소나 고도화 — 크롤링 80~90% 자동 + 업주 확인 4질문 + 콘텐츠 발행 보완 (2026-03-18)
  - EnhancedBrandPersona 타입 확장 (ai_inferred + owner_input + content_strategy + competitive_summary)
  - lib/utils/persona-compat.ts (신규): normalizePersona(), getPersonaForPipeline(), syncFlatFromEnhanced() 하위 호환 레이어
  - analysis-agent-chain.ts: CMO context에 homepage_url/sns_url/service_labels/image_count 추가, 저장 시 normalizePersona() 적용 + persona_version:2 태깅
  - 온보딩 리뉴얼 (/onboarding/refine): AI추론 5항목 확인 (타겟/톤/USP/콘텐츠방향/가격포지션) + 업주 4질문(브랜드스토리/금지콘텐츠/수상인증/가격표, 모두 선택)
  - refinement-actions.ts: applyAnalysisToProject에 aiInferred/ownerInput 파라미터 추가, syncFlatFromEnhanced로 flat↔nested 동기화
  - content-pipeline-v2.ts: getPersonaForPipeline() 경유 flat 필드 접근 + brand_story/forbidden_content/awards/usp_details/pain_points/price_position/special_emphasis 추가
  - content-qc-v2.ts: forbidden_content 검수 필드 추가 (avoid_angles와 별도로 전달)
  - blog-publish-flow.tsx Step 2: 페르소나 기반 pre-fill (USP/톤/타겟/브랜드스토리/수상인증/금지사항 표시) + 보완사항 입력
  - publishing-account-actions.ts: getBrandAnalysisForPublishing 폴백에 ai_inferred.tone 보강
  - tsc --noEmit 통과, npm run build 성공

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

### 완료된 Phase 목록

| 순서 | Phase | 핵심 내용 | 상태 |
|------|-------|----------|------|
| 1 | **F-1** | AI 인프라 — 에이전트 실행 엔진 + 기준 테이블 + 프롬프트 시딩 | ✅ 완료 |
| 2 | **F-2** | 분석 고도화 — 경쟁사 분석 + 페르소나 + SEO 코멘트 + 개선포인트 | ✅ 완료 |
| 3 | **F-3** | 키워드 고도화 — 니치 키워드 확장 + 공략 전략 + 키워드 UI 개편 | ✅ 완료 |
| 4 | **F-4** | 콘텐츠 품질 고도화 — 벤치마킹 + 작성 v2 + QC v2 + 재작성 루프 | ✅ 완료 |
| 5 | **G-1** | 월간 PDF 리포트 + 이메일 발송 + 어드민 설정 | ✅ 완료 |
| 6 | **PIPE-1** | 캠페인 기획 + 에디터 브릿지 (실전 파이프라인 UI) | ✅ 완료 |
| 7 | **UX-P0** | P0 크리티컬 이슈 수정 (error.tsx + not-found.tsx + 설정 정리 + 랜딩 정리) | ✅ 완료 |
| 8 | **UX-P1** | P1 UX 개선 (loading.tsx + EmptyState + Breadcrumb + sidebar/timeout/XSS fix) | ✅ 완료 |
| 9 | **STRUCT-1** | 서비스 구조 정리 — 계정관리, 역할메뉴, 브랜드뷰, 온보딩 플로우 | ✅ 완료 |
| 10 | **ERR-1** | 에러 모니터링 시스템 — Slack 알림 + 에러 로그 관리 페이지 | ✅ 완료 |
| 11 | **FIX-1** | 페르소나 버그 수정 + 분석→페르소나 자동생성 + 포털 분석결과 표시 | ✅ 완료 |
| 12 | **DEV-0** | AI 오케스트레이션 개발 시스템 셋업 (ai-team, tasks, prompts, docs) | ✅ 완료 |
| 13 | **IA-1** | IA 구조 변경 — SEO & AEO 메뉴 통합 + 탭 구조 + URL 리디렉트 | ✅ 완료 |
| 14 | **ONBOARD-1** | 브랜드 분석 → 프로젝트 자동 생성 (보완하기/재분석/프로젝트시작/반영하기) | ✅ 완료 |
| 15 | **Phase 3** | 질문 엔진 + 포인트 시스템 + AEO 콘텐츠 자동 생성 | ✅ 완료 |
| 16 | **Phase 4+5** | LLM 크롤링 + Mention Detection + AEO Score + 추적 큐 + 엔티티 콘텐츠 | ✅ 완료 |
| 17 | **Phase 6** | 자동 배포 엔진 — Tistory/WordPress/Medium + OAuth + 자동발행 | ✅ 완료 |
| 18 | **Phase 7-10** | 프롬프트 편집 + 진화지식 + 니치 키워드 + 검색량 + 리포트 AEO | ✅ 완료 |
| 19 | **AUTH-1** | 인증 통합 — Supabase Auth 단일화 + 구글/카카오 OAuth + HMAC deprecated | ✅ 완료 |
| 20 | **PERSONA-1~3** | 브랜드 페르소나 고도화 — EnhancedBrandPersona + 온보딩 리뉴얼 + 콘텐츠 보완 | ✅ 완료 |

### 미구현 (우선순위 순)

| # | 기능 | 우선순위 |
|---|------|---------|
| 1 | **Vercel 도메인 연결** (커스텀 도메인 + SSL) | 높음 |
| 3 | **구글 상위노출** (마케팅점수 15점 자리 비어있음) | 중간 |
| 4 | **홈페이지 SEO/AEO 분석** (크롤링 → meta/schema/heading) | 중간 |
| 5 | **검색량 트렌드 차트** (DataLab 12개월) | 낮음 |
| 6 | **소스 매칭 AI** (규칙 기반 → AI 업그레이드) | 나중 |

---

## 9. 핵심 ID / 환경변수

- Workspace: 2d716b35-407e-45bf-8941-60bce627d249
- 캠핏 client_id: d9af5297-de7c-4353-96ea-78ba0bb59f0c
- 어드민: admin / admin1234
- **Vercel 배포 URL**: https://waide.vercel.app (프로덕션)
- **Vercel 프로젝트**: fiftycompanies-projects/web, 리전: icn1 (서울)
- agents/.env: NSERP_EC2_URL, NSERP_EC2_SECRET, SUPABASE_URL/KEY, ANTHROPIC_API_KEY, SLACK_BOT_TOKEN, TAVILY_API_KEY
- apps/web/.env.local: SUPABASE URLs, NAVER_AD_API_KEY/SECRET_KEY/CUSTOMER_ID, ANTHROPIC_API_KEY, SERPER_API_KEY, RESEND_API_KEY, CRON_SECRET, REPORT_FROM_EMAIL, PERPLEXITY_API_KEY, OPENAI_SESSION_COOKIE, GOOGLE_SESSION_COOKIE, PROXY_URL
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
| 053 | keyword_visibility에 rank_google, visibility_score_google 컬럼 추가 | **SQL 생성 완료** |
| 054 | clients.metadata JSONB + report_deliveries 테이블 (월간 리포트 발송 이력) | **SQL 생성 완료** |
| 055 | admin_users CHECK 재생성 (sales 역할 추가) | **SQL 생성 완료** |
| 056 | error_logs 테이블 (에러 모니터링, status/error_type CHECK, 3 인덱스) | **SQL 생성 완료** |
| 057 | brand_analyses 보완 컬럼 (refined_keywords/strengths/appeal/target, refinement_count, last_refined_at) | **SQL 생성 완료** |
| 058 | questions + client_points + point_transactions + point_settings 테이블 + contents 확장 (content_type, question_id) | **SQL 생성 완료** |
| 059 | llm_answers + mentions + aeo_scores + aeo_tracking_queue + aeo_tracking_settings 테이블 + point_transactions 'refund' + contents 'aeo_entity' | **SQL 생성 완료** |
| 060 | blog_accounts 확장 (auth_type/access_token/api_key/is_default 등) + publications + auto_publish_settings 테이블 | **SQL 생성 완료** |
| 061 | evolving_knowledge 확장 (knowledge_type/title/description/evidence/confidence/is_active/learned_at) + keywords 확장 (monthly_search_volume/pc_volume/mobile_volume/competition/volume_updated_at) | **SQL 생성 완료** |
| 064 | AUTH 통합: users.auth_provider 컬럼 + role CHECK에 viewer 추가 + handle_new_user 트리거 + admin_users DEPRECATED 주석 | **SQL 생성 완료** |
| 068 | 상담 CRM: consultation_requests 확장 (status CHECK 5→6, assigned_to/notes/interested_items/brand_name/marketing_score/channel/follow_up_date/consultation_date/last_activity_at 컬럼, 인덱스 4개) | **SQL 생성 완료** |

> ⚠️ 045~068: scripts/migrations/ 디렉토리에 SQL 파일 생성. Supabase Dashboard에서 실행 필요.

---

## 11. 반복 에러 패턴

- brand_persona 접근: 반드시 getPersonaForPipeline() 통해서 flat 필드 접근 (직접 접근하면 v1/v2 구조 불일치)
- persona_version 체크: v1(flat만)과 v2(nested) 혼재 → normalizePersona()로 정규화 필수
- owner_input.forbidden_content: avoid_angles와 별도 필드. QC에서 둘 다 체크. syncFlatFromEnhanced()가 자동 병합.
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
- Playwright optional dependency: `import("playwright")` 하면 Turbopack이 번들링 시도 → `Function("m", "return import(m)")("playwright")` 사용 필수
- Supabase query builder에는 `.catch()` 없음 → `.then(({ error }) => { if (error) ... })` 패턴 사용
- AEO 추적 포인트 정책: 추적 자체는 무료, 콘텐츠 생성만 1포인트, 실패 시 refundPoints() 자동 환불
- apps/web에 실체 파일 생성 금지: 소스 원본은 루트에만 존재. `apps/web/app`, `apps/web/lib` 등은 루트의 심볼릭 링크. apps/web에 별도 파일을 만들면 동기화 불일치로 Vercel 배포 실패.
- ★ /dashboard 단일 진입 위반 금지: 모든 유효 역할(ALL_VALID_ROLES: admin+client 모두)은 /dashboard로 진입. client_owner/client_member를 /portal로 리다이렉트하는 코드 작성 절대 금지. 역할별 UI 차이는 컴포넌트 레벨에서 분기. middleware에서 역할별 라우트 분리 금지. fail-closed 원칙 (역할 조회 실패 시 /login으로).

---

## 12. AI 오케스트레이션 개발 시스템 (Phase DEV-0)

### 전체 로드맵

- MASTER_ROADMAP.md 참조 (프로젝트 루트)
- Phase 0~10, SEO+AEO 통합 재설계

### 에이전트 역할 정의

- ai-team/ 폴더의 각 .md 파일 참조
- CTO Agent: 전체 오케스트레이션 (ai-team/cto.md)
- Analysis Dev: 키워드/질문/경쟁사/Gap (ai-team/analysis-dev.md)
- Content Dev: SEO/AEO 콘텐츠/QC/배포 (ai-team/content-dev.md)
- Tracking Dev: SERP/LLM/언급/스코어 (ai-team/tracking-dev.md)
- Infra Dev: DB/배포/크론/모니터링 (ai-team/infra-dev.md)

### Task 기반 워크플로우

- tasks/ 폴더에 task 파일 생성 (tasks/README.md 참조)
- 상태: pending → in_progress → done
- 네이밍: task_NNN_제목.md
- PM이 기획 → task 파일 작성 → Claude Code에 "pending task 실행해" 지시

### 프로젝트 추가 디렉토리

- ai-team/: 에이전트 역할 정의
- tasks/: 작업 큐 (파일 기반)
- prompts/: 에이전트용 프롬프트 저장
- docs/: 설계 문서 (architecture.md 등)
- MASTER_ROADMAP.md: 전체 Phase 로드맵
