# Waide 코드베이스 종합 분석

> 분석일: 2026-03-11
> 소스 코드 직접 조사 기반
> 코드 수정 없음 — 조사 전용

---

## 조사 1: 앱 라우트 전체 구조

### 1-1. 라우트 그룹 구성

| 라우트 그룹 | 테마 | 인증 | 용도 |
|------------|------|------|------|
| `(public)` | 다크 | 없음 | 랜딩, 분석결과, 로그인/가입 |
| `(portal)` | 라이트 | Supabase Auth | 고객 포털 |
| `(dashboard)` | 라이트 | HMAC-SHA256 | 어드민 대시보드 |

### 1-2. 퍼블릭 라우트 `(public)`

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `app/(public)/page.tsx` | 랜딩 (URL 입력 → 분석 유도) |
| `/login` | `app/(public)/login/page.tsx` | 통합 로그인 (아이디=어드민, 이메일=고객 자동 구분) |
| `/signup` | `app/(public)/signup/page.tsx` | 회원가입 (초대 토큰 지원) |
| `/invite/[token]` | `app/(public)/invite/[token]/page.tsx` | 초대 수락 → 가입 리다이렉트 |
| `/analysis/[id]` | `app/(public)/analysis/[id]/page.tsx` | 분석 결과 (마케팅 점수, SEO 진단, CTA) |
| `/analysis/loading` | `app/(public)/analysis/loading/page.tsx` | 분석 로딩 (2초 폴링, 120초 타임아웃) |
| `/onboarding/refine` | `app/(public)/onboarding/refine/page.tsx` | 프로젝트 시작 (분석 → 보완 → 반영) |

### 1-3. 포털 라우트 `(portal)`

| 경로 | 파일 | 줄수 | 설명 |
|------|------|------|------|
| `/portal` | `portal/page.tsx` | 649 | 대시보드 (KPI 4종, 브랜드 요약, 체크리스트, 타임라인) |
| `/portal/analysis` | `portal/analysis/page.tsx` | ~80 | 브랜드 분석 결과 (AnalysisResultView portal variant) |
| `/portal/keywords` | `portal/keywords/page.tsx` | 509 | 키워드 관리 (4탭: 활성/AI추천/질문/보관) |
| `/portal/contents` | `portal/contents/page.tsx` | 7 | 콘텐츠 현황 (→ PortalContentsClient) |
| `/portal/reports` | `portal/reports/page.tsx` | 476 | 월간 리포트 (차트, 순위, AEO) |
| `/portal/settings` | `portal/settings/page.tsx` | 257 | 설정 (프로필, 비밀번호, 구독) |
| `/portal/blog` | `portal/blog/page.tsx` | 5 | 블로그 관리 (→ PortalBlogClient) |
| `/portal/write` | `portal/write/page.tsx` | 7 | 콘텐츠 작성 (→ PortalWriteClient) |

### 1-4. 어드민 라우트 `(dashboard)` — 주요 페이지

#### 서비스 (SEO & AEO)
| 경로 | 설명 |
|------|------|
| `/dashboard` | B2B KPI (MRR, 고객수, 이탈률, 평균점수) + SEO 운영 |
| `/keywords` | 키워드 관리 (5탭: 키워드/질문/검색량/전략) |
| `/keywords/[id]` | 키워드 상세 (순위 트렌드, 연결 콘텐츠, 계정 성과) |
| `/contents` | 콘텐츠 관리 (3탭: 목록/생성/작업현황) |
| `/contents/[id]` | 콘텐츠 상세 (ContentEditor + 발행) |
| `/contents/[id]/publish` | 발행 위저드 (3스텝) |
| `/publish` | 발행 관리 (3탭: 대기/이력/자동설정) |
| `/analytics` | 성과 분석 (4탭: SEO/AEO 노출/경쟁/Citation) |

#### 고객 관리
| 경로 | 설명 |
|------|------|
| `/ops/clients` | 고객 포트폴리오 (카드뷰, 상태필터, At Risk) |
| `/ops/clients/[id]` | 고객 상세 (10탭) |
| `/ops/onboarding` | 온보딩 관리 (체크리스트, 진행률) |
| `/brands` | 브랜드 관리 |
| `/ops/accounts-management` | 계정 관리 (사용자 CRUD) |

#### 비즈니스
| 경로 | 설명 |
|------|------|
| `/ops/revenue` | 매출 관리 (MRR/ARR, 플랜 분포) |
| `/ops/churn` | 이탈 관리 (At Risk, 이탈률) |
| `/ops/products` | 상품 관리 (패키지 CRUD) |
| `/ops/points` | 포인트 관리 (3탭: 잔액/거래/설정) |

