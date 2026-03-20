/**
 * brand-injector.ts
 * 브랜드 정보 주입기
 *
 * vision-to-html.ts가 생성한 HTML의 플레이스홀더를
 * 브랜드 실제 정보 + Unsplash 이미지로 교체한다.
 *
 * 플레이스홀더:
 * - [BRAND_NAME], [TAGLINE], [USP], [SERVICE_1..5], [PHONE], [ADDRESS]
 * - data-img-slot="hero|about|service|gallery" → Unsplash 이미지
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

  // 브랜드 기본 정보
  result = result.replace(/\[BRAND_NAME\]/g, esc(brandInfo.name));
  result = result.replace(/\[TAGLINE\]/g, esc(persona.tagline || persona.one_liner || `${brandInfo.name} - ${brandInfo.industry} 전문`));
  result = result.replace(/\[USP\]/g, esc(persona.usp || `${brandInfo.name}의 전문적인 ${brandInfo.industry} 서비스를 경험하세요.`));
  result = result.replace(/\[PHONE\]/g, esc(brandInfo.phone || "02-000-0000"));
  result = result.replace(/\[ADDRESS\]/g, esc(brandInfo.address || ""));

  // 서비스 목록 (최대 5개)
  const services = brandInfo.services.length > 0 ? brandInfo.services : ["서비스 1", "서비스 2", "서비스 3"];
  for (let i = 0; i < 5; i++) {
    const serviceName = services[i] || services[i % services.length] || `서비스 ${i + 1}`;
    result = result.replace(new RegExp(`\\[SERVICE_${i + 1}\\]`, "g"), esc(serviceName));
    result = result.replace(
      new RegExp(`\\[SERVICE_DESC_${i + 1}\\]`, "g"),
      esc(`${brandInfo.name}의 전문적인 ${serviceName} 서비스를 만나보세요.`)
    );
  }

  // 타겟 고객
  result = result.replace(/\[TARGET_CUSTOMER\]/g, esc(persona.target_customer || "고객"));

  return result;
}

// ── 이미지 슬롯 교체 ─────────────────────────────────────────────────────────

function replaceImageSlots(html: string, images: UnsplashImageSet): string {
  let result = html;
  let heroIdx = 0;
  let sectionIdx = 0;
  let aboutIdx = 0;
  let galleryIdx = 0;

  // <img data-img-slot="..."> → src 채우기
  result = result.replace(
    /<img([^>]*?)data-img-slot="([^"]*)"([^>]*?)>/gi,
    (_match, before, slot, after) => {
      const url = getImageForSlot(slot, images, { heroIdx, sectionIdx, aboutIdx, galleryIdx });
      advanceIndex(slot, { heroIdx, sectionIdx, aboutIdx, galleryIdx });

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
      const url = getImageForSlot(slot, images, { heroIdx, sectionIdx, aboutIdx, galleryIdx });
      advanceIndex(slot, { heroIdx, sectionIdx, aboutIdx, galleryIdx });

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
      const url = getImageForSlot(slot, images, { heroIdx, sectionIdx, aboutIdx, galleryIdx });
      return `data-bg-slot="${slot}" style="background-image:url('${url}');background-size:cover;background-position:center;"`;
    }
  );

  return result;
}

interface SlotCounters {
  heroIdx: number;
  sectionIdx: number;
  aboutIdx: number;
  galleryIdx: number;
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
