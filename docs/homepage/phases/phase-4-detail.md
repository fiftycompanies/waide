# Phase 4: 홈페이지 템플릿 A (모던 미니멀)

## 개요
- **목적:** 인테리어 업체용 첫 번째 홈페이지 템플릿 "모던 미니멀(Modern Minimal)"을 Next.js 기반으로 개발한다. Supabase 데이터를 빌드 타임에 fetch하여 SSG로 생성하고, SEO 최적화, 블로그 페이지, 상담 폼을 포함한다.
- **예상 기간:** 5일
- **선행 조건:** Phase 1 (DB 스키마), Phase 2 (어드민 UI — 포트폴리오/후기 데이터), Phase 3 (키워드 생성)
- **산출물:** Next.js 템플릿 프로젝트 (templates/modern-minimal/), 12개 핵심 컴포넌트, SEO 자동 생성 로직

---

## 상세 작업 목록

### 4.1 프로젝트 구조 및 설정

#### 설명
Next.js 16 + Tailwind CSS 4 + Framer Motion 기반의 템플릿 프로젝트를 구성한다. Supabase 데이터를 빌드 타임에 fetch하여 정적 생성(SSG)한다.

#### 기술 스펙
- Next.js 16 (App Router)
- Tailwind CSS 4 (@theme inline 방식)
- Framer Motion (스크롤 애니메이션)
- Supabase JS Client
- 빌드 타임 데이터 fetch (ISR 지원)

#### 파일 구조
```
templates/modern-minimal/
├── app/
│   ├── layout.tsx            ← 루트 레이아웃 (메타데이터, 폰트, JSON-LD)
│   ├── page.tsx              ← 메인 홈페이지
│   ├── globals.css           ← 테마 CSS 변수
│   ├── sitemap.ts            ← 동적 사이트맵
│   ├── robots.ts             ← robots.txt
│   ├── portfolio/
│   │   └── [slug]/page.tsx   ← 포트폴리오 상세
│   ├── blog/
│   │   ├── page.tsx          ← 블로그 목록
│   │   └── [slug]/page.tsx   ← 블로그 글 상세
│   ├── contact/
│   │   └── page.tsx          ← 상담 신청 전용 페이지
│   ├── faq/
│   │   └── page.tsx          ← FAQ 페이지
│   └── api/
│       └── inquiry/route.ts  ← 상담 접수 API
├── components/
│   ├── home/
│   │   ├── Hero.tsx          ← 히어로 섹션
│   │   ├── Stats.tsx         ← 실적 통계
│   │   ├── Portfolio.tsx     ← 포트폴리오 그리드
│   │   ├── BeforeAfter.tsx   ← Before/After 슬라이더
│   │   ├── Services.tsx      ← 서비스 소개
│   │   ├── Process.tsx       ← 시공 프로세스
│   │   ├── Reviews.tsx       ← 고객 후기 캐러셀
│   │   ├── Blog.tsx          ← 최신 블로그 (3개)
│   │   ├── FAQ.tsx           ← 자주 묻는 질문
│   │   └── ContactCTA.tsx    ← 상담 CTA
│   ├── layout/
│   │   ├── Nav.tsx           ← 네비게이션 바
│   │   ├── Footer.tsx        ← 푸터
│   │   └── FloatingCTA.tsx   ← 플로팅 상담 버튼
│   └── shared/
│       ├── JsonLd.tsx        ← 구조화 데이터
│       └── Breadcrumb.tsx    ← 브레드크럼
├── lib/
│   └── supabase.ts           ← Supabase 클라이언트
├── data/
│   └── config.ts             ← 빌드 타임 데이터 fetch
├── public/
│   └── images/               ← 기본 이미지 에셋
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

### 4.2 Supabase 데이터 연동 (config.ts)

#### 설명
빌드 타임에 Supabase에서 프로젝트 데이터를 fetch하여 모든 페이지에서 사용할 수 있는 통합 config 객체를 생성한다.

#### 기술 스펙
- 환경변수: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PROJECT_ID`
- ISR: revalidate = 3600 (1시간)
- 캐싱: unstable_cache로 빌드 타임 캐싱

