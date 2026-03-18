# 와이드와일드 인테리어 홈페이지 서비스 — waide-mkt 통합 기획서

> 작성일: 2026-03-17
> 목적: 인테리어 업체 홈페이지 제작 서비스를 waide-mkt(ai-marketer)에 통합

---

## 1. 시스템 통합 아키텍처

### 1-1. 전체 흐름 (waide-mkt 기준)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        waide-mkt (ai-marketer)                       │
│                                                                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│  │ 브랜드    │───▶│ 키워드   │───▶│ 홈페이지  │───▶│ 블로그    │       │
│  │ 분석      │    │ 분석     │    │ 생성      │    │ 발행/추적  │       │
│  │ (기존)    │    │ (기존)   │    │ (신규)    │    │ (기존)    │       │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘       │
│       │                │                │                │            │
│       ▼                ▼                ▼                ▼            │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                    Supabase (공유 DB)                      │       │
│  │                                                            │       │
│  │  clients ←→ keywords ←→ contents ←→ serp_results          │       │
│  │     ↕            ↕           ↕           ↕                 │       │
│  │  brand_     homepage_    blog_posts   keyword_             │       │
│  │  analyses   projects    (contents)   visibility            │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                       │
│  │ 어드민    │    │ 고객     │    │ 홈페이지  │                       │
│  │ 대시보드  │    │ 포털     │    │ 프리뷰    │                       │
│  │ (기존)   │    │ (기존)   │    │ (신규)    │                       │
│  └──────────┘    └──────────┘    └──────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Vercel 배포      │
                    │  {업체}.waide.kr   │
                    │  (생성된 홈페이지)  │
                    └──────────────────┘
```

### 1-2. 기존 waide-mkt 기능과 매핑

| waide-mkt 기존 기능 | 홈페이지 서비스 활용 | 통합 방식 |
|---------------------|---------------------|-----------|
| **브랜드 분석** (`/api/analyze`) | 인테리어 업체 분석 → 페르소나 자동 생성 | 기존 API 재사용 |
| **clients.brand_persona** (JSONB) | 홈페이지 콘텐츠 자동 채우기 | 기존 컬럼 확장 |
| **keywords** 테이블 | 홈페이지 SEO 키워드 + 블로그 키워드 | 기존 테이블 사용 |
| **contents** 테이블 | 홈페이지 블로그 글 저장 | 기존 테이블 사용 (content_type 확장) |
| **SEO Writer 에이전트** | 정보성/후기성 블로그 자동 생성 | 기존 에이전트 사용 |
| **QC 에이전트** | 블로그 품질 검수 | 기존 에이전트 사용 |
| **Publisher 에이전트** | 블로그 자동 발행 | 기존 + homepage 플랫폼 추가 |
| **SERP Tracking** | 블로그 순위 추적 | 기존 크론잡 사용 |
| **AEO Tracking** | AI 답변 노출 추적 | 기존 시스템 사용 |
| **포인트 시스템** | 홈페이지 생성 포인트 차감 | 기존 시스템 사용 |
| **리포트** | 홈페이지 + 블로그 통합 리포트 | 기존 PDF 확장 |

---

## 2. 데이터 스키마 통합

### 2-1. 기존 테이블 활용 (변경 없음)

#### clients 테이블 — 인테리어 업체 = 클라이언트
```sql
-- 기존 clients 테이블 그대로 사용
-- brand_persona JSONB에 인테리어 전용 필드 추가

clients.brand_persona = {
  -- 기존 필드 (그대로 유지)
  one_liner: "강남 프리미엄 인테리어 전문",
  positioning: "...",
  target_audience: "30-40대 신혼부부, 리모델링 고객",
  tone: "전문적이면서 친근한",
  strengths: ["시공 퀄리티", "소통력", "합리적 가격"],
  weaknesses: ["인지도 부족", "온라인 마케팅 미흡"],
  content_angles: ["시공 사례", "비용 가이드", "인테리어 팁"],
  avoid_angles: [],
  competitor_differentiators: ["Before/After 비교", "견적 투명 공개"],
  seasonal_hooks: ["봄 이사철 특가", "연말 리모델링"],
  recommended_keywords: ["강남 인테리어", "강남 아파트 리모델링"],
  brand_story_hook: "10년 경력 강남 인테리어 전문가",
  visual_direction: "모던 미니멀, 화이트+우드톤",
  generated_at: "2026-03-17T00:00:00Z",
  manually_edited: false,

  -- 인테리어 전용 추가 필드 (JSONB 확장)
  interior_profile: {
    service_regions: ["강남구", "서초구", "송파구"],
    service_types: ["아파트 인테리어", "리모델링", "빌라 인테리어"],
    specialties: ["모던", "미니멀"],
    avg_budget_range: "3000만~8000만",
    experience_years: 10,
    completed_projects: 150,
    certifications: [],
    operating_hours: "09:00-18:00",
    business_number: "123-45-67890"
  }
}
```

#### keywords 테이블 — 인테리어 키워드
```sql
-- 기존 keywords 테이블 그대로 사용
-- source 필드로 구분: 'manual', 'homepage_seo', 'blog_target'

