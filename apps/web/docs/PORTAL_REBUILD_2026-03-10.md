# 포털 고객화면 전체 재구축 지시서
> 작성일: 2026-03-10 | Claude Code에 전달하여 순서대로 실행할 것

---

## ⚠️ 필수 규칙 (모든 작업에 적용)

```
- 라이브 서비스 운영 중 → 기존 코드 변경/삭제로 인한 오류 절대 금지
- 새 기능은 기존 코드에 영향 없이 추가만
- createAdminClient / rawFetch 사용
- JSONB 업데이트: SELECT → spread → UPDATE 패턴
- 없는 테이블 참조 금지
- shadcn 설치: 반드시 apps/web 디렉토리에서 실행
- 각 Phase 완료 후 반드시 빌드 확인: cd apps/web && npm run build
- 오류 발생 시 즉시 멈추고 보고
```

---

## 사전 파악 사항 (코드 탐색 결과 확인됨)

### 활용 가능한 기존 액션 함수
| 함수 | 파일 | 용도 |
|---|---|---|
| `getPortalDashboardV2` | portal-actions.ts | 대시보드 KPI, 최근 활동 |
| `getPortalKeywordsV2` | portal-actions.ts | active/suggested/archived 키워드 |
| `getPortalContentsV2` | portal-actions.ts | 콘텐츠 목록 전체 |
| `getKeywords` | keyword-actions.ts | 키워드 목록 (clientId 기반) |
| `updateKeywordStatus` | keyword-actions.ts | active/archived/suggested 상태 변경 |
| `searchKeywordVolumes` | keyword-actions.ts | 키워드 검색량 조회 |
| `getClientRankings` | keyword-actions.ts | 키워드 순위 요약 |
| `triggerSerpCheck` | keyword-actions.ts | SERP 수집 트리거 |
| `getSerpByKeyword` | keyword-actions.ts | 키워드별 순위 히스토리 |
| `getContentsByKeyword` | keyword-actions.ts | 키워드별 콘텐츠 목록 |

### DB 테이블 (참조 가능 확인됨)
- `keywords` (status: active/suggested/archived, monthly_search_volume, current_rank_naver_pc/mo)
- `contents` (publish_status: draft/review/approved/published/rejected, published_url, platform, qc_score, body)
- `publications` (content_id, blog_account_id, platform, status, external_url, publish_type: manual/auto)
- `blog_accounts` (platform: naver/tistory/wordpress/medium, auth_type, access_token, is_default)
- `brand_analyses` (status: completed/pending, marketing_score, keyword_rankings, analysis_result)
- `keyword_visibility` (keyword_id, rank_pc, rank_mo, rank_google, is_exposed, measured_at)
- `auto_publish_settings` (client_id, is_enabled, tistory_enabled, wordpress_enabled, default_blog_account_id)

### 현재 포털 라우트 구조
```
apps/web/app/(portal)/portal/
├── page.tsx          ← 대시보드 (수정 대상)
├── contents/page.tsx ← 콘텐츠 현황 (재구축 대상)
├── keywords/page.tsx ← 키워드 관리 (재구축 대상)
├── reports/page.tsx  ← 월간 리포트 (유지)
└── settings/page.tsx ← 설정 (유지)
```

---

## Phase 1: 대시보드 분석 미완료 분기 + 키워드 점유율 섹션

### 목표
- brand_analyses 미완료 시 분석 유도 화면 표시
- 키워드 점유율 요약 섹션 신규 추가

### 작업 대상 파일
- `apps/web/app/(portal)/portal/page.tsx`
- `apps/web/lib/actions/portal-actions.ts`

### 구현 상세

**1-1. portal-actions.ts 확장**

`getPortalDashboardV2` 함수에 아래 데이터를 추가로 fetch:
```typescript
// keyword_visibility에서 노출 키워드 집계
const { data: exposedKeywords } = await db
  .from("keyword_visibility")
  .select("keyword_id, rank_pc, rank_mo, is_exposed")
  .eq("client_id", clientId)
  .eq("is_exposed", true)
  .order("measured_at", { ascending: false })
  .limit(20)

// 활성 키워드 전체 수 (이미 activeKeywordsRes에 있으므로 재활용)
```

