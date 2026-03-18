# Phase 4 Contract: 홈페이지 템플릿 A - 모던 미니멀

## 계약 개요
- **Phase**: 4
- **제목**: 홈페이지 템플릿 A - 모던 미니멀 (Modern Minimal)
- **예상 기간**: 5일
- **선행 조건**: Phase 1 (DB 스키마), Phase 2 (어드민 UI — 포트폴리오/후기 데이터), Phase 3 (키워드 생성)
- **담당**: Claude Code

---

## 산출물 (Deliverables)

### D-4.1: Next.js 템플릿 프로젝트 구조
- **설명**: Next.js 16 + Tailwind CSS 4 + Framer Motion 기반의 인테리어 업체 홈페이지 템플릿 프로젝트. App Router, SSG(ISR), Supabase 데이터 연동을 포함한다.
- **파일**:
  - `templates/modern-minimal/package.json`
  - `templates/modern-minimal/next.config.ts`
  - `templates/modern-minimal/tailwind.config.ts`
  - `templates/modern-minimal/tsconfig.json`
  - `templates/modern-minimal/app/globals.css`
- **검증 방법**: `npm install && npm run build` 성공, `npm run dev` 로컬 실행 확인

### D-4.2: Supabase 데이터 연동 (config.ts)
- **설명**: 빌드 타임에 Supabase에서 프로젝트 데이터(프로젝트 설정, 자료, 포트폴리오, 후기, 블로그, 키워드)를 fetch하여 통합 config 객체를 생성하는 데이터 레이어. unstable_cache로 1시간 ISR 캐싱을 적용한다.
- **파일**:
  - `templates/modern-minimal/lib/supabase.ts`
  - `templates/modern-minimal/data/config.ts`
- **검증 방법**: 환경변수 설정 후 config 객체 반환 확인, 데이터 구조가 모든 컴포넌트에서 사용 가능

### D-4.3: 메인 페이지 홈 섹션 컴포넌트 (10개)
- **설명**: 메인 홈페이지를 구성하는 10개 섹션 컴포넌트. 각 컴포넌트는 Supabase 데이터를 props로 받아 렌더링한다.
- **파일**:
  - `templates/modern-minimal/components/home/Hero.tsx` (히어로 — 이미지 슬라이더 + 태그라인 + CTA)
  - `templates/modern-minimal/components/home/Stats.tsx` (실적 통계 — 카운트업 애니메이션)
  - `templates/modern-minimal/components/home/Portfolio.tsx` (포트폴리오 그리드 — 필터링)
  - `templates/modern-minimal/components/home/BeforeAfter.tsx` (Before/After 드래그 슬라이더)
  - `templates/modern-minimal/components/home/Services.tsx` (서비스 소개 카드)
  - `templates/modern-minimal/components/home/Process.tsx` (시공 프로세스 타임라인)
  - `templates/modern-minimal/components/home/Reviews.tsx` (고객 후기 캐러셀)
  - `templates/modern-minimal/components/home/Blog.tsx` (최신 블로그 3개)
  - `templates/modern-minimal/components/home/FAQ.tsx` (아코디언 + FAQPage JSON-LD)
  - `templates/modern-minimal/components/home/ContactCTA.tsx` (상담 폼)
- **검증 방법**: 각 컴포넌트 독립 렌더링 확인, Supabase 데이터 바인딩 확인

### D-4.4: 레이아웃 컴포넌트 (3개)
- **설명**: 네비게이션 바, 푸터, 플로팅 CTA 버튼 등 전체 레이아웃 구성 컴포넌트.
- **파일**:
  - `templates/modern-minimal/components/layout/Nav.tsx` (네비게이션 — 로고 + 메뉴 + 햄버거)
  - `templates/modern-minimal/components/layout/Footer.tsx` (푸터 — 업체 정보 + SNS 링크)
  - `templates/modern-minimal/components/layout/FloatingCTA.tsx` (플로팅 상담 버튼 — 카카오 + 전화)
