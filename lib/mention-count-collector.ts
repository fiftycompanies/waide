/**
 * mention-count-collector.ts
 *
 * 키워드별 네이버 블로그 / 구글 검색 상위 20건에서
 * 당사 콘텐츠가 몇 건 노출되는지(mention_count) 계산
 *
 * Phase 2-B: 점유율(mention_count) 수집
 */

import { searchNaverBlog } from "@/lib/naver-search-api";
import { searchGoogle } from "@/lib/google-serp-api";

// ── 타입 ────────────────────────────────────────────────
export interface MentionCountResult {
  keyword: string;
  naver_mention_count: number;
  google_mention_count: number;
  naver_top20_urls: string[];
  google_top20_urls: string[];
}

// ── 네이버 블로그 상위 20건에서 당사 콘텐츠 카운트 ───────
async function countNaverMentions(
  keyword: string,
  targetPatterns: string[],
): Promise<{ count: number; urls: string[] }> {
  try {
    const resp = await searchNaverBlog(keyword, 20, "sim");
    const urls = resp.items.map((item) => item.link);
    let count = 0;

    for (const url of urls) {
      const lowerUrl = url.toLowerCase();
      for (const pattern of targetPatterns) {
        if (lowerUrl.includes(pattern.toLowerCase())) {
          count++;
          break;
        }
      }
    }

    return { count, urls };
  } catch (e) {
    console.warn(`[mention-count] 네이버 검색 실패: ${keyword}`, e);
    return { count: 0, urls: [] };
  }
}

// ── 구글 상위 20건에서 당사 콘텐츠 카운트 ────────────────
async function countGoogleMentions(
  keyword: string,
  targetPatterns: string[],
): Promise<{ count: number; urls: string[] }> {
  try {
    const resp = await searchGoogle(keyword, { num: 20 });
    if (!resp) return { count: 0, urls: [] };

    const urls = resp.organic.map((item) => item.link);
    let count = 0;

    for (const url of urls) {
      const lowerUrl = url.toLowerCase();
      for (const pattern of targetPatterns) {
        if (lowerUrl.includes(pattern.toLowerCase())) {
          count++;
          break;
        }
      }
    }

    return { count, urls };
  } catch (e) {
    console.warn(`[mention-count] 구글 검색 실패: ${keyword}`, e);
    return { count: 0, urls: [] };
  }
}

// ── 타겟 URL 패턴 생성 ──────────────────────────────────
/**
 * 클라이언트의 블로그 URL, 웹사이트 URL, 업체명에서
 * 매칭 패턴을 추출한다.
 *
 * @param blogUrls 블로그 계정 URL 목록
 * @param websiteUrl 웹사이트 URL (nullable)
 * @param brandName 업체명 (nullable)
 */
export function buildTargetPatterns(
  blogUrls: string[],
  websiteUrl?: string | null,
  brandName?: string | null,
): string[] {
  const patterns: string[] = [];

  for (const url of blogUrls) {
    if (!url) continue;
    // blog.naver.com/blogid → "blog.naver.com/blogid" 패턴
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      const pathSegment = parsed.pathname.split("/").filter(Boolean)[0];
      if (parsed.hostname.includes("blog.naver.com") && pathSegment) {
        patterns.push(`blog.naver.com/${pathSegment}`);
      } else {
        patterns.push(parsed.hostname);
      }
    } catch {
      patterns.push(url);
    }
  }

  if (websiteUrl) {
    try {
      const parsed = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
      patterns.push(parsed.hostname);
    } catch {
      patterns.push(websiteUrl);
    }
  }

  return [...new Set(patterns.filter(Boolean))];
}

// ── 메인 함수: 키워드별 mention_count 계산 ───────────────
export async function collectMentionCount(
  keyword: string,
  targetPatterns: string[],
): Promise<MentionCountResult> {
  const [naver, google] = await Promise.allSettled([
    countNaverMentions(keyword, targetPatterns),
    countGoogleMentions(keyword, targetPatterns),
  ]);

  const naverResult = naver.status === "fulfilled" ? naver.value : { count: 0, urls: [] };
  const googleResult = google.status === "fulfilled" ? google.value : { count: 0, urls: [] };

  return {
    keyword,
    naver_mention_count: naverResult.count,
    google_mention_count: googleResult.count,
    naver_top20_urls: naverResult.urls,
    google_top20_urls: googleResult.urls,
  };
}