반환값에 추가:
```typescript
keywordOccupancy: {
  total: activeKeywordsRes.count || 0,        // 활성 키워드 수
  exposed: exposedKeywords?.length || 0,       // 1페이지 노출 수
  keywords: exposedKeywords || [],             // 노출된 키워드 목록
}
```

**1-2. portal/page.tsx 분기 로직**

서버 컴포넌트에서 brand_analyses 체크:
```typescript
// latestAnalysis가 null이면 분석 미완료
if (!dashboardData.latestAnalysis) {
  // 분석 유도 컴포넌트 렌더링
  return <AnalysisRequiredBanner clientId={clientId} />
}
// 정상 대시보드
```

**1-3. AnalysisRequiredBanner 컴포넌트 신규 생성**
- 위치: `apps/web/components/portal/analysis-required-banner.tsx`
- 내용: "아직 분석이 완료되지 않았어요" + 설명 텍스트 + [분석 시작하기] 버튼
- 버튼 클릭 → `/analysis` 페이지로 이동 (기존 분석 플로우 활용)

**1-4. KeywordOccupancySection 컴포넌트 신규 생성**
- 위치: `apps/web/components/portal/keyword-occupancy-section.tsx`
- 표시 내용:
  - "활성 키워드 {total}개 중 {exposed}개 1페이지 노출 중" 헤드라인
  - 진행바 (exposed / total 비율)
  - 노출된 키워드 칩(chip) 나열 (rank_pc 기준 오름차순)
- 대시보드 page.tsx의 퀵액션 버튼 아래에 삽입

### 빌드 확인
```bash
cd apps/web && npm run build
```

---

## Phase 2: 키워드 관리 페이지 전면 재구축

### 목표
- 활성/AI추천/보관 3탭 구조
- 활성 키워드 상세 모달 (순위 추이 + 발행 콘텐츠)
- AI 추천 키워드 활성 추가 기능

### 작업 대상 파일
- `apps/web/app/(portal)/portal/keywords/page.tsx` (재구축)
- `apps/web/components/portal/portal-keywords-client.tsx` (신규)
- `apps/web/components/portal/keyword-detail-modal.tsx` (신규)

### 구현 상세

**2-1. portal/keywords/page.tsx (서버 컴포넌트)**

```typescript
import { getPortalKeywordsV2 } from "@/lib/actions/portal-actions"
import { getClientRankings } from "@/lib/actions/keyword-actions"

export default async function PortalKeywordsPage() {
  // clientId는 기존 방식대로 세션/쿠키에서 추출
  const [keywordsData, rankingSummary] = await Promise.all([
    getPortalKeywordsV2(clientId),
    getClientRankings(clientId),
  ])
  
  return <PortalKeywordsClient 
    activeKeywords={keywordsData.activeKeywords}
    suggestedKeywords={keywordsData.suggestedKeywords}
    archivedKeywords={keywordsData.archivedKeywords}
    rankingSummary={rankingSummary}
    clientId={clientId}
  />
}
```

**2-2. PortalKeywordsClient 컴포넌트**

탭 구조:
```
[활성 키워드 {count}] [AI 추천 {count}] [보관됨 {count}]
```

**탭1: 활성 키워드**

테이블 컬럼:
| 키워드 | 월 검색량 | 현재순위(PC) | 현재순위(MO) | 1페이지 노출 | 콘텐츠 수 | 액션 |
|---|---|---|---|---|---|---|

- 월 검색량: `keywords.monthly_search_volume` (없으면 "-")
- 현재순위: `keywords.current_rank_naver_pc`, `current_rank_naver_mo`
- 1페이지 노출: rank_pc <= 10이면 초록 배지 "노출중", 아니면 회색 "미노출"
- 콘텐츠 수: 해당 키워드로 발행된 contents 수
- [보관] 버튼 → `updateKeywordStatus(id, 'archived')` 호출 후 revalidate
- 행 클릭 → KeywordDetailModal 열기

**탭2: AI 추천 키워드**

