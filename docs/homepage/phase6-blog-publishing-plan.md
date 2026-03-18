# Phase 6: 블로그 대량 발행 통합 기획서

> 작성일: 2026-03-17
> 목적: waide-mkt(ai-marketer) 기존 블로그 발행 시스템과 홈페이지 블로그를 통합하여, 키워드 기반 대량 발행 파이프라인을 구축
> 상위 문서: INTEGRATED_HOMEPAGE_PLAN.md, INTERIOR_HOMEPAGE_MASTER_PLAN.md

---

## 목차

1. [현행 시스템 분석](#1-현행-시스템-분석)
2. [콘텐츠 타입 확장](#2-콘텐츠-타입-확장)
3. [발행 플랫폼 확장](#3-발행-플랫폼-확장)
4. [블로그 자동 생성 파이프라인](#4-블로그-자동-생성-파이프라인)
5. [월간 발행 스케줄](#5-월간-발행-스케줄)
6. [키워드-블로그 연동](#6-키워드-블로그-연동)
7. [Server Actions & API](#7-server-actions--api)
8. [어드민 UI 통합](#8-어드민-ui-통합)
9. [마이그레이션 SQL](#9-마이그레이션-sql)
10. [구현 로드맵](#10-구현-로드맵)

---

## 1. 현행 시스템 분석

### 1-1. waide-mkt 기존 발행 시스템 구조

```
┌──────────────────────────────────────────────────────────────┐
│                    waide-mkt 기존 발행 파이프라인                │
│                                                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐ │
│  │ keywords  │───▶│ contents  │───▶│publications│───▶│  SERP   │ │
│  │  테이블   │    │  테이블   │    │   테이블   │    │ Tracker │ │
│  └──────────┘    └──────────┘    └──────────┘    └─────────┘ │
│       │                │                │                      │
│       │          ┌─────┴──────┐   ┌────┴─────┐               │
│       │          │ blog-writing│   │publishing│               │
│       │          │ -agent     │   │_accounts │               │
│       │          └────────────┘   └──────────┘               │
│       │                                                        │
│       ▼                                                        │
│  /api/cron/scheduled-publish                                   │
│  (스케줄 기반 자동 발행 크론잡)                                   │
└──────────────────────────────────────────────────────────────┘
```

### 1-2. 기존 테이블 스키마 요약

#### contents 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| client_id | UUID | FK → clients |
| title | TEXT | 글 제목 |
| body | TEXT | HTML 본문 |
| slug | TEXT | URL 슬러그 |
| content_type | TEXT (CHECK) | `blog_seo`, `blog_story`, `place_info` 등 |
| publish_status | TEXT | `draft`, `published`, `scheduled` |
| published_at | TIMESTAMPTZ | 발행 시각 |
| meta_description | TEXT | SEO 메타 설명 |
| main_keyword | TEXT | 메인 타겟 키워드 |
| sub_keywords | TEXT[] | 서브 키워드 |
| quality_score | INTEGER | QC 에이전트 점수 (0~100) |

#### publications 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| content_id | UUID | FK → contents |
| client_id | UUID | FK → clients |
| platform | TEXT | `naver_blog`, `tistory`, `wordpress` |
| publishing_account_id | UUID | FK → publishing_accounts |
| external_url | TEXT | 발행된 외부 URL |
| status | TEXT | `pending`, `published`, `failed` |

#### publishing_accounts 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| client_id | UUID | FK → clients |
| platform | TEXT | `naver_blog`, `tistory`, `wordpress` |
| account_name | TEXT | 계정 표시명 |
| account_url | TEXT | 계정 URL |
| credentials | JSONB | 인증 정보 (암호화) |
| is_default | BOOLEAN | 기본 발행 계정 여부 |

### 1-3. 홈페이지 블로그 현황 (이미 구현된 부분)

현재 홈페이지 템플릿(`templates/modern-minimal/`)에 블로그 페이지가 이미 구현되어 있다:

- `app/blog/page.tsx` -- contents 테이블에서 `hp_blog_info`, `hp_blog_review` 타입 조회
- `app/blog/[slug]/page.tsx` -- 개별 블로그 글 상세 (Article JSON-LD 포함)
- `data/config.ts` -- `getHomepageConfig()`에서 블로그 글 fetch 포함
- `app/sitemap.ts` -- 블로그 글을 sitemap에 자동 포함

**미구현 부분**: 콘텐츠 자동 생성, 대량 발행, 스케줄링, 키워드 연동

---

## 2. 콘텐츠 타입 확장

### 2-1. 기존 → 확장 content_type 매핑

```
기존 content_type CHECK 제약조건:
  'blog_seo'      -- SEO 최적화 블로그 (네이버/티스토리용)
  'blog_story'    -- 스토리텔링 블로그
  'place_info'    -- 플레이스 정보성 글

신규 추가 (홈페이지용):
  'hp_blog_info'   -- 홈페이지 정보성 블로그
  'hp_blog_review' -- 홈페이지 후기성 블로그
  'hp_page'        -- 홈페이지 정적 페이지 콘텐츠
```

### 2-2. 각 콘텐츠 타입별 목적과 생성 전략

#### hp_blog_info (정보성 블로그)

| 항목 | 내용 |
|------|------|
| 목적 | 검색 유입 확보, 전문성 어필, AEO 최적화 |
| 타겟 키워드 | `{지역} 인테리어 비용`, `인테리어 업체 고르는 방법` 등 |
| 글 포맷 | 비용 분석, 가이드, 트렌드, 비교, 체크리스트 |
| 글 길이 | 2,000~4,000자 |
| 발행 비율 | 월간 발행의 50% |
| SEO 스키마 | Article + FAQPage (FAQ 섹션 포함 시) |
| AEO 최적화 | 핵심 요약 블록 + FAQ 구조화 데이터 필수 |
| CTA | 하단 무료 상담 폼 링크 |

**생성 전략**:
1. keywords 테이블에서 `source = 'blog_target'`, `metadata.blog_type = '정보성'`인 키워드 선택
2. 검색량 높은 키워드부터 우선 사용
3. 동일 키워드로 이미 발행된 글이 있으면 다른 angle(content_format)로 재생성
4. brand_persona.content_angles에서 콘텐츠 각도 참조

#### hp_blog_review (후기성 블로그)

| 항목 | 내용 |
|------|------|
| 목적 | 신뢰도 구축, 지역 키워드 점유, 전환율 향상 |
| 타겟 키워드 | `{지역} 인테리어 후기`, `{평수}평 인테리어 후기` 등 |
| 글 포맷 | 시공 후기, 견적 공개, Before/After, 완성 포토 |
| 글 길이 | 1,500~3,000자 |
| 발행 비율 | 월간 발행의 50% |
| SEO 스키마 | Article + Review |
| 포트폴리오 연동 | homepage_portfolios 데이터 자동 참조 |
| CTA | 하단 견적 문의 폼 링크 |

**생성 전략**:
1. homepage_portfolios에서 아직 블로그화되지 않은 포트폴리오 선택
2. 포트폴리오의 space_type, style, area_pyeong 정보를 키워드에 조합
3. Before/After 이미지가 있으면 비교 컨텐츠로 자동 구성
4. 실제 시공 데이터 기반으로 구체적인 비용, 기간 정보 포함

#### hp_page (정적 페이지 콘텐츠)

| 항목 | 내용 |
|------|------|
| 목적 | 홈페이지 정적 페이지의 본문 콘텐츠 관리 |
| 대상 페이지 | `/about`, `/services/*`, `/faq` 등 |
| 발행 방식 | 수동 생성/수정, 자동 발행 대상 아님 |
| SEO 스키마 | 페이지별 상이 (Service, FAQPage 등) |

### 2-3. content_type별 body HTML 구조

```html
<!-- hp_blog_info: 정보성 블로그 본문 구조 -->
<article>
  <!-- 핵심 요약 (AEO 최적화) -->
  <div class="summary-block">
    <p>{질문에 대한 직접적 답변 2~3문장}</p>
  </div>

  <!-- 본문 섹션들 -->
  <h2>{섹션1 제목}</h2>
  <p>{본문}</p>

  <h2>{섹션2 제목}</h2>
  <p>{본문 + 표/이미지}</p>

  <!-- FAQ 섹션 (FAQPage 스키마 매핑) -->
  <section class="faq-section">
    <h2>자주 묻는 질문</h2>
    <div class="faq-item">
      <h3>Q. {질문}</h3>
      <p>A. {답변}</p>
    </div>
  </section>

  <!-- CTA -->
  <div class="cta-block">
    <p>{업체명}에서 무료로 인테리어 상담을 받아보세요.</p>
    <a href="/contact">무료 상담 신청하기</a>
  </div>
</article>
```

```html
<!-- hp_blog_review: 후기성 블로그 본문 구조 -->
<article>
  <!-- 시공 개요 테이블 -->
  <table class="overview-table">
    <tr><th>위치</th><td>{지역} {아파트명}</td></tr>
    <tr><th>평수</th><td>{N}평</td></tr>
    <tr><th>시공 범위</th><td>{올수리/부분수리}</td></tr>
    <tr><th>시공 기간</th><td>{N주}</td></tr>
    <tr><th>총 비용</th><td>{금액}만원</td></tr>
  </table>

  <!-- Before/After -->
  <h2>Before - 시공 전</h2>
  <img src="{before_image}" alt="시공 전" />

  <h2>After - 시공 후</h2>
  <img src="{after_image}" alt="시공 후" />

  <!-- 비용 상세 -->
  <h2>비용 상세</h2>
  <table class="cost-table">...</table>

  <!-- 총평 -->
  <h2>총평</h2>
  <p>{만족도, 추천 포인트}</p>

  <!-- CTA -->
  <div class="cta-block">
    <a href="/contact">무료 견적 받기</a>
  </div>
</article>
```

---

## 3. 발행 플랫폼 확장

### 3-1. publishing_accounts에 'homepage' 플랫폼 추가

기존 platform CHECK 제약조건에 `'homepage'`를 추가한다.

```
기존: 'naver_blog', 'tistory', 'wordpress'
추가: 'homepage'
```

### 3-2. 홈페이지별 발행 계정 자동 생성

homepage_projects가 생성되고 status가 `'live'`로 전환될 때, publishing_accounts에 자동으로 homepage 발행 계정을 INSERT한다.

```
트리거 시점: homepage_projects.status = 'live'
동작:
  1. publishing_accounts INSERT
     - client_id: homepage_projects.client_id
     - platform: 'homepage'
     - account_name: '{업체명} 홈페이지 블로그'
     - account_url: 'https://{subdomain}.waide.kr/blog'
     - credentials: { project_id: '{homepage_project_id}', vercel_project_id: '{vercel_project_id}' }
     - is_default: false (기존 네이버 블로그가 기본)
  2. auto_publish_settings 업데이트 (있을 경우)
     - homepage_enabled: true
     - homepage_project_id: '{project_id}'
```

### 3-3. 발행 프로세스: homepage 플랫폼

기존 `naver_blog`, `tistory` 플랫폼은 외부 API를 통해 글을 게시하지만, `homepage` 플랫폼은 Supabase에 콘텐츠를 INSERT하고 Vercel 리빌드를 트리거하는 방식이다.

```
┌──────────────────────────────────────────────────────────────────┐
│                   homepage 플랫폼 발행 프로세스                     │
│                                                                    │
│  1. contents 테이블 UPDATE                                        │
│     └─ publish_status: 'draft' → 'published'                     │
│     └─ published_at: NOW()                                        │
│     └─ slug: 자동 생성 (제목 기반 slugify)                          │
│                                                                    │
│  2. publications 테이블 INSERT                                    │
│     └─ platform: 'homepage'                                       │
│     └─ external_url: 'https://{subdomain}.waide.kr/blog/{slug}'  │
│     └─ status: 'published'                                        │
│                                                                    │
│  3. Vercel ISR Revalidation 트리거                                │
│     └─ POST https://api.vercel.com/v1/integrations/deploy-hooks   │
│        OR                                                          │
│     └─ fetch('https://{subdomain}.waide.kr/api/revalidate', {     │
│          method: 'POST',                                           │
│          body: { path: '/blog', secret: REVALIDATE_SECRET }       │
│        })                                                          │
│                                                                    │
│  4. sitemap 자동 갱신 (ISR 리빌드 시 sitemap.ts 재생성)            │
└──────────────────────────────────────────────────────────────────┘
```

### 3-4. 네이버 블로그 동시 발행 (크로스 포스팅)

하나의 콘텐츠를 홈페이지와 네이버 블로그에 동시 발행할 수 있다. 네이버 블로그 버전에는 원본 홈페이지 URL을 canonical로 명시하여 SEO 중복을 방지한다.

```
발행 옵션:
  ┌─ 홈페이지만 발행 (기본)
  ├─ 홈페이지 + 네이버 블로그 동시 발행
  └─ 네이버 블로그만 발행

동시 발행 시:
  publications 테이블에 2건 INSERT
    1. platform: 'homepage', external_url: 'https://{subdomain}.waide.kr/blog/{slug}'
    2. platform: 'naver_blog', external_url: 'https://blog.naver.com/...'

네이버 블로그 본문 하단에 원본 링크 자동 삽입:
  "원본 글: https://{subdomain}.waide.kr/blog/{slug}"
```

---

## 4. 블로그 자동 생성 파이프라인

### 4-1. 전체 파이프라인 흐름

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  키워드   │───▶│  주제    │───▶│  콘텐츠   │───▶│   QC     │───▶│   발행   │
│  선정     │    │  생성    │    │  생성     │    │  검수    │    │  & 추적  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │                │                │                │              │
     ▼                ▼                ▼                ▼              ▼
  keywords       AI 주제 생성     blog-writing      QC 에이전트    publications
  테이블         (GPT/Claude)     -agent (기존)     quality_score   + ISR revalidate
  source:                         + HP 프롬프트      >= 70점        + SERP 추적
  'blog_target'                   확장
```

### 4-2. Step 1: 키워드 매트릭스 기반 블로그 주제 자동 선정

```typescript
// waide-mkt 내 Server Action
async function selectBlogTopics(projectId: string, month: string): Promise<BlogTopic[]> {
  const project = await getHomepageProject(projectId);
  const clientId = project.client_id;

  // 1. blog_target 키워드 조회
  const targetKeywords = await supabase
    .from('keywords')
    .select('*')
    .eq('client_id', clientId)
    .eq('source', 'blog_target')
    .eq('status', 'active')
    .order('priority');

  // 2. 이미 발행된 키워드 제외
  const publishedKeywords = await supabase
    .from('contents')
    .select('main_keyword')
    .eq('client_id', clientId)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .eq('publish_status', 'published');

  const usedKeywords = new Set(publishedKeywords.data?.map(c => c.main_keyword));

  // 3. 미사용 키워드 우선 선정 (월 8개: 정보성 4 + 후기성 4)
  const availableKeywords = targetKeywords.data
    ?.filter(k => !usedKeywords.has(k.keyword));

  const infoKeywords = availableKeywords
    ?.filter(k => k.metadata?.blog_type === '정보성')
    .slice(0, 4);

  const reviewKeywords = availableKeywords
    ?.filter(k => k.metadata?.blog_type === '후기성')
    .slice(0, 4);

  // 4. 키워드 풀이 부족하면 키워드 매트릭스에서 자동 확장
  if ((infoKeywords?.length || 0) < 4 || (reviewKeywords?.length || 0) < 4) {
    await expandKeywordsFromMatrix(clientId, project);
  }

  // 5. 주제 생성 (AI)
  const topics = await generateTopicsFromKeywords(
    [...(infoKeywords || []), ...(reviewKeywords || [])],
    project.client.brand_persona
  );

  return topics;
}
```

### 4-3. Step 2: AI 에이전트(blog-writing-agent) 연동

기존 blog-writing-agent를 확장하여 홈페이지 블로그 전용 프롬프트를 추가한다.

#### 기존 에이전트와의 통합 포인트

| 항목 | 기존 (blog_seo/blog_story) | 확장 (hp_blog_info/hp_blog_review) |
|------|---------------------------|-----------------------------------|
| 에이전트 | blog-writing-agent | 동일 에이전트 재사용 |
| 프롬프트 | SEO/스토리 프롬프트 | HP 전용 프롬프트 추가 |
| 입력 | client.brand_persona | + interior_profile, portfolios |
| 출력 | HTML body | HTML body + 구조화 데이터 |
| QC | quality_score >= 70 | 동일 기준 |
| 발행 | naver_blog/tistory | homepage + (선택)naver_blog |

#### 홈페이지 블로그용 프롬프트 확장

```typescript
// hp_blog_info 전용 시스템 프롬프트 (기존 프롬프트에 추가)
const HP_BLOG_INFO_PROMPT = `
당신은 인테리어 전문 블로그 작가입니다.

## 업체 정보
- 업체명: {company_name}
- 서비스 지역: {service_regions}
- 전문 분야: {service_types}
- 브랜드 톤: {brand_persona.tone}
- 차별점: {brand_persona.strengths}

## 작성 규칙
1. 글 길이: 2,000~4,000자
2. H2 태그로 4~6개 섹션 구분
3. 첫 문단에 핵심 요약 (AEO 최적화용 직접 답변)
4. FAQ 섹션 포함 (최소 3개 Q&A)
5. 하단에 CTA 블록 포함 (무료 상담 링크: /contact)
6. 구체적 수치/데이터 포함 (비용, 기간, 면적 등)
7. 내부 링크 삽입:
   - 포트폴리오: /portfolio
   - 다른 블로그 글: /blog/{관련글 slug}
   - 상담: /contact
8. 이미지 alt 텍스트에 키워드 포함
9. 업체명을 자연스럽게 2~3회 언급

## 메인 키워드: {main_keyword}
## 서브 키워드: {sub_keywords}
## 콘텐츠 포맷: {content_format}
`;

// hp_blog_review 전용 시스템 프롬프트
const HP_BLOG_REVIEW_PROMPT = `
당신은 인테리어 시공 후기 전문 작가입니다.

## 업체 정보
(위와 동일)

## 포트폴리오 참조 데이터
- 공간 유형: {portfolio.space_type}
- 스타일: {portfolio.style}
- 면적: {portfolio.area_pyeong}평
- 예산 범위: {portfolio.budget_range}
- Before 이미지: {portfolio.before_image_url}
- After 이미지: {portfolio.after_image_url}

## 작성 규칙
1. 글 길이: 1,500~3,000자
2. 시공 개요 테이블 필수 (위치, 평수, 범위, 기간, 비용)
3. Before/After 비교 섹션 필수
4. 비용 항목별 분석표 포함
5. 1인칭 고객 시점으로 작성 (자연스러운 후기체)
6. 업체와의 소통 과정, 만족 포인트 구체적 서술
7. 하단 CTA: "비슷한 시공 견적 받아보기" → /contact
8. 내부 링크: 포트폴리오 상세 페이지 연결
`;
```

### 4-4. Step 3: SEO 최적화 자동 적용

#### 메타태그 자동 생성

```typescript
function generateBlogMeta(content: Content, company: CompanyConfig) {
  return {
    // title: 50~60자 (키워드 포함)
    title: `${content.title} | ${company.name}`,

    // meta_description: 120~160자 (키워드 + CTA)
    meta_description: generateMetaDescription(content),

    // slug: URL-safe 한글 슬러그
    slug: slugify(content.title),

    // canonical URL
    canonical: `https://${project.subdomain}.waide.kr/blog/${slug}`,
  };
}
```

#### JSON-LD 스키마 마크업 자동 삽입

```typescript
function generateBlogSchema(content: Content, company: CompanyConfig) {
  const schemas = [];

  // 1. Article 스키마 (모든 블로그 글)
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: content.title,
    description: content.meta_description,
    author: {
      '@type': 'Organization',
      name: company.name,
    },
    publisher: {
      '@type': 'Organization',
      name: company.name,
      logo: { '@type': 'ImageObject', url: company.logo },
    },
    datePublished: content.published_at,
    dateModified: content.updated_at,
    mainEntityOfPage: content.canonical_url,
  });

  // 2. FAQPage 스키마 (FAQ 섹션이 있는 정보성 글)
  if (content.content_type === 'hp_blog_info' && content.faq_items?.length) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faq_items.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  // 3. HowTo 스키마 (가이드/방법 글)
  if (content.metadata?.content_format === '가이드') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: content.title,
      step: content.metadata.steps?.map((step, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: step.title,
        text: step.description,
      })),
    });
  }

  // 4. Review 스키마 (후기성 글)
  if (content.content_type === 'hp_blog_review') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: {
        '@type': 'LocalBusiness',
        name: company.name,
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: content.metadata?.rating || 5,
        bestRating: 5,
      },
      author: {
        '@type': 'Person',
        name: content.metadata?.reviewer_name || '고객',
      },
    });
  }

  return schemas;
}
```

### 4-5. Step 4: AEO 최적화 (Answer Engine Optimization)

AI 검색 엔진(Perplexity, ChatGPT, 네이버 AI검색 등)에 답변으로 채택될 확률을 높이기 위한 최적화:

#### AEO 최적화 체크리스트

| # | 항목 | 적용 방법 |
|---|------|----------|
| 1 | **직접 답변 블록** | 글 최상단에 2~3문장으로 핵심 답변 배치 |
| 2 | **FAQ 구조화 데이터** | FAQPage 스키마 마크업 (JSON-LD) |
| 3 | **HowTo 구조화 데이터** | 단계별 가이드에 HowToStep 스키마 |
| 4 | **정확한 수치** | "약 3,000~5,000만원" 같은 구체적 범위 |
| 5 | **표/리스트** | 비교표, 체크리스트로 정보 구조화 |
| 6 | **질문 제목** | H2/H3에 "~인가요?", "~하는 방법" 질문형 사용 |
| 7 | **최신성** | 발행일 명시, 연도 포함 ("2026년 기준") |
| 8 | **출처 명시** | "10년 경력 전문 업체 OO인테리어 제공" |

#### AEO 프롬프트 추가 지시

```
## AEO 최적화 지시사항
- 글의 첫 문단은 "{메인 키워드}"에 대한 직접적 답변으로 시작하세요
- "결론부터 말하면", "핵심 요약" 형태로 즉답을 제공하세요
- 구체적 수치를 반드시 포함하세요 (비용, 기간, 면적 등)
- FAQ 섹션의 질문은 실제 사용자가 AI에게 물을 법한 형태로 작성하세요
- 각 답변은 50~150자로 간결하게 작성하세요
```

### 4-6. Step 5: 내부 링크 자동 삽입

홈페이지 블로그 글 간의 내부 링크를 자동으로 삽입하여 SEO 효과를 극대화한다.

```typescript
async function insertInternalLinks(
  body: string,
  contentId: string,
  clientId: string
): Promise<string> {
  // 1. 같은 클라이언트의 발행된 블로그 글 조회
  const { data: relatedPosts } = await supabase
    .from('contents')
    .select('title, slug, main_keyword')
    .eq('client_id', clientId)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .eq('publish_status', 'published')
    .neq('id', contentId);

  let enrichedBody = body;

  // 2. 본문에서 관련 키워드 매칭 → 내부 링크 삽입 (최대 3개)
  let linkCount = 0;
  for (const post of relatedPosts || []) {
    if (linkCount >= 3) break;
    const keyword = post.main_keyword;
    if (keyword && enrichedBody.includes(keyword) && !enrichedBody.includes(`/blog/${post.slug}`)) {
      enrichedBody = enrichedBody.replace(
        keyword,
        `<a href="/blog/${post.slug}" title="${post.title}">${keyword}</a>`
      );
      linkCount++;
    }
  }

  // 3. 포트폴리오 링크 삽입 (후기성 글인 경우)
  enrichedBody = enrichedBody.replace(
    /시공 사례|포트폴리오/,
    '<a href="/portfolio">시공 사례</a>'
  );

  // 4. 상담 CTA 링크 확인
  if (!enrichedBody.includes('/contact')) {
    enrichedBody += `
      <div class="cta-block">
        <p>무료 인테리어 상담을 받아보세요.</p>
        <a href="/contact">무료 상담 신청하기</a>
      </div>
    `;
  }

  return enrichedBody;
}
```

---

## 5. 월간 발행 스케줄

### 5-1. /api/cron/scheduled-publish 확장

기존 크론잡에 홈페이지 블로그 발행 로직을 추가한다.

```
기존 크론잡 흐름:
  1. auto_publish_settings에서 활성 클라이언트 조회
  2. 각 클라이언트별 스케줄된 콘텐츠 조회
  3. 플랫폼별 발행 실행 (naver_blog, tistory, wordpress)

확장 흐름:
  1. (기존 동일)
  2. (기존 동일)
  3. (기존 동일)
  4. [추가] homepage_projects.status = 'live'인 프로젝트 조회
  5. [추가] 월간 발행 목표 대비 부족분 확인
  6. [추가] 부족 시 콘텐츠 자동 생성 + 발행 큐 추가
  7. [추가] homepage 플랫폼 발행 실행 (contents UPDATE + ISR revalidation)
```

### 5-2. 프로젝트별 월간 발행 목표

```typescript
interface MonthlyPublishTarget {
  projectId: string;
  clientId: string;
  postsPerMonth: number;     // 기본값: 8
  infoRatio: number;         // 기본값: 0.5 (정보성 비율)
  reviewRatio: number;       // 기본값: 0.5 (후기성 비율)
  autoPublish: boolean;      // 기본값: true
  publishDays: number[];     // 발행 요일 [1,3] = 월,수 (기본값: [1,3,5] = 월,수,금)
  publishHour: number;       // 발행 시각 (기본값: 9 = 오전 9시)
}

// homepage_projects.blog_config에 저장
// 예시:
{
  "posts_per_month": 8,
  "info_ratio": 0.5,
  "review_ratio": 0.5,
  "auto_publish": true,
  "publish_days": [1, 3, 5],
  "publish_hour": 9,
  "target_keywords": ["강남 인테리어 비용", "강남 인테리어 후기"],
  "content_calendar": []
}
```

### 5-3. 발행 큐 관리

```typescript
// 발행 큐 관리 로직 (크론잡 내부)
async function processHomepageBlogQueue(projectId: string) {
  const project = await getHomepageProject(projectId);
  const blogConfig = project.blog_config;

  // 1. 이번 달 발행 현황 확인
  const thisMonth = new Date().toISOString().slice(0, 7); // "2026-03"
  const { count: publishedCount } = await supabase
    .from('contents')
    .select('id', { count: 'exact' })
    .eq('client_id', project.client_id)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .eq('publish_status', 'published')
    .gte('published_at', `${thisMonth}-01`)
    .lt('published_at', `${thisMonth}-32`);

  const remaining = blogConfig.posts_per_month - (publishedCount || 0);
  if (remaining <= 0) return; // 이번 달 목표 달성

  // 2. 오늘이 발행일인지 확인
  const today = new Date().getDay(); // 0=일, 1=월, ...
  if (!blogConfig.publish_days.includes(today)) return;

  // 3. 발행 대기 중인 콘텐츠 확인
  const { data: scheduledContents } = await supabase
    .from('contents')
    .select('*')
    .eq('client_id', project.client_id)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .eq('publish_status', 'scheduled')
    .order('created_at')
    .limit(1);

  if (scheduledContents?.length) {
    // 4a. 대기 중인 콘텐츠 발행
    await publishToHomepage(scheduledContents[0].id, project.id);
  } else {
    // 4b. 대기 콘텐츠 없으면 자동 생성 → 발행
    const topic = await selectNextTopic(project);
    const content = await generateHomepageBlogContent(project.id, topic.keywordId);
    await publishToHomepage(content.id, project.id);
  }
}
```

### 5-4. 중복 방지 로직

```typescript
// 중복 방지 체크
async function isDuplicateTopic(clientId: string, mainKeyword: string): Promise<boolean> {
  // 1. 동일 main_keyword로 이미 발행된 글이 있는지 확인
  const { count } = await supabase
    .from('contents')
    .select('id', { count: 'exact' })
    .eq('client_id', clientId)
    .eq('main_keyword', mainKeyword)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .in('publish_status', ['published', 'scheduled']);

  if ((count || 0) > 0) return true;

  // 2. 유사 제목 체크 (동일 키워드의 다른 angle은 허용)
  // → metadata.content_format이 다르면 OK
  return false;
}

// 키워드별 발행 횟수 추적
async function updateKeywordPublishCount(keywordId: string) {
  const { data: keyword } = await supabase
    .from('keywords')
    .select('metadata')
    .eq('id', keywordId)
    .single();

  const metadata = keyword?.metadata || {};
  metadata.publish_count = (metadata.publish_count || 0) + 1;
  metadata.last_published_at = new Date().toISOString();

  await supabase
    .from('keywords')
    .update({ metadata })
    .eq('id', keywordId);
}
```

### 5-5. 발행 후 ISR Revalidation 자동 트리거

```typescript
async function triggerRevalidation(projectId: string, paths: string[]) {
  const project = await getHomepageProject(projectId);

  // 방법 1: Vercel Deploy Hook (전체 리빌드)
  if (project.vercel_deploy_hook_url) {
    await fetch(project.vercel_deploy_hook_url, { method: 'POST' });
    return;
  }

  // 방법 2: On-demand ISR (특정 경로만 리빌드)
  const revalidateUrl = `https://${project.subdomain}.waide.kr/api/revalidate`;
  const revalidateSecret = process.env.REVALIDATE_SECRET;

  for (const path of paths) {
    await fetch(revalidateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, secret: revalidateSecret }),
    });
  }
}