INSERT INTO keywords (client_id, keyword, source, priority, status, is_primary) VALUES
  ('{client_id}', '강남 인테리어', 'homepage_seo', 'critical', 'active', true),
  ('{client_id}', '강남 아파트 인테리어', 'blog_target', 'high', 'active', false),
  ('{client_id}', '강남 인테리어 비용', 'blog_target', 'high', 'active', false),
  ('{client_id}', '강남 인테리어 후기', 'blog_target', 'medium', 'active', false);
```

#### contents 테이블 — 블로그 글
```sql
-- 기존 contents 테이블 그대로 사용
-- content_type 확장: 'hp_blog_info', 'hp_blog_review' 추가

-- content_type 기존값:
--   'blog_post', 'blog_list', 'blog_review', 'blog_info',
--   'aeo_qa', 'aeo_list', 'aeo_entity'
--
-- 신규 추가값 (홈페이지 블로그용):
--   'hp_blog_info'    → 홈페이지 정보성 블로그
--   'hp_blog_review'  → 홈페이지 후기성 블로그
--   'hp_page'         → 홈페이지 정적 페이지 콘텐츠
```

### 2-2. 신규 테이블 (홈페이지 전용)

#### homepage_projects — 홈페이지 프로젝트
```sql
CREATE TABLE homepage_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- 프로젝트 기본 정보
  project_name TEXT NOT NULL,                -- "강남인테리어 홈페이지"
  template_id TEXT NOT NULL DEFAULT 'modern-minimal',
                                              -- 'modern-minimal', 'natural-wood', 'premium-dark'
  status TEXT NOT NULL DEFAULT 'collecting',
    -- 'collecting' → 'building' → 'preview' → 'live' → 'suspended'

  -- 배포 정보
  subdomain TEXT UNIQUE,                      -- "gangnam-interior"
  custom_domain TEXT,                         -- "www.gangnam-interior.com"
  vercel_project_id TEXT,                     -- Vercel 프로젝트 ID
  vercel_deployment_url TEXT,                 -- 최신 배포 URL

  -- 테마 설정
  theme_config JSONB NOT NULL DEFAULT '{}',
    -- {
    --   primary_color: "#2563eb",
    --   secondary_color: "#10b981",
    --   font_heading: "Pretendard",
    --   font_body: "Pretendard",
    --   logo_url: "...",
    --   favicon_url: "...",
    --   og_image_url: "..."
    -- }

  -- SEO 설정 (자동생성)
  seo_config JSONB NOT NULL DEFAULT '{}',
    -- {
    --   meta_title_template: "%s | {업체명}",
    --   meta_description: "...",
    --   keywords: ["강남 인테리어", ...],
    --   json_ld_local_business: {...},
    --   sitemap_config: {...},
    --   robots_config: {...}
    -- }

  -- 블로그 발행 설정
  blog_config JSONB NOT NULL DEFAULT '{}',
    -- {
    --   posts_per_month: 8,
    --   info_ratio: 0.5,          -- 정보성 50%
    --   review_ratio: 0.5,        -- 후기성 50%
    --   auto_publish: true,
    --   target_keywords: ["강남 인테리어 비용", ...],
    --   content_calendar: [...]
    -- }

  -- 통계
  total_visits INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,
  last_deployed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_projects_client ON homepage_projects(client_id);
CREATE INDEX idx_hp_projects_status ON homepage_projects(status);
CREATE UNIQUE INDEX idx_hp_projects_subdomain ON homepage_projects(subdomain) WHERE subdomain IS NOT NULL;
```

#### homepage_materials — 고객 수집 자료
```sql
CREATE TABLE homepage_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,

  -- 필수 자료
  company_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  address_lat FLOAT,
  address_lng FLOAT,
  description TEXT NOT NULL,             -- 업체 소개 (1-2문장)
  kakao_link TEXT,

  -- 서비스 정보
  service_regions TEXT[] DEFAULT '{}',   -- ["강남구", "서초구"]
  service_types TEXT[] DEFAULT '{}',     -- ["아파트 인테리어", "리모델링"]

  -- 브랜드 자료 (선택)
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#10b981',

  -- SNS 계정 (선택)
  instagram_url TEXT,
  youtube_url TEXT,
  naver_place_url TEXT,
  naver_blog_url TEXT,

  -- 추가 정보 (선택)
  certifications TEXT[],                 -- 자격증/인증서 이미지 URL
  operating_hours TEXT,
  business_number TEXT,
  faq_items JSONB DEFAULT '[]',          -- [{q: "...", a: "..."}]

  -- 상태
  is_complete BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_materials_project ON homepage_materials(project_id);