#### 영업 CRM
| 경로 | 설명 |
|------|------|
| `/ops/analysis-logs` | 분석 로그 (CRM 파이프라인) |
| `/ops/analysis-logs/[id]` | 분석 상세 (4탭 + 할당) |
| `/ops/sales-agents` | 영업사원 관리 + 성과 |

#### 리소스
| 경로 | 설명 |
|------|------|
| `/blog-accounts` | 블로그 계정 + 등급 |
| `/sources` | 소스 라이브러리 |
| `/ops/scheduler` | 자동 스케줄러 |

#### 설정
| 경로 | 설명 |
|------|------|
| `/ops/agent-settings` | 에이전트 설정 (4탭: 프롬프트/콘텐츠프롬프트/진화지식/프롬프트관리) |
| `/ops/aeo-settings` | AEO 추적 설정 |
| `/ops/scoring-settings` | 점수 가중치 |
| `/ops/serp-settings` | SERP 설정 |
| `/ops/settings` | API 설정 |
| `/ops/error-logs` | 에러 모니터링 |
| `/settings/admins` | 어드민 관리 (super_admin 전용) |

### 1-5. URL 리디렉트 매핑

| 이전 경로 | 새 경로 |
|----------|---------|
| `/ops/contents` | `/contents` |
| `/ops/jobs` | `/contents?tab=jobs` |
| `/campaigns/plan` | `/contents?tab=create` |
| `/clients` | `/ops/clients` |
| `/accounts` | `/ops/accounts-management` |
| `/settings/agents` | `/ops/agent-settings` |

### 1-6. API 라우트

| API 경로 | 메서드 | 기능 |
|----------|--------|------|
| `/api/analyze` | POST | 브랜드 분석 시작 |
| `/api/analyze/[id]` | GET | 분석 상태/결과 조회 |
| `/api/analyze/[id]/edit` | POST | 분석 결과 수정 |
| `/api/analyze/[id]/refine` | POST | 보완 데이터 저장 + 재분석 |
| `/api/brand/analyze` | POST | 브랜드 분석 (내부) |
| `/api/consultation` | POST | 상담 신청 → CRM 자동연동 |
| `/api/auth/tistory/callback` | GET | Tistory OAuth 콜백 |
| `/api/ai/niche-keywords` | POST | 니치 키워드 AI 분석 |
| `/api/portal/report-pdf` | GET | PDF 리포트 다운로드 |
| `/api/cron/serp` | GET | 일일 SERP 수집 |
| `/api/cron/search-volume` | GET | 검색량 수집 |
| `/api/cron/grading` | GET | 계정 등급/난이도 산출 |
| `/api/cron/monthly-report` | GET/POST | 월간 리포트 자동 발송 |
| `/api/cron/aeo` | GET | AEO 추적 (매일 04:00 KST) |

---

## 조사 2: 어드민 페이지 + 기능 상세

### 2-1. 사이드바 메뉴 구조 (6그룹)

#### 그룹 1: 서비스 (5개)
| 메뉴 | URL | 아이콘 | 권한 |
|------|-----|--------|------|
| 대시보드 | `/dashboard` | LayoutDashboard | 전체 |
| 키워드 관리 | `/keywords` | Search | 전체 |
| 콘텐츠 관리 | `/contents` | FileText | sales 포함 |
| 발행 관리 | `/publish` | Send | admin+ |
| 성과 분석 | `/analytics` | BarChart3 | sales 포함 |

#### 그룹 2: 고객 관리 (4개)
| 메뉴 | URL | 아이콘 | 권한 |
|------|-----|--------|------|
| 고객 포트폴리오 | `/ops/clients` | Building2 | sales 포함 |
| 온보딩 관리 | `/ops/onboarding` | ClipboardList | sales 포함 |
| 브랜드 관리 | `/brands` | Store | sales 포함 |
| 계정 관리 | `/ops/accounts-management` | Users | admin+ |

#### 그룹 3: 비즈니스 (3개)
| 메뉴 | URL | 권한 |
|------|-----|------|
| 매출 관리 | `/ops/revenue` | admin+ |
| 상품 관리 | `/ops/products` | admin+ |
| 포인트 관리 | `/ops/points` | admin+ |

#### 그룹 4: 영업 CRM (2개)
| 메뉴 | URL | 권한 |
|------|-----|------|
| 분석 로그 | `/ops/analysis-logs` | sales 포함 |
| 영업사원 관리 | `/ops/sales-agents` | admin+ |