#### 코드 예시
```typescript
// data/config.ts
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const PROJECT_ID = process.env.PROJECT_ID!;

export const getHomepageConfig = unstable_cache(
  async () => {
    const { data: project } = await supabase
      .from('homepage_projects')
      .select('*, client:clients(company_name, brand_persona)')
      .eq('id', PROJECT_ID)
      .single();

    const { data: materials } = await supabase
      .from('homepage_materials')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .single();

    const { data: portfolios } = await supabase
      .from('homepage_portfolios')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('sort_order');

    const { data: reviews } = await supabase
      .from('homepage_reviews')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('created_at', { ascending: false });

    const { data: blogPosts } = await supabase
      .from('contents')
      .select('*')
      .eq('client_id', project!.client_id)
      .in('content_type', ['hp_blog_info', 'hp_blog_review'])
      .eq('publish_status', 'published')
      .order('published_at', { ascending: false });

    const { data: keywords } = await supabase
      .from('keywords')
      .select('keyword')
      .eq('client_id', project!.client_id)
      .eq('source', 'homepage_seo');

    return {
      company: {
        name: materials!.company_name,
        owner: materials!.owner_name,
        phone: materials!.phone,
        address: materials!.address,
        description: materials!.description,
        kakaoLink: materials!.kakao_link,
        logo: materials!.logo_url,
        instagram: materials!.instagram_url,
        youtube: materials!.youtube_url,
        naverPlace: materials!.naver_place_url,
        operatingHours: materials!.operating_hours,
        businessNumber: materials!.business_number,
      },
      theme: project!.theme_config,
      seo: {
        ...project!.seo_config,
        keywords: keywords?.map(k => k.keyword) ?? [],
      },
      persona: project!.client.brand_persona,
      portfolios: portfolios ?? [],
      reviews: reviews ?? [],
      blogPosts: blogPosts ?? [],
      faqItems: materials!.faq_items ?? [],
    };
  },
  ['homepage-config', PROJECT_ID],
  { revalidate: 3600 }
);
```

### 4.3 히어로 섹션 (Hero.tsx)

#### 설명
메인 페이지 최상단의 풀 와이드 히어로 섹션. 포트폴리오 이미지 슬라이더, 브랜드 태그라인, CTA 버튼을 포함한다.

#### 기술 스펙
- 배경: 포트폴리오 이미지 자동 슬라이더 (is_featured 이미지)
- 태그라인: brand_persona.one_liner
- CTA: "무료 상담 신청" 버튼 → /contact 또는 kakao_link
- 서브텍스트: brand_persona.target_audience
- 애니메이션: 페이드인 + 스케일 (Framer Motion)
- 오버레이: 반투명 그라디언트

#### 코드 예시
```typescript
// components/home/Hero.tsx
'use client';

import { motion } from 'framer-motion';

export function Hero({ config }: { config: HomepageConfig }) {
  const featuredImages = config.portfolios
    .filter(p => p.is_featured)
    .flatMap(p => p.image_urls)
    .slice(0, 5);

  return (
    <section className="relative h-screen overflow-hidden">
      {/* 배경 이미지 슬라이더 */}
      <div className="absolute inset-0">
        <ImageSlider images={featuredImages} interval={5000} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/30" />
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          {config.persona.one_liner}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl"
        >
          {config.company.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-4"
        >
          <a href="/contact" className="btn-primary">무료 상담 신청</a>
          <a href="#portfolio" className="btn-outline">시공 사례 보기</a>
        </motion.div>
      </div>
    </section>
  );
}
```

### 4.4 포트폴리오 그리드 (Portfolio.tsx)

#### 설명
시공 사례를 필터링 가능한 그리드 형태로 보여주는 섹션. 공간 유형별 필터와 마우스 호버 효과를 포함한다.

#### 기술 스펙
- 레이아웃: 3열 그리드 (반응형: 모바일 1열, 태블릿 2열)
- 필터: 전체, 거실, 주방, 침실, 욕실 등 (space_type 기반)
- 호버 효과: 이미지 확대 + 오버레이 + 제목/정보 표시
- 클릭: /portfolio/[slug] 상세 페이지로 이동
- 최대 표시: 9개 (더 보기 버튼)

### 4.5 Before/After 슬라이더 (BeforeAfter.tsx)

#### 설명
인테리어 시공 전/후를 비교할 수 있는 드래그 슬라이더 컴포넌트. 터치/마우스 드래그로 분할선을 이동한다.

