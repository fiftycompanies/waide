/**
 * brand-mapper.ts
 * ReferenceAnalysis + BrandInput → 페이지별 콘텐츠 매핑 + Gemini 프롬프트 생성
 *
 * 동작 방식:
 * 1. 레퍼런스 분석 결과(ReferenceAnalysis)의 페이지/섹션 구조를 기반으로
 * 2. 브랜드 정보(BrandInput)를 각 페이지에 매핑
 * 3. 페이지별 완성된 Gemini 프롬프트를 생성하여 HTML 생성 준비
 *
 * 기존 코드 변경 없음. 신규 파일.
 */

import type { ReferenceAnalysis, PageInfo, DesignSystem, SectionInfo } from "./reference-analyzer";

// ── 타입 정의 ────────────────────────────────────────────────────────────────

export interface BrandInput {
  name: string;
  industry: string;
  phone: string;
  address: string;
  services: string[];
  keywords: string[];
  tagline: string;
  usp: string;
  description: string;
  businessHours?: string;
  sns?: {
    instagram?: string;
    blog?: string;
    kakao?: string;
  };
}

export interface MappedSection {
  type: string;
  koreanTitle: string;
  order: number;
  content: Record<string, string>;
  layout: string;
  hasImage: boolean;
}

export interface MappedPage {
  name: string;
  slug: string;
  sections: MappedSection[];
  prompt: string;
}

// ── 업종별 섹션 한국어 매핑 ──────────────────────────────────────────────────

const SECTION_KOREAN_MAP: Record<string, string> = {
  hero: "히어로 배너",
  about: "소개",
  services: "서비스 안내",
  gallery: "갤러리",
  testimonials: "고객 후기",
  team: "팀 소개",
  pricing: "가격 안내",
  faq: "자주 묻는 질문",
  contact: "문의/예약",
  blog: "블로그",
  footer: "푸터",
  cta: "콜 투 액션",
  stats: "실적/통계",
  map: "오시는 길",
  section: "일반 섹션",
};

const INDUSTRY_SECTION_MAP: Record<string, Record<string, string>> = {
  피부과: {
    services: "시술 안내",
    gallery: "시술 전후 사진",
    team: "의료진 소개",
    pricing: "시술 가격표",
    testimonials: "시술 후기",
    contact: "상담 예약",
  },
  의원: {
    services: "진료 과목",
    gallery: "시설 안내",
    team: "의료진 소개",
    testimonials: "치료 후기",
    contact: "진료 예약",
  },
  치과: {
    services: "진료 안내",
    gallery: "치료 사례",
    team: "의료진 소개",
    pricing: "진료 비용",
    testimonials: "환자 후기",
    contact: "진료 예약",
  },
  숙박: {
    services: "객실 안내",
    gallery: "시설 사진",
    testimonials: "투숙 후기",
    pricing: "객실 요금",
    contact: "예약 문의",
    map: "오시는 길",
  },
  호텔: {
    services: "객실 및 스위트",
    gallery: "호텔 사진",
    testimonials: "투숙 후기",
    pricing: "객실 요금",
    contact: "예약",
  },
  카페: {
    services: "메뉴",
    gallery: "매장 사진",
    about: "카페 스토리",
    contact: "위치 안내",
  },
  음식점: {
    services: "메뉴 안내",
    gallery: "음식 사진",
    about: "셰프 소개",
    contact: "예약/위치",
  },
  인테리어: {
    services: "서비스 범위",
    gallery: "포트폴리오",
    testimonials: "고객 후기",
    about: "회사 소개",
    contact: "상담 신청",
  },
};

/**
 * 섹션 타입을 업종에 맞는 한국어로 변환
 */
export function mapSectionToKorean(sectionType: string, industry: string): string {
  // 업종별 매핑 우선
  const industryMap = INDUSTRY_SECTION_MAP[industry];
  if (industryMap && industryMap[sectionType]) {
    return industryMap[sectionType];
  }

  // 업종 부분 매칭
  for (const [key, map] of Object.entries(INDUSTRY_SECTION_MAP)) {
    if (industry.includes(key) || key.includes(industry)) {
      if (map[sectionType]) return map[sectionType];
    }
  }

  // 기본 한국어 매핑
  return SECTION_KOREAN_MAP[sectionType] || sectionType;
}

// ── 메인 함수 ────────────────────────────────────────────────────────────────

/**
 * ReferenceAnalysis + BrandInput → 페이지별 매핑 + Gemini 프롬프트 생성
 *
 * @param analysis 레퍼런스 분석 결과
 * @param brand 브랜드 정보
 * @returns MappedPage[] (각 페이지에 완성된 프롬프트 포함)
 */
export function mapBrandToPages(
  analysis: ReferenceAnalysis,
  brand: BrandInput,
): MappedPage[] {
  console.log(`[BrandMapper] ${analysis.pages.length}개 페이지에 브랜드 매핑 시작`);

  const mappedPages: MappedPage[] = analysis.pages.map((page) => {
    const mappedSections = mapSectionsForPage(page, brand, analysis.businessType);
    const prompt = buildPagePrompt(page, mappedSections, brand, analysis.designSystem);

    return {
      name: page.name,
      slug: page.slug,
      sections: mappedSections,
      prompt,
    };
  });

  console.log(`[BrandMapper] 매핑 완료: ${mappedPages.map((p) => p.name).join(", ")}`);
  return mappedPages;
}

// ── 섹션 매핑 ────────────────────────────────────────────────────────────────