```

#### homepage_portfolios — 포트폴리오 (시공사례)
```sql
CREATE TABLE homepage_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,

  title TEXT,                            -- "30평 모던 인테리어"
  slug TEXT,                             -- URL용 슬러그
  space_type TEXT,                       -- "거실", "주방", "욕실" 등
  style TEXT,                            -- "모던", "북유럽" 등
  area_pyeong INTEGER,                   -- 평수
  budget_range TEXT,                     -- "3000만~5000만"
  description TEXT,                      -- 시공 설명

  -- 이미지
  image_urls TEXT[] NOT NULL DEFAULT '{}',  -- 시공 완성 사진
  before_image_url TEXT,                    -- Before 사진 (선택)
  after_image_url TEXT,                     -- After 사진 (선택)

  -- 메타
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,     -- 메인페이지 노출

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_portfolios_project ON homepage_portfolios(project_id);
```

#### homepage_reviews — 고객 후기
```sql
CREATE TABLE homepage_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,

  customer_name TEXT NOT NULL,           -- "김OO"
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  project_type TEXT,                     -- "30평 아파트 올수리"
  source TEXT DEFAULT 'manual',          -- 'manual', 'naver_place', 'import'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_reviews_project ON homepage_reviews(project_id);
```

#### homepage_inquiries — 상담 신청
```sql
CREATE TABLE homepage_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),

  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  area_pyeong INTEGER,
  space_type TEXT,                       -- "아파트", "빌라" 등
  budget_range TEXT,
  message TEXT,

  status TEXT DEFAULT 'new',             -- 'new', 'contacted', 'consulting', 'contracted', 'lost'
  assigned_to UUID,                      -- 영업 담당자
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_inquiries_project ON homepage_inquiries(project_id);
CREATE INDEX idx_hp_inquiries_status ON homepage_inquiries(status);
```

### 2-3. 데이터 관계도

```
┌─────────────────────────────────────────────────────────┐
│                     waide-mkt DB                          │
│                                                           │
│  workspaces ──1:N──▶ clients                              │
│                         │                                  │
│              ┌──────────┼──────────┐                      │
│              │          │          │                       │
│              ▼          ▼          ▼                       │
│          keywords    contents   homepage_projects          │
│              │          │          │                       │
│              │          │     ┌────┼────┬────┐            │
│              │          │     │    │    │    │             │
│              ▼          ▼     ▼    ▼    ▼    ▼             │
│        keyword_     serp_  hp_   hp_  hp_   hp_           │
│        visibility  results mats  port revs  inqs          │
│              │                                             │
│              ▼                                             │
│        questions ──▶ llm_answers ──▶ mentions              │
│                                         │                  │
│                                         ▼                  │
│                                     aeo_scores             │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 기능 통합 상세

### 3-1. 브랜드 분석 → 홈페이지 자동 세팅

```
[영업사원이 인테리어 업체 등록]
      │
      ▼
[기존 브랜드 분석 실행] ← /api/analyze (네이버 플레이스 URL)
      │
      ├─ basic_info: 업체명, 카테고리, 영업시간, 시설 정보
      ├─ review_analysis: 평점, 감성분석, 핵심 키워드
      ├─ keyword_analysis: 네이버/구글 순위, 검색량
      └─ content_strategy: 콘텐츠 각도, 개선점
      │
      ▼
[브랜드 페르소나 생성] ← clients.brand_persona JSONB
      │
      ├─ one_liner: 홈페이지 히어로 태그라인
      ├─ target_audience: 타겟 고객 설명
      ├─ tone: 글쓰기 톤 → 블로그 글 스타일
      ├─ strengths: 홈페이지 차별점 섹션
      ├─ content_angles: 블로그 주제 리스트
      └─ interior_profile: 인테리어 전용 정보 (신규)
      │
      ▼
[키워드 자동 생성] ← keywords 테이블
      │
      ├─ {지역} + 인테리어 → is_primary = true (홈페이지 메인 키워드)
      ├─ {지역} + 아파트 인테리어 → source = 'homepage_seo'
      ├─ {지역} + 인테리어 비용 → source = 'blog_target'
      ├─ {지역} + 인테리어 후기 → source = 'blog_target'
      └─ ... (seo-keyword-matrix.ts 기반 자동 매칭)
      │
      ▼
[홈페이지 프로젝트 생성] ← homepage_projects 테이블
      │
      ├─ 템플릿 자동 선택 (업체 스타일 기반)
      ├─ SEO 설정 자동 생성 (키워드 기반)
      ├─ 블로그 설정 자동 생성 (콘텐츠 전략 기반)
      └─ status = 'collecting' (자료 수집 대기)
```

### 3-2. 자료 수집 → 홈페이지 빌드