// 블로그 발행 시 revalidation 대상 경로
// /blog         -- 블로그 목록 페이지
// /blog/{slug}  -- 새 글 상세 페이지
// /sitemap.xml  -- 사이트맵 갱신
// /             -- 메인 페이지 (최신 블로그 프리뷰 갱신)
```

### 5-6. 월간 발행 캘린더 예시

| 주 | 요일 | 콘텐츠 타입 | 키워드 전략 | 포맷 |
|----|------|------------|-----------|------|
| 1주 | 월 | hp_blog_info | `{지역} 인테리어 비용` | 비용 분석표 |
| 1주 | 수 | hp_blog_review | `{지역} {평수}평 인테리어 후기` | 시공 후기 |
| 1주 | 금 | hp_blog_info | `인테리어 업체 고르는 방법` | 체크리스트 |
| 2주 | 월 | hp_blog_review | `{지역} 인테리어 견적` | 견적 공개 |
| 2주 | 수 | hp_blog_info | `2026 인테리어 트렌드` | 트렌드 리포트 |
| 3주 | 월 | hp_blog_review | `{지역} 아파트 인테리어 후기` | Before/After |
| 3주 | 수 | hp_blog_info | `{공간} 리모델링 비용` | 비용 비교표 |
| 4주 | 월 | hp_blog_review | `{스타일} 인테리어 완성` | 완성 포토 |

---

## 6. 키워드-블로그 연동

### 6-1. keywords 테이블의 source: 'blog_target' 활용

기존 키워드 자동 생성 로직(INTEGRATED_HOMEPAGE_PLAN.md 4-1절)에서 `source: 'blog_target'`으로 생성된 키워드를 블로그 주제 선정에 활용한다.

```
키워드 → 블로그 연동 흐름:

  keywords (source: 'blog_target')
      │
      ├── metadata.blog_type: '정보성'
      │     └── → hp_blog_info 콘텐츠 생성
      │
      ├── metadata.blog_type: '후기성'
      │     └── → hp_blog_review 콘텐츠 생성
      │
      └── metadata.blog_type: 'AEO'
            └── → hp_blog_info + FAQ/HowTo 스키마
