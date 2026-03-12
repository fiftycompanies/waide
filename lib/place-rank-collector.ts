/**
 * place-rank-collector.ts
 *
 * 네이버 로컬 검색 API를 통해 플레이스 순위를 수집
 * (기존 checkKeywordRankings 로직 기반 — 배치 크론 전용 유틸)
 *
 * Phase 2-C: 플레이스 순위(place_rank_pc, place_rank_mo) 수집
 *
 * 참고: 네이버 로컬 검색 API는 PC/MO 구분이 없으므로
 * 동일 순위를 place_rank_pc, place_rank_mo에 모두 저장
 */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PlaceRankResult {
  keyword: string;
  keyword_id: string;
  place_rank: number | null; // 1-50, null=미노출
}

/**
 * 네이버 로컬 검색 API로 플레이스 순위 조회 (50위까지)
 *
 * @param keyword 검색 키워드
 * @param placeName 플레이스 업체명 (HTML 태그 제거 후 비교)
 * @param placeAddress 업체 주소 (부분 매칭)
 */
export async function findPlaceRank(
  keyword: string,
  placeName: string,
  placeAddress: string,
): Promise<number | null> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const cleanPlaceName = placeName.replace(/\s/g, "");

  try {
    for (let start = 1; start <= 46; start += 5) {
      const params = new URLSearchParams({
        query: keyword,
        display: "5",
        start: String(start),
      });

      const res = await fetch(
        `https://openapi.naver.com/v1/search/local.json?${params}`,
        {
          headers: {
            "X-Naver-Client-Id": clientId,
            "X-Naver-Client-Secret": clientSecret,
          },
          cache: "no-store",
        },
      );

      if (!res.ok) break;
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = data.items ?? [];
      if (items.length === 0) break;

      const idx = items.findIndex((item) => {
        const title = (item.title ?? "")
          .replace(/<[^>]*>/g, "")
          .replace(/\s/g, "");
        return (
          title.includes(cleanPlaceName) ||
          cleanPlaceName.includes(title) ||
          (item.address ?? "").includes(placeAddress)
        );
      });

      if (idx !== -1) {
        return start + idx;
      }
    }
  } catch (error) {
    console.error(`[place-rank] ${keyword} 검색 실패:`, error);
  }

  return null;
}

/**
 * 여러 키워드에 대해 플레이스 순위를 일괄 수집
 *
 * @param keywords 키워드 목록 (id, keyword 필수)
 * @param placeName 업체명
 * @param placeAddress 업체 주소
 * @param delayMs 키워드 간 딜레이 (기본 500ms)
 */
export async function collectPlaceRanks(
  keywords: Array<{ id: string; keyword: string }>,
  placeName: string,
  placeAddress: string,
  delayMs: number = 500,
): Promise<PlaceRankResult[]> {
  const results: PlaceRankResult[] = [];

  for (const kw of keywords) {
    const rank = await findPlaceRank(kw.keyword, placeName, placeAddress);
    results.push({
      keyword: kw.keyword,
      keyword_id: kw.id,
      place_rank: rank,
    });

    if (keywords.indexOf(kw) < keywords.length - 1) {
      await sleep(delayMs);
    }
  }

  return results;
}