```
[고객 자료 수집 폼] ← /dashboard/homepage/[projectId]/collect
      │
      ├─ STEP 1: 기본정보 → homepage_materials
      ├─ STEP 2: 포트폴리오 사진 → homepage_portfolios + Supabase Storage
      ├─ STEP 3: 브랜드 자료 → homepage_materials (로고, 컬러)
      ├─ STEP 4: 추가 자료 → homepage_materials (SNS, 후기)
      └─ STEP 5: 템플릿 선택 → homepage_projects.template_id
      │
      ▼
[자동 빌드 트리거]
      │
      ├─ 1. homepage_materials → clients.brand_persona 동기화
      │     (interior_profile 업데이트)
      │
      ├─ 2. homepage_materials.service_regions → keywords 자동 생성
      │     (지역 × 서비스 키워드 매트릭스)
      │
      ├─ 3. 템플릿 렌더링
      │     ├─ config.ts 생성 (업체 데이터)
      │     ├─ metadata 자동 생성 (SEO)
      │     ├─ JSON-LD 생성 (LocalBusiness, FAQPage)
      │     ├─ sitemap.ts / robots.ts 생성
      │     └─ 포트폴리오/후기 데이터 주입
      │
      ├─ 4. 초기 블로그 8개 자동 생성
      │     ├─ 정보성 4개: contents 테이블 INSERT (content_type: 'hp_blog_info')
      │     └─ 후기성 4개: contents 테이블 INSERT (content_type: 'hp_blog_review')
      │     (기존 SEO Writer 에이전트 + brand_persona 활용)
      │
      ├─ 5. Vercel 배포
      │     ├─ vercel_project_id 저장
      │     ├─ subdomain 설정
      │     └─ status = 'preview'
      │
      └─ 6. 프리뷰 링크 고객 전달
            └─ status = 'live' (고객 승인 후)
```

### 3-3. 블로그 대량발행 (기존 waide-mkt 파이프라인)

```
[월간 블로그 스케줄러] ← /api/cron/scheduled-publish + 홈페이지 확장

매월 자동 실행:
      │
      ├─ 1. 키워드 매트릭스에서 타겟 키워드 선정
      │     ├─ keywords 테이블 WHERE source = 'blog_target'
      │     ├─ 정보성 4개 + 후기성 4개 키워드 매칭
      │     └─ 중복 방지: 기존 contents에서 미사용 키워드 우선
      │
      ├─ 2. 콘텐츠 생성 (기존 파이프라인)
      │     ├─ jobs 테이블 INSERT (job_type: 'CONTENT_CREATE')
      │     ├─ SEO Writer 에이전트 실행 (brand_persona 참조)
      │     ├─ QC 에이전트 실행 (quality_score ≥ 70)
      │     └─ contents 테이블 INSERT
      │
      ├─ 3. 발행 (기존 Publisher 에이전트)
      │     ├─ 홈페이지 블로그 페이지에 자동 게시 (platform: 'homepage')
      │     ├─ 네이버 블로그 동시 발행 (선택)
      │     └─ publications 테이블 INSERT
      │
      └─ 4. 추적 (기존 SERP Tracker)
            ├─ keyword_visibility 일일 업데이트
            ├─ serp_results 저장
            └─ aeo_scores 주간 업데이트
```

### 3-4. 어드민 대시보드 확장

```
[기존 waide-mkt 대시보드]
      │
      ├─ /dashboard (기존)
      │     ├─ MRR, 활성 고객, 이탈률 등
      │     └─ + 홈페이지 프로젝트 현황 카드 추가
      │
      ├─ /dashboard/homepage (신규)
      │     ├─ 홈페이지 프로젝트 목록
      │     ├─ 상태별 필터 (수집중/빌드중/프리뷰/라이브)
      │     ├─ 프로젝트별 방문수/상담수 카드
      │     └─ 빠른 작업 (프리뷰 열기, 재배포, 도메인 변경)
      │
      ├─ /dashboard/homepage/[id] (신규)
      │     ├─ 프로젝트 상세 (설정, 테마, SEO)
      │     ├─ 자료 수집 현황
      │     ├─ 포트폴리오 관리
      │     ├─ 후기 관리
      │     ├─ 상담 신청 목록
      │     └─ 블로그 글 목록 (contents WHERE content_type LIKE 'hp_%')
      │
      ├─ /dashboard/homepage/[id]/collect (신규)
      │     └─ 고객 자료 수집 폼 (5단계)
      │
      └─ /ops/homepage (신규 — 운영팀 전용)
            ├─ 전체 홈페이지 프로젝트 관리
            ├─ 배포 로그
            ├─ 템플릿 관리
            └─ 상담 신청 배분
```

---

## 4. 키워드 연동 상세

### 4-1. 키워드 자동 생성 흐름

