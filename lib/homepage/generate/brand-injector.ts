/**
 * brand-injector.ts
 * 브랜드 정보 주입기
 *
 * vision-to-html.ts가 생성한 HTML의 플레이스홀더를
 * 브랜드 실제 정보 + Unsplash 이미지로 교체한다.
 *
 * 플레이스홀더 (2가지 형식 모두 지원):
 * - {{BRAND_NAME}}, {{TAGLINE}}, {{SUBTITLE}}, {{SERVICE_1..5}}, {{PHONE}}, {{ADDRESS}}
 * - [BRAND_NAME], [TAGLINE], [USP], [SERVICE_1..5], [PHONE], [ADDRESS]
 * - data-img-slot="hero|about|service|gallery|blog" → Unsplash 이미지
 * - data-bg-slot="hero|section" → background-image Unsplash
 * - <title>, og:title, description → SEO 메타
 */

import type { BrandInfo, PersonaInfo } from "./content-mapper";
import { getUnsplashImages, type UnsplashImageSet } from "./unsplash-images";

// ── 메인 함수 ─────────────────────────────────────────────────────────────────

/**
 * 플레이스홀더가 포함된 HTML에 브랜드 정보를 주입한다.
 */
export function injectBrandInfo(
  html: string,
  brandInfo: BrandInfo,
  persona: PersonaInfo,
  industry: string
): string {
  let result = html;

  // 1. 텍스트 플레이스홀더 교체
  result = replaceTextPlaceholders(result, brandInfo, persona);

  // 2. 이미지 슬롯 교체 (data-img-slot, data-bg-slot)
  const images = getUnsplashImages(industry);
  result = replaceImageSlots(result, images);

  // 3. 메타 태그 교체
  result = replaceMetaTags(result, brandInfo, persona);

  // 4. 블로그 플레이스홀더 교체
  result = replaceBlogPlaceholders(result, brandInfo);

  return result;
}

// ── 텍스트 교체 ──────────────────────────────────────────────────────────────

function replaceTextPlaceholders(
  html: string,
  brandInfo: BrandInfo,
  persona: PersonaInfo
): string {
  const esc = escHtml;

  let result = html;

  const tagline = persona.tagline || persona.one_liner || `${brandInfo.name} - ${brandInfo.industry} 전문`;
  const subtitle = persona.usp || `${brandInfo.name}의 전문적인 ${brandInfo.industry} 서비스를 경험하세요.`;
  const phone = brandInfo.phone || "02-000-0000";
  const address = brandInfo.address || "";

  // === {{}} 형식 교체 (우선) ===
  result = result.replace(/\{\{BRAND_NAME\}\}/g, esc(brandInfo.name));
  result = result.replace(/\{\{TAGLINE\}\}/g, esc(tagline));
  result = result.replace(/\{\{SUBTITLE\}\}/g, esc(subtitle));
  result = result.replace(/\{\{ABOUT_DESC\}\}/g, esc(subtitle));
  result = result.replace(/\{\{CTA_TEXT\}\}/g, esc("상담 예약하기"));
  result = result.replace(/\{\{PHONE\}\}/g, esc(phone));
  result = result.replace(/\{\{ADDRESS\}\}/g, esc(address));
  result = result.replace(/\{\{HOURS\}\}/g, esc("Mon – Sat : 10:00 – 19:00"));

  // 통계
  result = result.replace(/\{\{STAT_1\}\}/g, "10+");
  result = result.replace(/\{\{STAT_2\}\}/g, "5K+");
  result = result.replace(/\{\{STAT_3\}\}/g, "98%");
  result = result.replace(/\{\{STAT_LABEL_1\}\}/g, "Years Experience");
  result = result.replace(/\{\{STAT_LABEL_2\}\}/g, "Happy Clients");
  result = result.replace(/\{\{STAT_LABEL_3\}\}/g, "Satisfaction");

  // 서비스 목록 (최대 5개)
  const services = brandInfo.services.length > 0 ? brandInfo.services : ["서비스 1", "서비스 2", "서비스 3"];
  for (let i = 0; i < 5; i++) {
    const serviceName = services[i] || services[i % services.length] || `서비스 ${i + 1}`;
    // {{}} 형식
    result = result.replace(new RegExp(`\\{\\{SERVICE_${i + 1}\\}\\}`, "g"), esc(serviceName));
    result = result.replace(
      new RegExp(`\\{\\{SERVICE_DESC_${i + 1}\\}\\}`, "g"),
      esc(generateServiceDescription(brandInfo.name, serviceName, i))
    );
    // [] 형식 (하위 호환)
    result = result.replace(new RegExp(`\\[SERVICE_${i + 1}\\]`, "g"), esc(serviceName));
    result = result.replace(
      new RegExp(`\\[SERVICE_DESC_${i + 1}\\]`, "g"),
      esc(generateServiceDescription(brandInfo.name, serviceName, i))
    );
  }

  // 네비게이션 메뉴
  for (let i = 0; i < 7; i++) {
    const navItem = services[i] || (i === 0 ? "홈" : i === services.length ? "블로그" : services[i % services.length] || `메뉴 ${i + 1}`);
    result = result.replace(new RegExp(`\\{\\{NAV_${i + 1}\\}\\}`, "g"), esc(navItem));
  }

  // === [] 형식 교체 (하위 호환) ===
  result = result.replace(/\[BRAND_NAME\]/g, esc(brandInfo.name));
  result = result.replace(/\[TAGLINE\]/g, esc(tagline));
  result = result.replace(/\[USP\]/g, esc(subtitle));
  result = result.replace(/\[PHONE\]/g, esc(phone));
  result = result.replace(/\[ADDRESS\]/g, esc(address));

  // 타겟 고객
  result = result.replace(/\[TARGET_CUSTOMER\]/g, esc(persona.target_customer || "고객"));
  result = result.replace(/\{\{TARGET_CUSTOMER\}\}/g, esc(persona.target_customer || "고객"));

  return result;
}