#### 그룹 5: 리소스 (3개)
| 메뉴 | URL | 권한 |
|------|-----|------|
| 블로그 계정 | `/blog-accounts` | admin+ |
| 소스 라이브러리 | `/sources` | admin+ |
| 자동 스케줄러 | `/ops/scheduler` | admin+ |

#### 그룹 6: 설정 (6개)
| 메뉴 | URL | 권한 |
|------|-----|------|
| 에이전트 설정 | `/ops/agent-settings` | admin+ |
| AEO 설정 | `/ops/aeo-settings` | admin+ |
| 점수 가중치 | `/ops/scoring-settings` | admin+ |
| SERP 설정 | `/ops/serp-settings` | admin+ |
| API 설정 | `/ops/settings` | admin+ |
| 에러 로그 | `/ops/error-logs` | admin+ |
| 어드민 관리 | `/settings/admins` | super_admin |

### 2-2. 역할 기반 메뉴 필터링

| 역할 | 접근 범위 |
|------|----------|
| `super_admin` | 전체 메뉴 |
| `admin` | 전체 메뉴 (어드민 관리 제외) |
| `viewer` | 전체 메뉴 (읽기 전용) |
| `sales` | 대시보드, 고객포트폴리오, 온보딩, 브랜드, 성과분석, 콘텐츠, 분석로그 |

### 2-3. 고객 상세 10탭

| 탭 | 내용 |
|----|------|
| 개요 | 기본 정보, 마케팅 분석 실행 UI |
| 키워드 | 키워드 목록 + 관리 |
| 콘텐츠 | 생성 콘텐츠 목록 |
| 분석이력 | brand_analyses 이력 |
| 순위 | SERP 순위 (네이버+구글), 요약 카드 4종 |
| 페르소나 | 브랜드 페르소나 표시/수정/재생성 |
| 구독 | 구독 정보 + 플랜 |
| 온보딩 | 7항목 체크리스트 |
| 계정 | 포털 계정 연결/해제/초대 |
| 리포트 | 월간 리포트 설정/발송/이력 |

---

## 조사 3: 어드민 키워드 관리 상세

### 3-1. 키워드 관련 Server Actions (4파일)

#### keyword-actions.ts
| 함수 | 설명 |
|------|------|
| `getKeywords(clientId)` | 전체 키워드 조회 (client_id null 시 전체) |
| `createKeyword(payload)` | 단일 키워드 생성 |
| `updateKeywordStatus(id, status)` | 상태 변경 (active/paused/archived/queued/refresh/suggested) |
| `archiveKeyword(id)` | 소프트 삭제 (→ archived) |
| `getKeyword(id)` | 단일 조회 |
| `getContentsByKeyword(keywordId)` | 키워드 연결 콘텐츠 |
| `getSerpByKeyword(keywordId)` | SERP 순위 이력 (PC/MO 일자별 병합) |
| `getAccountPerfByKeyword(keywordId)` | 계정 성과 메트릭 |
| `bulkCreateKeywords(clientId, rows)` | CSV 대량 등록 (100건 배치) |
| `refreshKeywordSearchVolume(keywordId)` | 단일 검색량 갱신 |
| `refreshBulkKeywordSearchVolume(clientId)` | 일괄 검색량 갱신 (레이트 리밋) |
| `triggerSerpCheck(keywordId)` | 단일 SERP 수집 |
| `triggerAllSerpCheck()` | 전체 SERP 수집 |
| `triggerClientSerpCheck(clientId)` | 고객사별 SERP 수집 (네이버+구글 병렬) |
| `getClientRankings(clientId)` | 순위 요약 (visibility 메트릭) |
| `searchKeywordVolumes(keywords)` | 네이버 검색량 조회 |

#### keyword-expansion-actions.ts
| 함수 | 설명 |
|------|------|
| `expandNicheKeywords()` | 니치 키워드 확장 (네이버 수집 → RND AI) |
| `getClientMainKeywords()` | 메인 키워드 조회 |
| `approveSuggestedKeyword(id)` | AI 추천 키워드 승인 (→ active) |
| `rejectSuggestedKeyword(id)` | AI 추천 키워드 거절 (→ archived) |
| `bulkApproveSuggestedKeywords(ids)` | 일괄 승인 |

#### keyword-strategy-actions.ts
| 함수 | 설명 |
|------|------|
| `generateKeywordStrategy(clientId)` | CMO 키워드 전략 생성 (Quick Win/니치/방어) |
| `getKeywordStrategy(clientId)` | 키워드 전략 조회 |

#### keyword-volume-actions.ts
| 함수 | 설명 |
|------|------|
| `queryKeywordVolume(keywords)` | 네이버 광고 API 검색량 조회 (5개 배치) |
| `registerKeywordsFromVolume(clientId, keywords)` | 검색량 결과에서 키워드 등록 |
| `updateKeywordVolumes(clientId)` | 기존 키워드 검색량 갱신 |
| `checkNaverAdApiAvailable()` | API 키 설정 여부 확인 |