```typescript
// 브랜드 분석 완료 후 자동 키워드 생성
async function generateHomepageKeywords(clientId: string) {
  const client = await getClient(clientId);
  const regions = client.brand_persona.interior_profile.service_regions;
  const services = client.brand_persona.interior_profile.service_types;

  // 1. 홈페이지 SEO 키워드 (메타태그, 구조화 데이터용)
  const seoKeywords = regions.flatMap(region => [
    { keyword: `${region} 인테리어`, source: 'homepage_seo', priority: 'critical', is_primary: false },
    { keyword: `${region} 인테리어 업체`, source: 'homepage_seo', priority: 'high' },
    ...services.map(svc => ({ keyword: `${region} ${svc}`, source: 'homepage_seo', priority: 'high' })),
  ]);

  // 대표 키워드 1개 설정
  seoKeywords[0].is_primary = true;

  // 2. 블로그 타겟 키워드 (정보성)
  const infoKeywords = regions.flatMap(region => [
    { keyword: `${region} 인테리어 비용`, source: 'blog_target', priority: 'high',
      metadata: { blog_type: '정보성', content_format: '비용 분석표' } },
    { keyword: `${region} 인테리어 트렌드`, source: 'blog_target', priority: 'medium',
      metadata: { blog_type: '정보성', content_format: '트렌드 리포트' } },
    { keyword: `인테리어 업체 고르는 방법`, source: 'blog_target', priority: 'medium',
      metadata: { blog_type: '정보성', content_format: '체크리스트' } },
  ]);

  // 3. 블로그 타겟 키워드 (후기성)
  const reviewKeywords = regions.flatMap(region => [
    { keyword: `${region} 인테리어 후기`, source: 'blog_target', priority: 'high',
      metadata: { blog_type: '후기성', content_format: '시공 후기' } },
    { keyword: `${region} 아파트 인테리어 후기`, source: 'blog_target', priority: 'high',
      metadata: { blog_type: '후기성', content_format: 'Before/After' } },
    { keyword: `${region} 인테리어 견적`, source: 'blog_target', priority: 'medium',
      metadata: { blog_type: '후기성', content_format: '견적 공개' } },
  ]);

  // 4. AEO 키워드 (질문형)
  const aeoKeywords = [
    { keyword: `${regions[0]} 인테리어 비용 얼마`, source: 'blog_target', priority: 'medium',
      metadata: { blog_type: 'AEO', content_format: 'Q&A' } },
    { keyword: `인테리어 업체 어떻게 고르나요`, source: 'blog_target', priority: 'medium',
      metadata: { blog_type: 'AEO', content_format: '체크리스트' } },
  ];

  // keywords 테이블에 일괄 INSERT
  const allKeywords = [...seoKeywords, ...infoKeywords, ...reviewKeywords, ...aeoKeywords];
  await insertKeywords(clientId, allKeywords);

  // 5. 검색량 조회 크론잡 트리거
  await triggerSearchVolumeUpdate(clientId);
}
```

### 4-2. 키워드 상태별 용도

| keywords.source | 용도 | waide-mkt 기능 |
|-----------------|------|---------------|
| `homepage_seo` | 홈페이지 메타태그, JSON-LD | 홈페이지 SEO 설정 자동 적용 |
| `blog_target` | 블로그 글 타겟 키워드 | SEO Writer가 참조 |
| `manual` | 수동 추가 키워드 | 기존과 동일 |
| `niche_expansion` | AI 추천 확장 키워드 | 기존 니치 키워드 에이전트 |
| `csv_import` | CSV 일괄 업로드 | 기존과 동일 |

### 4-3. keywords.metadata 확장

```jsonc
// 기존 metadata에 블로그 관련 필드 추가
{
  // 기존 필드 유지
  "source": "blog_target",

  // 신규 추가 (홈페이지 블로그용)
  "blog_type": "정보성",           // "정보성" | "후기성" | "AEO"
  "content_format": "비용 분석표",  // 글 포맷 가이드
  "region": "강남구",               // 지역
  "last_published_at": null,       // 마지막 발행일
  "publish_count": 0               // 해당 키워드로 발행된 글 수
}
```

---

## 5. 블로그 발행 통합 상세

### 5-1. 콘텐츠 생성 — 기존 파이프라인 확장

```typescript
// 기존 /api/ai/generate-content 확장
// brandInfo에 interior_profile 포함

POST /api/ai/generate-content
{
  contentType: "hp_blog_info",     // 신규 타입
  brief: "강남구 30평 아파트 인테리어 비용을 항목별로 정리",
  brandInfo: {
    name: "OO인테리어",
    persona: clients.brand_persona,  // 기존 페르소나 그대로 전달
    interiorProfile: clients.brand_persona.interior_profile
  },
  mainKeyword: "강남 인테리어 비용",
  subKeywords: ["강남 아파트 인테리어", "30평 인테리어 비용"],
  addSchemaMarkup: true,            // JSON-LD Article 자동 삽입
  targetBlogType: "정보성"           // 신규: 블로그 유형 힌트
}
```

### 5-2. 발행 채널 — `homepage` 플랫폼 추가