/**
 * 서비스별 고유한 설명 생성 (템플릿 기반, AI 호출 없음)
 */
function generateServiceDescription(brandName: string, serviceName: string, index: number): string {
  const templates = [
    `${brandName}만의 차별화된 ${serviceName} 프로그램으로 최상의 결과를 경험하세요.`,
    `전문가의 체계적인 상담과 맞춤 ${serviceName}으로 고객님께 최적의 솔루션을 제공합니다.`,
    `최신 장비와 풍부한 경험을 바탕으로 안전하고 효과적인 ${serviceName}을 시행합니다.`,
    `${brandName}의 ${serviceName}은 1:1 맞춤 플랜으로 진행되어 높은 만족도를 자랑합니다.`,
    `검증된 기술력과 노하우로 ${serviceName} 분야에서 신뢰받는 결과를 만들어 갑니다.`,
  ];
  return templates[index % templates.length];
}

// ── 이미지 슬롯 교체 ─────────────────────────────────────────────────────────

interface SlotCounters {
  heroIdx: number;
  sectionIdx: number;
  aboutIdx: number;
  galleryIdx: number;
  blogIdx: number;
}

function replaceImageSlots(html: string, images: UnsplashImageSet): string {
  let result = html;

  // 단일 mutable 카운터 객체 — 콜백에서 직접 참조
  const counters: SlotCounters = {
    heroIdx: 0,
    sectionIdx: 0,
    aboutIdx: 0,
    galleryIdx: 0,
    blogIdx: 0,
  };

  // <img data-img-slot="..."> → src 채우기
  result = result.replace(
    /<img([^>]*?)data-img-slot="([^"]*)"([^>]*?)>/gi,
    (_match, before, slot, after) => {
      const url = getImageForSlot(slot, images, counters);
      advanceIndex(slot, counters);

      // src가 비어있으면 채우기
      let attrs = `${before}data-img-slot="${slot}"${after}`;
      if (attrs.includes('src=""') || attrs.includes("src=''")) {
        attrs = attrs.replace(/src=["'][^"']*["']/, `src="${url}"`);
      } else if (!attrs.includes("src=")) {
        attrs = ` src="${url}" ` + attrs;
      }

      // alt 추가
      if (!attrs.includes("alt=")) {
        attrs += ` alt="${slot} image"`;
      }

      return `<img${attrs}>`;
    }
  );

  // <div data-img-slot="..."> → background-image 채우기 (블로그 카드 등)
  result = result.replace(
    /<div([^>]*?)data-img-slot="([^"]*)"([^>]*?)>/gi,
    (_match, before, slot, after) => {
      const url = getImageForSlot(slot, images, counters);
      advanceIndex(slot, counters);

      let style = `background-image:url('${url}');background-size:cover;background-position:center;min-height:200px;`;

      // 기존 style에 추가
      const styleMatch = (before + after).match(/style="([^"]*)"/);
      if (styleMatch) {
        const combined = `${before}${after}`.replace(
          /style="([^"]*)"/,
          `style="${styleMatch[1]};${style}"`
        );
        return `<div${combined}>`;
      }

      return `<div${before}data-img-slot="${slot}"${after} style="${style}">`;
    }
  );

  // data-bg-slot → background-image 인라인 스타일
  result = result.replace(
    /data-bg-slot="([^"]*)"/gi,
    (_match, slot) => {
      const url = getImageForSlot(slot, images, counters);
      advanceIndex(slot, counters);
      return `data-bg-slot="${slot}" style="background-image:url('${url}');background-size:cover;background-position:center;"`;
    }
  );

  return result;
}