카드 그리드 형태:
- 키워드명
- 추천 이유: `keywords.metadata?.reason` 또는 `keywords.metadata?.description`
- 예상 검색량: `keywords.monthly_search_volume`
- [+ 활성 키워드로 추가] 버튼 → `updateKeywordStatus(id, 'active')` 후 탭1으로 이동
- [무시] 버튼 → `updateKeywordStatus(id, 'archived')`

**탭3: 보관된 키워드**

심플 테이블:
- 키워드명 / 보관일
- [복원] 버튼 → `updateKeywordStatus(id, 'active')`

**2-3. KeywordDetailModal 컴포넌트**

shadcn Dialog 사용. 내용:
```
상단: 키워드명 + 월 검색량 배지

섹션1: 순위 추이 차트
- getSerpByKeyword(keywordId) 호출
- 날짜별 rank_pc, rank_mo 라인 차트
- recharts LineChart 사용 (기존 대시보드 차트 패턴 참고)

섹션2: 이 키워드로 발행된 콘텐츠
- getContentsByKeyword(keywordId) 호출
- 제목 / 발행일 / 발행URL(클릭 가능 외부링크) / 상태 배지
```

### 빌드 확인
```bash
cd apps/web && npm run build
```

---

## Phase 3: 블로그 작성 페이지 신규 생성

### 목표
- 키워드 선택 → 생성 설정 → 콘텐츠 생성 지시 플로우
- 어드민의 CampaignPlanningClient 기능을 포털 고객용으로 단순화

### 작업 대상 파일
- `apps/web/app/(portal)/portal/write/page.tsx` (신규)
- `apps/web/components/portal/portal-write-client.tsx` (신규)

### portal-shell.tsx 수정 (nav 추가)
기존 navItems에 추가:
```typescript
{ href: "/portal/write", label: "블로그 작성", icon: PenLine }
```
navItems 순서: 대시보드 → 블로그 작성 → 콘텐츠 현황 → 키워드 관리 → 월간 리포트 → 설정

### 구현 상세

**3-1. write/page.tsx (서버 컴포넌트)**

```typescript
import { getPortalKeywordsV2 } from "@/lib/actions/portal-actions"

export default async function PortalWritePage() {
  const keywordsData = await getPortalKeywordsV2(clientId)
  
  return <PortalWriteClient
    activeKeywords={keywordsData.activeKeywords}
    clientId={clientId}
  />
}
```

**3-2. PortalWriteClient 컴포넌트**

3단계 스텝 UI (shadcn의 단순 상태 관리로 구현):

```
STEP 1. 키워드 선택
├── 탭A: 활성 키워드 목록
│     - 카드 형태로 나열
│     - 키워드명 + 현재순위 + 월 검색량 표시
│     - 클릭 시 선택 (selected 상태)
└── 탭B: 직접 입력
      - 텍스트 입력
      - [검색량 조회] 버튼 → searchKeywordVolumes([keyword]) 호출
      - 결과 (월 검색량 PC/MO) 표시

STEP 2. 생성 설정
├── 생성 개수: 1 / 2 / 3 버튼 선택
├── 콘텐츠 유형: 정보성 / 후기형 / 비교형 선택
└── 참고 URL: 텍스트 입력 (선택사항, 최대 3개)
    "참고할 블로그 URL을 입력하면 AI가 구조를 참고합니다"

STEP 3. 확인 및 생성
├── 선택한 키워드 확인
├── 설정 요약 확인
└── [콘텐츠 생성 시작] 버튼
    → jobs 테이블에 INSERT (기존 어드민 job 생성 로직 참고)
    → 성공 시 /portal/contents로 이동
    → 실패 시 에러 토스트
```

**job INSERT 로직:**
어드민의 `apps/web/lib/actions/campaign-planning-actions.ts` 또는 `ops-actions.ts`에서
job 생성 함수를 확인하여 동일한 패턴으로 포털용 Server Action 추가:

```typescript
// apps/web/lib/actions/portal-write-actions.ts (신규)
"use server"
export async function createPortalContentJob(payload: {
  clientId: string
  keyword: string
  count: number
  contentType: string
  referenceUrls: string[]
}) {
  const db = createAdminClient()
  // jobs 테이블에 INSERT (기존 job 스키마 확인 후 동일하게)
  // job_type: 'content_generation'
  // status: 'pending'
  // metadata에 keyword, count, contentType, referenceUrls 저장
}
```

### 빌드 확인
```bash
cd apps/web && npm run build
```

---

## Phase 4: 콘텐츠 현황 페이지 전면 재구축

### 목표
- 전체 콘텐츠 테이블 (상태별 필터)
- 생성 진행중 탭
- 발행 URL 등록 모달

### 작업 대상 파일
- `apps/web/app/(portal)/portal/contents/page.tsx` (재구축)
- `apps/web/components/portal/portal-contents-client.tsx` (신규)
- `apps/web/components/portal/publish-url-modal.tsx` (신규)

### 구현 상세

**4-1. contents/page.tsx (서버 컴포넌트)**

```typescript
import { getPortalContentsV2 } from "@/lib/actions/portal-actions"

export default async function PortalContentsPage() {
  const contents = await getPortalContentsV2(clientId)
  return <PortalContentsClient contents={contents} clientId={clientId} />
}
```

**4-2. PortalContentsClient 컴포넌트**

탭 구조:
```
[전체 콘텐츠] [생성 진행중]
```

**탭1: 전체 콘텐츠**

상태 필터 버튼 (전체 / 생성중 / 검토중 / 발행됨):
- 전체: 전부
- 생성중: draft
- 검토중: review / approved
- 발행됨: published

테이블 컬럼:
| 키워드 | 제목 | 상태 | QC점수 | 발행 채널 | 발행일 | 순위 | 액션 |
|---|---|---|---|---|---|---|---|

상태 배지 매핑:
```
draft → "작성중" (gray)
review → "검토중" (yellow)
approved → "승인됨" (blue)
published → "발행됨" (green)
rejected → "반려됨" (red)
```

- 발행 채널: `publications.platform` (없으면 "-")
- 순위: `keyword_visibility`에서 해당 content의 keyword 기준 최신 rank_pc
- [복사] 버튼 (published 상태): body 텍스트 클립보드 복사
- [URL 등록] 버튼 (approved 상태): PublishUrlModal 열기
- [보기] 버튼: 콘텐츠 상세 모달 (제목 + body 마크다운 렌더링)

**4-3. PublishUrlModal 컴포넌트**

shadcn Dialog:
```
제목: "발행 완료 URL 등록"

입력 필드1: 발행 URL (필수)
  placeholder: "https://blog.naver.com/..."

입력 필드2: 발행 채널 선택 (Select)
  옵션: 네이버 블로그 / 티스토리 / 워드프레스 / 미디엄 / 기타

[저장] 버튼 → Server Action 호출:
  1. publications 테이블 INSERT
     { content_id, client_id, platform, external_url, status: 'published', publish_type: 'manual', published_at: now() }
  2. contents 테이블 UPDATE
     { publish_status: 'published', published_url: url, published_at: now() }
  3. revalidatePath('/portal/contents')
  4. 성공 토스트: "발행 URL이 등록되었습니다. 순위 추적이 시작됩니다."
```

**4-4. 생성 진행중 탭**

```typescript
// portal-actions.ts에 함수 추가
export async function getPortalActiveJobs(clientId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from("jobs")
    .select("id, status, metadata, created_at, updated_at")
    .eq("client_id", clientId)
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: false })
  return data || []
}
```

표시 내용:
- 키워드명 (metadata.keyword)
- 생성 개수 (metadata.count)
- 상태 (pending: "대기중" / in_progress: "생성중 ●")
- 생성 요청일
- 빈 상태: "현재 생성 중인 콘텐츠가 없습니다"

### 빌드 확인
```bash
cd apps/web && npm run build
```

---

## Phase 5: 블로그 관리 페이지 실제 기능 연동

### 목표
- 블로그 계정 연결 (기존 OAuth 플로우 활용)
- 자동 발행 설정 ON/OFF
- 발행 이력 테이블