```sql
-- publishing_accounts 테이블에 'homepage' 플랫폼 추가
INSERT INTO publishing_accounts (client_id, platform, account_name, account_url, is_default) VALUES
  ('{client_id}', 'homepage', '홈페이지 블로그', 'https://{subdomain}.waide.kr/blog', true);

-- publications 테이블 — 홈페이지 발행 기록
INSERT INTO publications (content_id, client_id, platform, external_url, status) VALUES
  ('{content_id}', '{client_id}', 'homepage', 'https://{subdomain}.waide.kr/blog/{slug}', 'published');
```

### 5-3. 자동 발행 설정

```sql
-- auto_publish_settings 확장
UPDATE auto_publish_settings SET
  homepage_enabled = true,             -- 신규 필드
  homepage_project_id = '{project_id}' -- 신규 필드
WHERE client_id = '{client_id}';
```

---

## 6. 어드민(ops) 화면 통합

### 6-1. 사이드바 메뉴 추가

```
기존 waide-mkt 사이드바:
├─ 대시보드
├─ 브랜드
├─ 키워드
├─ 콘텐츠
├─ 발행
├─ 분석
├─ 블로그 계정
├─ 캠페인
│
├─ 🆕 홈페이지              ← 신규 메뉴
│   ├─ 프로젝트 목록
│   ├─ 자료 수집
│   ├─ 템플릿 관리
│   └─ 상담 신청
│
├─ 운영 (ops)
│   ├─ 기존 ops 메뉴...
│   └─ 🆕 홈페이지 운영      ← 신규 서브메뉴
└─ 설정
```

### 6-2. 클라이언트 상세 탭 추가

```
기존 클라이언트 상세 (10탭):
├─ 개요 / 순위 / 콘텐츠 / 키워드 / 계정
├─ 주문 / 팀 / 커뮤니케이션 / 설정 / 거래
│
└─ 🆕 홈페이지 탭           ← 신규 11번째 탭
    ├─ 프로젝트 상태
    ├─ 배포 이력
    ├─ 방문/상담 통계
    ├─ 포트폴리오 관리
    ├─ 후기 관리
    └─ 블로그 발행 현황
```

---

## 7. 홈페이지 템플릿 3종 — 기술 구현

### 7-1. 공통 구조 (모든 템플릿)

```
interior-template/
├── app/
│   ├── layout.tsx          ← clients.brand_persona → metadata 자동 생성
│   ├── page.tsx            ← homepage_materials + homepage_portfolios 데이터
│   ├── sitemap.ts          ← keywords(source='homepage_seo') → 자동 생성
│   ├── robots.ts
│   ├── portfolio/
│   │   └── [slug]/page.tsx ← homepage_portfolios 데이터
│   ├── blog/
│   │   ├── page.tsx        ← contents(content_type LIKE 'hp_%') 목록
│   │   └── [slug]/page.tsx ← contents.body (Markdown → HTML)
│   ├── contact/page.tsx    ← homepage_inquiries INSERT
│   ├── faq/page.tsx        ← homepage_materials.faq_items
│   └── api/
│       └── inquiry/route.ts ← homepage_inquiries INSERT
├── components/             ← chorokmaru 패턴 재사용
│   ├── home/
│   │   ├── Hero.tsx        ← brand_persona.one_liner + 포트폴리오 이미지
│   │   ├── Stats.tsx       ← interior_profile (경력, 시공수, 평점)
│   │   ├── Portfolio.tsx   ← homepage_portfolios (필터링 그리드)
│   │   ├── BeforeAfter.tsx ← homepage_portfolios (before/after 슬라이더)
│   │   ├── Services.tsx    ← interior_profile.service_types
│   │   ├── Process.tsx     ← 상담→실측→디자인→시공 (하드코딩)
│   │   ├── Reviews.tsx     ← homepage_reviews (캐러셀)
│   │   ├── Blog.tsx        ← contents (최신 3개)
│   │   ├── FAQ.tsx         ← homepage_materials.faq_items (JSON-LD FAQPage)
│   │   └── ContactCTA.tsx  ← 상담 폼 (homepage_inquiries)
│   ├── layout/
│   │   ├── Nav.tsx         ← homepage_materials.company_name + logo
│   │   ├── Footer.tsx      ← homepage_materials (주소, 전화, SNS)
│   │   └── FloatingCTA.tsx ← kakao_link + phone
│   └── shared/
│       ├── JsonLd.tsx      ← seo_config.json_ld_local_business
│       └── Breadcrumb.tsx  ← JSON-LD BreadcrumbList
├── lib/
│   ├── supabase.ts         ← waide-mkt 공유 Supabase 클라이언트
│   └── config.ts           ← homepage_projects + homepage_materials → 설정
└── data/
    └── config.ts           ← 빌드 시 Supabase에서 fetch → 정적 생성
```

### 7-2. 데이터 흐름 (빌드 타임)