#### 기술 스펙
- 입력: before_image_url, after_image_url
- 드래그: 마우스/터치 드래그로 분할선 이동
- 레이블: "BEFORE" / "AFTER" 텍스트 오버레이
- 초기 위치: 50% 중앙
- 반응형: 모바일 터치 최적화
- 접근성: 키보드 화살표 키로 조작 가능

#### 코드 예시
```typescript
// components/home/BeforeAfter.tsx
'use client';

import { useState, useRef, useCallback } from 'react';

export function BeforeAfter({
  beforeImage,
  afterImage,
  title,
}: {
  beforeImage: string;
  afterImage: string;
  title: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(Math.max(x, 0), 100));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl cursor-col-resize select-none"
      onMouseMove={(e) => handleMove(e.clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      {/* After (전체 배경) */}
      <img src={afterImage} alt="After" className="absolute inset-0 w-full h-full object-cover" />

      {/* Before (클립) */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img src={beforeImage} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* 분할선 */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <span className="text-gray-800 text-sm">↔</span>
        </div>
      </div>

      {/* 레이블 */}
      <span className="absolute top-4 left-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full">BEFORE</span>
      <span className="absolute top-4 right-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full">AFTER</span>
    </div>
  );
}
```

### 4.6 그 외 섹션 컴포넌트

#### 설명

**Stats.tsx — 실적 통계**
- 경력 년수, 시공 완료 수, 평균 평점, 상담 건수
- 카운트업 애니메이션 (Intersection Observer + Framer Motion)

**Services.tsx — 서비스 소개**
- interior_profile.service_types 기반 카드 레이아웃
- 아이콘 + 제목 + 설명 카드 (6개)

**Process.tsx — 시공 프로세스**
- 상담 → 실측 → 디자인 → 시공 → 완료 → A/S (6단계)
- 타임라인 형태 시각화

**Reviews.tsx — 고객 후기 캐러셀**
- 좌우 스와이프 캐러셀 (embla-carousel)
- 별점, 고객명(마스킹), 시공 유형, 후기 내용

**Blog.tsx — 최신 블로그**
- 최신 3개 블로그 글 카드
- 이미지 썸네일 + 제목 + 요약 + 날짜
- "더 보기" → /blog

**FAQ.tsx — 자주 묻는 질문**
- homepage_materials.faq_items 기반
- 아코디언 UI (클릭 시 토글)
- FAQPage JSON-LD 자동 생성

**ContactCTA.tsx — 상담 CTA**
- 간단 상담 폼 (이름, 연락처, 평수, 유형, 메시지)
- 카카오톡 바로가기 버튼
- homepage_inquiries INSERT

### 4.7 SEO 자동 생성

#### 설명
메타데이터, JSON-LD, 사이트맵, robots.txt를 Supabase 데이터 기반으로 자동 생성한다.

#### 기술 스펙

**metadata (layout.tsx)**
```typescript
export async function generateMetadata(): Promise<Metadata> {
  const config = await getHomepageConfig();
  return {
    title: {
      default: `${config.company.name} | 인테리어 전문`,
      template: `%s | ${config.company.name}`,
    },
    description: config.company.description,
    keywords: config.seo.keywords,
    openGraph: {
      title: config.company.name,
      description: config.company.description,
      images: config.portfolios[0]?.image_urls[0],
      type: 'website',
    },
  };
}
```

**JSON-LD (LocalBusiness)**
```typescript
// components/shared/JsonLd.tsx
export function LocalBusinessJsonLd({ config }: { config: HomepageConfig }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: config.company.name,
    description: config.company.description,
    telephone: config.company.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: config.company.address,
    },
    aggregateRating: config.reviews.length > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: avgRating(config.reviews),
      reviewCount: config.reviews.length,
    } : undefined,
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
```

**sitemap.ts**
```typescript
export default async function sitemap(): Promise<MetadataSitemapFile> {
  const config = await getHomepageConfig();
  const baseUrl = `https://${process.env.SUBDOMAIN}.waide.kr`;

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/portfolio`, lastModified: new Date(), priority: 0.8 },
    ...config.portfolios.map(p => ({
      url: `${baseUrl}/portfolio/${p.slug}`,
      lastModified: new Date(p.created_at),
      priority: 0.7,
    })),
    { url: `${baseUrl}/blog`, lastModified: new Date(), priority: 0.8 },
    ...config.blogPosts.map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.published_at),
      priority: 0.6,
    })),
    { url: `${baseUrl}/contact`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), priority: 0.5 },
  ];
}
```