### 3-2. keywords 테이블 구조

```
id, keyword, sub_keyword, client_id, status, priority,
monthly_search_pc, monthly_search_mo, monthly_search_total,
monthly_search_volume, pc_volume, mobile_volume,
competition, mobile_ratio, difficulty_score, opportunity_score,
current_rank_naver_pc, current_rank_naver_mo, current_rank_google,
rank_change_pc, rank_change_mo,
metadata (JSONB: content_angle, search_intent, relevance, reason),
source, is_tracking, last_checked_at, volume_updated_at,
created_at, updated_at
```

**status CHECK**: `active`/`paused`/`archived`/`queued`/`refresh`/`suggested`

### 3-3. keyword_rank_history 테이블

**존재하지 않음** — 코드베이스 전체 검색 결과 이 테이블은 사용되지 않음. 순위 이력은 `keyword_visibility` 테이블과 `serp_results` 테이블에 저장.

---

## 조사 4: 어드민 콘텐츠 관리 상세

### 4-1. 콘텐츠 관련 Server Actions

#### ops-actions.ts (주요 함수)
| 함수 | 설명 |
|------|------|
| `getContents(params)` | 콘텐츠 목록 (clientId, status, limit 필터) |
| `getContent(id)` | 콘텐츠 상세 (body, metadata 포함) |
| `updateContent(id, payload)` | 콘텐츠 수정 |
| `deleteContent(id)` | 삭제 |
| `updatePublishedUrl(id, url)` | 발행 URL 등록 → is_tracking=true |
| `getJobs(params)` | 작업 목록 (status, client_id 필터) |
| `getJob(id)` | 작업 상세 |
| `updateJobStatus(id, status)` | 작업 상태 변경 |
| `createJob(payload)` | 작업 생성 |

#### content-generate-actions.ts
| 함수 | 설명 |
|------|------|
| `generateContentV2(params)` | 통합 콘텐츠 생성 (벤치마크+페르소나+중복회피+AEO) |
| `processContentJobs()` | CONTENT_CREATE Job 배치 처리 |

### 4-2. 콘텐츠 생성 파이프라인 v2

```
triggerContentGeneration() → jobs INSERT (CONTENT_CREATE)
  ↓
processContentJobs() → generateContentV2()
  ↓
[1] RND content_benchmark (네이버 TOP5 벤치마킹)
  ↓
[2] COPYWRITER content_create_v2 (해요체 + AEO + 비교표)
  ↓
[3] QC qc_review_v2 (8항목 100점)
  ↓
[4a] PASS (70점+) → contents INSERT (approved) → checkAutoPublish()
[4b] FAIL → COPYWRITER content_rewrite → QC 재검수 (최대 2회)
```

### 4-3. contents 테이블 구조

```
id, keyword_id, account_id (FK → blog_accounts), client_id, job_id,
title, body, meta_description, tags[], image_urls[],
content_type, publish_status, published_url, published_at,
qc_score, similarity_score, quality_score, word_count,
seo_score, rejection_reason, generated_by,
metadata (JSONB: qc_score, qc_pass, qc_result, rewrite_history),
is_active, is_tracking, question_id,
created_at, updated_at
```

**content_type CHECK**: `blog_list`/`blog_review`/`blog_info`/`aeo_qa`/`aeo_list`/`aeo_entity`/`single`/`list`/`review`/`info`
**publish_status CHECK**: `draft`/`review`/`approved`/`published`/`rejected`/`archived`

---

## 조사 5: 발행 플로우 상세

### 5-1. 발행 관련 Server Actions (publish-actions.ts)

| 함수 | 설명 |
|------|------|
| `executePublish(params)` | 발행 실행 (계정 조회 → publications INSERT → publishContent → 결과 저장) |
| `retryPublish(publicationId)` | 재시도 (최대 3회) |
| `checkAutoPublish(contentId, clientId)` | QC 통과 후 자동 발행 트리거 |
| `getAutoPublishSettings(clientId)` | 자동 발행 설정 조회 |
| `updateAutoPublishSettings(clientId, updates)` | 자동 발행 설정 UPSERT |
| `getPublications(params)` | 발행 이력 조회 |
| `testBlogConnection(params)` | 연동 테스트 (Tistory/WordPress/Medium) |
| `createApiKeyAccount(params)` | API키 기반 계정 생성 |
| `setDefaultAccount(accountId, clientId)` | 기본 계정 토글 |
| `getClientBlogAccounts(clientId, platform?)` | 연결 계정 조회 |

