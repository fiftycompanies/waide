/**
 * content-benchmark.ts
 * 상위노출 글 수집 + RND 벤치마킹
 *
 * - 네이버 블로그 검색 API TOP5 수집
 * - 본문 크롤링 (HTML → 텍스트/H2/이미지 추출)
 * - RND/content_benchmark 에이전트 → 패턴 분석 + COPYWRITER 브리프
 * - content_benchmarks 테이블 캐시 (7일 TTL)
 *
 * ⚠️ createAdminClient() 사용
 * ⚠️ 크롤링 실패 시 빈 배열 반환 (체인 중단 방지)
 */

import { createAdminClient } from "@/lib/supabase/service";
import { searchNaverBlog, type NaverBlogSearchItem } from "@/lib/naver-search-api";
import { runAgent } from "@/lib/agent-runner";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface BlogPostDetail {
  title: string;
  body: string;
  h2_headings: string[];
  char_count: number;
  image_count: number;
  published_date: string;
  blog_name: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BenchmarkData = Record<string, any>;

// ═══════════════════════════════════════════
// 벤치마크 조회 (캐시 우선)
// ═══════════════════════════════════════════

export async function getBenchmark(keyword: string): Promise<BenchmarkData | null> {
  const db = createAdminClient();

  // 1. 캐시 확인 (만료 전)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cached } = await (db as any)
    .from("content_benchmarks")
    .select("*")
    .eq("keyword", keyword)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) return cached.benchmark_data as BenchmarkData;

  // 2. 캐시 없으면 새로 생성
  return await generateBenchmark(keyword);
}

// ═══════════════════════════════════════════
// 벤치마크 생성
// ═══════════════════════════════════════════

async function generateBenchmark(keyword: string): Promise<BenchmarkData | null> {
  const db = createAdminClient();

  // 1. 네이버 블로그 검색 TOP5 수집
  let topPosts: NaverBlogSearchItem[] = [];
  try {
    const searchResult = await searchNaverBlog(keyword, 5, "sim");
    topPosts = searchResult.items.slice(0, 5);
  } catch (error) {
    console.warn("[content-benchmark] 블로그 검색 실패:", error);
    return null; // 벤치마크 없이 진행
  }

  if (topPosts.length === 0) {
    return null;
  }

  // 2. 각 글의 본문 크롤링
  const contentDetails: BlogPostDetail[] = [];
  for (const post of topPosts) {
    try {
      const detail = await crawlBlogContent(post.link);
      contentDetails.push({
        title: stripHtml(post.title),
        body: detail.body.substring(0, 3000), // 토큰 절약
        h2_headings: detail.h2s,
        char_count: detail.body.length,
        image_count: detail.imageCount,
        published_date: formatPostDate(post.postdate),
        blog_name: post.bloggername,
      });
    } catch {
      // 크롤링 실패한 글은 스킵
      continue;
    }
  }

  if (contentDetails.length < 2) {
    // 최소 2개는 있어야 패턴 분석 가능
    return null;
  }

  // 3. RND에게 벤치마킹 요청
  let result;
  try {
    result = await runAgent({
      agent: "RND",
      task: "content_benchmark",
      context: {
        keyword,
        top5_contents: contentDetails,
      },
    });
  } catch (error) {
    console.warn("[content-benchmark] RND 벤치마킹 실패:", error);
    return null;
  }

  // 4. 결과 캐시 저장 (7일)
  if (result.success && result.data) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .from("content_benchmarks")
        .upsert(
          {
            keyword,
            benchmark_data: result.data,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: "keyword" }
        );
    } catch (cacheErr) {
      console.warn("[content-benchmark] 캐시 저장 실패:", cacheErr);
    }

    return result.data as BenchmarkData;
  }

  return null;
}

// ═══════════════════════════════════════════
// 블로그 본문 크롤링
// ═══════════════════════════════════════════

async function crawlBlogContent(url: string): Promise<{
  body: string;
  h2s: string[];
  imageCount: number;
}> {
  // 네이버 블로그 모바일 URL로 변환 (파싱이 더 쉬움)
  const mobileUrl = convertToMobileUrl(url);

  const resp = await fetch(mobileUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  const html = await resp.text();

  // 본문 추출
  const body = extractBodyText(html);
  const h2s = extractH2Headings(html);
  const imageCount = countImages(html);

  return { body, h2s, imageCount };
}

// ═══════════════════════════════════════════
// HTML 파싱 헬퍼
// ═══════════════════════════════════════════

function convertToMobileUrl(url: string): string {
  // blog.naver.com/BLOGID/POST → m.blog.naver.com/BLOGID/POST
  if (url.includes("blog.naver.com") && !url.includes("m.blog.naver.com")) {
    return url.replace("blog.naver.com", "m.blog.naver.com");
  }
  return url;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function extractBodyText(html: string): string {
  // 네이버 블로그 본문 영역 추출
  // se-main-container (스마트에디터) 또는 post-view 영역
  const containerPatterns = [
    /class="se-main-container"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/,
    /class="post_ct"[^>]*>([\s\S]*?)<\/div>/,
    /class="se_component_wrap"[^>]*>([\s\S]*?)<\/div>/,
    /<article[^>]*>([\s\S]*?)<\/article>/,
  ];

  for (const pattern of containerPatterns) {
    const match = html.match(pattern);
    if (match) {
      return stripHtml(match[1]).replace(/\s+/g, " ").trim();
    }
  }

  // 폴백: body 전체에서 텍스트 추출
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    // 스크립트/스타일 제거
    const cleaned = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "");
    return stripHtml(cleaned).replace(/\s+/g, " ").trim().substring(0, 5000);
  }

  return "";
}

function extractH2Headings(html: string): string[] {
  const h2Pattern = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const headings: string[] = [];
  let match;
  while ((match = h2Pattern.exec(html)) !== null) {
    const text = stripHtml(match[1]).trim();
    if (text) headings.push(text);
  }

  // 네이버 스마트에디터 H2 (se-text-paragraph + bold)
  if (headings.length === 0) {
    const seH2Pattern = /class="se-section se-section-text se-l-heading"[^>]*>[\s\S]*?class="se-text-paragraph"[^>]*>([\s\S]*?)<\/span>/gi;
    while ((match = seH2Pattern.exec(html)) !== null) {
      const text = stripHtml(match[1]).trim();
      if (text) headings.push(text);
    }
  }

  return headings;
}

function countImages(html: string): number {
  const imgPattern = /<img[^>]+src=["'][^"']*["']/gi;
  const matches = html.match(imgPattern);
  return matches ? matches.length : 0;
}

function formatPostDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
