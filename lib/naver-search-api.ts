/**
 * 네이버 검색 API 블로그 검색 모듈
 *
 * openapi.naver.com/v1/search/blog.json 을 사용하여
 * 키워드 검색 결과에서 우리 블로그의 순위를 추출한다.
 *
 * - 일일 25,000회 제한
 * - display 최대 100건
 * - PC/MO 구분 없음 (통합 순위)
 */

// ── 타입 ────────────────────────────────────────────────
export interface NaverBlogSearchItem {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  bloggerlink: string;
  postdate: string; // YYYYMMDD
}

export interface NaverBlogSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverBlogSearchItem[];
}

export interface BlogRankResult {
  rank: number | null;
  matchedBlogId: string | null;
  matchedUrl: string | null;
}

// ── 네이버 블로그 검색 API 호출 ─────────────────────────
export async function searchNaverBlog(
  query: string,
  display: number = 100,
  sort: "sim" | "date" = "sim",
): Promise<NaverBlogSearchResponse> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    query,
    display: String(Math.min(display, 100)),
    sort,
  });

  const resp = await fetch(`https://openapi.naver.com/v1/search/blog.json?${params}`, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`네이버 검색 API HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }

  return resp.json();
}

// ── 블로그 ID 추출 유틸 ─────────────────────────────────
function extractBlogId(url: string): string | null {
  // https://blog.naver.com/BLOGID/12345 형태
  const m = url.match(/blog\.naver\.com\/([a-zA-Z0-9_]+)/);
  return m ? m[1] : null;
}

// ── 검색 결과에서 우리 블로그 순위 찾기 ──────────────────
export function findBlogRank(
  items: NaverBlogSearchItem[],
  ourBlogIds: string[],
  maxRank: number = 100,
): BlogRankResult {
  const limit = Math.min(items.length, maxRank);
  const lowerIds = ourBlogIds.map((id) => id.toLowerCase());

  for (let i = 0; i < limit; i++) {
    const item = items[i];

    // 1) link에서 blogId 추출
    const blogIdFromLink = extractBlogId(item.link);
    if (blogIdFromLink && lowerIds.includes(blogIdFromLink.toLowerCase())) {
      return { rank: i + 1, matchedBlogId: blogIdFromLink, matchedUrl: item.link };
    }

    // 2) bloggerlink에서 매칭 (link에 blogId 없는 경우 대비)
    const blogIdFromBlogger = extractBlogId(
      item.bloggerlink.startsWith("http") ? item.bloggerlink : `https://${item.bloggerlink}`,
    );
    if (blogIdFromBlogger && lowerIds.includes(blogIdFromBlogger.toLowerCase())) {
      return { rank: i + 1, matchedBlogId: blogIdFromBlogger, matchedUrl: item.link };
    }
  }

  return { rank: null, matchedBlogId: null, matchedUrl: null };
}