### 5-2. 지원 플랫폼

| 플랫폼 | 인증 방식 | 퍼블리셔 모듈 |
|--------|----------|-------------|
| Tistory | OAuth (access_token) | `tistory-publisher.ts` |
| WordPress | API Key (Application Password) | `wordpress-publisher.ts` |
| Medium | Integration Token | `medium-publisher.ts` |
| Naver | 수동 (마크다운 복사) | 없음 |
| Brunch | 수동 | 없음 |

### 5-3. 발행 플로우

```
[수동 발행]
  콘텐츠 상세 → 마크다운 복사 → 블로그 수동 등록 → URL 입력 → updatePublishedUrl()

[자동 발행]
  QC PASS → checkAutoPublish()
    ↓ auto_publish_settings 확인
    ↓ 채널별 기본 계정 조회
    ↓ executePublish() per channel
    ↓ publications INSERT
    ↓ contents UPDATE (published_url, publish_status='published', is_tracking=true)
```

### 5-4. 관련 테이블

| 테이블 | 용도 |
|--------|------|
| `blog_accounts` | 계정 관리 (platform, auth_type, access_token, api_key 등) |
| `publications` | 발행 이력 (status: pending/publishing/published/failed) |
| `auto_publish_settings` | 자동 발행 설정 (마스터 토글, 채널별 ON/OFF) |

---

## 조사 6: 포털 페이지 + 기능 상세

### 6-1. 포털 레이아웃 구조

```
app/(portal)/layout.tsx (37줄)
  ├─ getCurrentUser() → 미인증 → /login 리다이렉트
  ├─ client_id 없음 → PortalPendingPage (리다이렉트 루프 방지)
  └─ PortalShell (user, clientId props)
       ├─ 상단 헤더 (로고, 브랜드명, 데스크톱 네비)
       ├─ 모바일 하단 탭바
       ├─ hidden meta 태그 (clientId, userId)
       └─ KakaoFloatingButton
```

### 6-2. 포털 네비게이션 (8개)

| 순서 | 메뉴 | URL | 아이콘 |
|------|------|-----|--------|
| 1 | 대시보드 | `/portal` | Home |
| 2 | 브랜드 분석 | `/portal/analysis` | Activity |
| 3 | 블로그 작성 | `/portal/write` | PenLine |
| 4 | 콘텐츠 현황 | `/portal/contents` | FileText |
| 5 | 키워드 관리 | `/portal/keywords` | Search |
| 6 | 블로그 관리 | `/portal/blog` | Globe |
| 7 | 월간 리포트 | `/portal/reports` | BarChart3 |
| 8 | 설정 | `/portal/settings` | Settings |

### 6-3. 포털 clientId 전달 패턴

```
[서버] layout.tsx: getCurrentUser() → user.client_id
  ↓
[서버] PortalShell: <meta name="portal-client-id" content={clientId} />
  ↓
[클라이언트] 각 페이지: document.querySelector("meta[name='portal-client-id']").content
```

> 일부 페이지(keywords)는 server → client props 전환 완료 (FIX-7)

### 6-4. 포털 컴포넌트 (10파일)

| 파일 | 줄수 | 설명 |
|------|------|------|
| `portal-shell.tsx` | 148 | 셸 (네비, meta 태그, 로그아웃) |
| `portal-pending.tsx` | 97 | 계정 미연결 대기 화면 |
| `portal-contents-client.tsx` | 591 | 콘텐츠 현황 (2탭, 4필터, 상세보기, QC, 재작성이력) |
| `portal-blog-client.tsx` | 483 | 블로그 관리 (계정연동, 자동발행, 이력) |
| `portal-write-client.tsx` | 396 | 3단계 콘텐츠 작성 위저드 |
| `keyword-detail-modal.tsx` | 161 | 키워드 상세 (순위 차트 + 연결 콘텐츠) |
| `keyword-occupancy-section.tsx` | 61 | 키워드 점유율 (진행바 + 칩) |
| `publish-url-modal.tsx` | 135 | 발행 URL 입력 (플랫폼 선택) |
| `analysis-required-banner.tsx` | 237 | 분석 시작 배너 (4상태: idle/analyzing/completed/failed) |
| `kakao-floating-button.tsx` | 31 | 카카오톡 플로팅 버튼 |

### 6-5. 포털 대시보드 주요 섹션