function getImageForSlot(
  slot: string,
  images: UnsplashImageSet,
  counters: SlotCounters
): string {
  switch (slot) {
    case "hero":
      return images.hero[counters.heroIdx % images.hero.length];
    case "about":
      return images.about[counters.aboutIdx % images.about.length];
    case "service":
    case "section":
      return images.section[counters.sectionIdx % images.section.length];
    case "gallery":
      return images.gallery[counters.galleryIdx % images.gallery.length];
    case "blog":
      return (images as UnsplashImageSet & { blog?: string[] }).blog
        ? (images as UnsplashImageSet & { blog?: string[] }).blog![counters.blogIdx % (images as UnsplashImageSet & { blog?: string[] }).blog!.length]
        : images.gallery[counters.blogIdx % images.gallery.length];
    default:
      return images.section[0] || `https://picsum.photos/seed/${slot}/800/600`;
  }
}

function advanceIndex(slot: string, counters: SlotCounters): void {
  switch (slot) {
    case "hero": counters.heroIdx++; break;
    case "about": counters.aboutIdx++; break;
    case "service":
    case "section": counters.sectionIdx++; break;
    case "gallery": counters.galleryIdx++; break;
    case "blog": counters.blogIdx++; break;
  }
}

// ── 메타 태그 교체 ───────────────────────────────────────────────────────────

function replaceMetaTags(
  html: string,
  brandInfo: BrandInfo,
  persona: PersonaInfo
): string {
  const seoTitle = persona.tagline
    ? `${brandInfo.name} | ${persona.tagline}`
    : `${brandInfo.name} | ${brandInfo.industry} 전문`;
  const seoDesc = persona.usp || `${brandInfo.name} - ${brandInfo.industry} 전문 서비스`;

  let result = html;

  // <title>
  result = result.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escHtml(seoTitle)}</title>`
  );

  // meta description
  result = result.replace(
    /<meta\s+name="description"\s+content="[^"]*"/i,
    `<meta name="description" content="${escAttr(seoDesc)}"`
  );

  // og:title
  result = result.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"/i,
    `<meta property="og:title" content="${escAttr(seoTitle)}"`
  );

  // og:description
  result = result.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"/i,
    `<meta property="og:description" content="${escAttr(seoDesc)}"`
  );

  return result;
}

// ── 블로그 플레이스홀더 교체 ─────────────────────────────────────────────────

function replaceBlogPlaceholders(html: string, brandInfo: BrandInfo): string {
  let result = html;

  const blogTitles = [
    `${brandInfo.name}의 전문 ${brandInfo.industry} 이야기`,
    `${brandInfo.industry} 전문가가 알려주는 꿀팁`,
    `${brandInfo.name} 최신 소식`,
  ];

  const blogExcerpts = [
    `${brandInfo.name}의 최신 ${brandInfo.industry} 트렌드와 전문 노하우를 공유합니다.`,
    `전문가만 아는 ${brandInfo.industry} 관리의 핵심 포인트를 알아보세요.`,
    `${brandInfo.name}의 새로운 소식과 이벤트 정보를 확인하세요.`,
  ];

  for (let i = 0; i < 3; i++) {
    result = result.replace(
      new RegExp(`\\[BLOG_TITLE_${i + 1}\\]`, "g"),
      escHtml(blogTitles[i])
    );
    result = result.replace(
      new RegExp(`\\[BLOG_EXCERPT_${i + 1}\\]`, "g"),
      escHtml(blogExcerpts[i])
    );
  }

  return result;
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