```

### 6-2. 키워드 성과 → 블로그 주제 자동 추천

기존 SERP Tracking 시스템의 데이터를 활용하여 블로그 주제를 자동 추천한다.

```typescript
async function recommendBlogTopics(clientId: string): Promise<TopicRecommendation[]> {
  // 1. keyword_visibility에서 순위 하락 키워드 감지
  const decliningKeywords = await supabase
    .from('keyword_visibility')
    .select('keyword_id, position, previous_position')
    .eq('client_id', clientId)
    .gt('position', 'previous_position')  // 순위 하락
    .lte('position', 30);  // 30위 이내

  // 2. 순위 하락 키워드 → "강화 블로그" 추천
  const strengthenTopics = decliningKeywords.data?.map(kv => ({
    keywordId: kv.keyword_id,
    reason: `순위 하락 (${kv.previous_position}위 → ${kv.position}위)`,
    action: '해당 키워드로 추가 블로그 작성하여 순위 방어',
    priority: 'high',
  }));

  // 3. 아직 순위가 없는 키워드 → "신규 공략" 추천
  const unrankedKeywords = await supabase
    .from('keywords')
    .select('id, keyword')
    .eq('client_id', clientId)
    .eq('source', 'blog_target')
    .is('metadata->last_published_at', null);

  const newAttackTopics = unrankedKeywords.data?.map(k => ({
    keywordId: k.id,
    reason: '아직 블로그가 없는 타겟 키워드',
    action: '해당 키워드로 첫 블로그 작성',
    priority: 'medium',
  }));

  // 4. 상위 노출 키워드 → "확장 블로그" 추천
  const topKeywords = await supabase
    .from('keyword_visibility')
    .select('keyword_id, position')
    .eq('client_id', clientId)
    .lte('position', 10);

  const expandTopics = topKeywords.data?.map(kv => ({
    keywordId: kv.keyword_id,
    reason: `상위 노출 중 (${kv.position}위) - 관련 롱테일 키워드 공략`,
    action: '상위 키워드의 롱테일 변형으로 추가 블로그 작성',
    priority: 'low',
  }));

  return [
    ...(strengthenTopics || []),
    ...(newAttackTopics || []),
    ...(expandTopics || []),
  ].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
```

### 6-3. 발행된 블로그의 키워드 순위 추적

```
발행 후 순위 추적 흐름:

  contents (publish_status: 'published')
      │
      ├── main_keyword 추출
      │
      ├── serp_results 테이블에 추적 등록
      │     └── 기존 SERP Tracker 크론잡이 자동 추적
      │
      ├── keyword_visibility 일일 업데이트
      │     └── homepage 블로그 URL이 검색 결과에 노출되는지 확인
      │
      └── aeo_scores 주간 업데이트
            └── AI 검색 엔진에서 해당 콘텐츠 인용 여부 확인
```

```typescript
// 발행 후 SERP 추적 자동 등록
async function registerSerpTracking(contentId: string) {
  const content = await getContent(contentId);
  const keyword = await getKeyword(content.main_keyword, content.client_id);

  // 1. 해당 키워드가 아직 SERP 추적 대상이 아니면 등록
  if (keyword && keyword.status !== 'tracking') {
    await supabase
      .from('keywords')
      .update({ status: 'tracking' })
      .eq('id', keyword.id);
  }

  // 2. 초기 SERP 체크 트리거
  await triggerSerpCheck(content.client_id, content.main_keyword);
}
```

### 6-4. 키워드 매트릭스 자동 확장

seo-keyword-matrix.ts의 데이터를 활용하여 키워드 풀이 부족할 때 자동으로 확장한다.

```typescript
import {
  interiorKeywords,
  blogKeywords,
  longTailKeywords,
  seoulDistricts,
} from '@/data/seo-keyword-matrix';

async function expandKeywordsFromMatrix(clientId: string, project: HomepageProject) {
  const regions = project.client.brand_persona?.interior_profile?.service_regions || [];

  // 1. 기존 키워드 목록 조회
  const { data: existingKeywords } = await supabase
    .from('keywords')
    .select('keyword')
    .eq('client_id', clientId);

  const existingSet = new Set(existingKeywords?.map(k => k.keyword));

  // 2. 매트릭스에서 미사용 조합 생성
  const newKeywords = [];

  for (const region of regions) {
    // 블로그 키워드 조합
    for (const bk of blogKeywords) {
      const combo = `${region} ${bk.keyword}`;
      if (!existingSet.has(combo)) {
        newKeywords.push({
          client_id: clientId,
          keyword: combo,
          source: 'blog_target',
          priority: bk.priority <= 2 ? 'high' : 'medium',
          status: 'active',
          metadata: {
            blog_type: bk.type,
            content_format: bk.contentFormat,
            region: region,
          },
        });
      }
    }

    // 롱테일 키워드 (AEO)
    for (const lt of longTailKeywords.filter(k => k.aeoOptimized)) {
      const combo = lt.keyword.replace('{지역}', region);
      if (!existingSet.has(combo)) {
        newKeywords.push({
          client_id: clientId,
          keyword: combo,
          source: 'blog_target',
          priority: 'medium',
          status: 'active',
          metadata: {
            blog_type: 'AEO',
            content_format: lt.answerFormat,
            region: region,
          },
        });
      }
    }
  }

  // 3. 일괄 INSERT
  if (newKeywords.length > 0) {
    await supabase.from('keywords').insert(newKeywords);
  }
}
```

---

## 7. Server Actions & API

### 7-1. generateHomepageBlogContent(projectId, keywordId)

키워드를 기반으로 홈페이지 블로그 콘텐츠를 AI로 생성한다.

```typescript
'use server'

async function generateHomepageBlogContent(
  projectId: string,
  keywordId: string
): Promise<{ contentId: string; title: string }> {
  // 1. 프로젝트 & 키워드 정보 조회
  const project = await getHomepageProjectWithClient(projectId);
  const keyword = await getKeyword(keywordId);
  const brandPersona = project.client.brand_persona;
  const interiorProfile = brandPersona?.interior_profile;

  // 2. 블로그 타입 결정
  const blogType = keyword.metadata?.blog_type || '정보성';
  const contentType = blogType === '후기성' ? 'hp_blog_review' : 'hp_blog_info';
  const contentFormat = keyword.metadata?.content_format || '가이드';

  // 3. 후기성인 경우 포트폴리오 데이터 조회
  let portfolioRef = null;
  if (contentType === 'hp_blog_review') {
    const { data: portfolios } = await supabase
      .from('homepage_portfolios')
      .select('*')
      .eq('project_id', projectId)
      .limit(1);
    portfolioRef = portfolios?.[0];
  }

  // 4. 관련 서브 키워드 조회
  const { data: subKeywords } = await supabase
    .from('keywords')
    .select('keyword')
    .eq('client_id', project.client_id)
    .eq('source', 'blog_target')
    .neq('id', keywordId)
    .limit(3);

  // 5. blog-writing-agent 호출 (기존 에이전트)
  const result = await callBlogWritingAgent({
    contentType,
    contentFormat,
    mainKeyword: keyword.keyword,
    subKeywords: subKeywords?.map(k => k.keyword) || [],
    brandInfo: {
      name: project.client.name,
      persona: brandPersona,
      interiorProfile,
    },
    portfolioRef,
    addSchemaMarkup: true,
    targetPlatform: 'homepage',  // 홈페이지 전용 프롬프트 적용
  });

  // 6. QC 에이전트 실행
  const qcResult = await runQualityCheck(result.body, contentType);
  if (qcResult.score < 70) {
    // 품질 미달 시 재생성 (최대 2회)
    // ... 재시도 로직
  }

  // 7. 내부 링크 삽입
  const enrichedBody = await insertInternalLinks(
    result.body,
    null,
    project.client_id
  );

  // 8. contents 테이블 INSERT
  const { data: content } = await supabase
    .from('contents')
    .insert({
      client_id: project.client_id,
      title: result.title,
      body: enrichedBody,
      slug: slugify(result.title),
      content_type: contentType,
      publish_status: 'draft',
      main_keyword: keyword.keyword,
      sub_keywords: subKeywords?.map(k => k.keyword),
      meta_description: result.metaDescription,
      quality_score: qcResult.score,
      metadata: {
        project_id: projectId,
        keyword_id: keywordId,
        content_format: contentFormat,
        schema_markup: result.schemaMarkup,
        faq_items: result.faqItems,
        generated_by: 'blog-writing-agent',
        generated_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  // 9. 키워드 발행 횟수 업데이트
  await updateKeywordPublishCount(keywordId);

  return { contentId: content.id, title: content.title };
}
```

### 7-2. publishToHomepage(contentId, projectId)

생성된 콘텐츠를 홈페이지에 발행한다.

```typescript
'use server'

async function publishToHomepage(
  contentId: string,
  projectId: string
): Promise<{ publicationId: string; blogUrl: string }> {
  const project = await getHomepageProject(projectId);
  const content = await getContent(contentId);

  // 1. slug 중복 체크 & 유니크 보장
  const slug = await ensureUniqueSlug(content.slug, content.client_id);

  // 2. contents 테이블 UPDATE
  await supabase
    .from('contents')
    .update({
      publish_status: 'published',
      published_at: new Date().toISOString(),
      slug,
    })
    .eq('id', contentId);

  // 3. publishing_accounts에서 homepage 계정 조회
  const { data: account } = await supabase
    .from('publishing_accounts')
    .select('id')
    .eq('client_id', project.client_id)
    .eq('platform', 'homepage')
    .single();

  // 4. publications 테이블 INSERT
  const blogUrl = `https://${project.subdomain}.waide.kr/blog/${slug}`;
  const { data: publication } = await supabase
    .from('publications')
    .insert({
      content_id: contentId,
      client_id: project.client_id,
      platform: 'homepage',
      publishing_account_id: account?.id,
      external_url: blogUrl,
      status: 'published',
    })
    .select()
    .single();

  // 5. ISR Revalidation 트리거
  await triggerRevalidation(projectId, [
    '/blog',
    `/blog/${slug}`,
    '/sitemap.xml',
    '/',
  ]);

  // 6. SERP 추적 등록
  await registerSerpTracking(contentId);

  return { publicationId: publication.id, blogUrl };
}
```

### 7-3. scheduleHomepageBlog(projectId, schedule)

프로젝트의 블로그 발행 스케줄을 설정한다.

```typescript
'use server'

interface BlogSchedule {
  postsPerMonth: number;
  infoRatio: number;
  reviewRatio: number;
  autoPublish: boolean;
  publishDays: number[];  // 0=일, 1=월, ..., 6=토
  publishHour: number;    // 0~23
}

async function scheduleHomepageBlog(
  projectId: string,
  schedule: BlogSchedule
): Promise<void> {
  // 1. 유효성 검증
  if (schedule.postsPerMonth < 1 || schedule.postsPerMonth > 30) {
    throw new Error('월간 발행 수는 1~30 사이여야 합니다');
  }
  if (Math.abs(schedule.infoRatio + schedule.reviewRatio - 1.0) > 0.01) {
    throw new Error('정보성/후기성 비율의 합은 1.0이어야 합니다');
  }

  // 2. blog_config 업데이트
  await supabase
    .from('homepage_projects')
    .update({
      blog_config: {
        posts_per_month: schedule.postsPerMonth,
        info_ratio: schedule.infoRatio,
        review_ratio: schedule.reviewRatio,
        auto_publish: schedule.autoPublish,
        publish_days: schedule.publishDays,
        publish_hour: schedule.publishHour,
      },
    })
    .eq('id', projectId);

  // 3. 콘텐츠 캘린더 자동 생성
  if (schedule.autoPublish) {
    await generateContentCalendar(projectId, schedule);
  }
}

// 콘텐츠 캘린더 자동 생성
async function generateContentCalendar(
  projectId: string,
  schedule: BlogSchedule
) {
  const project = await getHomepageProjectWithClient(projectId);
  const topics = await selectBlogTopics(projectId, getCurrentMonth());

  const calendar = [];
  const publishDates = getPublishDatesForMonth(
    schedule.publishDays,
    schedule.publishHour,
    schedule.postsPerMonth
  );

  for (let i = 0; i < Math.min(topics.length, publishDates.length); i++) {
    calendar.push({
      date: publishDates[i],
      topic: topics[i],
      status: 'planned',
    });
  }

  // blog_config.content_calendar에 저장
  await supabase
    .from('homepage_projects')
    .update({
      'blog_config': {
        ...project.blog_config,
        content_calendar: calendar,
      },
    })
    .eq('id', projectId);
}
```

### 7-4. getHomepageBlogStats(projectId)

홈페이지 블로그 발행 및 성과 통계를 조회한다.

```typescript
'use server'

interface HomepageBlogStats {
  // 발행 현황
  totalPublished: number;
  publishedThisMonth: number;
  scheduledCount: number;
  draftCount: number;
  monthlyTarget: number;
  targetAchievementRate: number;  // %

  // 콘텐츠 분포
  infoPostCount: number;
  reviewPostCount: number;

  // 키워드 성과
  trackedKeywords: number;
  top10Keywords: number;     // 10위 이내 키워드 수
  top30Keywords: number;     // 30위 이내 키워드 수
  avgPosition: number;       // 평균 순위

  // AEO 성과
  aeoMentions: number;       // AI 검색 인용 횟수
  aeoScore: number;          // 평균 AEO 점수

  // 최근 발행 글
  recentPosts: {
    id: string;
    title: string;
    contentType: string;
    publishedAt: string;
    mainKeyword: string;
    serpPosition: number | null;
  }[];

  // 월별 발행 추이
  monthlyTrend: {
    month: string;
    published: number;
    target: number;
  }[];
}

async function getHomepageBlogStats(projectId: string): Promise<HomepageBlogStats> {
  const project = await getHomepageProject(projectId);
  const clientId = project.client_id;
  const blogConfig = project.blog_config;

  // 전체 발행 글 수
  const { count: totalPublished } = await supabase
    .from('contents')
    .select('id', { count: 'exact' })
    .eq('client_id', clientId)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .eq('publish_status', 'published');

  // 이번 달 발행 수
  const thisMonth = new Date().toISOString().slice(0, 7);
  const { count: publishedThisMonth } = await supabase
    .from('contents')
    .select('id', { count: 'exact' })
    .eq('client_id', clientId)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .eq('publish_status', 'published')
    .gte('published_at', `${thisMonth}-01`);

  // 스케줄/초안 수
  const { count: scheduledCount } = await supabase
    .from('contents')
    .select('id', { count: 'exact' })
    .eq('client_id', clientId)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .eq('publish_status', 'scheduled');

  const { count: draftCount } = await supabase
    .from('contents')
    .select('id', { count: 'exact' })
    .eq('client_id', clientId)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .eq('publish_status', 'draft');

  // 키워드 순위 통계 (기존 keyword_visibility 테이블 활용)
  const { data: keywordStats } = await supabase
    .from('keyword_visibility')
    .select('position')
    .eq('client_id', clientId)
    .not('position', 'is', null);

  const positions = keywordStats?.map(k => k.position) || [];
  const top10 = positions.filter(p => p <= 10).length;
  const top30 = positions.filter(p => p <= 30).length;
  const avgPosition = positions.length > 0
    ? positions.reduce((a, b) => a + b, 0) / positions.length
    : 0;

  // 최근 발행 글 5개
  const { data: recentPosts } = await supabase
    .from('contents')
    .select('id, title, content_type, published_at, main_keyword')
    .eq('client_id', clientId)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .eq('publish_status', 'published')
    .order('published_at', { ascending: false })
    .limit(5);

  return {
    totalPublished: totalPublished || 0,
    publishedThisMonth: publishedThisMonth || 0,
    scheduledCount: scheduledCount || 0,
    draftCount: draftCount || 0,
    monthlyTarget: blogConfig?.posts_per_month || 8,
    targetAchievementRate: Math.round(
      ((publishedThisMonth || 0) / (blogConfig?.posts_per_month || 8)) * 100
    ),
    infoPostCount: 0,  // 별도 쿼리
    reviewPostCount: 0,  // 별도 쿼리
    trackedKeywords: positions.length,
    top10Keywords: top10,
    top30Keywords: top30,
    avgPosition: Math.round(avgPosition * 10) / 10,
    aeoMentions: 0,  // aeo_scores 테이블 조회
    aeoScore: 0,     // aeo_scores 테이블 조회
    recentPosts: (recentPosts || []).map(p => ({
      id: p.id,
      title: p.title,
      contentType: p.content_type,
      publishedAt: p.published_at,
      mainKeyword: p.main_keyword,
      serpPosition: null,  // keyword_visibility JOIN
    })),
    monthlyTrend: [],  // 최근 6개월 추이 별도 쿼리
  };
}
```

---

## 8. 어드민 UI 통합

### 8-1. 홈페이지 상세 → "블로그" 탭 추가

기존 `/dashboard/homepage/[id]` 페이지에 "블로그" 탭을 추가한다.

```
/dashboard/homepage/[id] 기존 탭:
  ├─ 개요 (프로젝트 상태, 배포 정보)
  ├─ 자료 (수집된 자료 관리)
  ├─ 포트폴리오 (시공사례 관리)
  ├─ 후기 (고객 후기 관리)
  ├─ 상담 (상담 신청 목록)
  ├─ SEO (SEO 설정)
  │
  └─ [신규] 블로그
       ├─ 발행 현황 대시보드
       ├─ 콘텐츠 목록 (필터: 전체/발행/예약/초안)
       ├─ 콘텐츠 미리보기 및 수정
       ├─ 블로그 자동 생성 (키워드 선택 → 생성)
       ├─ 발행 스케줄 설정
       └─ 키워드 성과 (순위 추적)
```

### 8-2. 블로그 탭 UI 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│  개요 | 자료 | 포트폴리오 | 후기 | 상담 | SEO | [블로그]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ── 발행 현황 ──────────────────────────────────────────        │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │    12    │ │   3/8    │ │    2     │ │    5     │          │
│  │  총 발행  │ │ 이번 달  │ │  예약    │ │  초안    │          │
│  │          │ │ (37.5%)  │ │          │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                   │
│  ── 키워드 성과 ────────────────────────────────────────        │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │  Top 10  │ │  Top 30  │ │ 평균순위  │                        │
│  │   3개    │ │   8개    │ │  15.2위  │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
│                                                                   │
│  ── 콘텐츠 목록 ────────────────────────── [+ 새 글 생성]      │
│                                                                   │
│  [전체] [발행] [예약] [초안]                                      │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 타입    │ 제목                          │ 키워드       │ 상태  │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 정보    │ 강남 인테리어 비용 총정리 2026  │ 강남 인테리어..│ 발행  │
│  │ 후기    │ 강남 30평 아파트 모던 인테리어.. │ 강남 인테리어..│ 발행  │
│  │ 정보    │ 인테리어 업체 고르는 5가지 기준  │ 인테리어 업체..│ 예약  │
│  │ 후기    │ 서초 25평 북유럽 인테리어 후기   │ 서초 인테리어..│ 초안  │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ── 발행 스케줄 설정 ──────────────────────────────────────     │
│                                                                   │
│  월간 발행 수: [8] 개                                             │
│  정보성 비율: [50]% / 후기성 비율: [50]%                          │
│  자동 발행: [ON]                                                  │
│  발행 요일: [월] [수] [금]                                        │
│  발행 시각: [09:00]                                               │
│                                                                   │
│                                    [설정 저장]                    │
└─────────────────────────────────────────────────────────────────┘
```

### 8-3. 콘텐츠 미리보기 및 수정

```
┌─────────────────────────────────────────────────────────────────┐
│  ← 블로그 목록                    [미리보기]  [수정]  [발행]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────┬───────────────────────────────┐  │
│  │       에디터 패널          │        미리보기 패널            │  │
│  │                           │                               │  │
│  │  제목:                    │  ┌─────────────────────────┐  │  │
│  │  [강남 인테리어 비용 총정리]│  │   (홈페이지 블로그 미리보기)│  │  │
│  │                           │  │                         │  │  │
│  │  메인 키워드:              │  │   강남 인테리어 비용      │  │  │
│  │  [강남 인테리어 비용]       │  │   총정리 2026            │  │  │
│  │                           │  │                         │  │  │
│  │  SEO 설명:                │  │   결론부터 말하면,       │  │  │
│  │  [강남 인테리어 비용을...]  │  │   30평 아파트 기준...    │  │  │
│  │                           │  │                         │  │  │
│  │  본문: (Rich Text Editor) │  │   ...                    │  │  │
│  │  [...........................│  │                         │  │  │
│  │  ..........................]│  │                         │  │  │
│  │                           │  └─────────────────────────┘  │  │
│  │  품질 점수: 85/100        │                               │  │
│  │  스키마: Article + FAQPage │                               │  │
│  └───────────────────────────┴───────────────────────────────┘  │
│                                                                   │
│  발행 옵션:                                                       │
│  ☑ 홈페이지 발행   ☐ 네이버 블로그 동시 발행                      │
│                                                                   │
│                          [초안 저장]  [즉시 발행]  [예약 발행]    │
└─────────────────────────────────────────────────────────────────┘
```

### 8-4. 새 글 생성 모달

```
┌─────────────────────────────────────────────────────┐
│  새 블로그 글 생성                              [X]   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  1. 콘텐츠 타입 선택                                  │
│     ○ 정보성 (hp_blog_info)                           │
│     ○ 후기성 (hp_blog_review)                         │
│                                                       │
│  2. 키워드 선택                                       │
│     ┌─────────────────────────────────────────────┐  │
│     │ ☐ 강남 인테리어 비용        [높음] [정보성]   │  │
│     │ ☐ 강남 인테리어 트렌드      [중간] [정보성]   │  │
│     │ ☐ 강남 아파트 인테리어 후기  [높음] [후기성]   │  │
│     │ ☐ 강남 인테리어 견적 공개    [중간] [후기성]   │  │
│     │                                               │  │
│     │ [AI 키워드 추천 받기]                          │  │
│     └─────────────────────────────────────────────┘  │
│                                                       │
│  3. 포트폴리오 연결 (후기성만)                         │
│     ▼ [포트폴리오 선택]                               │
│                                                       │
│  4. 콘텐츠 포맷                                       │
│     ○ 비용 분석  ○ 가이드  ○ 트렌드  ○ 비교          │
│     ○ 시공 후기  ○ 견적 공개  ○ Before/After         │
│                                                       │
│              [AI로 자동 생성]  [직접 작성]             │
└─────────────────────────────────────────────────────┘
```

---

## 9. 마이그레이션 SQL

### 9-1. content_type CHECK 제약조건 확장

```sql
-- ============================================
-- Phase 6 Migration: 블로그 대량 발행 통합
-- ============================================

-- 1. contents.content_type CHECK 제약조건에 신규 타입 추가
-- 기존 CHECK 제약조건 삭제 후 재생성

-- 기존 제약조건 이름 확인 (환경마다 다를 수 있음)
-- SELECT constraint_name FROM information_schema.check_constraints
-- WHERE constraint_name LIKE '%content_type%';

ALTER TABLE contents
  DROP CONSTRAINT IF EXISTS contents_content_type_check;

ALTER TABLE contents
  ADD CONSTRAINT contents_content_type_check
  CHECK (content_type IN (
    -- 기존 타입
    'blog_seo',
    'blog_story',
    'place_info',
    -- 신규 추가 (홈페이지 블로그)
    'hp_blog_info',
    'hp_blog_review',
    'hp_page'
  ));

COMMENT ON COLUMN contents.content_type IS '콘텐츠 타입: blog_seo(SEO블로그), blog_story(스토리블로그), place_info(플레이스정보), hp_blog_info(홈페이지정보블로그), hp_blog_review(홈페이지후기블로그), hp_page(홈페이지정적페이지)';
```

### 9-2. publishing_accounts.platform 확장

```sql
-- 2. publishing_accounts.platform CHECK 제약조건에 'homepage' 추가

ALTER TABLE publishing_accounts
  DROP CONSTRAINT IF EXISTS publishing_accounts_platform_check;

ALTER TABLE publishing_accounts
  ADD CONSTRAINT publishing_accounts_platform_check
  CHECK (platform IN (
    -- 기존 플랫폼
    'naver_blog',
    'tistory',
    'wordpress',
    -- 신규 추가
    'homepage'
  ));

COMMENT ON COLUMN publishing_accounts.platform IS '발행 플랫폼: naver_blog, tistory, wordpress, homepage';
```

### 9-3. publications.platform 확장

```sql
-- 3. publications.platform CHECK 제약조건에 'homepage' 추가

ALTER TABLE publications
  DROP CONSTRAINT IF EXISTS publications_platform_check;

ALTER TABLE publications
  ADD CONSTRAINT publications_platform_check
  CHECK (platform IN (
    'naver_blog',
    'tistory',
    'wordpress',
    'homepage'
  ));
```

### 9-4. contents 테이블 인덱스 추가

```sql
-- 4. 홈페이지 블로그 전용 인덱스

-- 홈페이지 블로그 글 조회 최적화 (client_id + content_type + publish_status)
CREATE INDEX IF NOT EXISTS idx_contents_hp_blog
  ON contents(client_id, content_type, publish_status)
  WHERE content_type IN ('hp_blog_info', 'hp_blog_review');

-- 발행일 기준 정렬 최적화
CREATE INDEX IF NOT EXISTS idx_contents_hp_blog_published
  ON contents(client_id, published_at DESC)
  WHERE content_type IN ('hp_blog_info', 'hp_blog_review')
    AND publish_status = 'published';

-- slug 기반 조회 최적화
CREATE INDEX IF NOT EXISTS idx_contents_hp_blog_slug
  ON contents(slug)
  WHERE content_type IN ('hp_blog_info', 'hp_blog_review');
```

### 9-5. 홈페이지 Revalidation API 엔드포인트

```sql
-- 5. homepage_projects 테이블에 deploy_hook 컬럼 추가 (없는 경우)

ALTER TABLE homepage_projects
  ADD COLUMN IF NOT EXISTS vercel_deploy_hook_url TEXT;

COMMENT ON COLUMN homepage_projects.vercel_deploy_hook_url IS 'Vercel Deploy Hook URL (ISR revalidation용)';
```

### 9-6. 전체 마이그레이션 스크립트 (통합)

```sql
-- ============================================
-- 006_blog_publishing_integration.sql
-- Phase 6: 블로그 대량 발행 통합
-- ============================================

BEGIN;

-- 1. content_type 확장
ALTER TABLE contents
  DROP CONSTRAINT IF EXISTS contents_content_type_check;
ALTER TABLE contents
  ADD CONSTRAINT contents_content_type_check
  CHECK (content_type IN (
    'blog_seo', 'blog_story', 'place_info',
    'hp_blog_info', 'hp_blog_review', 'hp_page'
  ));

-- 2. publishing_accounts.platform 확장
ALTER TABLE publishing_accounts
  DROP CONSTRAINT IF EXISTS publishing_accounts_platform_check;
ALTER TABLE publishing_accounts
  ADD CONSTRAINT publishing_accounts_platform_check
  CHECK (platform IN (
    'naver_blog', 'tistory', 'wordpress', 'homepage'
  ));

-- 3. publications.platform 확장
ALTER TABLE publications
  DROP CONSTRAINT IF EXISTS publications_platform_check;
ALTER TABLE publications
  ADD CONSTRAINT publications_platform_check
  CHECK (platform IN (
    'naver_blog', 'tistory', 'wordpress', 'homepage'
  ));

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_contents_hp_blog
  ON contents(client_id, content_type, publish_status)
  WHERE content_type IN ('hp_blog_info', 'hp_blog_review');

CREATE INDEX IF NOT EXISTS idx_contents_hp_blog_published
  ON contents(client_id, published_at DESC)
  WHERE content_type IN ('hp_blog_info', 'hp_blog_review')
    AND publish_status = 'published';

CREATE INDEX IF NOT EXISTS idx_contents_hp_blog_slug
  ON contents(slug)
  WHERE content_type IN ('hp_blog_info', 'hp_blog_review');

-- 5. deploy hook URL 컬럼
ALTER TABLE homepage_projects
  ADD COLUMN IF NOT EXISTS vercel_deploy_hook_url TEXT;

COMMIT;
```

---

## 10. 구현 로드맵

### 10-1. 작업 분할 (총 예상: 5일)

#### Day 1: DB 마이그레이션 & 기반 설정

- [ ] `006_blog_publishing_integration.sql` 마이그레이션 실행
- [ ] content_type CHECK 제약조건 확장 확인
- [ ] publishing_accounts/publications platform 확장 확인
- [ ] 인덱스 생성 확인
- [ ] 홈페이지 프로젝트 live 전환 시 publishing_accounts 자동 생성 로직 추가

#### Day 2: Server Actions 구현

- [ ] `generateHomepageBlogContent(projectId, keywordId)` 구현
  - blog-writing-agent HP 전용 프롬프트 추가
  - 내부 링크 자동 삽입 로직
  - JSON-LD 스키마 자동 생성
- [ ] `publishToHomepage(contentId, projectId)` 구현
  - contents UPDATE + publications INSERT
  - ISR revalidation 트리거
  - SERP 추적 등록
- [ ] `scheduleHomepageBlog(projectId, schedule)` 구현
  - blog_config 업데이트
  - 콘텐츠 캘린더 자동 생성

#### Day 3: 크론잡 확장 & 키워드 연동

- [ ] `/api/cron/scheduled-publish` 확장
  - homepage 플랫폼 발행 로직 추가
  - 월간 목표 대비 자동 생성/발행
  - 중복 방지 로직
- [ ] 키워드 성과 → 블로그 주제 자동 추천 로직
- [ ] 키워드 매트릭스 자동 확장 로직
- [ ] `getHomepageBlogStats(projectId)` 구현

#### Day 4: 어드민 UI - 블로그 탭

- [ ] `/dashboard/homepage/[id]` 블로그 탭 UI 구현
  - 발행 현황 대시보드 (카드 4개)
  - 키워드 성과 (카드 3개)
  - 콘텐츠 목록 (테이블 + 필터)
- [ ] 새 글 생성 모달
  - 키워드 선택 UI
  - AI 자동 생성 연동
- [ ] 콘텐츠 미리보기 & 수정 페이지

#### Day 5: 발행 스케줄 설정 & 테스트

- [ ] 발행 스케줄 설정 UI
- [ ] 크로스 포스팅 옵션 (홈페이지 + 네이버 블로그)
- [ ] 홈페이지 블로그 페이지 Revalidation API 구현
  - `templates/modern-minimal/app/api/revalidate/route.ts`
- [ ] 통합 테스트
  - 키워드 선택 → AI 생성 → QC → 발행 → ISR → sitemap 갱신 → SERP 등록
- [ ] 에러 핸들링 & 재시도 로직 검증

### 10-2. 기존 waide-mkt 시스템과의 통합 포인트 체크리스트

| # | 통합 포인트 | 기존 시스템 | 변경 사항 | 영향도 |
|---|-----------|-----------|---------|-------|
| 1 | contents 테이블 | content_type CHECK | 3개 타입 추가 | 낮음 (기존 로직 변경 없음) |
| 2 | publishing_accounts | platform CHECK | 'homepage' 추가 | 낮음 |
| 3 | publications | platform CHECK | 'homepage' 추가 | 낮음 |
| 4 | blog-writing-agent | 기존 프롬프트 | HP 전용 프롬프트 분기 추가 | 중간 |
| 5 | QC 에이전트 | quality_score 산정 | 변경 없음 (동일 기준 적용) | 없음 |
| 6 | /api/cron/scheduled-publish | 기존 크론잡 | homepage 발행 로직 추가 | 중간 |
| 7 | keywords 테이블 | source, metadata | 변경 없음 (기존 필드 활용) | 없음 |
| 8 | keyword_visibility | 순위 추적 | 변경 없음 (기존 추적 재사용) | 없음 |
| 9 | serp_results | SERP 결과 저장 | 변경 없음 | 없음 |
| 10 | aeo_scores | AEO 점수 | 변경 없음 | 없음 |
| 11 | jobs 테이블 | 작업 큐 | job_type 확장 가능 (선택) | 낮음 |
| 12 | auto_publish_settings | 자동 발행 설정 | homepage 필드 추가 (선택) | 낮음 |

### 10-3. 리스크 및 대응 방안

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| AI 생성 콘텐츠 품질 불안정 | 저품질 글 발행 | QC 에이전트 점수 70점 미만 시 재생성 (최대 2회), 실패 시 수동 검수 큐로 이동 |
| ISR Revalidation 실패 | 새 글이 사이트에 반영 안 됨 | Deploy Hook 폴백, 실패 시 Slack 알림 + 수동 재배포 UI 제공 |
| 키워드 풀 고갈 | 새 주제 선정 불가 | seo-keyword-matrix.ts 기반 자동 확장 + AI 키워드 추천 |
| 네이버 블로그 동시 발행 API 제한 | 크로스 포스팅 실패 | 홈페이지 발행만 우선 처리, 네이버 발행은 비동기 재시도 |
| 콘텐츠 중복/유사도 | SEO 패널티 | 중복 방지 로직 + 캐노니컬 URL 설정 + content_format 다양화 |

---

## 부록: 관련 파일 목록

### waide-mkt(ai-marketer) 수정 대상

```
# 마이그레이션
supabase/migrations/006_blog_publishing_integration.sql  (신규)

# Server Actions
app/actions/homepage-blog.ts  (신규)
  - generateHomepageBlogContent()
  - publishToHomepage()
  - scheduleHomepageBlog()
  - getHomepageBlogStats()

# 크론잡 확장
app/api/cron/scheduled-publish/route.ts  (수정)
  - processHomepageBlogQueue() 추가

# blog-writing-agent 확장
agents/blog-writing-agent/prompts/hp-blog-info.ts  (신규)
agents/blog-writing-agent/prompts/hp-blog-review.ts  (신규)

# 어드민 UI
app/(dashboard)/dashboard/homepage/[id]/blog/page.tsx  (신규)
components/homepage/blog-tab.tsx  (신규)
components/homepage/blog-create-modal.tsx  (신규)
components/homepage/blog-preview.tsx  (신규)
components/homepage/blog-schedule.tsx  (신규)
```

### 홈페이지 템플릿 수정 대상

```
# Revalidation API
templates/modern-minimal/app/api/revalidate/route.ts  (신규)

# 기존 파일 (수정 불필요 - 이미 hp_blog_info/hp_blog_review 대응)
templates/modern-minimal/app/blog/page.tsx
templates/modern-minimal/app/blog/[slug]/page.tsx
templates/modern-minimal/data/config.ts
templates/modern-minimal/app/sitemap.ts
```