1. 환영 카드 + 빠른 액션 링크
2. 온보딩 체크리스트 (진행바)
3. 키워드 순위 요약 (TOP3/TOP10)
4. KPI 4종 카드 (활성키워드, 이번달콘텐츠, AI추천대기, 평균QC)
5. 포인트 잔액 배너
6. AEO Visibility Score 카드
7. 마케팅 점수 (원형 차트 + 6영역 바)
8. 브랜드 페르소나 한줄 정리
9. 강점/약점 태그
10. AI 개선 제안 (TOP 3)
11. SEO 진단 코멘트
12. 최근 활동 타임라인
13. 담당 매니저 연락처

---

## 조사 7: 리포트 + 알림 + 스케줄러

### 7-1. 월간 리포트 시스템

#### Server Actions (report-actions.ts)
| 함수 | 설명 |
|------|------|
| `getMonthlyReportData(clientId, year, month)` | 리포트 데이터 수집 |
| `getReportSettings(clientId)` | 리포트 설정 조회 (ON/OFF, 수신 이메일) |
| `updateReportSettings(clientId, settings)` | 설정 업데이트 |
| `getReportDeliveries(clientId)` | 발송 이력 조회 |
| `generateAndSendReport(clientId)` | PDF 생성 + 이메일 발송 |
| `resendReport(deliveryId)` | 재발송 |

#### PDF 생성 파이프라인
```
getMonthlyReportData() → 데이터 수집
  ↓
generateReportPdf() → @react-pdf/renderer (NotoSansKR)
  ↓ 4페이지 PDF
  ├─ Page 1: KPI 요약
  ├─ Page 2: 콘텐츠 현황
  ├─ Page 3: 순위 현황
  └─ Page 4: AEO 노출 현황
  ↓
sendReportEmail() → Resend API (PDF 첨부)
```

#### 자동 발송 크론
- **경로**: `/api/cron/monthly-report`
- **스케줄**: 매월 1일 (0 0 1 * *)
- **배치**: 최대 10건/배치
- **조건**: `report_settings.enabled = true` + `recipient_email` 설정

### 7-2. 알림 시스템

#### notifications 테이블: **존재하지 않음**

알림은 전용 테이블 없이 다음 방식으로 처리:
- **Slack Webhook**: 분석 완료, 상담 신청, 에러 발생 시 Slack 채널로 알림
- **Toast UI**: `sonner` 라이브러리로 클라이언트 사이드 토스트 알림
- **에러 알림**: `lib/slack/error-notification.ts` (5분 중복 제거)

### 7-3. 크론 스케줄 (Vercel Cron)

| 크론 | 경로 | 스케줄 | 설명 |
|------|------|--------|------|
| SERP | `/api/cron/serp` | 매일 | 네이버+구글 순위 수집 |
| 검색량 | `/api/cron/search-volume` | 수동/분기 | 네이버 광고 API 검색량 |
| 등급 산출 | `/api/cron/grading` | 매일/주간 | 계정 등급 + 키워드 난이도 |
| 월간 리포트 | `/api/cron/monthly-report` | 매월 1일 | PDF 생성 + 이메일 발송 |
| AEO 추적 | `/api/cron/aeo` | 매일 04:00 KST | LLM 크롤링 + 언급 감지 (기본 비활성) |

### 7-4. vercel.json 크론 설정

```json
{
  "crons": [
    { "path": "/api/cron/serp", "schedule": "0 0 * * *" },
    { "path": "/api/cron/grading", "schedule": "0 2 * * 1" },
    { "path": "/api/cron/monthly-report", "schedule": "0 0 1 * *" },
    { "path": "/api/cron/search-volume", "schedule": "0 3 1 * *" },
    { "path": "/api/cron/aeo", "schedule": "0 4 * * *" }
  ]
}
```

---

## 조사 8: Server Actions 전체 인벤토리

### 8-1. 전체 파일 목록 (44파일)

