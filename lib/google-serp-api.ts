/**
 * Serper API를 통한 구글 검색 순위 조회 모듈
 *
 * Serper API (https://serper.dev)를 사용하여
 * 구글 검색에서 특정 키워드의 순위를 추출한다.
 *
 * - 월 2,500건 무료
 * - 환경변수: SERPER_API_KEY
 * - 결과 수: 상위 20개
 *
 * 사용처:
 *   - lib/google-serp-collector.ts
 */

// ── 타입 ────────────────────────────────────────────────

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SerperSearchResponse {
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
    num: number;
  };
  organic: SerperOrganicResult[];
  searchInformation?: {
    totalResults?: number;
  };
}

export interface GoogleRankResult {
  rank: number | null;
  url: string | null;
  title: string | null;
  totalResults: number;
}

// ── Serper API 호출 ──────────────────────────────────────

/**
 * Serper API로 구글 검색 실행
 *
 * SERPER_API_KEY 미설정 시 null 반환 (graceful skip)
 */
export async function searchGoogle(
  query: string,
  options?: { gl?: string; hl?: string; num?: number },
): Promise<SerperSearchResponse | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn("[google-serp-api] SERPER_API_KEY 환경변수 미설정 — 구글 순위 수집 스킵");
    return null;
  }

  try {
    const resp = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        gl: options?.gl ?? "kr",
        hl: options?.hl ?? "ko",
        num: options?.num ?? 20,
      }),
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.warn(`[google-serp-api] HTTP ${resp.status}: ${text.slice(0, 200)}`);
      return null;
    }

    return await resp.json();
  } catch (err) {
    console.warn("[google-serp-api] 요청 실패:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ── URL 매칭 유틸 ────────────────────────────────────────

function extractDomainPattern(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);

    // blog.naver.com/blogid → blog.naver.com/blogid
    if (u.hostname.includes("blog.naver.com")) {
      const pathParts = u.pathname.split("/").filter(Boolean);
      return pathParts.length > 0
        ? `blog.naver.com/${pathParts[0]}`
        : "blog.naver.com";
    }

    // xxx.tistory.com → xxx.tistory.com
    if (u.hostname.includes("tistory.com")) {
      return u.hostname;
    }

    // 일반 도메인: hostname
    return u.hostname;
  } catch {
    return url.toLowerCase();
  }
}

// ── 검색 결과에서 우리 URL의 순위 찾기 ──────────────────

/**
 * 구글 검색 결과에서 우리 URL 매칭
 *
 * targetUrls에 포함된 도메인/경로가 검색 결과에 매칭되면 해당 순위 반환
 */
export function findGoogleRank(
  organicResults: SerperOrganicResult[],
  targetUrls: string[],
): GoogleRankResult {
  const totalResults = organicResults.length;

  const targetPatterns = targetUrls
    .map(extractDomainPattern)
    .filter((p): p is string => p != null);

  if (targetPatterns.length === 0) {
    return { rank: null, url: null, title: null, totalResults };
  }

  for (const result of organicResults) {
    const link = result.link.toLowerCase();
    for (const pattern of targetPatterns) {
      if (link.includes(pattern.toLowerCase())) {
        return {
          rank: result.position,
          url: result.link,
          title: result.title,
          totalResults,
        };
      }
    }
  }

  return { rank: null, url: null, title: null, totalResults };
}