### 작업 대상 파일
- `apps/web/components/portal/portal-blog-client.tsx` (수정)
- `apps/web/lib/actions/portal-blog-actions.ts` (신규)

### 구현 상세

**5-1. portal-blog-actions.ts (신규)**

```typescript
"use server"
import { createAdminClient } from "@/lib/supabase/service"

// 블로그 계정 목록 조회
export async function getPortalBlogAccounts(clientId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from("blog_accounts")
    .select("id, platform, account_name, blog_url, auth_type, is_default, last_published_at, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
  return data || []
}

// 자동 발행 설정 조회
export async function getAutoPublishSettings(clientId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from("auto_publish_settings")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle()
  return data
}

// 자동 발행 설정 저장
export async function saveAutoPublishSettings(clientId: string, settings: {
  is_enabled: boolean
  tistory_enabled: boolean
  wordpress_enabled: boolean
  publish_as_draft: boolean
  default_blog_account_id: string | null
}) {
  const db = createAdminClient()
  // UPSERT (unique constraint: client_id)
  const { error } = await db
    .from("auto_publish_settings")
    .upsert({ client_id: clientId, ...settings, updated_at: new Date().toISOString() })
  return { success: !error, error: error?.message }
}

// 발행 이력 조회
export async function getPortalPublications(clientId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from("publications")
    .select("id, platform, external_url, status, publish_type, published_at, created_at, contents(title, keyword)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50)
  return data || []
}
```

**5-2. portal-blog-client.tsx 수정**

섹션1: 연결된 블로그 계정
```
플랫폼 카드 (네이버/티스토리/워드프레스):
- 연결됨: 초록 배지 + 계정명 + [기본 설정] [해제] 버튼
- 미연결: [연결하기] 버튼
  - 티스토리: /api/auth/tistory 로 이동 (기존 OAuth 라우트 활용)
  - 워드프레스: API URL + API Key 입력 모달
  - 네이버: 블로그 URL 수동 입력 모달 (auth_type='manual')
```

섹션2: 자동 발행 설정
```
마스터 토글: 자동 발행 활성화
  └── ON 시 하위 옵션 표시:
      - 기본 발행 채널 Select (연결된 계정 중 선택)
      - 티스토리 자동 발행 toggle
      - 워드프레스 자동 발행 toggle
      - 초안으로 발행 toggle

[설정 저장] 버튼 → saveAutoPublishSettings 호출
```

섹션3: 발행 이력
```
테이블: 콘텐츠 제목 / 키워드 / 플랫폼 / 발행 유형(자동/수동) / 상태 / 발행일 / 링크
```

### 빌드 확인
```bash
cd apps/web && npm run build
```

---

## Phase 6: 대시보드 퀵액션 버튼 라우팅 수정

### 목표
- 기존 퀵액션 버튼 3개를 실제 페이지로 연결

### 작업 대상 파일
- `apps/web/app/(portal)/portal/page.tsx` (수정)

### 구현 상세

현재 퀵액션 버튼:
```
블로그 작성 → /portal/write (Phase 3에서 생성됨)
콘텐츠 현황 → /portal/contents (Phase 4에서 재구축됨)
키워드 관리 → /portal/keywords (Phase 2에서 재구축됨)
```

버튼 텍스트 및 설명 업데이트:
```
블로그 작성: "키워드로 AI 콘텐츠 생성"
콘텐츠 현황: "발행 현황 및 순위 추적"
키워드 관리: "활성/추천 키워드 관리"
```

### 최종 빌드 확인
```bash
cd apps/web && npm run build
# 빌드 성공 확인 후 git add . && git commit -m "feat: portal rebuild - 고객 포털 전면 재구축" && git push
```

---

## 전체 실행 순서 요약

```
Phase 1 → 빌드 확인
Phase 2 → 빌드 확인
Phase 3 → 빌드 확인
Phase 4 → 빌드 확인
Phase 5 → 빌드 확인
Phase 6 → 최종 빌드 + 커밋 + 푸시
```

각 Phase 사이에 빌드 오류 발생 시 즉시 멈추고 보고할 것.
모든 Phase 완료 후 waide.vercel.app에서 포털 로그인하여 전체 QA.
