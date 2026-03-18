# Phase 7: Template B(Natural Wood) & C(Premium Dark) 기획서

> 작성일: 2026-03-17
> 기반: Template A(modern-minimal) 구현 완료 상태
> 기술 스택: Next.js 16 + Tailwind CSS 4 (@theme inline) + Framer Motion + Supabase

---

## 목차

1. [공통 아키텍처 — 공유 컴포넌트 추출](#1-공통-아키텍처--공유-컴포넌트-추출)
2. [템플릿 전환 메커니즘](#2-템플릿-전환-메커니즘)
3. [Template B: Natural Wood 상세 설계](#3-template-b-natural-wood-상세-설계)
4. [Template C: Premium Dark 상세 설계](#4-template-c-premium-dark-상세-설계)
5. [구현 우선순위 및 일정](#5-구현-우선순위-및-일정)

---

## 1. 공통 아키텍처 -- 공유 컴포넌트 추출

### 1-1. 현재 Template A 구조 분석

현재 `templates/modern-minimal/`에 모든 로직이 포함되어 있다. Template B, C를 추가하기 전에 공통 로직을 `templates/shared/`로 추출해야 한다.

```
templates/
├── shared/                          # 공통 로직 (신규 추출)
│   ├── data/
│   │   └── config.ts               # getHomepageConfig() — 전 템플릿 공유
│   ├── lib/
│   │   └── supabase.ts             # Supabase 클라이언트
│   ├── components/
│   │   └── JsonLd.tsx              # JsonLd, LocalBusinessJsonLd, FaqJsonLd, BreadcrumbJsonLd
│   ├── api/
│   │   └── inquiry/route.ts        # POST /api/inquiry — 상담 신청 API
│   └── types/
│       └── index.ts                # CompanyConfig, ThemeConfig, Portfolio, Review 등 공통 타입
│
├── modern-minimal/                  # Template A (기존)
│   ├── app/
│   │   ├── globals.css             # A 전용 테마 CSS 변수
│   │   ├── layout.tsx              # A 전용 레이아웃
│   │   ├── page.tsx                # A 전용 홈페이지
│   │   ├── blog/                   # A 전용 블로그 UI
│   │   ├── portfolio/              # A 전용 포트폴리오 상세
│   │   └── api/inquiry/route.ts    # → shared에서 re-export
│   └── components/
│       ├── layout/                 # Nav, Footer, FloatingCTA — A 전용 UI
│       └── home/                   # Hero, Stats, Portfolio 등 — A 전용 UI
│
├── natural-wood/                    # Template B (신규)
│   ├── app/
│   │   ├── globals.css             # B 전용 테마 CSS 변수
│   │   ├── layout.tsx              # B 전용 레이아웃
│   │   ├── page.tsx                # B 전용 홈페이지
│   │   ├── blog/
│   │   ├── portfolio/
│   │   └── api/inquiry/route.ts    # → shared에서 re-export
│   └── components/
│       ├── layout/                 # B 전용 Nav, Footer
│       └── home/                   # B 전용 섹션 컴포넌트
│
└── premium-dark/                    # Template C (신규)
    ├── app/
    │   ├── globals.css             # C 전용 테마 CSS 변수
    │   ├── layout.tsx              # C 전용 레이아웃
    │   ├── page.tsx                # C 전용 홈페이지
    │   ├── blog/
    │   ├── portfolio/
    │   └── api/inquiry/route.ts    # → shared에서 re-export
    └── components/
        ├── layout/                 # C 전용 Nav, Footer
        └── home/                   # C 전용 섹션 컴포넌트
```

### 1-2. 공유 vs 독립 구분표

| 구분 | 파일 | 공유/독립 | 이유 |
|------|------|-----------|------|
| **데이터** | `data/config.ts` | 공유 | 동일한 Supabase 테이블 구조, 동일한 `getHomepageConfig()` |
| **타입** | `types/index.ts` | 공유 | `CompanyConfig`, `Portfolio`, `Review` 등 동일 |
| **Supabase** | `lib/supabase.ts` | 공유 | 환경변수 기반 동일 클라이언트 |
| **JSON-LD** | `components/JsonLd.tsx` | 공유 | SEO 구조화 데이터 로직 동일 |
| **API** | `api/inquiry/route.ts` | 공유 | `homepage_inquiries` INSERT 로직 동일 |
| **CSS** | `globals.css` | **독립** | 템플릿별 CSS 변수, 유틸리티 클래스 상이 |
| **Layout** | `app/layout.tsx` | **독립** | 폰트 로딩, 테마 주입 방식 상이 |
| **컴포넌트** | `components/home/*` | **독립** | UI/UX, 애니메이션, 레이아웃 완전 상이 |
| **네비게이션** | `components/layout/Nav.tsx` | **독립** | 디자인, 메뉴 구조, 배경 처리 상이 |

### 1-3. 공유 데이터 타입 (templates/shared/types/index.ts)

```typescript
// Template A에서 추출 — 모든 템플릿이 공유
export interface CompanyConfig {
  name: string;
  owner: string;
  phone: string;
  address: string;
  description: string;
  kakaoLink: string | null;
  logo: string | null;
  instagram: string | null;
  youtube: string | null;
  naverPlace: string | null;
  naverBlog: string | null;
  operatingHours: string | null;
  businessNumber: string | null;
}

export interface ThemeConfig {
  primary_color: string;
  secondary_color: string;
  font_heading: string;
  font_body: string;
  logo_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
}

export interface SeoConfig {
  meta_title_template: string;
  meta_description: string;
  keywords: string[];
  json_ld_local_business: Record<string, unknown>;
}

export interface Portfolio {
  id: string;
  title: string | null;
  slug: string | null;
  space_type: string | null;
  style: string | null;
  area_pyeong: number | null;
  budget_range: string | null;
  description: string | null;
  image_urls: string[];
  before_image_url: string | null;
  after_image_url: string | null;
  is_featured: boolean;
}

export interface Review {
  id: string;
  customer_name: string;
  rating: number;
  content: string;
  project_type: string | null;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  content_type: string;
  published_at: string | null;
  meta_description: string | null;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface HomepageConfig {
  company: CompanyConfig;
  theme: ThemeConfig;
  seo: SeoConfig;
  persona: Record<string, unknown>;
  portfolios: Portfolio[];
  reviews: Review[];
  blogPosts: BlogPost[];
  faqItems: FaqItem[];
}
```

---

## 2. 템플릿 전환 메커니즘

### 2-1. 선택 흐름

```
homepage_projects.template_id = 'modern-minimal' | 'natural-wood' | 'premium-dark'
        │
        ▼
빌드 시 해당 템플릿 디렉토리 기반으로 Next.js 프로젝트 생성
        │
        ▼
환경변수로 HOMEPAGE_PROJECT_ID 주입
        │
        ▼
getHomepageConfig()가 Supabase에서 업체 데이터 fetch
        │
        ▼
템플릿별 UI 컴포넌트가 동일한 데이터를 각각의 디자인으로 렌더링
```

### 2-2. 테마 시스템 — CSS 변수 기반

각 템플릿은 `globals.css`에서 `:root` CSS 변수를 정의하고, `@theme inline`으로 Tailwind 4에 등록한다. 어드민에서 업체별 `primary_color`, `secondary_color`를 변경하면 `layout.tsx`에서 `<style>` 태그로 런타임 오버라이드한다.

```
[Supabase: homepage_projects.theme_config]
    │
    ▼
[layout.tsx: <style> 태그로 CSS 변수 오버라이드]
    │
    ▼
[globals.css: @theme inline에서 Tailwind 클래스로 사용]
    │
    ▼
[컴포넌트: bg-primary, text-secondary 등 Tailwind 유틸리티]
```

### 2-3. 템플릿별 package.json

각 템플릿은 독립적인 `package.json`을 갖는다. 공통 의존성은 동일하되, 템플릿별 추가 패키지가 있다.

| 의존성 | A: modern-minimal | B: natural-wood | C: premium-dark |
|--------|:-:|:-:|:-:|
| next@16 | O | O | O |
| react@19 | O | O | O |
| tailwindcss@4 | O | O | O |
| framer-motion@12 | O | O | O |
| lucide-react | O | O | O |
| @supabase/supabase-js | O | O | O |
| react-intersection-observer | O | O | O |
| react-compare-slider | - | O (Before/After) | - |
| swiper | - | O (카드 슬라이더) | - |
| lenis (smooth scroll) | - | - | O |

---

## 3. Template B: Natural Wood 상세 설계

### 3-1. 디자인 컨셉

- **타겟 고객**: 자연주의, 따뜻한 인테리어를 선호하는 업체 (내추럴/북유럽 스타일, 신혼부부/가족 고객 대상)
- **무드**: 나무의 질감, 자연광, 유기적 곡선, 편안함
- **차별화**: Before/After 슬라이더, 매거진 스타일 포트폴리오, 자재 쇼케이스

### 3-2. CSS 변수 목록 (globals.css)

```css
@import "tailwindcss";

:root {
  /* ── Natural Wood 테마 컬러 ── */
  --primary: #8B7355;           /* 우드 브라운 (메인 포인트) */
  --primary-dark: #6F5B3E;      /* 우드 브라운 다크 */
  --primary-light: #A89279;     /* 우드 브라운 라이트 */
  --secondary: #6B8E5A;         /* 올리브 그린 (보조 포인트) */
  --secondary-dark: #557548;    /* 올리브 그린 다크 */
  --accent: #D4A574;            /* 라이트 우드 (강조) */

  --bg: #FEFCF9;                /* 웜 화이트 (메인 배경) */
  --bg-soft: #F5F0EB;           /* 크림 (섹션 교차 배경) */
  --bg-muted: #EDE5DB;          /* 베이지 (카드/입력 배경) */

  --text: #2D2A26;              /* 다크 브라운 (본문) */
  --text-secondary: #5C564E;    /* 미디엄 브라운 (보조 텍스트) */
  --text-muted: #8B8680;        /* 라이트 브라운 (약한 텍스트) */

  --border: #E8E0D8;            /* 웜 보더 */
  --border-light: #F0EBE5;      /* 라이트 웜 보더 */

  /* ── 폰트 ── */
  --font-heading: "Noto Serif KR", serif;
  --font-body: "Pretendard", system-ui, sans-serif;

  /* ── 레이아웃 ── */
  --radius-sm: 6px;
  --radius: 12px;
  --radius-lg: 20px;
  --shadow: 0 2px 8px rgba(45, 42, 38, 0.06);
  --shadow-md: 0 4px 16px rgba(45, 42, 38, 0.08);
}

@theme inline {
  --color-primary: var(--primary);
  --color-primary-dark: var(--primary-dark);
  --color-primary-light: var(--primary-light);
  --color-secondary: var(--secondary);
  --color-secondary-dark: var(--secondary-dark);
  --color-accent: var(--accent);
  --color-bg: var(--bg);
  --color-bg-soft: var(--bg-soft);
  --color-bg-muted: var(--bg-muted);
  --color-text: var(--text);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-border: var(--border);
  --color-border-light: var(--border-light);
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

/* ── Natural Wood 전용 유틸리티 ── */

.section-padding {
  @apply py-20 md:py-28;
}

.container-magazine {
  @apply max-w-6xl mx-auto px-4 sm:px-6 lg:px-8;
}

.container-wide {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}

.container-narrow {
  @apply max-w-4xl mx-auto px-4 sm:px-6 lg:px-8;
}

/* 세리프 헤딩 */
.heading-serif {
  font-family: var(--font-heading);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

/* 우드 텍스처 오버레이 (배경 장식용) */
.wood-texture-overlay {
  background-image: url("data:image/svg+xml,..."); /* 나무결 SVG 패턴 */
  opacity: 0.03;
  pointer-events: none;
}

/* 유기적 곡선 카드 */
.organic-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

/* 소프트 그라데이션 오버레이 */
.gradient-warm {
  background: linear-gradient(to bottom, rgba(254,252,249,0), rgba(245,240,235,1));
}
```

### 3-3. 섹션 구성 및 와이어프레임

#### 전체 페이지 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    NAVIGATION BAR                            │
│  [로고/업체명]                                               │
│             시공사례  서비스  시공후기  블로그  상담예약       │
│                                          [상담 예약하기]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                     HERO SECTION                              │
│            (전체화면 슬라이드 — Before/After 강조)             │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                 TRUST BADGES (신뢰 지표)                      │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│           PORTFOLIO (매거진 스타일 레이아웃)                   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│           BEFORE/AFTER (드래그 비교 슬라이더)                 │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│           SERVICES (유기적 카드 레이아웃)                     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│           PROCESS (일러스트 기반 타임라인)                    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│           MATERIALS (소재 팔레트 섹션)                        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│           REVIEWS (카드 슬라이더 — 사진 포함)                │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│           BLOG (카테고리 탭 + 그리드)                        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│           FAQ (아코디언)                                     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│           CONTACT CTA (따뜻한 톤의 상담 폼)                  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                      FOOTER                                   │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-1. Navigation Bar

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌────────┐                                                  │
│  │ 로고   │   시공사례  서비스  시공후기  블로그              │
│  │/업체명 │                                                  │
│  └────────┘                           ┌─────────────────┐   │
│                                       │  상담 예약하기   │   │
│                                       └─────────────────┘   │
│                                                               │
│  특징:                                                        │
│  - 배경: 투명 → 스크롤 시 bg-bg/90 + backdrop-blur            │
│  - 로고/메뉴: 세리프 폰트 사용                                │
│  - CTA 버튼: bg-primary + rounded-full (둥근 알약형)          │
│  - 모바일: 슬라이드 인 사이드 메뉴 (왼쪽에서 진입)            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-2. Hero Section (전체화면 이미지 슬라이드)

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │        (전체화면 시공 사진 — 자동 슬라이드)              │   │
│  │                                                         │   │
│  │                                                         │   │
│  │                                                         │   │
│  │   ┌─────────────────────────────────────────┐          │   │
│  │   │                                           │          │   │
│  │   │  "자연을 닮은,                            │          │   │
│  │   │    우리 가족의 공간"                       │          │   │
│  │   │                                           │          │   │
│  │   │  {업체 소개 한줄}                          │          │   │
│  │   │                                           │          │   │
│  │   │  ┌──────────────┐  ┌──────────────┐      │          │   │
│  │   │  │ 상담 예약하기 │  │ 시공사례 보기 │      │          │   │
│  │   │  └──────────────┘  └──────────────┘      │          │   │
│  │   │                                           │          │   │
│  │   └─────────────────────────────────────────┘          │   │
│  │                                                         │   │
│  │                    ● ○ ○ ○ (페이지네이션)                │   │
│  │                                                         │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  특징:                                                        │
│  - min-h-screen 전체 화면                                     │
│  - 3~5장 포트폴리오 이미지 자동 슬라이드 (5초 간격)           │
│  - 오버레이: 하단에서 상단으로 따뜻한 그라데이션               │
│    (rgba(45,42,38,0.1) → rgba(45,42,38,0.5))                │
│  - 헤딩: heading-serif 클래스, text-white                    │
│  - CTA: 왼쪽(bg-primary 채움형), 오른쪽(border-white 테두리형)│
│  - 페이지네이션: 하단 중앙 동그라미 도트                     │
│  - Framer Motion: 텍스트 fadeUp 0.8s, 버튼 fadeUp 1.0s      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-3. Trust Badges (신뢰 지표)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg-soft                                             │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │    🌿    │  │    🏡    │  │    ⭐    │  │    🤝    │    │
│  │          │  │          │  │          │  │          │    │
│  │   10년   │  │  150건+  │  │   4.9    │  │   98%    │    │
│  │  시공 경력│  │ 시공 완료│  │ 평균 평점│  │ 재계약률 │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                               │
│  특징:                                                        │
│  - organic-card 스타일 (rounded-[20px])                      │
│  - 배경: bg-white + shadow-sm                                │
│  - 아이콘: 라인 아이콘 대신 이모지 or SVG 일러스트 스타일     │
│  - 숫자 카운트업 애니메이션 (Framer Motion)                  │
│  - 구분선: 세로 점선 (옅은 border-dashed)                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-4. Portfolio (매거진 스타일 레이아웃)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg                                                  │
│                                                               │
│  "시공 이야기"  (heading-serif)                               │
│  "공간마다 담긴 이야기를 확인해보세요"                        │
│                                                               │
│  ┌──────────────────────────────┬─────────────────────┐      │
│  │                              │                       │      │
│  │                              │  #01                  │      │
│  │       (대형 이미지)           │                       │      │
│  │       시공 사례 1             │  "30평 신혼집의       │      │
│  │                              │   따뜻한 변화"        │      │
│  │                              │                       │      │
│  │                              │  모던 내추럴 | 30평   │      │
│  │                              │                       │      │
│  │                              │  "원목 마루와 화이트   │      │
│  │                              │   톤으로 깨끗하면서도  │      │
│  │                              │   따뜻한 공간을..."   │      │
│  │                              │                       │      │
│  │                              │  [자세히 보기 →]      │      │
│  │                              │                       │      │
│  └──────────────────────────────┴─────────────────────┘      │
│                                                               │
│  ┌─────────────────────┬──────────────────────────────┐      │
│  │                       │                              │      │
│  │  #02                  │                              │      │
│  │                       │      (대형 이미지)            │      │
│  │  "구축 아파트의       │       시공 사례 2             │      │
│  │   놀라운 변신"        │                              │      │
│  │                       │                              │      │
│  │  올수리 | 25평        │                              │      │
│  │                       │                              │      │
│  │  [자세히 보기 →]      │                              │      │
│  │                       │                              │      │
│  └─────────────────────┴──────────────────────────────┘      │
│                                                               │
│  [더 많은 시공 이야기 보기 →]                                 │
│                                                               │
│  특징:                                                        │
│  - 지그재그 레이아웃: 홀수는 이미지 좌/텍스트 우,              │
│    짝수는 텍스트 좌/이미지 우                                  │
│  - 이미지: aspect-[3/4] 세로 비율, 호버 시 scale-105          │
│  - 텍스트 영역: heading-serif 제목 + 2줄 설명                │
│  - 번호: #01, #02... 라이트 그레이 대형 숫자                 │
│  - 최대 4개 노출, [더 보기]로 전체 목록 이동                  │
│  - Framer Motion: scroll-triggered fadeIn + translateY        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-5. Before/After (드래그 비교 슬라이더)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg-soft                                             │
│                                                               │
│  "시공 전/후 비교"  (heading-serif)                           │
│  "드래그하여 변화를 직접 확인해보세요"                        │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                          │                              │   │
│  │                          │                              │   │
│  │       BEFORE             │          AFTER               │   │
│  │       (시공 전)       ◄──┤──►       (시공 후)           │   │
│  │                          │                              │   │
│  │                          │                              │   │
│  │                       ┌──┤──┐                           │   │
│  │                       │◄►│  │ (드래그 핸들)             │   │
│  │                       └──┤──┘                           │   │
│  │                          │                              │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ◄ 이전     ● ○ ○     다음 ►                                │
│                                                               │
│  특징:                                                        │
│  - react-compare-slider 라이브러리 사용                      │
│  - 포트폴리오 중 before_image_url & after_image_url가        │
│    모두 있는 항목만 표시                                      │
│  - 여러 개일 경우 좌우 화살표로 전환                          │
│  - 드래그 핸들: bg-primary 원형 + 좌우 화살표 아이콘          │
│  - 데이터 없으면 섹션 자체 비노출                             │
│  - Framer Motion: 섹션 진입 시 fadeIn                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-6. Services (유기적 카드)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg                                                  │
│                                                               │
│  "제공 서비스"  (heading-serif)                               │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │                    │  │                    │                  │
│  │  ┌──────┐         │  │  ┌──────┐         │                  │
│  │  │ 🏠  │         │  │  │ 🔨  │         │                  │
│  │  └──────┘         │  │  └──────┘         │                  │
│  │                    │  │                    │                  │
│  │  아파트 인테리어   │  │  리모델링          │                  │
│  │                    │  │                    │                  │
│  │  아파트 특성에     │  │  노후 공간을       │                  │
│  │  맞는 최적의      │  │  새롭게 탈바꿈     │                  │
│  │  인테리어 설계    │  │  하는 전문 시공    │                  │
│  │                    │  │                    │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │ ...               │  │ ...               │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                               │
│  특징:                                                        │
│  - 2열 그리드 (md:grid-cols-2)                               │
│  - organic-card: rounded-[20px] + bg-bg-soft                 │
│  - 아이콘: 64px 원형 bg-primary/10 배경                      │
│  - 호버: translateY(-4px) + shadow-md                        │
│  - 제목: heading-serif                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-7. Process (일러스트 기반 타임라인)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg-soft                                             │
│                                                               │
│  "시공 프로세스"  (heading-serif)                             │
│  "5단계 체계적 프로세스로 완성합니다"                         │
│                                                               │
│          ①              ②              ③                     │
│       ┌──────┐       ┌──────┐       ┌──────┐                │
│       │ ☎️   │       │ 📐   │       │ 🎨   │                │
│       │      │       │      │       │      │                │
│       │ 상담  │ ───── │ 실측  │ ───── │ 디자인│                │
│       │      │       │      │       │      │                │
│       └──────┘       └──────┘       └──────┘                │
│       전화/방문        현장 방문       3D 시뮬                 │
│       상담 진행        실측+견적       레이션                  │
│                                                               │
│                 ④              ⑤                              │
│              ┌──────┐       ┌──────┐                         │
│              │ 🔨   │       │ ✅   │                         │
│              │      │       │      │                         │
│              │ 시공  │ ───── │ 완공  │                         │
│              │      │       │      │                         │
│              └──────┘       └──────┘                         │
│              전문팀          최종 점검                         │
│              시공 진행       + 인도                            │
│                                                               │
│  특징:                                                        │
│  - 수직 타임라인 (모바일) / 수평 타임라인 (데스크탑)          │
│  - 각 단계: 원형 아이콘(일러스트 스타일) + 점선 연결           │
│  - 아이콘 배경: bg-accent/20 (연한 우드톤)                    │
│  - 단계 번호: 원형 배지, bg-primary text-white                │
│  - 연결선: border-dashed border-primary/30                   │
│  - Framer Motion: stagger 0.15s, 순차적 등장                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-8. Materials (소재 팔레트 섹션) -- Template B 전용

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg                                                  │
│                                                               │
│  "사용 자재 소개"  (heading-serif)                            │
│  "검증된 친환경 자재만 사용합니다"                            │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │    │
│  │ │      │ │  │ │      │ │  │ │      │ │  │ │      │ │    │
│  │ │ 원목  │ │  │ │친환경│ │  │ │ 자연  │ │  │ │ 강화  │ │    │
│  │ │ 마루  │ │  │ │페인트│ │  │ │ 소재  │ │  │ │ 마루  │ │    │
│  │ │ 질감  │ │  │ │ 질감 │ │  │ │ 타일  │ │  │ │ 질감  │ │    │
│  │ │      │ │  │ │      │ │  │ │      │ │  │ │      │ │    │
│  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │    │
│  │          │  │          │  │          │  │          │    │
│  │ 원목 마루│  │ 친환경   │  │ 자연석   │  │ 강화 마루│    │
│  │          │  │ 페인트   │  │ 타일     │  │          │    │
│  │ 오크/월넛│  │ 벤자민무어│  │ 대리석  │  │ 독일산   │    │
│  │ 원목마루 │  │ 듀럭스등 │  │ 포세린등│  │ 고급자재 │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                               │
│  특징:                                                        │
│  - 4열 그리드 (모바일: 2열)                                   │
│  - 각 카드 상단: 자재 질감 사진 (aspect-square, rounded-xl)   │
│  - 하단: 자재명 + 설명 1줄                                    │
│  - 호버: 사진 scale-110 + overlay로 상세 정보 표시            │
│  - 데이터: 하드코딩 (업체별 커스터마이징은 추후 어드민에서)   │
│  - 3D 공간 투어 임베드 영역: iframe placeholder (옵션)        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-9. Reviews (카드 슬라이더)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg-soft                                             │
│                                                               │
│  "고객님의 이야기"  (heading-serif)                           │
│                                                               │
│  ◄  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  ►  │
│     │ ★★★★★        │ │ ★★★★★        │ │ ★★★★☆        │     │
│     │              │ │              │ │              │     │
│     │ "처음부터    │ │ "아이 방을   │ │ "예산 내에서 │     │
│     │  끝까지 정말 │ │  예쁘게 꾸며 │ │  최대한 만족 │     │
│     │  세심하게    │ │  주셨어요.   │ │  스러운      │     │
│     │  신경써 주셔 │ │  특히 안전한 │ │  결과물을..."│     │
│     │  서..."     │ │  자재를..."  │ │              │     │
│     │              │ │              │ │              │     │
│     │ ────────── │ │ ────────── │ │ ────────── │     │
│     │ 김OO님      │ │ 박OO님      │ │ 이OO님      │     │
│     │ 강남 30평   │ │ 분당 25평   │ │ 마포 34평   │     │
│     │ 아파트      │ │ 아파트      │ │ 빌라        │     │
│     └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                               │
│                    ● ● ○ ○                                   │
│                                                               │
│  특징:                                                        │
│  - Swiper 또는 Framer Motion 기반 카드 슬라이더               │
│  - 카드: organic-card + bg-white                              │
│  - 별점: amber-400 fill 스타일                                │
│  - 후기 내용: 3줄 말줄임 (line-clamp-3)                      │
│  - 하단: 고객명 + 프로젝트 유형                               │
│  - 자동 슬라이드 4초 + 드래그 가능                            │
│  - 데스크탑: 3장 동시 노출, 모바일: 1장                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-10. Blog (카테고리 탭 + 그리드)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg                                                  │
│                                                               │
│  "인테리어 이야기"  (heading-serif)                           │
│                                                               │
│  [전체]  [인테리어 팁]  [시공 후기]  [트렌드]                │
│  ────   ────────────  ──────────  ──────                    │
│                                                               │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │ ┌───────────────┐ │  │ ┌───────────────┐ │               │
│  │ │  (블로그 썸네일)│ │  │ │  (블로그 썸네일)│ │               │
│  │ └───────────────┘ │  │ └───────────────┘ │               │
│  │                     │  │                     │               │
│  │  인테리어 팁        │  │  시공 후기          │               │
│  │  "2026 인테리어     │  │  "강남 30평 아파트  │               │
│  │   트렌드 TOP 5"    │  │   시공 후기"        │               │
│  │                     │  │                     │               │
│  │  2026.03.15         │  │  2026.03.10         │               │
│  └───────────────────┘  └───────────────────┘               │
│                                                               │
│  [블로그 전체 보기 →]                                         │
│                                                               │
│  특징:                                                        │
│  - 상단 카테고리 탭: content_type으로 필터링                  │
│  - 2열 그리드 (md:grid-cols-2)                               │
│  - 카드: 썸네일 + 카테고리 태그 + 제목 + 날짜                │
│  - 최대 4개 노출                                              │
│  - 데이터: blogPosts (contents 테이블에서 fetch)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### B-11. Contact CTA

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-primary/5 (따뜻한 우드 톤 배경)                     │
│                                                               │
│  "편안한 상담, 시작해볼까요?"  (heading-serif)                │
│  "전문 상담사가 맞춤 견적을 안내해드립니다"                   │
│                                                               │
│  ┌─────────────────────────────────────────────────┐         │
│  │  배경: bg-white + organic-card                    │         │
│  │                                                   │         │
│  │  이름 *          연락처 *                          │         │
│  │  [____________]  [______________]                 │         │
│  │                                                   │         │
│  │  평수       공간 유형       예산                    │         │
│  │  [________] [▼ 선택]       [▼ 선택]               │         │
│  │                                                   │         │
│  │  문의 내용                                         │         │
│  │  [____________________________________]           │         │
│  │  [____________________________________]           │         │
│  │                                                   │         │
│  │  ┌─────────────────────────────────────┐         │         │
│  │  │        상담 예약하기                  │         │         │
│  │  └─────────────────────────────────────┘         │         │
│  │                                                   │         │
│  └─────────────────────────────────────────────────┘         │
│                                                               │
│  특징:                                                        │
│  - Template A와 동일한 폼 필드 (데이터 호환)                  │
│  - 입력 필드: rounded-xl + border-border + bg-bg-soft         │
│  - 제출 버튼: bg-primary + rounded-full + 큰 크기             │
│  - 성공 시: 나무 아이콘 + "상담 신청이 접수되었습니다"        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 3-4. Template B 컴포넌트 목록

```
templates/natural-wood/
├── app/
│   ├── globals.css                # B 전용 CSS 변수 (위 3-2절)
│   ├── layout.tsx                 # Noto Serif KR + Pretendard 폰트 로딩
│   ├── page.tsx                   # B 전용 섹션 조합
│   ├── blog/
│   │   ├── page.tsx               # 카테고리 탭 + 그리드 블로그 목록
│   │   └── [slug]/page.tsx        # 블로그 상세
│   ├── portfolio/
│   │   └── [slug]/page.tsx        # 매거진 스타일 포트폴리오 상세
│   ├── api/inquiry/route.ts       # → shared re-export
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── layout/
│   │   ├── Nav.tsx                # 투명→불투명 네비, 세리프 로고, 둥근 CTA
│   │   ├── Footer.tsx             # 웜 톤 푸터
│   │   └── FloatingCTA.tsx        # 둥근 플로팅 버튼 (우드 톤)
│   ├── home/
│   │   ├── Hero.tsx               # 전체화면 이미지 슬라이드
│   │   ├── TrustBadges.tsx        # 신뢰 지표 (Stats 대체)
│   │   ├── PortfolioMagazine.tsx  # 매거진 스타일 지그재그 레이아웃
│   │   ├── BeforeAfter.tsx        # react-compare-slider 기반
│   │   ├── Services.tsx           # 유기적 카드 2열 그리드
│   │   ├── ProcessTimeline.tsx    # 일러스트 기반 타임라인
│   │   ├── Materials.tsx          # 소재 팔레트 (B 전용)
│   │   ├── ReviewSlider.tsx       # Swiper 카드 슬라이더
│   │   ├── BlogGrid.tsx           # 카테고리 탭 + 그리드
│   │   ├── FAQ.tsx                # 아코디언 (A와 유사, 스타일만 변경)
│   │   └── ContactCTA.tsx         # 따뜻한 톤 상담 폼
│   └── shared/                    # → templates/shared 참조
├── package.json
├── next.config.ts
├── tsconfig.json
└── postcss.config.mjs
```

### 3-5. Template B 차별 포인트 요약

| 항목 | Template A (modern-minimal) | Template B (natural-wood) |
|------|---------------------------|--------------------------|
| 히어로 | 단일 이미지 + 그라데이션 | 전체화면 이미지 슬라이드 (자동 전환) |
| 포트폴리오 | 3열 그리드 + 필터 탭 | 매거진 지그재그 레이아웃 + 스토리 |
| Before/After | 없음 | react-compare-slider 드래그 비교 |
| 프로세스 | 5열 수평 아이콘 | 일러스트 기반 타임라인 (점선 연결) |
| 자재 섹션 | 없음 | 소재 팔레트 쇼케이스 (B 전용) |
| 리뷰 | 3열 카드 그리드 | Swiper 카드 슬라이더 (자동 슬라이드) |
| 블로그 | 없음 (page.tsx에만 있음) | 카테고리 탭 + 2열 그리드 |
| 폰트 | Pretendard (산세리프) | Noto Serif KR (헤딩) + Pretendard (본문) |
| 색감 | 블루 + 화이트 (쿨톤) | 우드 브라운 + 올리브 그린 (웜톤) |
| 모서리 | rounded-xl (12px) | rounded-[20px] (유기적 곡선) |

---

## 4. Template C: Premium Dark 상세 설계

### 4-1. 디자인 컨셉

- **타겟 고객**: 고급/모던 인테리어 업체 (40~50대 고소득 고객, 하이엔드 시공)
- **무드**: 다크 배경, 골드 포인트, 대리석 질감, 미니멀 타이포, 비주얼 중심
- **차별화**: 비디오 히어로, 패럴랙스, 커서 팔로우 효과, 프리미엄 상담 폼

### 4-2. CSS 변수 목록 (globals.css)

```css
@import "tailwindcss";

:root {
  /* ── Premium Dark 테마 컬러 ── */
  --primary: #C6A664;              /* 골드 (메인 포인트) */
  --primary-dark: #A88D4F;         /* 골드 다크 */
  --primary-light: #D4BA80;        /* 골드 라이트 */
  --secondary: #C6A664;            /* 골드 (다크 테마에서 보조=메인과 동일) */
  --secondary-dark: #A88D4F;
  --accent: #E8D5B0;               /* 크림 골드 (강조) */

  --bg: #0E0E12;                   /* 딥 다크 (메인 배경) */
  --bg-soft: #16161C;              /* 다크 그레이 (섹션 교차 배경) */
  --bg-muted: #1E1E26;             /* 미디엄 다크 (카드/입력 배경) */

  --text: #FAFAFA;                 /* 화이트 (본문) */
  --text-secondary: #A0A0B0;       /* 라이트 그레이 (보조 텍스트) */
  --text-muted: #6B6B7B;           /* 미디엄 그레이 (약한 텍스트) */

  --border: #2A2A35;               /* 다크 보더 */
  --border-light: #1E1E28;         /* 라이트 다크 보더 */

  /* ── 폰트 ── */
  --font-heading: "Playfair Display", serif;
  --font-body: "Pretendard", system-ui, sans-serif;

  /* ── 레이아웃 ── */
  --radius-sm: 4px;
  --radius: 8px;
  --radius-lg: 12px;
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-gold: 0 4px 20px rgba(198, 166, 100, 0.15);
}

@theme inline {
  --color-primary: var(--primary);
  --color-primary-dark: var(--primary-dark);
  --color-primary-light: var(--primary-light);
  --color-secondary: var(--secondary);
  --color-secondary-dark: var(--secondary-dark);
  --color-accent: var(--accent);
  --color-bg: var(--bg);
  --color-bg-soft: var(--bg-soft);
  --color-bg-muted: var(--bg-muted);
  --color-text: var(--text);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-border: var(--border);
  --color-border-light: var(--border-light);
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

/* ── Premium Dark 전용 유틸리티 ── */

.section-padding {
  @apply py-24 md:py-32;
}

.container-full {
  @apply max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8;
}

.container-wide {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}

.container-narrow {
  @apply max-w-5xl mx-auto px-4 sm:px-6 lg:px-8;
}

/* 프리미엄 헤딩 */
.heading-premium {
  font-family: var(--font-heading);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

/* 골드 텍스트 그라데이션 */
.text-gold-gradient {
  background: linear-gradient(135deg, #C6A664 0%, #E8D5B0 50%, #C6A664 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 글래스모피즘 카드 */
.glass-card {
  background: rgba(30, 30, 38, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(198, 166, 100, 0.1);
}

/* 골드 보더 그라데이션 */
.gold-border {
  border-image: linear-gradient(135deg, #C6A664, #E8D5B0, #C6A664) 1;
}

/* 대리석 텍스처 오버레이 */
.marble-texture {
  background-image: url("data:image/svg+xml,..."); /* 대리석 SVG 패턴 */
  opacity: 0.02;
  pointer-events: none;
}

/* 프리미엄 그라데이션 */
.gradient-dark {
  background: linear-gradient(180deg, rgba(14,14,18,0) 0%, rgba(14,14,18,0.95) 100%);
}

/* 메탈릭 호버 효과 */
.metallic-hover:hover {
  box-shadow: 0 0 30px rgba(198, 166, 100, 0.1);
}
```

### 4-3. 섹션 구성 및 와이어프레임

#### 전체 페이지 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    NAVIGATION BAR (투명)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│          HERO (풀스크린 비디오 + 패럴랙스)                    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│          STATS (골드 카운터)                                  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│          PORTFOLIO (풀스크린 갤러리 + 라이트박스)             │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│          SERVICES (글래스모피즘 카드 + 호버 애니메이션)       │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│          PROCESS (미니멀 수평 스텝)                           │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│          AWARDS (수상/인증 섹션) -- C 전용                    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│          REVIEWS (다크 카드 그리드)                           │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│          PRICING (프리미엄 패키지) -- C 전용                  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│          FAQ (미니멀 아코디언)                                │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│          PREMIUM CTA (럭셔리 상담 폼)                        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                      FOOTER (다크)                            │
└─────────────────────────────────────────────────────────────┘
```

---

#### C-1. Navigation Bar

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  {업체명}                                                    │
│  (Playfair Display,                                          │
│   text-gold-gradient)   PROJECT  SERVICE  REVIEW  CONTACT   │
│                                                               │
│                                    ┌───────────────────┐     │
│                                    │ CONSULTATION      │     │
│                                    │ (골드 테두리 버튼)  │     │
│                                    └───────────────────┘     │
│                                                               │
│  특징:                                                        │
│  - 배경: 완전 투명 → 스크롤 시 bg-bg/95 + backdrop-blur-xl    │
│  - 로고: heading-premium + text-gold-gradient                │
│  - 메뉴: 영문 대문자, letter-spacing 넓게, text-text-secondary│
│  - CTA: border-primary + text-primary (테두리형)             │
│  - 호버: text-primary로 전환 + 하단 밑줄 애니메이션           │
│  - 모바일: 풀스크린 오버레이 메뉴 (bg-bg/98)                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### C-2. Hero Section (비디오 배경 + 패럴랙스)

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │      (풀스크린 비디오 자동재생 / 폴백: 이미지)          │   │
│  │                                                         │   │
│  │                                                         │   │
│  │                                                         │   │
│  │                   {업체명}                               │   │
│  │              PREMIUM INTERIOR                           │   │
│  │             (heading-premium,                           │   │
│  │              text-gold-gradient)                        │   │
│  │                                                         │   │
│  │         "공간의 격을 높이는 프리미엄 인테리어"           │   │
│  │                                                         │   │
│  │         ┌─────────────────────┐                        │   │
│  │         │   프로젝트 보기      │                        │   │
│  │         │ (골드 라인 + 화살표)  │                        │   │
│  │         └─────────────────────┘                        │   │
│  │                                                         │   │
│  │         ▼ SCROLL                                       │   │
│  │                                                         │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  특징:                                                        │
│  - min-h-screen 풀스크린                                      │
│  - 비디오: autoplay, muted, loop, playsinline                │
│  - 비디오 없을 경우: 포트폴리오 첫 번째 이미지 + 패럴랙스     │
│  - 오버레이: gradient-dark (하단 80% 다크 그라데이션)         │
│  - 텍스트: 중앙 정렬, heading-premium                        │
│  - 업체명: text-gold-gradient (골드 그라데이션)               │
│  - CTA: border-primary text-primary + 호버 시 bg-primary/10  │
│  - 하단 스크롤 유도: 마우스 아이콘 bounce 애니메이션          │
│  - 패럴랙스: Framer Motion useScroll + useTransform           │
│  - Framer Motion: 텍스트 fadeUp stagger 0.2s                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### C-3. Stats (골드 카운터)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg                                                  │
│                                                               │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │             │             │             │             │  │
│  │   10+       │   150+      │   4.9       │   98%       │  │
│  │   (골드)     │   (골드)     │   (골드)     │   (골드)     │  │
│  │             │             │             │             │  │
│  │   YEARS     │   PROJECTS  │   RATING    │   RENEWAL   │  │
│  │   시공 경력  │  시공 완료   │  평균 평점   │  재계약률    │  │
│  │             │             │             │             │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
│                                                               │
│  특징:                                                        │
│  - 보더 없는 미니멀 레이아웃                                  │
│  - 숫자: text-6xl font-bold text-gold-gradient               │
│  - 라벨 (영문): text-xs tracking-[0.3em] uppercase           │
│  - 라벨 (한글): text-sm text-text-muted                      │
│  - 구분: 세로 border-r border-border (마지막 제외)           │
│  - 카운트업 애니메이션: Framer Motion + useInView             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### C-4. Portfolio (풀스크린 갤러리 + 라이트박스)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg-soft                                             │
│                                                               │
│  PORTFOLIO  (text-xs tracking-[0.3em] text-primary)          │
│  "프로젝트"  (heading-premium text-4xl)                      │
│                                                               │
│  ┌─────────────────────────────┬──────────────────────────┐  │
│  │                             │                            │  │
│  │                             │  ┌──────────────────────┐ │  │
│  │                             │  │                        │ │  │
│  │                             │  │     (이미지 2)         │ │  │
│  │      (대형 이미지 1)         │  │                        │ │  │
│  │      aspect-[3/4]           │  └──────────────────────┘ │  │
│  │                             │                            │  │
│  │                             │  ┌──────────────────────┐ │  │
│  │      호버 시:               │  │                        │ │  │
│  │      → 타이틀 오버레이      │  │     (이미지 3)         │ │  │
│  │      → 프로젝트 정보        │  │                        │ │  │
│  │      → 클릭하면 라이트박스  │  └──────────────────────┘ │  │
│  │                             │                            │  │
│  └─────────────────────────────┴──────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────┬─────────────────────────────┐  │
│  │                            │                             │  │
│  │  ┌──────────────────────┐ │                             │  │
│  │  │                        │ │       (대형 이미지 5)       │  │
│  │  │     (이미지 4)         │ │       aspect-[3/4]         │  │
│  │  │                        │ │                             │  │
│  │  └──────────────────────┘ │                             │  │
│  │                            │                             │  │
│  └──────────────────────────┴─────────────────────────────┘  │
│                                                               │
│                 [VIEW ALL PROJECTS →]                         │
│                                                               │
│  특징:                                                        │
│  - 비대칭 Masonry 스타일 그리드                               │
│  - 이미지 호버: scale-105 + 오버레이(bg-bg/60)               │
│    + 하단에서 올라오는 정보 패널                              │
│  - 정보 패널: 프로젝트명, 면적, 스타일 (text-white)          │
│  - 클릭: 라이트박스 모달 (풀스크린 이미지 뷰어)              │
│  - 라이트박스: bg-bg/95 + backdrop-blur + 좌우 넘기기        │
│  - 커서 팔로우 효과: 이미지 위에서 커스텀 커서 표시           │
│  - Framer Motion: scroll-triggered 순차 fadeIn               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### C-5. Services (글래스모피즘 카드)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg                                                  │
│                                                               │
│  SERVICE  (text-xs tracking-[0.3em] text-primary)            │
│  "서비스"  (heading-premium)                                 │
│                                                               │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │
│  │                  │ │                  │ │                  │   │
│  │  glass-card      │ │  glass-card      │ │  glass-card      │   │
│  │                  │ │                  │ │                  │   │
│  │  ┌────┐         │ │  ┌────┐         │ │  ┌────┐         │   │
│  │  │ ◇  │ (골드)  │ │  │ ◇  │ (골드)  │ │  │ ◇  │ (골드)  │   │
│  │  └────┘         │ │  └────┘         │ │  └────┘         │   │
│  │                  │ │                  │ │                  │   │
│  │  아파트          │ │  리모델링        │ │  상업 공간       │   │
│  │  인테리어        │ │                  │ │  인테리어        │   │
│  │                  │ │                  │ │                  │   │
│  │  프리미엄 자재와 │ │  노후 공간을     │ │  고급 상업 공간 │   │
│  │  세련된 디자인의│ │  새롭게 탈바꿈  │ │  전문 설계 및   │   │
│  │  하이엔드 시공  │ │  하는 전문 시공  │ │  시공            │   │
│  │                  │ │                  │ │                  │   │
│  │  ──────────── │ │  ──────────── │ │  ──────────── │   │
│  │  [상세 보기 →]  │ │  [상세 보기 →]  │ │  [상세 보기 →]  │   │
│  │                  │ │                  │ │                  │   │
│  └────────────────┘ └────────────────┘ └────────────────┘   │
│                                                               │
│  특징:                                                        │
│  - 3열 그리드 (md:grid-cols-3)                               │
│  - glass-card: backdrop-blur + 반투명 배경                    │
│  - 아이콘: 골드 라인 아이콘 (lucide-react, stroke-primary)   │
│  - 호버: border-primary/30 → border-primary/60               │
│    + shadow-gold + translateY(-8px)                          │
│  - 구분선: border-primary/20                                  │
│  - [상세 보기]: text-primary + underline offset               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### C-6. Process (미니멀 수평 스텝)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg-soft                                             │
│                                                               │
│  PROCESS  (text-xs tracking-[0.3em] text-primary)            │
│  "시공 프로세스"  (heading-premium)                           │
│                                                               │
│      01             02             03             04         │
│   ─────────────────────────────────────────────────────     │
│   │  CONSULT  ──── │  MEASURE ──── │  DESIGN  ──── │  BUILD│
│   ─────────────────────────────────────────────────────     │
│      상담            실측            디자인           시공    │
│                                                               │
│      전문 상담사가    현장 방문       3D 시뮬레이션    전문팀  │
│      맞춤 상담       실측+견적       완성 이미지      시공    │
│                                                               │
│  특징:                                                        │
│  - 수평 진행 바: bg-border, 진행 부분 bg-primary              │
│  - 단계 번호: text-6xl font-bold text-border (워터마크)      │
│  - 영문 라벨: text-xs tracking-widest text-primary           │
│  - 한글 설명: text-sm text-text-secondary                    │
│  - 연결선: 골드 라인 (border-t border-primary/30)            │
│  - 모바일: 세로 타임라인으로 전환                             │
│  - Framer Motion: 진행 바 width 애니메이션 + stagger          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### C-7. Awards (수상/인증) -- Template C 전용

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg                                                  │
│                                                               │
│  AWARDS & CERTIFICATION                                      │
│  "수상 및 인증"  (heading-premium)                           │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │          │  │          │  │          │  │          │    │
│  │   🏆    │  │   📰    │  │   🎖️    │  │   ⭐    │    │
│  │          │  │          │  │          │  │          │    │
│  │  인테리어│  │  매거진  │  │  ISO     │  │  네이버  │    │
│  │  대상    │  │  선정    │  │  인증    │  │  평점    │    │
│  │  수상    │  │  TOP10   │  │          │  │  4.9    │    │
│  │          │  │          │  │          │  │          │    │
│  │  2024    │  │  2025    │  │  2023    │  │  2026    │    │
│  │          │  │          │  │          │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                               │
│  특징:                                                        │
│  - 4열 그리드, 가운데 정렬                                    │
│  - 각 카드: glass-card + 골드 아이콘                         │
│  - 아이콘: 64px, text-primary                                │
│  - 연도: text-xs text-text-muted                             │
│  - 호버: shadow-gold 효과                                    │
│  - 데이터: homepage_materials.certifications 배열              │
│    또는 하드코딩 (추후 어드민 연동)                           │
│  - 데이터 없으면 섹션 비노출                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### C-8. Reviews (다크 카드 그리드)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg-soft                                             │
│                                                               │
│  REVIEWS  (text-xs tracking-[0.3em] text-primary)            │
│  "고객 후기"  (heading-premium)                              │
│                                                               │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │                     │  │                     │               │
│  │  glass-card         │  │  glass-card         │               │
│  │                     │  │                     │               │
│  │  ★★★★★ (골드)      │  │  ★★★★★ (골드)      │               │
│  │                     │  │                     │               │
│  │  "고급스러운 자재와 │  │  "처음부터 끝까지   │               │
│  │   세심한 시공으로   │  │   프로페셔널한     │               │
│  │   만족스러운 공간이 │  │   진행이었습니다.  │               │
│  │   완성되었습니다"  │  │   강력 추천합니다" │               │
│  │                     │  │                     │               │
│  │  ── ── ── ── ──   │  │  ── ── ── ── ──   │               │
│  │                     │  │                     │               │
│  │  김OO              │  │  박OO              │               │
│  │  GANGNAM 45PY APT  │  │  SEOCHO 55PY APT  │               │
│  │                     │  │                     │               │
│  └───────────────────┘  └───────────────────┘               │
│                                                               │
│  특징:                                                        │
│  - 2열 그리드 (md:grid-cols-2)                               │
│  - glass-card 스타일                                          │
│  - 별점: text-primary (골드 fill)                            │
│  - 후기 내용: text-text-secondary, italic 느낌               │
│  - 고객명: font-medium text-text                             │
│  - 프로젝트 유형: 영문 대문자, text-xs text-text-muted       │
│  - 구분선: border-primary/20                                  │
│  - 최대 4개 노출                                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### C-9. Pricing (프리미엄 패키지) -- Template C 전용

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg                                                  │
│                                                               │
│  PRICING  (text-xs tracking-[0.3em] text-primary)            │
│  "패키지 안내"  (heading-premium)                            │
│                                                               │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │                │  │ ★ RECOMMENDED    │  │                │   │
│  │   STANDARD    │  │                    │  │   PREMIUM     │   │
│  │               │  │   SIGNATURE       │  │               │   │
│  │   기본 패키지  │  │                    │  │  프리미엄     │   │
│  │               │  │   시그니처 패키지   │  │  패키지       │   │
│  │  ────────── │  │                    │  │  ────────── │   │
│  │               │  │  ────────────── │  │               │   │
│  │  평당 80만~   │  │                    │  │  평당 150만~  │   │
│  │               │  │  평당 120만~       │  │               │   │
│  │  ☑ 기본 자재 │  │                    │  │  ☑ 최고급    │   │
│  │  ☑ 표준 설계 │  │  ☑ 프리미엄 자재  │  │    수입 자재  │   │
│  │  ☑ 시공 관리 │  │  ☑ 맞춤 설계      │  │  ☑ 전담 설계 │   │
│  │  ☑ 1년 A/S  │  │  ☑ 3D 시뮬레이션  │  │  ☑ VR 투어   │   │
│  │               │  │  ☑ 전담 관리      │  │  ☑ 5년 A/S  │   │
│  │               │  │  ☑ 3년 A/S       │  │  ☑ 인테리어  │   │
│  │               │  │                    │  │    컨시어지  │   │
│  │ ┌──────────┐│  │ ┌────────────────┐│  │ ┌──────────┐│   │
│  │ │ 상담 신청 ││  │ │   상담 신청     ││  │ │ VIP 상담  ││   │
│  │ └──────────┘│  │ └────────────────┘│  │ └──────────┘│   │
│  └──────────────┘  └──────────────────┘  └──────────────┘   │
│                                                               │
│  특징:                                                        │
│  - 3열 그리드, 중앙(SIGNATURE)이 크고 gold-border 강조        │
│  - 중앙 카드: scale-105 + border-primary + RECOMMENDED 배지   │
│  - 좌우 카드: glass-card                                      │
│  - 가격: text-3xl text-gold-gradient                         │
│  - 체크 아이콘: text-primary                                  │
│  - CTA 버튼: 중앙만 bg-primary (채움형), 좌우는 테두리형     │
│  - 데이터: 하드코딩 (추후 어드민에서 패키지 관리)            │
│  - 가격 표시 여부: 토글 가능 (업체별 선택)                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### C-10. Premium CTA (럭셔리 상담 폼)

```
┌─────────────────────────────────────────────────────────────┐
│  배경: bg-bg-soft + marble-texture 오버레이                   │
│                                                               │
│  CONSULTATION  (text-xs tracking-[0.3em] text-primary)       │
│  "프리미엄 상담 예약"  (heading-premium)                     │
│  "전담 디자이너가 맞춤 컨설팅을 제공합니다"                  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  glass-card + gold-border (상단 or 좌측에 골드 라인)    │   │
│  │                                                         │   │
│  │  이름 *                  연락처 *                        │   │
│  │  [__________________]   [____________________]          │   │
│  │                                                         │   │
│  │  시공 예정 면적           예상 예산                       │   │
│  │  [__________________]   [▼ 3천만~5천만       ]          │   │
│  │                                                         │   │
│  │  희망 스타일              시공 희망 시기                   │   │
│  │  [▼ 모던            ]   [▼ 3개월 이내       ]          │   │
│  │                                                         │   │
│  │  문의 내용                                               │   │
│  │  [________________________________________________]     │   │
│  │  [________________________________________________]     │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────┐       │   │
│  │  │           프리미엄 상담 신청하기               │       │   │
│  │  │    (bg-primary text-bg font-medium)           │       │   │
│  │  └─────────────────────────────────────────────┘       │   │
│  │                                                         │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  특징:                                                        │
│  - Template A/B 대비 추가 필드: 희망 스타일, 시공 시기         │
│  - 입력 필드: bg-transparent + border-b border-border         │
│    (언더라인 스타일, 미니멀)                                   │
│  - 포커스: border-primary + glow 효과                         │
│  - 제출 버튼: bg-primary text-bg, 호버 시 shadow-gold        │
│  - 성공 시: 골드 체크 아이콘 + "프리미엄 상담이 접수되었습니다"│
│  - 추가 필드는 API에 message에 합쳐서 전달                   │
│    (기존 inquiry API와 호환 유지)                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4-4. Template C 컴포넌트 목록

```
templates/premium-dark/
├── app/
│   ├── globals.css                # C 전용 CSS 변수 (위 4-2절)
│   ├── layout.tsx                 # Playfair Display + Pretendard 폰트 로딩
│   ├── page.tsx                   # C 전용 섹션 조합
│   ├── blog/
│   │   ├── page.tsx               # 다크 테마 블로그 목록
│   │   └── [slug]/page.tsx        # 블로그 상세
│   ├── portfolio/
│   │   └── [slug]/page.tsx        # 풀스크린 갤러리 포트폴리오 상세
│   ├── api/inquiry/route.ts       # → shared re-export
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── layout/
│   │   ├── Nav.tsx                # 투명 네비, 골드 로고, 대문자 메뉴
│   │   ├── Footer.tsx             # 다크 미니멀 푸터
│   │   ├── FloatingCTA.tsx        # 골드 톤 플로팅 버튼
│   │   └── CursorFollow.tsx       # 커서 팔로우 효과 (C 전용)
│   ├── home/
│   │   ├── HeroVideo.tsx          # 비디오 배경 + 패럴랙스
│   │   ├── Stats.tsx              # 골드 카운터 (수직 구분선)
│   │   ├── PortfolioGallery.tsx   # 비대칭 Masonry + 라이트박스
│   │   ├── Lightbox.tsx           # 풀스크린 이미지 모달 (C 전용)
│   │   ├── Services.tsx           # 글래스모피즘 카드
│   │   ├── ProcessMinimal.tsx     # 미니멀 수평 스텝
│   │   ├── Awards.tsx             # 수상/인증 섹션 (C 전용)
│   │   ├── Reviews.tsx            # 다크 카드 2열 그리드
│   │   ├── Pricing.tsx            # 프리미엄 패키지 (C 전용)
│   │   ├── FAQ.tsx                # 미니멀 아코디언 (다크 스타일)
│   │   └── PremiumCTA.tsx         # 럭셔리 상담 폼
│   └── shared/                    # → templates/shared 참조
├── package.json
├── next.config.ts
├── tsconfig.json
└── postcss.config.mjs
```

### 4-5. Template C 차별 포인트 요약

| 항목 | Template A (modern-minimal) | Template C (premium-dark) |
|------|---------------------------|--------------------------|
| 배경 | 화이트 (#ffffff) | 딥 다크 (#0E0E12) |
| 포인트 | 블루 (#2563eb) | 골드 (#C6A664) |
| 히어로 | 단일 이미지 + 좌측 정렬 | 풀스크린 비디오 + 중앙 정렬 + 패럴랙스 |
| 포트폴리오 | 3열 균등 그리드 | 비대칭 Masonry + 라이트박스 |
| 서비스 | 일반 카드 | 글래스모피즘 카드 + 호버 glow |
| 수상 섹션 | 없음 | Awards 섹션 (C 전용) |
| 가격 섹션 | 없음 | 프리미엄 패키지 3종 (C 전용) |
| 리뷰 | 3열 카드 그리드 | 2열 glass-card + 골드 별점 |
| 상담 폼 | 기본 폼 | 럭셔리 폼 (추가 필드: 스타일/시기) |
| 애니메이션 | fadeUp 기본 | 패럴랙스 + 커서 팔로우 + glow |
| 폰트 | Pretendard | Playfair Display (헤딩) + Pretendard (본문) |
| 텍스트 효과 | 없음 | text-gold-gradient (골드 그라데이션) |

---

## 5. 구현 우선순위 및 일정

### 5-1. 전체 순서

```
Phase 7-1: 공유 컴포넌트 추출 (1일)
    │
    ▼
Phase 7-2: Template B (natural-wood) 구현 (3일)
    │
    ▼
Phase 7-3: Template C (premium-dark) 구현 (3일)
    │
    ▼
Phase 7-4: 템플릿 전환 테스트 및 QA (1일)
```

### 5-2. 상세 태스크

#### Phase 7-1: 공유 컴포넌트 추출 (1일)

| # | 태스크 | 산출물 | 예상 시간 |
|---|--------|--------|-----------|
| 1 | `templates/shared/types/index.ts` 생성 | 공통 타입 파일 | 30분 |
| 2 | `templates/shared/data/config.ts` 추출 | getHomepageConfig() 공유 | 30분 |
| 3 | `templates/shared/lib/supabase.ts` 추출 | Supabase 클라이언트 공유 | 15분 |
| 4 | `templates/shared/components/JsonLd.tsx` 추출 | JSON-LD 컴포넌트 공유 | 15분 |
| 5 | `templates/shared/api/inquiry/route.ts` 추출 | 상담 API 공유 | 15분 |
| 6 | Template A에서 shared 참조하도록 import 경로 변경 | 기존 코드 리팩토링 | 1시간 |
| 7 | Template A 동작 검증 | 빌드 + 로컬 테스트 | 30분 |

#### Phase 7-2: Template B (natural-wood) 구현 (3일)

| # | 태스크 | 산출물 | 예상 시간 |
|---|--------|--------|-----------|
| 1 | 프로젝트 초기화 (package.json, config) | 프로젝트 설정 | 1시간 |
| 2 | globals.css (CSS 변수 + 유틸리티) | 테마 파일 | 1시간 |
| 3 | layout.tsx (폰트 로딩 + 메타데이터) | 레이아웃 | 1시간 |
| 4 | Nav.tsx (투명→불투명, 세리프 로고) | 네비게이션 | 2시간 |
| 5 | Hero.tsx (전체화면 이미지 슬라이드) | 히어로 | 3시간 |
| 6 | TrustBadges.tsx (신뢰 지표) | Stats 대체 | 1시간 |
| 7 | PortfolioMagazine.tsx (매거진 지그재그) | 포트폴리오 | 3시간 |
| 8 | BeforeAfter.tsx (react-compare-slider) | 비교 슬라이더 | 2시간 |
| 9 | Services.tsx (유기적 카드) | 서비스 | 1.5시간 |
| 10 | ProcessTimeline.tsx (일러스트 타임라인) | 프로세스 | 2시간 |
| 11 | Materials.tsx (소재 팔레트) | B 전용 | 2시간 |
| 12 | ReviewSlider.tsx (카드 슬라이더) | 리뷰 | 2시간 |
| 13 | BlogGrid.tsx (카테고리 탭) | 블로그 | 1.5시간 |
| 14 | FAQ.tsx + ContactCTA.tsx | 폼 | 1.5시간 |
| 15 | Footer.tsx + FloatingCTA.tsx | 레이아웃 | 1시간 |
| 16 | 블로그 상세/포트폴리오 상세 페이지 | 서브 페이지 | 2시간 |
| 17 | 반응형 + 빌드 테스트 | QA | 1시간 |

#### Phase 7-3: Template C (premium-dark) 구현 (3일)

| # | 태스크 | 산출물 | 예상 시간 |
|---|--------|--------|-----------|
| 1 | 프로젝트 초기화 (package.json, config) | 프로젝트 설정 | 1시간 |
| 2 | globals.css (CSS 변수 + 다크 유틸리티) | 테마 파일 | 1.5시간 |
| 3 | layout.tsx (Playfair Display 폰트 로딩) | 레이아웃 | 1시간 |
| 4 | Nav.tsx (투명, 골드 로고, 대문자 메뉴) | 네비게이션 | 2시간 |
| 5 | HeroVideo.tsx (비디오 배경 + 패럴랙스) | 히어로 | 4시간 |
| 6 | Stats.tsx (골드 카운터) | 통계 | 1시간 |
| 7 | PortfolioGallery.tsx (비대칭 Masonry) | 포트폴리오 | 3시간 |
| 8 | Lightbox.tsx (풀스크린 이미지 모달) | C 전용 | 2시간 |
| 9 | Services.tsx (글래스모피즘 카드) | 서비스 | 2시간 |
| 10 | ProcessMinimal.tsx (수평 스텝) | 프로세스 | 1.5시간 |
| 11 | Awards.tsx (수상/인증) | C 전용 | 1.5시간 |
| 12 | Reviews.tsx (다크 카드 그리드) | 리뷰 | 1.5시간 |
| 13 | Pricing.tsx (프리미엄 패키지) | C 전용 | 3시간 |
| 14 | FAQ.tsx (미니멀 아코디언) | FAQ | 1시간 |
| 15 | PremiumCTA.tsx (럭셔리 상담 폼) | 상담 폼 | 2시간 |
| 16 | CursorFollow.tsx (커서 팔로우 효과) | C 전용 | 1.5시간 |
| 17 | Footer.tsx + FloatingCTA.tsx | 레이아웃 | 1시간 |
| 18 | 블로그 상세/포트폴리오 상세 페이지 | 서브 페이지 | 2시간 |
| 19 | 반응형 + 빌드 테스트 | QA | 1시간 |

#### Phase 7-4: 템플릿 전환 테스트 (1일)

| # | 태스크 | 산출물 | 예상 시간 |
|---|--------|--------|-----------|
| 1 | 동일 데이터로 A/B/C 3종 빌드 테스트 | 빌드 성공 확인 | 2시간 |
| 2 | template_id 변경 시 정상 전환 확인 | 전환 로직 검증 | 1시간 |
| 3 | 어드민에서 색상 커스터마이징 테스트 | CSS 변수 오버라이드 | 1시간 |
| 4 | 모바일/태블릿 반응형 최종 점검 | 크로스 디바이스 | 2시간 |
| 5 | Lighthouse 성능 측정 (3종 모두) | 성능 리포트 | 1시간 |
| 6 | SEO 체크 (메타태그, JSON-LD, sitemap) | SEO 검증 | 1시간 |

### 5-3. 3종 템플릿 비교 종합표

| 항목 | A: Modern Minimal | B: Natural Wood | C: Premium Dark |
|------|:-:|:-:|:-:|
| **배경색** | #FFFFFF | #FEFCF9 | #0E0E12 |
| **메인 컬러** | #2563EB (블루) | #8B7355 (우드) | #C6A664 (골드) |
| **보조 컬러** | #10B981 (그린) | #6B8E5A (올리브) | #C6A664 (골드) |
| **텍스트** | #0F172A | #2D2A26 | #FAFAFA |
| **헤딩 폰트** | Pretendard | Noto Serif KR | Playfair Display |
| **본문 폰트** | Pretendard | Pretendard | Pretendard |
| **border-radius** | 12px | 20px | 8px |
| **톤** | 깔끔, 전문적 | 따뜻한, 감성적 | 고급, 프리미엄 |
| **타겟** | 20-30대 | 신혼/가족 | 40-50대 고소득 |
| **히어로** | 단일 이미지 | 이미지 슬라이드 | 비디오 + 패럴랙스 |
| **포트폴리오** | 3열 필터 그리드 | 매거진 지그재그 | Masonry + 라이트박스 |
| **전용 섹션** | - | BeforeAfter, Materials | Awards, Pricing, CursorFollow |
| **리뷰** | 3열 카드 | Swiper 슬라이더 | 2열 glass-card |
| **추가 패키지** | - | react-compare-slider, swiper | lenis |

---

## 부록: 템플릿별 CSS 변수 전체 대조표

| CSS 변수 | A: Modern Minimal | B: Natural Wood | C: Premium Dark |
|----------|:-:|:-:|:-:|
| `--primary` | #2563EB | #8B7355 | #C6A664 |
| `--primary-dark` | #1D4ED8 | #6F5B3E | #A88D4F |
| `--primary-light` | #3B82F6 | #A89279 | #D4BA80 |
| `--secondary` | #10B981 | #6B8E5A | #C6A664 |
| `--secondary-dark` | #059669 | #557548 | #A88D4F |
| `--accent` | #F59E0B | #D4A574 | #E8D5B0 |
| `--bg` | #FFFFFF | #FEFCF9 | #0E0E12 |
| `--bg-soft` | #F8FAFC | #F5F0EB | #16161C |
| `--bg-muted` | #F1F5F9 | #EDE5DB | #1E1E26 |
| `--text` | #0F172A | #2D2A26 | #FAFAFA |
| `--text-secondary` | #475569 | #5C564E | #A0A0B0 |
| `--text-muted` | #94A3B8 | #8B8680 | #6B6B7B |
| `--border` | #E2E8F0 | #E8E0D8 | #2A2A35 |
| `--border-light` | #F1F5F9 | #F0EBE5 | #1E1E28 |
| `--font-heading` | Pretendard | Noto Serif KR | Playfair Display |
| `--font-body` | Pretendard | Pretendard | Pretendard |