- **검증 방법**: 네비게이션 메뉴 동작, 모바일 햄버거 메뉴 동작, 푸터 정보 표시, 플로팅 CTA 링크 동작

### D-4.5: 공유 컴포넌트 (2개)
- **설명**: 구조화 데이터(JSON-LD)와 브레드크럼 컴포넌트.
- **파일**:
  - `templates/modern-minimal/components/shared/JsonLd.tsx` (LocalBusiness + FAQPage JSON-LD)
  - `templates/modern-minimal/components/shared/Breadcrumb.tsx` (BreadcrumbList JSON-LD)
- **검증 방법**: HTML 소스에서 JSON-LD script 태그 확인, Google Rich Results Test 통과

### D-4.6: SEO 자동 생성
- **설명**: Supabase 데이터 기반으로 메타데이터, JSON-LD, 사이트맵, robots.txt를 자동 생성하는 로직.
- **파일**:
  - `templates/modern-minimal/app/layout.tsx` (generateMetadata — title, description, keywords, OpenGraph)
  - `templates/modern-minimal/app/sitemap.ts` (동적 사이트맵 — 메인, 포트폴리오, 블로그, FAQ)
  - `templates/modern-minimal/app/robots.ts` (robots.txt)
- **검증 방법**: `<head>` 태그에 메타데이터 존재, /sitemap.xml 접근 시 올바른 URL 목록, /robots.txt 접근 가능

### D-4.7: 포트폴리오 상세 페이지
- **설명**: 개별 포트폴리오(시공사례) 상세를 보여주는 동적 라우트 페이지. 이미지 갤러리, 시공 정보, Before/After 비교를 포함한다.
- **파일**: `templates/modern-minimal/app/portfolio/[slug]/page.tsx`
- **검증 방법**: /portfolio/[slug] 경로 접근 가능, 이미지 갤러리 동작, 시공 정보 표시

### D-4.8: 블로그 페이지 (목록 + 상세)
- **설명**: contents 테이블(content_type: hp_blog_info, hp_blog_review)과 연동하는 블로그 목록 및 상세 페이지. Markdown → HTML 변환을 포함한다.
- **파일**:
  - `templates/modern-minimal/app/blog/page.tsx` (블로그 목록 — 카드 그리드)
  - `templates/modern-minimal/app/blog/[slug]/page.tsx` (블로그 상세 — Markdown 렌더링)
- **검증 방법**: /blog 경로에서 글 목록 표시, /blog/[slug] 경로에서 본문 렌더링 확인

### D-4.9: 상담 신청 페이지 및 API
- **설명**: 상담 폼 전용 페이지와 homepage_inquiries INSERT API. 이름, 연락처, 평수, 공간유형, 예산, 메시지 입력 필드와 스팸 방지(허니팟)를 포함한다.
- **파일**:
  - `templates/modern-minimal/app/contact/page.tsx`
  - `templates/modern-minimal/app/api/inquiry/route.ts`
- **검증 방법**: 폼 제출 → homepage_inquiries INSERT 확인, 유효성 검사 동작, 성공/실패 응답 표시

### D-4.10: FAQ 페이지
- **설명**: homepage_materials.faq_items 데이터를 기반으로 자주 묻는 질문을 아코디언 형태로 보여주는 전용 페이지. FAQPage JSON-LD를 포함한다.
- **파일**: `templates/modern-minimal/app/faq/page.tsx`
- **검증 방법**: FAQ 아코디언 토글 동작, FAQPage JSON-LD 출력 확인

### D-4.11: 반응형 디자인
- **설명**: 모바일(< 640px), 태블릿(640~1024px), 데스크톱(> 1024px) 3개 브레이크포인트에 최적화된 반응형 디자인. clamp() 기반 유동적 폰트, next/image 반응형 이미지 최적화를 포함한다.
- **파일**: 모든 컴포넌트 (Tailwind CSS 반응형 클래스 적용)
- **검증 방법**: Chrome DevTools Device Mode에서 각 브레이크포인트 레이아웃 확인

---

## 인수 기준 (Acceptance Criteria)

