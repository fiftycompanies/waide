/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
/**
 * component-assembler.ts
 * Waide 컴포넌트 어셈블러
 *
 * 선택된 컴포넌트들을 조합하여 완성 HTML을 생성한다.
 * 출력 HTML은 100% Waide 작성 코드 — 외부 저작권 코드 없음.
 */

import type { BrandInfo, PersonaInfo } from "./content-mapper";
import type {
  ComponentPlan,
  DesignTokens,
  ImageMap,
  NavProps,
  HeroProps,
  AboutProps,
  ServicesProps,
  GalleryProps,
  ContactProps,
  BlogProps,
  CtaProps,
  FooterProps,
} from "../components/types";
import {
  renderNav,
  renderHero,
  renderAbout,
  renderServices,
  renderGallery,
  renderContact,
  renderBlog,
  renderCta,
  renderFooter,
} from "../components/index";
import { buildBaseCss } from "../components/base.css";

// ── Google Fonts URL 생성 ──────────────────────────────────────────────────

function buildGoogleFontsUrl(tokens: DesignTokens): string {
  const fonts = new Set<string>();
  fonts.add(tokens.headingFont);
  fonts.add(tokens.bodyFont);

  const families = Array.from(fonts)
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// ── 서비스 아이콘 매핑 ──────────────────────────────────────────────────────

const SERVICE_ICON_MAP: Record<string, string> = {
  피부: "&#10024;",
  보톡스: "&#128137;",
  필러: "&#128161;",
  리프팅: "&#11014;&#65039;",
  레이저: "&#128300;",
  관리: "&#128148;",
  여드름: "&#127793;",
  기미: "&#9728;&#65039;",
  탈모: "&#129506;",
  치아: "&#129463;",
  교정: "&#128171;",
  임플란트: "&#128168;",
  미백: "&#10024;",
  카페: "&#9749;",
  커피: "&#9749;",
  베이커리: "&#127838;",
  식사: "&#127858;",
  헤어: "&#9986;&#65039;",
  네일: "&#128133;",
  인테리어: "&#127968;",
  도배: "&#127912;",
  호텔: "&#127976;",
  펜션: "&#127968;",
};

function getServiceIcon(serviceName: string): string {
  for (const [keyword, icon] of Object.entries(SERVICE_ICON_MAP)) {
    if (serviceName.includes(keyword)) return icon;
  }
  return "&#10003;";
}

// ── Props 빌더 ──────────────────────────────────────────────────────────────

function buildNavProps(brand: BrandInfo): NavProps {
  return {
    brandName: brand.name,
    phone: brand.phone,
    menuItems: ["소개", "서비스", "갤러리", "블로그", "문의"],
  };
}

function buildHeroProps(brand: BrandInfo, persona: PersonaInfo, images: ImageMap): HeroProps {
  return {
    brandName: brand.name,
    tagline: persona.tagline || `${brand.name} — ${brand.industry} 전문`,
    subtitle: persona.usp || `${brand.name}에서 최고의 ${brand.industry} 서비스를 경험하세요.`,
    ctaText: brand.phone ? "지금 예약하기" : "무료 상담 신청",
    ctaHref: brand.phone ? `tel:${brand.phone}` : "#contact",
    backgroundImage: images.hero[0] || null,
  };
}

function buildAboutProps(brand: BrandInfo, persona: PersonaInfo, images: ImageMap): AboutProps {
  const highlights = brand.services.slice(0, 4).map((s) => `${s} 전문`);

  return {
    brandName: brand.name,
    title: `${brand.name} 소개`,
    description:
      persona.usp ||
      `${brand.name}은(는) ${brand.industry} 분야의 전문가로, 고객 한 분 한 분에게 맞춤형 서비스를 제공합니다.`,
    highlights,
    image: images.about[0] || null,
    stats: [
      { number: "10+", label: "년 경력" },
      { number: "5,000+", label: "고객 관리" },
      { number: "98%", label: "만족도" },
    ],
  };
}

function buildServicesProps(brand: BrandInfo, images: ImageMap): ServicesProps {
  const services = brand.services.map((name, i) => ({
    name,
    description: `${brand.name}의 전문 ${name} 서비스로 최적의 결과를 경험하세요.`,
    icon: getServiceIcon(name),
    image: images.section[i % images.section.length] || null,
  }));

  return {
    brandName: brand.name,
    title: "전문 서비스",
    services,
  };
}

function buildGalleryProps(brand: BrandInfo, images: ImageMap): GalleryProps {
  const galleryImages = images.gallery.map((src, i) => ({
    src,
    alt: `${brand.name} ${i + 1}`,
  }));

  return {
    brandName: brand.name,
    title: "갤러리",
    images: galleryImages,
  };
}

function buildContactProps(brand: BrandInfo): ContactProps {
  return {
    brandName: brand.name,
    title: "문의하기",
    phone: brand.phone,
    address: brand.address,
    mapEmbedUrl: null,
  };
}

function buildBlogProps(brand: BrandInfo): BlogProps {
  return {
    brandName: brand.name,
    title: "최신 블로그 포스트",
    posts: [], // 플레이스홀더 — 향후 Supabase contents 테이블 연동
  };
}

function buildCtaProps(brand: BrandInfo, persona: PersonaInfo): CtaProps {
  return {
    brandName: brand.name,
    title: persona.one_liner || `${brand.name}과(와) 함께하세요`,
    subtitle: `지금 ${brand.name}에 문의하시면 무료 상담을 받으실 수 있습니다.`,
    ctaText: brand.phone ? "전화 상담하기" : "무료 상담 신청",
    ctaHref: brand.phone ? `tel:${brand.phone}` : "#contact",
  };
}

function buildFooterProps(brand: BrandInfo): FooterProps {
  const year = new Date().getFullYear();
  return {
    brandName: brand.name,
    phone: brand.phone,
    address: brand.address,
    copyright: `\u00A9 ${year} ${brand.name}. All rights reserved. Powered by Waide`,
  };
}

// ── 메인 어셈블러 ───────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function assembleHomepage(
  componentPlan: ComponentPlan,
  tokens: DesignTokens,
  brandInfo: BrandInfo,
  persona: PersonaInfo,
  images: ImageMap
): string {
  // 1. CSS 토큰 주입
  const css = buildBaseCss(tokens);

  // 2. Google Fonts URL
  const fontsUrl = buildGoogleFontsUrl(tokens);

  // 3. SEO 메타
  const seoTitle = persona.tagline
    ? `${brandInfo.name} | ${persona.tagline}`
    : `${brandInfo.name} | ${brandInfo.industry} 전문`;
  const seoDescription =
    persona.usp || `${brandInfo.name} — ${brandInfo.industry} 분야 전문 서비스`;

  // 4. 각 섹션 렌더링
  const sections = [
    renderNav(componentPlan.nav, tokens, buildNavProps(brandInfo)),
    renderHero(componentPlan.hero, tokens, buildHeroProps(brandInfo, persona, images)),
    renderAbout(componentPlan.about, tokens, buildAboutProps(brandInfo, persona, images)),
    renderServices(componentPlan.services, tokens, buildServicesProps(brandInfo, images)),
    renderGallery(componentPlan.gallery, tokens, buildGalleryProps(brandInfo, images)),
    renderBlog(tokens, buildBlogProps(brandInfo)),
    renderCta(tokens, buildCtaProps(brandInfo, persona)),
    renderContact(componentPlan.contact, tokens, buildContactProps(brandInfo)),
    renderFooter(tokens, buildFooterProps(brandInfo)),
  ].join("\n");

  // 5. 완성 HTML 조립
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(seoTitle)}</title>
  <meta name="description" content="${escHtml(seoDescription)}">
  <meta property="og:title" content="${escHtml(seoTitle)}">
  <meta property="og:description" content="${escHtml(seoDescription)}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontsUrl}" rel="stylesheet">
  <style>
${css}
  </style>
</head>
<body>
${sections}
</body>
</html>`;
}