| # | 파일 | 주요 함수 수 | DB 테이블 |
|---|------|------------|----------|
| 1 | `admin-actions.ts` | 1 | admin_users |
| 2 | `aeo-tracking-actions.ts` | 11 | llm_answers, mentions, aeo_scores, aeo_tracking_queue |
| 3 | `analysis-brand-actions.ts` | 8 | brand_analyses |
| 4 | `analysis-log-actions.ts` | 10 | brand_analyses, consultation_requests, sales_agents |
| 5 | `auth-actions.ts` | 7 | users, invitations (Supabase Auth) |
| 6 | `blog-account-actions.ts` | 3+ | blog_accounts, account_grades |
| 7 | `brand-actions.ts` | 15+ | clients, brand_personas, workspaces |
| 8 | `campaign-actions.ts` | 4 | campaigns, campaign_keywords, keywords |
| 9 | `campaign-planning-actions.ts` | 5 | keywords, contents, jobs, clients |
| 10 | `client-account-actions.ts` | 4 | users, invitations, clients |
| 11 | `client-portfolio-actions.ts` | 3 | clients, subscriptions, brand_analyses |
| 12 | `content-actions.ts` | 3 | contents, brand_personas (GPT-4o) |
| 13 | `content-generate-actions.ts` | 2 | contents, jobs, clients |
| 14 | `content-prompt-actions.ts` | 2 | content_prompts |
| 15 | `content-source-actions.ts` | 2 | content_sources |
| 16 | `dashboard-actions.ts` | 1 | subscriptions, clients, brand_analyses |
| 17 | `entity-content-actions.ts` | 1 | contents, clients |
| 18 | `error-log-actions.ts` | 5 | error_logs |
| 19 | `keyword-actions.ts` | 15+ | keywords, serp_results, keyword_visibility |
| 20 | `keyword-expansion-actions.ts` | 5 | keywords |
| 21 | `keyword-strategy-actions.ts` | 2 | keywords, brand_analyses |
| 22 | `keyword-volume-actions.ts` | 4 | keywords |
| 23 | `knowledge-actions.ts` | 2 | evolving_knowledge |
| 24 | `ops-actions.ts` | 9 | jobs, contents, blog_accounts |
| 25 | `persona-actions.ts` | 5 | clients (brand_persona JSONB) |
| 26 | `point-actions.ts` | 11 | client_points, point_transactions, point_settings |
| 27 | `portal-actions.ts` | 9 | 다수 (portal 전용) |
| 28 | `product-actions.ts` | 8 | products, subscriptions |
| 29 | `prompt-registry-actions.ts` | 3 | agent_prompts |
| 30 | `publish-actions.ts` | 10 | publications, auto_publish_settings, blog_accounts |
| 31 | `question-actions.ts` | 8 | questions, contents |
| 32 | `recommendation-actions.ts` | 2 | publishing_recommendations, jobs |
| 33 | `refinement-actions.ts` | 3 | brand_analyses, clients, keywords, users |
| 34 | `report-actions.ts` | 6 | clients, report_deliveries, keywords, contents |
| 35 | `revenue-actions.ts` | 1 | subscriptions, products, clients |
| 36 | `settings-actions.ts` | 3 | settings |
| 37 | `url-crawl-action.ts` | 1 | (외부 fetch) |

### 8-2. Portal 전용 Actions (portal-actions.ts)

| 함수 | 버전 | 설명 |
|------|------|------|
| `getPortalDashboard()` | V1 | 대시보드 데이터 (레거시) |
| `getPortalKeywords()` | V1 | 키워드 데이터 (레거시) |
| `getPortalContents()` | V1 | 콘텐츠 목록 (레거시) |
| `getPortalReport()` | V1 | 리포트 데이터 (레거시) |
| `getPortalDashboardV2()` | V2 | KPI + 브랜드 + 최근활동 + AEO + 개선제안 |
| `getPortalKeywordsV2()` | V2 | 3탭 키워드 + 전략 |
| `getPortalContentsV2()` | V2 | 상세 콘텐츠 + QC + 재작성이력 |
| `getPortalReportV2()` | V2 | 추이차트 + 순위 + AEO + AI활동 |
| `getPortalSettings()` | - | 사용자 설정 |
| `getPortalPointBalance()` | - | 포인트 잔액 |

> V1은 하위호환 유지, V2가 실제 사용

---

## 조사 9: 포털 ↔ 어드민 연결 포인트

### 9-1. 데이터 공유 테이블

| 테이블 | 어드민 | 포털 | 연결 키 |
|--------|--------|------|---------|
| `clients` | 생성/수정/관리 | 읽기 (brand_persona, name) | client_id |
| `keywords` | 생성/수정/관리/CSV등록 | 조회/승인/거절 | client_id |
| `contents` | 생성/편집/발행 | 조회/상세보기 | client_id |
| `brand_analyses` | 분석 실행/CRM | 조회/인라인 표시 | client_id |
| `blog_accounts` | 계정 관리/등급 | 연동/발행설정 | client_id |
| `subscriptions` | 생성/관리 | 읽기 (설정 페이지) | client_id |
| `sales_agents` | 등록/성과 관리 | 읽기 (담당 매니저) | assigned_sales_agent_id |
| `keyword_visibility` | SERP 크론 저장 | 순위 표시 | client_id |
| `aeo_scores` | 추적 실행 | 스코어 표시 | client_id |
| `publications` | 이력 관리 | 발행 이력 표시 | client_id |
| `questions` | 생성/관리 | 읽기 (질문 현황 탭) | client_id |
| `client_points` | 관리/지급/차감 | 잔액 표시 | client_id |

