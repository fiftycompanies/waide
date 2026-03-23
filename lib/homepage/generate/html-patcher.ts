/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
/**
 * html-patcher.ts
 * content-mapper의 replacements + image-replacer의 결과를 실제 HTML에 적용
 *
 * 핵심 원칙:
 * - CSS class/id/구조 변경 절대 금지
 * - 텍스트 노드만 정확히 교체
 * - 이미지 src만 교체
 * - <title>, <meta> 교체
 */

import * as cheerio from "cheerio";
import type { AnyNode, Text as DomText, Element as DomElement } from "domhandler";
import type { TextReplacement } from "./content-mapper";
import type { ImageReplacement } from "./image-replacer";

// ── 출력 타입 ──────────────────────────────────────────────────────────────────

export interface PatchResult {
  html: string;
  textReplacements: number;
  imageReplacements: number;
  metaReplacements: number;
}

// ── 메인: 패치 적용 ──────────────────────────────────────────────────────────

export function applyPatches(
  html: string,
  textReplacements: TextReplacement[],
  imageReplacements: ImageReplacement[],
  brandName: string,
  seoTitle: string,
  seoDescription: string
): PatchResult {
  const $ = cheerio.load(html);
  let textCount = 0;
  let imgCount = 0;
  let metaCount = 0;

  // ── 1. 텍스트 노드 교체 ────────────────────────────────────────────────────

  // 교체 맵을 원본 텍스트 길이 내림차순 정렬 (긴 텍스트 먼저 → 부분 매칭 방지)
  const sortedReplacements = [...textReplacements].sort(
    (a, b) => b.original.length - a.original.length
  );

  // 텍스트 노드 순회
  const SKIP_TAGS = new Set(["script", "style", "noscript", "svg", "code", "pre"]);

  function walkAndReplace(node: AnyNode) {
    if (node.type === "text") {
      const textNode = node as DomText;
      let text = textNode.data || "";

      for (const rep of sortedReplacements) {
        if (text.includes(rep.original)) {
          text = text.replace(rep.original, rep.replacement);
          textCount++;
        }
      }

      textNode.data = text;
      return;
    }

    if (node.type === "tag") {
      const el = node as DomElement;
      if (SKIP_TAGS.has(el.tagName?.toLowerCase())) return;

      for (const child of el.children || []) {
        walkAndReplace(child);
      }
    }
  }

  const body = $("body")[0];
  if (body) {
    for (const child of body.children || []) {
      walkAndReplace(child);
    }
  }

  // ── 2. 이미지 교체 ────────────────────────────────────────────────────────

  for (const rep of imageReplacements) {
    if (rep.category === "logo" && rep.newSrc === "__LOGO_TEXT__") {
      // 로고 이미지 → 텍스트 로고로 대체
      $(`img`).each((_, el) => {
        const $el = $(el);
        const src = $el.attr("src") || "";
        if (src === rep.originalSrc) {
          const span = $(`<span style="font-weight:700;font-size:1.25rem">${escapeHtml(brandName)}</span>`);
          $el.replaceWith(span);
          imgCount++;
        }
      });
      continue;
    }

    // <img src> 교체
    $(`img`).each((_, el) => {
      const $el = $(el);
      const src = $el.attr("src") || "";
      if (src === rep.originalSrc) {
        $el.attr("src", rep.newSrc);
        // srcset 제거 (Unsplash는 단일 URL)
        $el.removeAttr("srcset");
        imgCount++;
      }
    });

    // 인라인 style의 background-image 교체
    $("[style]").each((_, el) => {
      const $el = $(el);
      const style = $el.attr("style") || "";
      if (style.includes(rep.originalSrc)) {
        $el.attr("style", style.replace(rep.originalSrc, rep.newSrc));
        imgCount++;
      }
    });

    // <style> 태그 내 background-image 교체
    $("style").each((_, el) => {
      const $el = $(el);
      const cssText = $el.html() || "";
      if (cssText.includes(rep.originalSrc)) {
        $el.html(cssText.split(rep.originalSrc).join(rep.newSrc));
        imgCount++;
      }
    });
  }

  // ── 3. 메타 태그 교체 ──────────────────────────────────────────────────────

  // <title>
  const $title = $("title");
  if ($title.length > 0) {
    $title.text(seoTitle);
    metaCount++;
  } else {
    $("head").append(`<title>${escapeHtml(seoTitle)}</title>`);
    metaCount++;
  }

  // <meta name="description">
  setMetaContent($, "name", "description", seoDescription);
  metaCount++;

  // Open Graph
  setMetaContent($, "property", "og:title", seoTitle);
  setMetaContent($, "property", "og:description", seoDescription);
  metaCount += 2;

  // Twitter Card
  setMetaContent($, "name", "twitter:title", seoTitle);
  setMetaContent($, "name", "twitter:description", seoDescription);

  // canonical URL 제거 (레퍼런스 사이트 URL 남지 않도록)
  $('link[rel="canonical"]').remove();

  // JSON-LD 구조화 데이터 제거 (레퍼런스 사이트 정보)
  $('script[type="application/ld+json"]').remove();

  const finalHtml = $.html();

  console.log(`[HtmlPatcher] 패치 완료: 텍스트 ${textCount}건, 이미지 ${imgCount}건, 메타 ${metaCount}건`);

  return {
    html: finalHtml,
    textReplacements: textCount,
    imageReplacements: imgCount,
    metaReplacements: metaCount,
  };
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function setMetaContent(
  $: cheerio.CheerioAPI,
  attrName: "name" | "property",
  attrValue: string,
  content: string
) {
  const selector = `meta[${attrName}="${attrValue}"]`;
  const $meta = $(selector);
  if ($meta.length > 0) {
    $meta.attr("content", content);
  } else {
    $("head").append(`<meta ${attrName}="${attrValue}" content="${escapeHtml(content)}">`);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
