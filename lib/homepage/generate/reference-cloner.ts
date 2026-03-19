/**
 * reference-cloner.ts
 * ReferenceStructure + 브랜드 데이터를 받아 완전한 HTML 페이지를 생성한다.
 *
 * - Claude Sonnet 1회 호출로 전체 HTML 생성
 * - 레퍼런스 구조(Vision 분석)의 섹션 순서·레이아웃·색상 스키마를 그대로 복제
 * - 텍스트·연락처는 브랜드 정보로 교체
 * - 외부 이미지 핫링크 금지 — CSS 그라데이션/패턴만 사용
 */

import type { ReferenceStructure } from "./vision-analyzer";

// ── 입력 타입 ─────────────────────────────────────────────────────────────────

export interface BrandContent {
  brandName: string;
  industry: string;
  phone: string | null;
  address: string | null;
  websiteUrl: string | null;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutDescription: string;
  services: Array<{ title: string; description: string }>;
  whyChooseUs: Array<{ title: string; description: string }>;
  ctaText: string;
  seoTitle: string;
  seoDescription: string;
  testimonials?: Array<{ text: string; author: string }>;
  faqItems?: Array<{ question: string; answer: string }>;
  stats?: Array<{ number: string; label: string }>;
}

// ── 메인 생성 함수 ──────────────────────────────────────────────────────────

