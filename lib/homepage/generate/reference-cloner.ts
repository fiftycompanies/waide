/**
 * reference-cloner.ts
 * ReferenceStructure + 브랜드 데이터를 받아 완전한 HTML 페이지를 생성한다.
 *
 * - Claude Sonnet 1회 호출로 전체 HTML 생성
 * - 레퍼런스 HTML의 CSS 패턴(레이아웃, 여백, 색상, 폰트)을 복제
 * - 텍스트·연락처는 브랜드 정보로 교체
 * - Unsplash CDN 이미지 사용 (이모지/그라데이션 대체 금지)
 */

import type { ReferenceStructure } from "./vision-analyzer";
import { getUnsplashImages, type UnsplashImageSet } from "./unsplash-images";

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

export interface ClonerOptions {
  referenceHtml?: string | null;
  industry?: string;
}

// ── HTML 정제 (style 태그 보존, script/svg/주석 제거) ────────────────────────

function cleanHtmlForCloner(html: string, maxChars = 8000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxChars);
}

// ── 메인 생성 함수 ──────────────────────────────────────────────────────────

export async function generateReferenceCloneHtml(
  structure: ReferenceStructure,
  brandContent: BrandContent,
  apiKey: string,
  options?: ClonerOptions
): Promise<string> {
  const prompt = buildClonerPrompt(structure, brandContent, options);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
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
  brand: BrandContent,
  options?: ClonerOptions
): string {
  const gs = structure.globalStyle;
  const hero = structure.heroStyle;
  const nav = structure.navStyle;

  // 업종별 Unsplash 이미지 세트
  const images = getUnsplashImages(options?.industry || brand.industry);

  // 섹션별 레이아웃 지시사항 생성
  const sectionSpecs = structure.sections
    .map((s) => {
      const content = getSectionContent(s.type, brand, images);
      return `  ${s.order + 1}. [${s.type}] layout="${s.layout}" colorScheme="${s.colorScheme}"
     콘텐츠: ${content}`;
    })
    .join("\n");

  // 레퍼런스 HTML 블록 (있으면 포함)
  const referenceBlock = options?.referenceHtml
    ? `
== 레퍼런스 HTML (CSS 패턴 복제 대상) ==
아래는 레퍼런스 홈페이지의 실제 HTML+CSS입니다.
이 HTML에서 다음을 복제하세요:
- CSS 레이아웃 구조 (flexbox/grid 패턴, 컬럼 수, 간격)
- 여백과 패딩 비율
- border-radius, box-shadow 스타일
- font-size 비율 (h1~h6, body)
- 색상 배합과 배경 패턴
- 섹션 간 구분선/간격 패턴

복제하지 마세요: 텍스트 내용, 이미지 URL, 외부 스크립트, 외부 CSS 파일

<reference>
${cleanHtmlForCloner(options.referenceHtml)}
</reference>
`
    : "";

  // Unsplash 이미지 목록
  const imageBlock = `
== Unsplash 이미지 (반드시 사용) ==
아래 이미지 URL을 HTML에서 반드시 사용하세요.
이모지(🏥💉 등)나 CSS 그라데이션으로 이미지를 대체하지 마세요.

히어로 배경:
${images.hero.map((url, i) => `  ${i + 1}. ${url}`).join("\n")}

서비스/섹션 이미지:
${images.section.map((url, i) => `  ${i + 1}. ${url}`).join("\n")}

소개 섹션 이미지:
${images.about.map((url, i) => `  ${i + 1}. ${url}`).join("\n")}

포트폴리오/갤러리 이미지:
${images.gallery.map((url, i) => `  ${i + 1}. ${url}`).join("\n")}`;

  return `당신은 프로페셔널 웹 디자이너입니다.
${referenceBlock ? "아래 레퍼런스 HTML의 CSS 패턴을 복제하여" : "아래 디자인 스펙에 따라"} "${brand.brandName}" 업체의 완전한 HTML 홈페이지를 생성하세요.
${referenceBlock}
== 디자인 시스템${referenceBlock ? " (레퍼런스 없을 때 폴백)" : ""} ==
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
- 배경 이미지: 위 Unsplash 히어로 이미지를 background-image로 사용
- 오버레이: ${hero.hasOverlay ? "있음 (rgba 오버레이 적용)" : "없음"}
- 텍스트 정렬: ${hero.textAlignment}
- CTA 스타일: ${hero.ctaStyle}

== 섹션 순서 + 레이아웃 (이 순서대로 정확히 생성) ==
${sectionSpecs}
${imageBlock}

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
4. 위 Unsplash CDN 이미지를 반드시 사용하세요. 이모지나 CSS 그라데이션으로 이미지를 대체하지 마세요.
   히어로에 배경 이미지, 서비스 카드에 이미지, 소개 섹션에 이미지를 필수로 넣으세요.
5. 반응형 디자인: 모바일(~768px)에서도 정상 동작해야 합니다.
6. 한국어 콘텐츠입니다. lang="ko"를 설정하세요.
7. 모든 텍스트는 위 [브랜드 정보]와 [섹션별 콘텐츠]에서만 가져오세요.
8. 네비게이션의 모바일 햄버거 메뉴를 포함하세요 (순수 JS, 라이브러리 없이).
9. scroll-behavior: smooth를 적용하세요.
10. 각 섹션에 적절한 id 속성을 부여하세요 (#home, #about, #services 등).
11. CTA 버튼의 href는 ${brand.phone ? `tel:${brand.phone}` : "#contact"}로 설정하세요.
12. footer에 Copyright ${new Date().getFullYear()} ${brand.brandName}을 포함하세요.
13. 배경색은 화이트(#ffffff) 또는 매우 밝은 색 기반으로 하세요. 파란-핑크 그라데이션이나 글래스모피즘 효과를 사용하지 마세요.
14. 전문적이고 세련된 디자인으로 작성하세요. 제네릭 SaaS 템플릿 스타일은 피하세요.

HTML만 출력하세요. 설명이나 주석은 포함하지 마세요.`;
}

// ── 섹션별 콘텐츠 매핑 ─────────────────────────────────────────────────────

function getSectionContent(type: string, brand: BrandContent, images: UnsplashImageSet): string {
  switch (type) {
    case "hero":
      return `제목="${brand.heroTitle}", 부제="${brand.heroSubtitle}", CTA="${brand.ctaText}", 배경이미지="${images.hero[0]}"`;

    case "about":
      return `제목="${brand.aboutTitle}", 내용="${brand.aboutDescription}", 이미지="${images.about[0]}"`;

    case "services": {
      const svcList = brand.services
        .map((s, i) => `${s.title}: ${s.description} [이미지: ${images.section[i % images.section.length]}]`)
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

    case "portfolio": {
      const galleryList = images.gallery
        .map((url, i) => `이미지${i + 1}: ${url}`)
        .join(", ");
      return `포트폴리오 섹션 (${galleryList})`;
    }

    case "footer":
      return `업체명=${brand.brandName}, 연락처=${brand.phone || ""}, 주소=${brand.address || ""}`;

    default:
      return "";
  }
}