### AC-4.1: 섹션 렌더링
- [ ] 10개 홈 섹션이 메인 페이지에서 올바른 순서로 렌더링됨
- [ ] 각 섹션이 Supabase 데이터를 정확하게 표시함
- [ ] 데이터 없는 섹션은 graceful하게 처리됨 (빈 상태 또는 비표시)

### AC-4.2: 인터랙션 컴포넌트
- [ ] Hero 이미지 슬라이더 자동 전환 (5초 간격) 동작
- [ ] Before/After 슬라이더 — 마우스/터치 드래그 동작
- [ ] 포트폴리오 그리드 — 공간유형별 필터 동작
- [ ] 후기 캐러셀 — 좌우 스와이프 동작
- [ ] FAQ 아코디언 — 클릭 토글 동작
- [ ] Stats 카운트업 애니메이션 — 뷰포트 진입 시 동작

### AC-4.3: SEO
- [ ] `<title>` 태그: "{업체명} | 인테리어 전문" 형식
- [ ] `<meta description>` 태그: 업체 소개 텍스트
- [ ] `<meta keywords>` 태그: homepage_seo 키워드 포함
- [ ] OpenGraph 태그 (title, description, image, type) 설정됨
- [ ] LocalBusiness JSON-LD 출력 — name, description, telephone, address 포함
- [ ] FAQPage JSON-LD 출력 — faq_items 기반
- [ ] /sitemap.xml — 메인, 포트폴리오, 블로그, FAQ URL 포함
- [ ] /robots.txt — Sitemap 경로 포함

### AC-4.4: 블로그
- [ ] /blog 페이지에서 hp_blog_info, hp_blog_review 글 목록 표시
- [ ] /blog/[slug] 페이지에서 Markdown 본문 HTML 렌더링
- [ ] 블로그 글별 메타데이터(title, description) 자동 생성
- [ ] 블로그 글별 Article JSON-LD 출력

### AC-4.5: 상담 폼
- [ ] 상담 폼 제출 시 homepage_inquiries 테이블에 INSERT 성공
- [ ] 이름, 연락처 필수 필드 유효성 검사 동작
- [ ] 스팸 방지(허니팟 필드) 적용
- [ ] 접수 성공 메시지 표시
- [ ] 접수 실패 시 에러 메시지 표시

### AC-4.6: 반응형
- [ ] 모바일: 1열 레이아웃, 햄버거 메뉴, 터치 최적화
- [ ] 태블릿: 2열 그리드, 축소된 히어로
- [ ] 데스크톱: 3열 그리드, 풀 와이드 히어로, 플로팅 CTA

### AC-4.7: 성능
- [ ] Lighthouse Performance score > 90
- [ ] Lighthouse SEO score > 95
- [ ] Lighthouse Accessibility score > 90
- [ ] Lighthouse Best Practices score > 90

---

## 테스트 요구사항 (Test Requirements)

### T-4.1: 빌드 테스트
- **유형**: 통합
- **설명**: Supabase 환경변수를 설정한 상태에서 `npm run build`가 에러 없이 완료되는지 확인한다.
- **예상 결과**: 빌드 성공, 정적 페이지 생성 완료.

### T-4.2: 섹션 렌더링 테스트
- **유형**: E2E
- **설명**: 메인 페이지를 로드하고 10개 섹션이 모두 렌더링되는지 확인한다.
- **예상 결과**: 각 섹션의 고유 데이터-testid 또는 heading이 DOM에 존재.

### T-4.3: Before/After 슬라이더 테스트
- **유형**: E2E
- **설명**: Before/After 슬라이더에서 마우스 드래그로 분할선을 이동하고, 키보드 화살표 키로 조작하는 테스트.
- **예상 결과**: 분할선 위치가 드래그/키보드에 따라 변경됨.

### T-4.4: 포트폴리오 필터 테스트
- **유형**: E2E
- **설명**: 포트폴리오 섹션에서 공간유형 필터를 클릭하고 해당 유형의 포트폴리오만 표시되는지 확인한다.
- **예상 결과**: 선택한 유형의 포트폴리오만 그리드에 표시.