function mapSectionsForPage(
  page: PageInfo,
  brand: BrandInput,
  businessType: string,
): MappedSection[] {
  return page.sections.map((section) => {
    const koreanTitle = mapSectionToKorean(section.type, brand.industry || businessType);
    const content = buildSectionContent(section, brand);

    return {
      type: section.type,
      koreanTitle,
      order: section.order,
      content,
      layout: section.layout,
      hasImage: section.hasImage,
    };
  });
}

function buildSectionContent(
  section: SectionInfo,
  brand: BrandInput,
): Record<string, string> {
  const content: Record<string, string> = {};

  switch (section.type) {
    case "hero":
      content.brandName = brand.name;
      content.tagline = brand.tagline || `${brand.name} - ${brand.industry} 전문`;
      content.ctaText = "상담 예약하기";
      content.subtitle = brand.usp || brand.description || "";
      break;

    case "about":
      content.title = `${brand.name} 소개`;
      content.description = brand.description || brand.usp || `${brand.name}은 ${brand.industry} 분야의 전문 서비스를 제공합니다.`;
      content.usp = brand.usp || "";
      break;

    case "services":
      brand.services.forEach((svc, i) => {
        content[`service_${i + 1}`] = svc;
      });
      content.title = "서비스 안내";
      break;

    case "gallery":
      content.title = "갤러리";
      break;

    case "testimonials":
      content.title = "고객 후기";
      break;

    case "team":
      content.title = "팀 소개";
      break;

    case "pricing":
      content.title = "가격 안내";
      brand.services.forEach((svc, i) => {
        content[`item_${i + 1}`] = svc;
      });
      break;

    case "faq":
      content.title = "자주 묻는 질문";
      break;

    case "contact":
      content.phone = brand.phone;
      content.address = brand.address;
      content.hours = brand.businessHours || "Mon – Sat  10:00 – 19:00";
      content.ctaText = "상담 예약하기";
      break;

    case "footer":
      content.brandName = brand.name;
      content.phone = brand.phone;
      content.address = brand.address;
      content.copyright = `© 2026 ${brand.name}. All rights reserved.`;
      break;

    case "cta":
      content.title = brand.tagline || `${brand.name}에 문의하세요`;
      content.ctaText = "상담 예약하기";
      content.phone = brand.phone;
      break;

    case "stats":
      content.title = "실적";
      break;

    case "blog":
      content.title = "블로그";
      break;

    case "map":
      content.address = brand.address;
      content.title = "오시는 길";
      break;

    default:
      content.title = section.contentDescription || section.type;
      break;
  }

  return content;
}

// ── Gemini 프롬프트 생성 ─────────────────────────────────────────────────────

function buildPagePrompt(
  page: PageInfo,
  sections: MappedSection[],
  brand: BrandInput,
  designSystem: DesignSystem,
): string {
  const sectionDescriptions = sections.map((s) => {
    const contentEntries = Object.entries(s.content)
      .map(([key, val]) => `    - ${key}: "${val}"`)
      .join("\n");

    return `  ${s.order}. [${s.koreanTitle}] (type: ${s.type}, layout: ${s.layout})
${contentEntries}`;
  }).join("\n\n");

  const servicesStr = brand.services.length > 0
    ? brand.services.join(", ")
    : "서비스 정보 없음";

  const snsStr = brand.sns
    ? Object.entries(brand.sns)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ") || "없음"
    : "없음";

  return `당신은 전문 웹 디자이너입니다. 아래 브랜드 정보와 페이지 구조를 기반으로
"${page.name}" 페이지의 완성된 HTML을 생성하세요.

## 브랜드 정보
- 브랜드명: ${brand.name}
- 업종: ${brand.industry}
- 전화번호: ${brand.phone}
- 주소: ${brand.address}
- 서비스: ${servicesStr}
- 키워드: ${brand.keywords.join(", ") || "없음"}
- 태그라인: ${brand.tagline || "없음"}
- USP: ${brand.usp || "없음"}
- 설명: ${brand.description || "없음"}
- 영업시간: ${brand.businessHours || "Mon – Sat 10:00 – 19:00"}
- SNS: ${snsStr}

## 디자인 시스템
- 메인 색상: ${designSystem.primaryColor}
- 강조색: ${designSystem.accentColor}
- 배경색: ${designSystem.backgroundColor}
- 텍스트색: ${designSystem.textColor}
- 제목 폰트: ${designSystem.headingFont}
- 본문 폰트: ${designSystem.bodyFont}
- 스타일: ${designSystem.style}

## 페이지 구조: "${page.name}" (${page.purpose})

${sectionDescriptions}

## 생성 규칙
1. 완전한 <!DOCTYPE html> 문서를 생성하세요.
2. Tailwind CSS CDN (<script src="https://cdn.tailwindcss.com"></script>)을 사용하세요.
3. Google Fonts에서 ${designSystem.headingFont}와 ${designSystem.bodyFont}를 로드하세요.
4. tailwind.config에 brand 색상 (primary: '${designSystem.primaryColor}', accent: '${designSystem.accentColor}')을 등록하세요.
5. 모든 텍스트는 한국어로 작성하세요.
6. 이미지는 <img src="https://images.unsplash.com/photo-placeholder" data-img-slot="hero|about|service|gallery" alt="설명" class="..."> 형태로 작성하세요.
7. 반응형 디자인 (sm:, md:, lg: Tailwind 클래스) 적용하세요.
8. 네비게이션에 ${brand.name} 로고 텍스트와 메뉴 항목을 포함하세요.
9. 푸터에 저작권, 전화번호, 주소를 포함하세요.
10. SEO 메타 태그 (title, description, og:title, og:description) 포함하세요.

HTML 코드만 출력하세요. 설명이나 마크다운 코드 블록 없이 순수 HTML만 출력하세요.`;
}