export async function generateReferenceCloneHtml(
  structure: ReferenceStructure,
  brandContent: BrandContent,
  apiKey: string
): Promise<string> {
  const prompt = buildClonerPrompt(structure, brandContent);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 12000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`Cloner API HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await resp.json();
  const responseText: string = data.content?.[0]?.text || "";

  if (!responseText) {
    throw new Error("HTML 생성 실패: 응답 비어있음");
  }

  // HTML 추출 (```html ... ``` 또는 <!DOCTYPE 로 시작하는 블록)
  let html = responseText;
  const htmlBlockMatch = responseText.match(/```html\s*([\s\S]*?)```/);
  if (htmlBlockMatch) {
    html = htmlBlockMatch[1].trim();
  } else {
    const doctypeMatch = responseText.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
    if (doctypeMatch) {
      html = doctypeMatch[1];
    }
  }

  if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
    throw new Error("HTML 생성 실패: 유효한 HTML을 찾을 수 없음");
  }

  return html;
}

// ── 프롬프트 빌더 ──────────────────────────────────────────────────────────

function buildClonerPrompt(
  structure: ReferenceStructure,
  brand: BrandContent
): string {
  const gs = structure.globalStyle;
  const hero = structure.heroStyle;
  const nav = structure.navStyle;

  // 섹션별 레이아웃 지시사항 생성
  const sectionSpecs = structure.sections
    .map((s) => {
      const content = getSectionContent(s.type, brand);
      return `  ${s.order + 1}. [${s.type}] layout="${s.layout}" colorScheme="${s.colorScheme}"
     콘텐츠: ${content}`;
    })
    .join("\n");

  return `당신은 프로페셔널 웹 디자이너입니다.
아래 디자인 스펙에 따라 "${brand.brandName}" 업체의 완전한 HTML 홈페이지를 생성하세요.

== 디자인 시스템 ==
- 디자인 톤: ${gs.designTone}
- 주색: ${gs.primaryColor}
- 보조색: ${gs.secondaryColor}
- 강조색: ${gs.accentColor || gs.primaryColor}
- 배경색: ${gs.backgroundColor}
- 텍스트색: ${gs.textColor}
- 제목 폰트: ${gs.headingFont || "'Noto Sans KR', sans-serif"}
- 본문 폰트: ${gs.bodyFont || "'Noto Sans KR', sans-serif"}
- border-radius: ${gs.borderRadius}
- 여백감: ${gs.spacing}

== 네비게이션 ==
- position: ${nav.position}
- background: ${nav.background}
- alignment: ${nav.alignment}
- 브랜드명: ${brand.brandName}

== 히어로 ==
- 배경 이미지: ${hero.hasBackgroundImage ? "CSS 그라데이션으로 대체 (외부 이미지 금지)" : "없음 — CSS 그라데이션"}
- 오버레이: ${hero.hasOverlay ? "있음" : "없음"}
- 텍스트 정렬: ${hero.textAlignment}
- CTA 스타일: ${hero.ctaStyle}

== 섹션 순서 + 레이아웃 (이 순서대로 정확히 생성) ==
${sectionSpecs}

== 브랜드 정보 ==
- 업체명: ${brand.brandName}
- 업종: ${brand.industry}
- 연락처: ${brand.phone || "없음"}
- 주소: ${brand.address || "없음"}
- SEO 타이틀: ${brand.seoTitle}
- SEO 설명: ${brand.seoDescription}

== 필수 규칙 ==
1. 완전한 HTML 문서를 생성하세요 (<!DOCTYPE html> ~ </html>).
2. 모든 CSS는 <style> 태그 안에 인라인으로 작성하세요 (외부 CSS 파일 금지).
3. Google Fonts CDN만 <link>로 허용합니다 (Noto Sans KR 필수 포함).
4. 외부 이미지 URL 절대 사용 금지. 배경은 CSS 그라데이션/패턴만 사용하세요.
5. 반응형 디자인: 모바일(~768px)에서도 정상 동작해야 합니다.
6. 한국어 콘텐츠입니다. lang="ko"를 설정하세요.
7. 모든 텍스트는 위 [브랜드 정보]와 [섹션별 콘텐츠]에서만 가져오세요.
8. 네비게이션의 모바일 햄버거 메뉴를 포함하세요 (순수 JS, 라이브러리 없이).
9. scroll-behavior: smooth를 적용하세요.
10. 각 섹션에 적절한 id 속성을 부여하세요 (#home, #about, #services 등).
11. CTA 버튼의 href는 ${brand.phone ? `tel:${brand.phone}` : "#contact"}로 설정하세요.
12. footer에 Copyright ${new Date().getFullYear()} ${brand.brandName}을 포함하세요.

HTML만 출력하세요. 설명이나 주석은 포함하지 마세요.`;
}

// ── 섹션별 콘텐츠 매핑 ─────────────────────────────────────────────────────

function getSectionContent(type: string, brand: BrandContent): string {
  switch (type) {
    case "hero":
      return `제목="${brand.heroTitle}", 부제="${brand.heroSubtitle}", CTA="${brand.ctaText}"`;

    case "about":
      return `제목="${brand.aboutTitle}", 내용="${brand.aboutDescription}"`;

    case "services": {
      const svcList = brand.services
        .map((s) => `${s.title}: ${s.description}`)
        .join(" | ");
      return `서비스 목록: ${svcList}`;
    }

    case "testimonials": {
      if (!brand.testimonials?.length) return "후기 3개 (AI가 업종에 맞게 생성)";
      const revList = brand.testimonials
        .map((t) => `"${t.text}" — ${t.author}`)
        .join(" | ");
      return `고객 후기: ${revList}`;
    }

    case "faq": {
      if (!brand.faqItems?.length) return "FAQ 3개 (AI가 업종에 맞게 생성)";
      const faqList = brand.faqItems
        .map((f) => `Q: ${f.question} A: ${f.answer}`)
        .join(" | ");
      return `FAQ: ${faqList}`;
    }

    case "stats": {
      if (!brand.stats?.length) return "숫자 통계 3-4개 (AI가 업종에 맞게 생성)";
      const statList = brand.stats.map((s) => `${s.number} ${s.label}`).join(" | ");
      return `통계: ${statList}`;
    }

    case "cta":
      return `CTA 문구="${brand.ctaText}", 전화=${brand.phone || "없음"}`;

    case "contact":
      return `전화=${brand.phone || "없음"}, 주소=${brand.address || "없음"}`;

    case "map":
      return `주소=${brand.address || "없음"} (네이버지도 링크 포함)`;

    case "portfolio":
      return "포트폴리오 섹션 (이미지 없이 CSS 플레이스홀더 카드로 구성)";

    case "footer":
      return `업체명=${brand.brandName}, 연락처=${brand.phone || ""}, 주소=${brand.address || ""}`;

    default:
      return "";
  }
}
