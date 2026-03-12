/**
 * naver-suggest-collector.ts
 * 네이버 자동완성 + 연관검색어 수집
 * AI가 아닌 크롤링 — 실제 검색 데이터 기반
 * ⚠️ 외부 API 호출이므로 try-catch 래핑 필수, 실패 시 빈 배열 반환
 */

export interface SuggestionResult {
  autocomplete: string[];
  relatedSearches: string[];
}

/**
 * 네이버 자동완성 + 연관검색어 수집
 */
export async function collectNaverSuggestions(keyword: string): Promise<SuggestionResult> {
  const [autocomplete, relatedSearches] = await Promise.all([
    fetchAutocomplete(keyword),
    fetchRelatedSearches(keyword),
  ]);

  return { autocomplete, relatedSearches };
}

/**
 * 네이버 자동완성 API
 * https://ac.search.naver.com/nx/ac?q=...&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8
 */
async function fetchAutocomplete(keyword: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      q: keyword,
      con: "1",
      frm: "nv",
      ans: "2",
      r_format: "json",
      r_enc: "UTF-8",
      r_unicode: "0",
      t_koreng: "1",
      run: "2",
      rev: "4",
      q_enc: "UTF-8",
    });

    const res = await fetch(`https://ac.search.naver.com/nx/ac?${params.toString()}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://search.naver.com/",
      },
    });

    if (!res.ok) {
      console.warn(`[naver-suggest] 자동완성 API 실패: ${res.status}`);
      return [];
    }

    const data = await res.json();
    // 응답 구조: { items: [["키워드1", ...], ["키워드2", ...], ...] }
    // items[0]이 자동완성 목록
    const items = data?.items;
    if (!Array.isArray(items) || items.length === 0) return [];

    // items[0]이 자동완성 키워드 배열
    const suggestions = items[0];
    if (!Array.isArray(suggestions)) return [];

    return suggestions
      .map((item: string | string[]) => (Array.isArray(item) ? item[0] : item))
      .filter((s: string) => typeof s === "string" && s.trim() !== keyword.trim())
      .slice(0, 10);
  } catch (err) {
    console.warn("[naver-suggest] 자동완성 수집 실패:", err);
    return [];
  }
}

/**
 * 네이버 연관검색어 수집
 * 네이버 검색 결과 HTML에서 연관검색어 영역 파싱
 */
async function fetchRelatedSearches(keyword: string): Promise<string[]> {
  try {
    const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    if (!res.ok) {
      console.warn(`[naver-suggest] 연관검색어 페이지 실패: ${res.status}`);
      return [];
    }

    const html = await res.text();

    // 연관검색어 추출: data-area="rkq" (연관 검색어 영역)
    // 패턴 1: <a ... class="keyword" ...>키워드</a> in related_keywords section
    const results: string[] = [];

    // 패턴: "tit":"키워드" in related keyword JSON
    const jsonPattern = /"tit"\s*:\s*"([^"]+)"/g;
    let match;
    while ((match = jsonPattern.exec(html)) !== null) {
      const kw = match[1].trim();
      if (kw && kw !== keyword.trim() && !results.includes(kw)) {
        results.push(kw);
      }
    }

    // 패턴 2: <span class="keyword">키워드</span> 형태
    if (results.length === 0) {
      const spanPattern = /class="keyword"[^>]*>([^<]+)</g;
      while ((match = spanPattern.exec(html)) !== null) {
        const kw = match[1].trim();
        if (kw && kw !== keyword.trim() && !results.includes(kw)) {
          results.push(kw);
        }
      }
    }

    // 패턴 3: data-clk="rkq" 영역의 텍스트
    if (results.length === 0) {
      const rkqPattern = /data-clk="rkq[^"]*"[^>]*>([^<]+)</g;
      while ((match = rkqPattern.exec(html)) !== null) {
        const kw = match[1].trim();
        if (kw && kw !== keyword.trim() && !results.includes(kw)) {
          results.push(kw);
        }
      }
    }

    return results.slice(0, 10);
  } catch (err) {
    console.warn("[naver-suggest] 연관검색어 수집 실패:", err);
    return [];
  }
}

/**
 * 매장 특성 키워드 추출 (플레이스 데이터에서)
 * 편의시설, 메뉴, 리뷰 긍정 키워드에서 콘텐츠 키워드 후보 추출
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractPlaceFeatureKeywords(placeData: any): string[] {
  const features: string[] = [];

  // 편의시설에서: 주차, 와이파이, 콘센트, 루프탑, 키즈존 등
  if (placeData.facilities && Array.isArray(placeData.facilities)) {
    for (const f of placeData.facilities) {
      const normalized = String(f).trim().toLowerCase();
      // 키워드화 가능한 편의시설만
      const keywordMap: Record<string, string> = {
        "주차": "주차",
        "무선인터넷": "와이파이",
        "wi-fi": "와이파이",
        "wifi": "와이파이",
        "콘센트": "콘센트",
        "루프탑": "루프탑",
        "테라스": "테라스",
        "키즈": "키즈존",
        "반려동물": "반려동물",
        "펫": "반려동물",
        "노키즈존": "노키즈존",
        "단체석": "단체석",
        "개별룸": "프라이빗룸",
        "발렛": "발렛주차",
      };
      for (const [key, val] of Object.entries(keywordMap)) {
        if (normalized.includes(key) && !features.includes(val)) {
          features.push(val);
        }
      }
    }
  }

  // 메뉴에서: 주요 메뉴 키워드 추출
  if (placeData.menuItems && typeof placeData.menuItems === "string") {
    const menuKeywords = ["브런치", "핸드드립", "수제", "디저트", "파스타", "스테이크",
      "오마카세", "코스요리", "뷔페", "칵테일", "와인", "크래프트맥주"];
    const menuText = placeData.menuItems.toLowerCase();
    for (const mk of menuKeywords) {
      if (menuText.includes(mk) && !features.includes(mk)) {
        features.push(mk);
      }
    }
  }

  // 리뷰 긍정 키워드에서
  if (placeData.positiveKeywords) {
    const positives = typeof placeData.positiveKeywords === "string"
      ? placeData.positiveKeywords.split(",").map((s: string) => s.trim())
      : Array.isArray(placeData.positiveKeywords)
        ? placeData.positiveKeywords
        : [];
    for (const pk of positives) {
      if (pk && !features.includes(pk)) {
        features.push(pk);
      }
    }
  }

  return features;
}
