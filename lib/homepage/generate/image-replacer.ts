/**
 * image-replacer.ts
 * 복제된 HTML의 모든 이미지를 Unsplash로 교체
 *
 * - <img> 태그와 CSS background-image url() 모두 처리
 * - alt 텍스트/주변 컨텍스트 기반 키워드 결정
 * - 로고 이미지는 텍스트 로고로 대체
 */

import * as cheerio from "cheerio";
import { getUnsplashImages, type UnsplashImageSet } from "./unsplash-images";

// ── 출력 타입 ──────────────────────────────────────────────────────────────────

export interface ImageReplacement {
  /** 원본 이미지 URL (src 또는 background-image url) */
  originalSrc: string;
  /** 교체할 Unsplash 이미지 URL */
  newSrc: string;
  /** 이미지 용도 (hero, section, about, gallery, logo) */
  category: "hero" | "section" | "about" | "gallery" | "logo";
}

// ── 이미지 카테고리 판단 ──────────────────────────────────────────────────────

interface ImageContext {
  src: string;
  alt: string;
  className: string;
  parentTag: string;
  parentClass: string;
  parentId: string;
  width: number | null;
  height: number | null;
  isBackground: boolean;
}

function categorizeImage(ctx: ImageContext): "hero" | "section" | "about" | "gallery" | "logo" {
  const alt = ctx.alt.toLowerCase();
  const cls = (ctx.className + " " + ctx.parentClass).toLowerCase();
  const id = ctx.parentId.toLowerCase();

  // 로고 감지
  if (
    alt.includes("logo") ||
    cls.includes("logo") ||
    id.includes("logo") ||
    (ctx.width && ctx.width < 200 && ctx.height && ctx.height < 100)
  ) {
    return "logo";
  }

  // 히어로 감지
  if (
    cls.includes("hero") ||
    id.includes("hero") ||
    cls.includes("banner") ||
    cls.includes("main-visual") ||
    cls.includes("key-visual") ||
    ctx.isBackground ||
    (ctx.width && ctx.width >= 1200)
  ) {
    return "hero";
  }

  // About 감지
  if (
    cls.includes("about") ||
    id.includes("about") ||
    cls.includes("intro") ||
    cls.includes("profile") ||
    alt.includes("소개") ||
    alt.includes("about")
  ) {
    return "about";
  }

  // 갤러리/포트폴리오 감지
  if (
    cls.includes("gallery") ||
    cls.includes("portfolio") ||
    cls.includes("grid") ||
    cls.includes("slider") ||
    cls.includes("carousel") ||
    cls.includes("before") ||
    cls.includes("after")
  ) {
    return "gallery";
  }

  // 기본: 섹션 이미지
  return "section";
}

// ── 메인: 이미지 교체 맵 생성 ──────────────────────────────────────────────────

export function replaceImages(
  html: string,
  brandName: string,
  industry: string
): ImageReplacement[] {
  const $ = cheerio.load(html);
  const images = getUnsplashImages(industry);
  const replacements: ImageReplacement[] = [];

  // 카테고리별 인덱스 (순환 사용)
  const counters = { hero: 0, section: 0, about: 0, gallery: 0, logo: 0 };

  function getNextImage(category: "hero" | "section" | "about" | "gallery"): string {
    const pool = images[category];
    if (pool.length === 0) return images.hero[0]; // 최종 폴백
    const idx = counters[category] % pool.length;
    counters[category]++;
    return pool[idx];
  }

  // 1. <img> 태그 처리
  $("img").each((_, el) => {
    const $el = $(el);
    const src = $el.attr("src") || "";
    if (!src || src.startsWith("data:")) return;

    // 이미 Unsplash URL이면 스킵
    if (src.includes("unsplash.com")) return;

    const parent = $el.parent();
    const ctx: ImageContext = {
      src,
      alt: $el.attr("alt") || "",
      className: $el.attr("class") || "",
      parentTag: parent.prop("tagName")?.toLowerCase() || "",
      parentClass: parent.attr("class") || "",
      parentId: parent.attr("id") || "",
      width: parseInt($el.attr("width") || "0") || null,
      height: parseInt($el.attr("height") || "0") || null,
      isBackground: false,
    };

    const category = categorizeImage(ctx);

    if (category === "logo") {
      // 로고는 이미지 교체 대신 텍스트 대체 (html-patcher에서 처리)
      replacements.push({
        originalSrc: src,
        newSrc: "__LOGO_TEXT__",
        category: "logo",
      });
      return;
    }

    replacements.push({
      originalSrc: src,
      newSrc: getNextImage(category),
      category,
    });
  });

  // 2. CSS background-image 처리 (인라인 style)
  $("[style]").each((_, el) => {
    const $el = $(el);
    const style = $el.attr("style") || "";
    const bgMatch = style.match(/background(?:-image)?\s*:\s*url\(\s*['"]?(.*?)['"]?\s*\)/i);

    if (!bgMatch || !bgMatch[1]) return;
    const src = bgMatch[1];
    if (src.startsWith("data:") || src.includes("unsplash.com")) return;

    const ctx: ImageContext = {
      src,
      alt: "",
      className: $el.attr("class") || "",
      parentTag: $el.prop("tagName")?.toLowerCase() || "",
      parentClass: $el.parent().attr("class") || "",
      parentId: $el.attr("id") || "",
      width: null,
      height: null,
      isBackground: true,
    };

    const category = categorizeImage(ctx);
    if (category === "logo") return; // 배경 이미지는 로고가 아님

    replacements.push({
      originalSrc: src,
      newSrc: getNextImage(category),
      category,
    });
  });

  // 3. <style> 태그 내 background-image 처리
  $("style").each((_, el) => {
    const cssText = $(el).html() || "";
    const bgRegex = /background(?:-image)?\s*:\s*url\(\s*['"]?((?!data:|unsplash).*?)['"]?\s*\)/gi;
    let match;
    while ((match = bgRegex.exec(cssText)) !== null) {
      const src = match[1];
      if (!src || src.startsWith("data:") || src.includes("unsplash.com")) continue;

      replacements.push({
        originalSrc: src,
        newSrc: getNextImage("hero"), // <style> 내 배경은 주로 히어로
        category: "hero",
      });
    }
  });

  console.log(`[ImageReplacer] 이미지 교체 맵: ${replacements.length}건 (로고 ${counters.logo}건)`);
  return replacements;
}
