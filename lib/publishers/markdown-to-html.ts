/**
 * markdown-to-html.ts
 * 마크다운 → HTML 변환 유틸
 * Tistory/WordPress는 HTML, Medium은 마크다운 그대로
 */

import { marked } from "marked";

// marked 설정
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * 마크다운을 HTML로 변환
 */
export function convertMarkdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

/**
 * FAQ Schema 마크업 생성 (Q&A 콘텐츠용)
 */
export function generateFaqSchema(
  items: { question: string; answer: string }[]
): string {
  if (items.length === 0) return "";

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

/**
 * Article Schema 마크업 생성 (블로그 콘텐츠용)
 */
export function generateArticleSchema(params: {
  title: string;
  description?: string;
  url?: string;
  datePublished?: string;
  keywords?: string[];
}): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.title,
  };

  if (params.description) schema.description = params.description;
  if (params.url) schema.url = params.url;
  if (params.datePublished) schema.datePublished = params.datePublished;
  if (params.keywords?.length) schema.keywords = params.keywords.join(", ");

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

/**
 * LocalBusiness Schema 마크업 생성 (엔티티 콘텐츠용)
 */
export function generateLocalBusinessSchema(params: {
  name: string;
  description?: string;
  url?: string;
}): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: params.name,
  };

  if (params.description) schema.description = params.description;
  if (params.url) schema.url = params.url;

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

/**
 * 콘텐츠 타입에 맞는 Schema 자동 생성
 */
export function generateSchemaMarkup(params: {
  contentType?: string;
  title: string;
  description?: string;
  url?: string;
  keywords?: string[];
}): string {
  if (params.contentType === "aeo_entity") {
    return generateLocalBusinessSchema({
      name: params.title,
      description: params.description,
      url: params.url,
    });
  }

  if (params.contentType === "aeo_qa") {
    // FAQ 형식은 본문에서 Q&A 추출 필요 — 기본 Article로 폴백
    return generateArticleSchema(params);
  }

  return generateArticleSchema(params);
}

/**
 * Canonical URL 태그 생성
 */
export function generateCanonicalTag(url: string): string {
  return `<link rel="canonical" href="${url}" />`;
}