### 4.8 상담 폼 및 API

#### 설명
홈페이지 방문자가 상담을 신청할 수 있는 폼과 API를 구현한다. 접수 시 Slack/이메일 알림을 발송한다.

#### 기술 스펙
- **입력 필드:** 이름, 연락처, 평수, 공간 유형, 예산 범위, 메시지
- **유효성 검사:** 이름 필수, 연락처 형식 검사
- **스팸 방지:** reCAPTCHA v3 또는 허니팟 필드
- **API:** POST /api/inquiry → homepage_inquiries INSERT
- **응답:** 접수 완료 메시지 + 예상 연락 시간 안내

#### 코드 예시
```typescript
// app/api/inquiry/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from('homepage_inquiries').insert({
    project_id: process.env.PROJECT_ID,
    client_id: process.env.CLIENT_ID,
    name: body.name,
    phone: body.phone,
    area_pyeong: body.areaPyeong,
    space_type: body.spaceType,
    budget_range: body.budgetRange,
    message: body.message,
    status: 'new',
  });

  if (error) {
    return NextResponse.json({ error: '접수에 실패했습니다.' }, { status: 500 });
  }

  // Slack 알림 발송 (비동기)
  sendSlackNotification({
    channel: '#homepage-inquiries',
    text: `새 상담 신청: ${body.name} (${body.phone}) - ${body.spaceType} ${body.areaPyeong}평`,
  }).catch(console.error);

  // homepage_projects.total_inquiries 증가
  await supabase.rpc('increment_inquiry_count', { p_project_id: process.env.PROJECT_ID });

  return NextResponse.json({ success: true, message: '상담 신청이 접수되었습니다.' });
}
```

### 4.9 반응형 디자인

#### 설명
모바일(< 640px), 태블릿(640~1024px), 데스크톱(> 1024px) 3개 브레이크포인트에 최적화된 반응형 디자인을 구현한다.

#### 기술 스펙
- **모바일:** 1열 레이아웃, 햄버거 메뉴, 터치 최적화 인터랙션
- **태블릿:** 2열 그리드, 축소된 히어로
- **데스크톱:** 3열 그리드, 풀 와이드 히어로, 플로팅 CTA
- **이미지:** next/image로 반응형 이미지 최적화 (srcSet, sizes)
- **타이포그래피:** clamp() 기반 유동적 폰트 크기

---

## 테스트 계획
- [ ] Supabase 데이터 fetch 정상 동작 (config.ts)
- [ ] 모든 섹션 컴포넌트 렌더링 확인 (12개)
- [ ] Before/After 슬라이더 — 마우스/터치 드래그 동작
- [ ] 포트폴리오 필터링 동작 확인
- [ ] 후기 캐러셀 스와이프 동작 확인
- [ ] FAQ 아코디언 토글 동작 확인
- [ ] 상담 폼 제출 → homepage_inquiries INSERT 확인
- [ ] SEO: 메타태그, JSON-LD, sitemap, robots 확인
- [ ] 반응형 디자인 (모바일/태블릿/데스크톱) 확인
- [ ] Lighthouse 점수: Performance > 90, SEO > 95, Accessibility > 90
- [ ] ISR 재검증 동작 확인 (데이터 변경 후 1시간 이내 반영)
- [ ] 블로그 페이지 — 목록/상세 정상 동작
- [ ] 포트폴리오 상세 페이지 정상 동작

## 완료 기준
- [ ] Next.js 템플릿 프로젝트 구조 완성
- [ ] 12개 홈 섹션 컴포넌트 구현 완료
- [ ] 블로그 목록/상세 페이지 구현 완료
- [ ] 포트폴리오 상세 페이지 구현 완료
- [ ] 상담 폼 + API 구현 완료
- [ ] SEO 자동 생성 (메타, JSON-LD, sitemap) 구현 완료
- [ ] 반응형 디자인 3개 브레이크포인트 대응 완료
- [ ] Lighthouse 점수 기준 달성
- [ ] 로컬 개발 환경에서 정상 빌드 및 실행 확인