```typescript
// data/config.ts — 빌드 시 Supabase에서 데이터 fetch
export async function getHomepageConfig(projectId: string) {
  const { data: project } = await supabase
    .from('homepage_projects').select('*, client:clients(*)').eq('id', projectId).single();

  const { data: materials } = await supabase
    .from('homepage_materials').select('*').eq('project_id', projectId).single();

  const { data: portfolios } = await supabase
    .from('homepage_portfolios').select('*').eq('project_id', projectId).order('sort_order');

  const { data: reviews } = await supabase
    .from('homepage_reviews').select('*').eq('project_id', projectId).order('created_at', { ascending: false });

  const { data: blogPosts } = await supabase
    .from('contents').select('*')
    .eq('client_id', project.client_id)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .eq('publish_status', 'published')
    .order('published_at', { ascending: false });

  const { data: keywords } = await supabase
    .from('keywords').select('*')
    .eq('client_id', project.client_id)
    .eq('source', 'homepage_seo');

  return {
    company: {
      name: materials.company_name,
      owner: materials.owner_name,
      phone: materials.phone,
      address: materials.address,
      description: materials.description,
      kakaoLink: materials.kakao_link,
      logo: materials.logo_url,
      instagram: materials.instagram_url,
      youtube: materials.youtube_url,
      naverPlace: materials.naver_place_url,
      operatingHours: materials.operating_hours,
      businessNumber: materials.business_number,
    },
    theme: project.theme_config,
    seo: {
      ...project.seo_config,
      keywords: keywords.map(k => k.keyword),
    },
    persona: project.client.brand_persona,
    portfolios,
    reviews,
    blogPosts,
    faqItems: materials.faq_items,
  };
}
```

### 7-3. 템플릿별 차이