### T-4.5: 상담 폼 제출 테스트
- **유형**: 통합
- **설명**: POST /api/inquiry에 유효한 데이터를 전송하고 homepage_inquiries에 INSERT되는지 확인한다.
- **예상 결과**: 201 또는 200 응답, DB에 레코드 생성됨.

### T-4.6: SEO 검증 테스트
- **유형**: 단위
- **설명**: generateMetadata() 함수의 반환값에 title, description, keywords, openGraph 필드가 올바르게 포함되는지 확인한다.
- **예상 결과**: 메타데이터 객체가 Next.js Metadata 스키마와 일치.

### T-4.7: JSON-LD 검증 테스트
- **유형**: 단위
- **설명**: LocalBusinessJsonLd 컴포넌트가 올바른 JSON-LD를 생성하는지 확인한다 (Schema.org 스펙 준수).
- **예상 결과**: @context, @type, name, telephone, address 필드 존재.

### T-4.8: 사이트맵 테스트
- **유형**: 통합
- **설명**: /sitemap.xml 요청 시 올바른 XML 형식의 사이트맵이 반환되는지 확인한다.
- **예상 결과**: 메인, 포트폴리오 상세, 블로그 상세, contact, faq URL 포함.

### T-4.9: 반응형 디자인 테스트
- **유형**: E2E
- **설명**: 320px, 768px, 1280px 뷰포트에서 메인 페이지 레이아웃을 스크린샷 비교한다.
- **예상 결과**: 각 브레이크포인트에서 레이아웃 깨짐 없음.

### T-4.10: Lighthouse 성능 테스트
- **유형**: E2E
- **설명**: 빌드된 페이지에 대해 Lighthouse를 실행하고 점수를 확인한다.
- **예상 결과**: Performance > 90, SEO > 95, Accessibility > 90, Best Practices > 90.

### T-4.11: 블로그 페이지 테스트
- **유형**: E2E
- **설명**: /blog 페이지에서 블로그 글 목록이 표시되고, 클릭 시 /blog/[slug] 상세 페이지로 이동하며 Markdown 본문이 렌더링되는지 확인한다.
- **예상 결과**: 목록/상세 페이지 정상 렌더링, Markdown → HTML 변환 정확.

---

## 의존성 (Dependencies)
- Phase 1: 5개 신규 테이블 데이터 접근 (homepage_projects, homepage_materials, homepage_portfolios, homepage_reviews, homepage_inquiries)
- Phase 2: 어드민에서 포트폴리오, 후기, 자료 데이터 입력 완료
- Phase 3: keywords 테이블에 homepage_seo 키워드 존재
- 기존 waide-mkt contents 테이블 (hp_blog_info, hp_blog_review 타입 데이터)

## 위험 요소 (Risks)
- **Supabase 데이터 없는 상태에서 빌드**: 초기에 데이터가 없으면 빌드 실패 가능. 대응: 각 데이터 fetch에 fallback 값 제공, 빈 배열/null 안전 처리.
- **ISR 캐시 무효화 지연**: 데이터 변경 후 최대 1시간까지 이전 데이터가 표시될 수 있음. 대응: revalidate 값 조정 가능, 수동 재배포 트리거 제공 (Phase 5에서 해결).
- **이미지 최적화 성능**: 대량의 포트폴리오 이미지가 있을 때 next/image 최적화 부하. 대응: 이미지 크기 제한(max 2MB), 적절한 sizes/srcSet 설정.
- **Framer Motion 번들 크기**: 애니메이션 라이브러리 추가로 번들 크기 증가. 대응: tree-shaking 활성화, 필요한 모듈만 import.

## 완료 선언 조건
- [ ] 모든 산출물 생성 완료
- [ ] 모든 인수 기준 충족
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 커밋 & 푸시 완료

---

## 부록: 상세 기획서

> 아래 내용은 `/docs/phases/phase-4-detail.md`에서 통합되었습니다.

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