### 9-2. 공유 Server Actions

| 액션 | 어드민 호출 | 포털 호출 |
|------|-----------|----------|
| `approveSuggestedKeyword()` | 키워드 관리 | 포털 키워드 AI추천 탭 |
| `rejectSuggestedKeyword()` | 키워드 관리 | 포털 키워드 AI추천 탭 |
| `updateKeywordStatus()` | 키워드 상태 변경 | 포털 키워드 보관/복원 |
| `runBrandAnalysis()` | 고객 상세 개요탭 | 포털 분석 배너 |
| `getAnalysisStatus()` | 분석 폴링 | 포털 분석 폴링 |
| `getBrandAnalysis()` | 분석 결과 조회 | 포털 분석 페이지 |
| `executePublish()` | 발행 관리 | 포털 블로그 관리 |
| `testBlogConnection()` | 블로그 계정 | 포털 블로그 관리 |

### 9-3. 인증 경계

```
[어드민]                        [포털]
HMAC-SHA256                    Supabase Auth
admin_users 테이블              users 테이블
Cookie: admin_token             Cookie: sb-*-auth-token
middleware: verifyAdmin()       middleware: supabase.auth.getUser()
createAdminClient() (RLS bypass) createAdminClient() (RLS bypass)
```

> 두 시스템 모두 Server Actions에서는 `createAdminClient()` (service_role) 사용하여 RLS 바이패스

### 9-4. 데이터 흐름 시나리오

#### 시나리오 1: AI 키워드 추천 → 포털 승인

```
[어드민] suggestKeywordsForClient(clientId)
  → keywords INSERT (status='suggested')

[포털] getPortalKeywordsV2(clientId)
  → suggestedKeywords 표시

[포털] approveSuggestedKeyword(keywordId)
  → status='active'
  → 질문 자동 생성 트리거
```

#### 시나리오 2: 콘텐츠 생성 → 포털 확인

```
[어드민] triggerContentGeneration(params)
  → jobs INSERT → processContentJobs()
  → generateContentV2() → QC → checkAutoPublish()
  → contents INSERT (approved/published)

[포털] getPortalContentsV2(clientId)
  → 콘텐츠 목록 + QC 결과 + 재작성 이력 표시
```

#### 시나리오 3: 브랜드 분석 → 포털 표시

```
[포털] runBrandAnalysis(clientId, url)
  → brand_analyses INSERT (pending)
  → runFullAnalysis() 비동기 시작

[포털] getAnalysisStatus(analysisId) (2초 폴링)
  → 완료 시 AnalysisResultView 인라인 표시

[어드민] analysis-logs에서 CRM 관리
  → lead_status 변경, 영업사원 할당
```

### 9-5. 포털 전용 기능 (어드민에 없음)

| 기능 | 파일 |
|------|------|
| 콘텐츠 직접 작성 (3단계 위저드) | `portal-write-client.tsx` |
| 블로그 계정 연동 (Tistory OAuth) | `portal-blog-client.tsx` |
| 자동 발행 설정 (포털용) | `portal-blog-client.tsx` |
| 발행 URL 등록 | `publish-url-modal.tsx` |
| 카카오톡 문의 | `kakao-floating-button.tsx` |
| PDF 다운로드 | 포털 리포트 페이지 |

### 9-6. 어드민 전용 기능 (포털에 없음)

| 기능 | 경로 |
|------|------|
| CRM 파이프라인 | `/ops/analysis-logs` |
| 영업사원 관리 | `/ops/sales-agents` |
| 매출/이탈 관리 | `/ops/revenue`, `/ops/churn` |
| 에러 모니터링 | `/ops/error-logs` |
| 프롬프트 편집 | `/ops/agent-settings` |
| 점수 가중치 설정 | `/ops/scoring-settings` |
| 온보딩 관리 | `/ops/onboarding` |
| 포인트 관리 | `/ops/points` |
| 어드민 계정 관리 | `/settings/admins` |

---

## 부록: 주요 발견사항

### 존재하지 않는 테이블
- `keyword_rank_history` — 코드에서 사용하지 않음
- `notifications` — 전용 테이블 없음 (Slack + toast로 대체)

### 이중 패턴
- Server Actions V1/V2 병존 (portal-actions.ts)
- clientId 전달: meta 태그 DOM 쿼리 (대부분) vs props 전달 (keywords만 전환 완료)
- 콘텐츠 라우트: `/ops/contents` → `/contents` 리디렉트 유지

### 코드 규모
- Server Action 파일: 44개
- 포털 컴포넌트: 10개
- API 라우트: 15개
- 크론 잡: 5개
- DB 마이그레이션: 061개