| 항목 | A: 모던 미니멀 | B: 내추럴 우드 | C: 프리미엄 다크 |
|------|---------------|---------------|-----------------|
| **배경** | 화이트 (#fff) | 웜화이트 (#FEFCF9) | 다크 (#0A0A0A) |
| **포인트** | 업체 컬러 / 블루 | 우드브라운 / 올리브 | 골드 (#C9A96E) |
| **폰트** | Pretendard | Noto Serif KR | Playfair Display |
| **히어로** | 이미지 슬라이더 | 대형 감성 사진 | 풀스크린 비디오 |
| **갤러리** | 3열 그리드 필터 | 2열 카드 | 풀스크린 갤러리 |
| **톤** | 깔끔, 전문적 | 따뜻한, 감성적 | 고급, 프리미엄 |
| **타겟** | 20-30대 | 신혼/가족 | 40-50대 고소득 |
| **CSS vars** | `theme_config` | `theme_config` | `theme_config` |

---

## 8. 구현 로드맵 (waide-mkt 통합 기준)

### Phase 1: DB 스키마 확장 (1일)
- [ ] homepage_projects 테이블 생성 (migration)
- [ ] homepage_materials 테이블 생성
- [ ] homepage_portfolios 테이블 생성
- [ ] homepage_reviews 테이블 생성
- [ ] homepage_inquiries 테이블 생성
- [ ] clients.brand_persona에 interior_profile 스키마 문서화
- [ ] keywords.metadata에 blog_type 스키마 문서화
- [ ] contents.content_type에 'hp_blog_info', 'hp_blog_review', 'hp_page' 추가

### Phase 2: 어드민 UI (3일)
- [ ] /dashboard/homepage — 프로젝트 목록 페이지
- [ ] /dashboard/homepage/new — 새 프로젝트 생성
- [ ] /dashboard/homepage/[id] — 프로젝트 상세
- [ ] /dashboard/homepage/[id]/collect — 자료 수집 폼 (5단계)
- [ ] /dashboard/homepage/[id]/portfolios — 포트폴리오 관리
- [ ] /dashboard/homepage/[id]/reviews — 후기 관리
- [ ] /dashboard/homepage/[id]/inquiries — 상담 신청 관리
- [ ] 사이드바 메뉴 추가
- [ ] 클라이언트 상세에 홈페이지 탭 추가

### Phase 3: 자동 키워드 생성 (1일)
- [ ] generateHomepageKeywords() 서버 액션 구현
- [ ] seo-keyword-matrix.ts 데이터 연동
- [ ] 브랜드 분석 → 키워드 자동 INSERT 훅

### Phase 4: 홈페이지 템플릿 A (5일)
- [ ] 모던 미니멀 템플릿 컴포넌트 개발
- [ ] Supabase 데이터 연동 (config.ts)
- [ ] SEO 자동 생성 (metadata, JSON-LD, sitemap)
- [ ] 블로그 페이지 (contents 테이블 연동)
- [ ] 상담 폼 (homepage_inquiries INSERT)
- [ ] Before/After 슬라이더 컴포넌트
- [ ] 반응형 디자인

### Phase 5: 빌드/배포 파이프라인 (2일)
- [ ] Vercel API 연동 (프로젝트 생성, 배포)
- [ ] 서브도메인 자동 설정
- [ ] 환경변수 자동 주입 (SUPABASE_URL, PROJECT_ID 등)
- [ ] 재배포 트리거 (데이터 변경 시)

### Phase 6: 블로그 대량발행 연동 (2일)
- [ ] 콘텐츠 생성 프롬프트에 hp_blog_info / hp_blog_review 타입 추가
- [ ] 월간 스케줄러에 홈페이지 블로그 발행 추가
- [ ] publishing_accounts에 'homepage' 플랫폼 추가
- [ ] contents → 홈페이지 블로그 페이지 연동

### Phase 7: 템플릿 B, C (3일)
- [ ] 내추럴 우드 템플릿
- [ ] 프리미엄 다크 템플릿
- [ ] 템플릿 전환 기능

### Phase 8: 모니터링 & 리포트 (2일)
- [ ] 홈페이지 방문/상담 통계 대시보드
- [ ] 월간 리포트에 홈페이지 섹션 추가
- [ ] 상담 신청 알림 (Slack + 이메일)

---

## 9. API 엔드포인트 추가 목록

### 홈페이지 관리 API (신규)

```
-- 프로젝트 CRUD
POST   /api/homepage/projects              → 프로젝트 생성
GET    /api/homepage/projects              → 프로젝트 목록
GET    /api/homepage/projects/[id]         → 프로젝트 상세
PATCH  /api/homepage/projects/[id]         → 프로젝트 수정
DELETE /api/homepage/projects/[id]         → 프로젝트 삭제

-- 자료 수집
POST   /api/homepage/projects/[id]/materials   → 자료 저장
PATCH  /api/homepage/projects/[id]/materials   → 자료 수정
POST   /api/homepage/projects/[id]/upload      → 파일 업로드 (Supabase Storage)

-- 포트폴리오
POST   /api/homepage/projects/[id]/portfolios  → 포트폴리오 추가
PATCH  /api/homepage/portfolios/[id]           → 포트폴리오 수정
DELETE /api/homepage/portfolios/[id]           → 포트폴리오 삭제

-- 후기
POST   /api/homepage/projects/[id]/reviews     → 후기 추가
DELETE /api/homepage/reviews/[id]              → 후기 삭제

-- 상담 신청
POST   /api/homepage/inquiry                   → 상담 접수 (홈페이지에서 호출)
GET    /api/homepage/projects/[id]/inquiries   → 상담 목록

-- 빌드/배포
POST   /api/homepage/projects/[id]/build       → 빌드 트리거
POST   /api/homepage/projects/[id]/deploy      → 배포 트리거
GET    /api/homepage/projects/[id]/preview     → 프리뷰 URL 반환

-- 키워드 자동생성
POST   /api/homepage/projects/[id]/generate-keywords → 키워드 매트릭스 생성
```

### 기존 API 확장

```
-- contents 생성 확장
POST /api/ai/generate-content
  + contentType: 'hp_blog_info' | 'hp_blog_review'
  + targetBlogType: '정보성' | '후기성'

-- 발행 확장
POST /api/publish
  + platform: 'homepage'
  + homepageProjectId: UUID

-- 크론잡 확장
GET /api/cron/scheduled-publish
  + 홈페이지 블로그 스케줄 포함
```

---

## 10. 요약 — 핵심 통합 포인트

| 기존 waide-mkt | 홈페이지 서비스 연동 | 변경 사항 |
|---------------|---------------------|-----------|
| `clients` | 인테리어 업체 = 클라이언트 | brand_persona에 interior_profile 추가 |
| `brand_analyses` | 업체 분석 → 홈페이지 자동 세팅 | 변경 없음 (그대로 사용) |
| `keywords` | SEO + 블로그 타겟 키워드 | source, metadata 필드 활용 |
| `contents` | 홈페이지 블로그 글 | content_type 확장 (hp_blog_*) |
| `publications` | 홈페이지 발행 기록 | platform: 'homepage' 추가 |
| `publishing_accounts` | 홈페이지 발행 계정 | platform: 'homepage' 추가 |
| `serp_results` | 블로그 순위 추적 | 변경 없음 |
| `keyword_visibility` | 키워드 노출 추적 | 변경 없음 |
| `aeo_scores` | AI 답변 노출 추적 | 변경 없음 |
| `jobs` | 빌드/배포 작업 큐 | job_type 확장 가능 |
| **신규** | `homepage_projects` | 홈페이지 프로젝트 관리 |
| **신규** | `homepage_materials` | 고객 수집 자료 |
| **신규** | `homepage_portfolios` | 포트폴리오 (시공사례) |
| **신규** | `homepage_reviews` | 고객 후기 |
| **신규** | `homepage_inquiries` | 상담 신청 |

> **핵심 원칙: 기존 waide-mkt 테이블은 최대한 변경하지 않고, 신규 5개 테이블로 홈페이지 기능을 확장. 블로그 발행/추적은 100% 기존 파이프라인 재사용.**
