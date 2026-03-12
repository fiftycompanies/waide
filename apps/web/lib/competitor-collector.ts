/**
 * competitor-collector.ts
 * 경쟁사 TOP5 수집 — 네이버 로컬 검색 API 활용
 *
 * 기존 place-analyzer.ts의 checkKeywordRankings 패턴을 재사용하여
 * 같은 키워드의 네이버 로컬 검색 TOP5 매장 데이터를 수집.
 */

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface CompetitorData {
  name: string;
  placeId: string;
  rank: number;
  reviewCount: number;
  blogReviewCount: number;
  category: string;
  address: string;
  imageCount: number;
  hasBusinessHours: boolean;
  hasReservation: boolean;
  link: string;
}

// ═══════════════════════════════════════════
// 메인: collectCompetitors
// ═══════════════════════════════════════════

export async function collectCompetitors(params: {
  keywords: string[];
  myPlaceId: string;
  limit?: number;
}): Promise<CompetitorData[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  // API 키 없으면 빈 배열 반환
  if (!clientId || !clientSecret) {
    console.warn("[competitor-collector] NAVER_CLIENT_ID/SECRET 미설정, 빈 배열 반환");
    return [];
  }

  const limit = params.limit ?? 5;
  const mainKeyword = params.keywords[0];
  if (!mainKeyword) return [];

  const competitors: CompetitorData[] = [];
  const seen = new Set<string>();

  try {
    // 네이버 로컬 검색 API — 상위 10개 수집 (내 매장 제외 후 limit개)
    const searchParams = new URLSearchParams({
      query: mainKeyword,
      display: "5",
      start: "1",
    });

    // 최대 2번 요청 (start=1, start=6) → 최대 10개
    for (let start = 1; start <= 6; start += 5) {
      searchParams.set("start", String(start));

      const res = await fetch(
        `https://openapi.naver.com/v1/search/local.json?${searchParams}`,
        {
          headers: {
            "X-Naver-Client-Id": clientId,
            "X-Naver-Client-Secret": clientSecret,
          },
        },
      );

      if (!res.ok) break;
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = data.items ?? [];
      if (items.length === 0) break;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const title = (item.title ?? "").replace(/<[^>]*>/g, "");

        // place_id 추출 시도 (link에서)
        const link = item.link ?? "";
        const placeIdMatch = link.match(/place\/(\d+)/);
        const placeId = placeIdMatch ? placeIdMatch[1] : "";

        // 내 매장 제외
        if (placeId && placeId === params.myPlaceId) continue;
        if (seen.has(title)) continue;
        seen.add(title);

        competitors.push({
          name: title,
          placeId: placeId || `local_${start + i}`,
          rank: start + i,
          reviewCount: 0,       // 로컬 검색 API에서 제공 안 함
          blogReviewCount: 0,
          category: (item.category ?? "").replace(/<[^>]*>/g, ""),
          address: (item.roadAddress || item.address || "").replace(/<[^>]*>/g, ""),
          imageCount: 0,
          hasBusinessHours: false,
          hasReservation: false,
          link,
        });

        if (competitors.length >= limit) break;
      }

      if (competitors.length >= limit) break;
    }
  } catch (error) {
    console.error("[competitor-collector] 로컬 검색 실패:", error);
  }

  // TODO: 각 경쟁사의 GraphQL 플레이스 데이터 수집 (Phase F-3에서 구현)
  // 현재는 로컬 검색 결과만으로 기본 데이터 반환
  // GraphQL 수집 시: 리뷰수, 블로그리뷰수, 이미지수, 영업시간, 예약 등 추가

  return competitors;
}
