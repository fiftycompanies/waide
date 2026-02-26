/**
 * place-analyzer.ts
 * 네이버 플레이스 URL → 브랜드 분석 엔진.
 *
 * Step 1: URL 파싱 + place_id 획득
 * Step 2: 데이터 수집 (summary API + 검색 API)
 * Step 3: 메인 키워드 자동 생성
 * Step 4: 키워드 분석 (검색량, 경쟁도)
 * Step 5: AI 종합 분석 (Claude API)
 */

import { createAdminClient } from "@/lib/supabase/service";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface ParseResult {
  placeId: string | null;
  resolvedUrl: string;
  urlType: "naver_place" | "google_maps" | "website";
}

interface CollectedData {
  name: string;
  category: string;
  businessType: string;
  roadAddress: string;
  address: string;
  phone: string;
  businessHours: string;
  visitorReviewCount: number;
  blogReviewCount: number;
  serviceLabels: string[];
  imageCount: number;
  imageUrls: Array<{ url: string; type: string }>;
  homepageUrl: string;
  snsUrl: string;
  description: string;
  latitude?: number;
  longitude?: number;
  facilities: string[];
  paymentMethods: string[];
  reservationUrl: string;
  reviewKeywords: Array<{ keyword: string; count: number }>;
  nearbyCompetitors: number;
}

interface KeywordItem {
  keyword: string;
  intent: string;
  priority: "high" | "medium" | "low";
  monthlySearch?: number;
  competition?: string;
}

// ═══════════════════════════════════════════
// Step 1. URL 파싱 + place_id 획득
// ═══════════════════════════════════════════

export async function parseUrl(inputUrl: string): Promise<ParseResult> {
  let url = inputUrl.trim();
  if (!url.startsWith("http")) url = "https://" + url;

  // A) 네이버 플레이스 URL
  if (url.includes("naver.me") || url.includes("map.naver.com") || url.includes("place.naver.com") || url.includes("naver.com/p/")) {
    let resolvedUrl = url;

    // 축약 URL 리다이렉트 추적
    if (url.includes("naver.me")) {
      try {
        const resp = await fetch(url, {
          redirect: "follow",
          headers: { "User-Agent": BROWSER_UA },
        });
        resolvedUrl = resp.url;
      } catch {
        resolvedUrl = url;
      }
    }

    // place_id 추출
    const patterns = [/\/place\/(\d+)/, /placeid=(\d+)/, /\/entry\/place\/(\d+)/];
    for (const pat of patterns) {
      const m = resolvedUrl.match(pat);
      if (m) {
        return { placeId: m[1], resolvedUrl, urlType: "naver_place" };
      }
    }
    return { placeId: null, resolvedUrl, urlType: "naver_place" };
  }

  // B) 구글맵 URL
  if (url.includes("google.com/maps") || url.includes("goo.gl/maps") || url.includes("maps.app.goo.gl")) {
    let resolvedUrl = url;
    try {
      const resp = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": BROWSER_UA },
      });
      resolvedUrl = resp.url;
    } catch {
      /* pass */
    }

    // 구글맵 URL에서 업체명 추출 (/place/업체명/ 패턴)
    const placeMatch = resolvedUrl.match(/\/place\/([^/]+)/);
    let placeName = "";
    if (placeMatch) {
      placeName = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
    }

    // 네이버 검색 API로 place_id 찾기
    if (placeName) {
      const placeId = await searchNaverPlaceId(placeName);
      if (placeId) {
        return { placeId, resolvedUrl, urlType: "google_maps" };
      }
    }
    return { placeId: null, resolvedUrl, urlType: "google_maps" };
  }

  // C) 일반 웹사이트 URL
  let resolvedUrl = url;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA },
    });
    const html = await resp.text();

    // title에서 업체명 추출
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().split(/[|\-–—]/)[0].trim() : "";

    if (title) {
      const placeId = await searchNaverPlaceId(title);
      if (placeId) {
        return { placeId, resolvedUrl, urlType: "website" };
      }
    }
  } catch {
    /* pass */
  }
  return { placeId: null, resolvedUrl, urlType: "website" };
}

/** 네이버 검색 API로 업체명 검색 → place_id 추출 */
async function searchNaverPlaceId(query: string): Promise<string | null> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const params = new URLSearchParams({ query, display: "5" });
    const resp = await fetch(
      `https://openapi.naver.com/v1/search/local.json?${params}`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const items = data.items ?? [];
    if (items.length === 0) return null;

    // 첫 번째 결과의 mapx/mapy로 place_id 검색 시도
    // 또는 link에서 place_id 추출
    for (const item of items) {
      const link: string = item.link ?? "";
      const m = link.match(/place\/(\d+)/);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// Step 2. 데이터 수집
// ═══════════════════════════════════════════

async function collectPlaceData(placeId: string): Promise<CollectedData> {
  const result: CollectedData = {
    name: "",
    category: "",
    businessType: "",
    roadAddress: "",
    address: "",
    phone: "",
    businessHours: "",
    visitorReviewCount: 0,
    blogReviewCount: 0,
    serviceLabels: [],
    imageCount: 0,
    imageUrls: [],
    homepageUrl: "",
    snsUrl: "",
    description: "",
    facilities: [],
    paymentMethods: [],
    reservationUrl: "",
    reviewKeywords: [],
    nearbyCompetitors: 0,
  };

  // GraphQL API 호출 (pcmap-api.place.naver.com)
  const GRAPHQL_QUERY = `{
    placeDetail(input: {id: "${placeId}", deviceType: "mobile", isNx: false, checkRedirect: false}) {
      base {
        id name category roadAddress address phone virtualPhone
        visitorReviewsTotal visitorReviewsScore
        microReviews conveniences
        coordinate { x y }
      }
      description
      newBusinessHours {
        businessStatusDescription { status description }
        businessHours { day businessHours { start end } }
      }
      menus { name price recommend description }
      homepages { repr { url type } }
      images { images { origin url } }
      fsasReviews { total }
    }
  }`;

  try {
    const resp = await fetch("https://pcmap-api.place.naver.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BROWSER_UA,
        Accept: "*/*",
        Origin: "https://m.place.naver.com",
        Referer: "https://m.place.naver.com/",
      },
      body: JSON.stringify({ query: GRAPHQL_QUERY }),
    });

    if (resp.ok) {
      const gqlRes = await resp.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail: any = gqlRes?.data?.placeDetail;

      if (detail?.base) {
        const base = detail.base;
        result.name = base.name ?? "";
        result.category = base.category ?? "";
        result.roadAddress = base.roadAddress ?? "";
        result.address = base.address ?? "";
        result.phone = base.phone ?? base.virtualPhone ?? "";
        result.visitorReviewCount = base.visitorReviewsTotal ?? 0;

        // 좌표
        if (base.coordinate) {
          result.longitude = parseFloat(base.coordinate.x) || undefined;
          result.latitude = parseFloat(base.coordinate.y) || undefined;
        }

        // 소개글 (microReviews 배열)
        if (base.microReviews && Array.isArray(base.microReviews)) {
          result.description = base.microReviews.filter(Boolean).join(" ");
        }

        // 편의시설 (conveniences 배열)
        if (base.conveniences && Array.isArray(base.conveniences)) {
          result.facilities = base.conveniences.filter(Boolean);
        }

        console.log(`[place-analyzer] GraphQL base: name=${result.name}, reviews=${result.visitorReviewCount}, facilities=${result.facilities.length}`);
      }

      // 상세 설명 (description은 별도 필드 — microReviews보다 상세)
      if (detail.description && typeof detail.description === "string") {
        result.description = detail.description;
      }

      // 블로그 리뷰 수
      if (detail.fsasReviews?.total) {
        result.blogReviewCount = detail.fsasReviews.total;
      }

      // 영업시간 — newBusinessHours 배열
      if (detail.newBusinessHours && Array.isArray(detail.newBusinessHours)) {
        const nbh = detail.newBusinessHours[0];
        if (nbh) {
          const statusDesc = nbh.businessStatusDescription;
          const hours = nbh.businessHours;
          if (hours && Array.isArray(hours) && hours.length > 0) {
            result.businessHours = hours
              .map((h: { day?: string; businessHours?: { start?: string; end?: string } }) => {
                const day = h.day ?? "";
                const start = h.businessHours?.start ?? "";
                const end = h.businessHours?.end ?? "";
                return start && end ? `${day} ${start}~${end}` : "";
              })
              .filter(Boolean)
              .join(", ");
          }
          // 영업시간이 없으면 상태만이라도 사용
          if (!result.businessHours && statusDesc?.status) {
            result.businessHours = statusDesc.status;
          }
        }
      }

      // 메뉴
      if (detail.menus && Array.isArray(detail.menus) && detail.menus.length > 0) {
        if (!result.serviceLabels.includes("메뉴")) {
          result.serviceLabels.push("메뉴");
        }
        console.log(`[place-analyzer] GraphQL menus: ${detail.menus.length}개`);
      }

      // 홈페이지 URL
      if (detail.homepages?.repr?.url) {
        result.homepageUrl = detail.homepages.repr.url;
      }

      // 이미지 — GraphQL images
      if (detail.images?.images && Array.isArray(detail.images.images)) {
        const imgList = detail.images.images;
        result.imageCount = imgList.length;
        for (const img of imgList.slice(0, 20)) {
          const imgUrl = img.origin || img.url || "";
          if (!imgUrl) continue;
          result.imageUrls.push({ url: imgUrl, type: "photo" });
        }
        console.log(`[place-analyzer] GraphQL images: ${result.imageUrls.length}장`);
      }

      console.log(`[place-analyzer] GraphQL 완료: desc=${result.description.length}자, hours="${result.businessHours}", blog=${result.blogReviewCount}`);
    } else {
      console.log(`[place-analyzer] GraphQL API 응답: ${resp.status}`);
    }
  } catch (e) {
    console.log(`[place-analyzer] GraphQL API 실패:`, e);
  }

  // 이미지 보충: pcmap 페이지에서 이미지 URL 추출
  if (result.imageUrls.length < 5) {
    try {
      const photoResp = await fetch(
        `https://pcmap.place.naver.com/place/${placeId}/photo`,
        { headers: { "User-Agent": BROWSER_UA } }
      );
      if (photoResp.ok) {
        const html = await photoResp.text();
        // phinf.pstatic.net 원본 URL 추출 (ldb-phinf, blogphinf 등 다양한 서브도메인)
        const srcMatches = html.match(/[a-z-]*phinf\.pstatic\.net\/[^&\s"')\\]+/g) ?? [];
        const decoded = srcMatches.map(m => {
          try { return "https://" + decodeURIComponent(m); } catch { return ""; }
        }).filter(Boolean);
        // 중복 제거 + 쿼리 파라미터 제거 (같은 이미지의 리사이즈 버전 제거)
        const unique = [...new Set(decoded.map(u => u.split("?")[0]))];
        console.log(`[place-analyzer] pcmap photo 페이지에서 ${unique.length}장 추출`);
        for (const pUrl of unique.slice(0, 20)) {
          if (result.imageUrls.some(i => i.url.split("?")[0] === pUrl)) continue;
          result.imageUrls.push({ url: pUrl, type: "photo" });
          if (result.imageUrls.length >= 20) break;
        }
        if (!result.imageCount && unique.length > 0) {
          result.imageCount = Math.max(result.imageCount, unique.length);
        }
      } else {
        console.log(`[place-analyzer] pcmap photo 응답: ${photoResp.status}`);
      }
    } catch (e) {
      console.log(`[place-analyzer] pcmap photo 실패:`, e);
    }
  }

  // 이미지 최종 폴백: 모바일 플레이스 메인 페이지에서 이미지 추출
  if (result.imageUrls.length === 0) {
    try {
      const mobileResp = await fetch(
        `https://m.place.naver.com/place/${placeId}/home`,
        { headers: { "User-Agent": BROWSER_UA } }
      );
      if (mobileResp.ok) {
        const html = await mobileResp.text();
        const imgMatches = html.match(/[a-z-]*phinf\.pstatic\.net\/[^&\s"')\\]+/g) ?? [];
        const decoded = imgMatches.map(m => {
          try { return "https://" + decodeURIComponent(m); } catch { return ""; }
        }).filter(Boolean);
        const unique = [...new Set(decoded.map(u => u.split("?")[0]))];
        console.log(`[place-analyzer] 모바일 home 페이지에서 ${unique.length}장 추출`);
        for (const mUrl of unique.slice(0, 10)) {
          result.imageUrls.push({ url: mUrl, type: "mobile" });
        }
        if (!result.imageCount && unique.length > 0) {
          result.imageCount = unique.length;
        }
      }
    } catch { /* 모바일 페이지 실패 → 무시 */ }
  }

  console.log(`[place-analyzer] 최종 이미지: ${result.imageUrls.length}장 (imageCount=${result.imageCount})`);

  // 리뷰 키워드 수집 (GraphQL visitorReviewStats)
  try {
    const kwQuery = `{ placeDetail(input: {id: "${placeId}", deviceType: "mobile", isNx: false, checkRedirect: false}) { visitorReviewStats { analysis { themes { label count } } } } }`;
    const kwResp = await fetch("https://pcmap-api.place.naver.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BROWSER_UA,
        Accept: "*/*",
        Origin: "https://m.place.naver.com",
        Referer: "https://m.place.naver.com/",
      },
      body: JSON.stringify({ query: kwQuery }),
    });
    if (kwResp.ok) {
      const kwData = await kwResp.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const themes = kwData?.data?.placeDetail?.visitorReviewStats?.analysis?.themes ?? [];
      result.reviewKeywords = themes
        .slice(0, 10)
        .map((t: { label?: string; count?: number }) => ({
          keyword: t.label ?? "",
          count: t.count ?? 0,
        }))
        .filter((k: { keyword: string }) => k.keyword);
      console.log(`[place-analyzer] 리뷰 키워드: ${result.reviewKeywords.length}개 수집`);
    }
  } catch {
    /* 리뷰 키워드 실패 → 무시 */
  }

  // 네이버 검색 API로 보충
  if (result.name) {
    const region = result.roadAddress.split(" ")[1] ?? "";
    const searchQuery = `${result.name} ${region}`.trim();
    const fb = await searchNaverLocal(searchQuery);
    if (fb) {
      if (fb.description && !result.description)
        result.description = fb.description;
      if (fb.link && !result.homepageUrl) result.homepageUrl = fb.link;
      if (fb.category && !result.category) result.category = fb.category;
    }

    // 주변 경쟁업체 수 (같은 업종 지역 검색)
    if (result.category) {
      const industry = detectIndustry(result.category, result.name);
      const competitorQuery = `${region || result.roadAddress.split(" ").slice(0, 2).join(" ")} ${industry}`;
      try {
        const compFb = await searchNaverLocal(competitorQuery);
        if (compFb && compFb._total) {
          result.nearbyCompetitors = Math.min(compFb._total, 100);
        }
      } catch { /* 무시 */ }
    }
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function searchNaverLocal(query: string): Promise<any | null> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const params = new URLSearchParams({ query, display: "5" });
    const resp = await fetch(
      `https://openapi.naver.com/v1/search/local.json?${params}`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const items = data.items ?? [];
    if (items.length === 0) return null;
    const item = items[0];
    return {
      name: (item.title ?? "").replace(/<[^>]+>/g, ""),
      category: item.category ?? "",
      address: item.address ?? "",
      roadAddress: item.roadAddress ?? "",
      phone: item.telephone ?? "",
      description: item.description ?? "",
      link: item.link ?? "",
      _total: data.total ?? items.length,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// Step 3. 키워드 후보 대량 생성 (v2)
// ═══════════════════════════════════════════

// ── 업종별 하위 키워드군 ──
const INDUSTRY_SUB_KEYWORDS: Record<string, string[]> = {
  숙소: ["펜션", "풀빌라", "숙소", "호텔", "모텔", "게스트하우스", "글램핑", "에어비앤비"],
  음식점: ["맛집", "밥집", "점심", "저녁", "회식", "데이트", "혼밥", "맛집추천"],
  카페: ["카페", "브런치", "디저트", "베이커리", "감성카페"],
  캠핑장: ["캠핑장", "오토캠핑", "글램핑", "차박", "캠핑"],
  술집: ["술집", "이자카야", "와인바", "호프", "혼술"],
  병원: ["병원", "의원", "클리닉"],
  미용실: ["미용실", "헤어샵", "네일", "속눈썹", "피부관리"],
  학원: ["학원", "과외", "교습소"],
  헬스장: ["헬스장", "PT", "필라테스", "요가", "크로스핏"],
  마사지: ["마사지", "스파", "타이마사지"],
  동물병원: ["동물병원", "반려동물", "펫"],
  꽃집: ["꽃집", "꽃배달", "플라워샵"],
};

// ── 업종 판별 → 대분류 키 ──
const INDUSTRY_PATTERNS: [RegExp, string][] = [
  [/카페|커피|디저트|베이커리|빵/, "카페"],
  [/술|바|pub|주점|호프|와인|이자카야/, "술집"],
  [/병원|의원|클리닉|치과|한의원|피부과|성형|안과|내과|외과|정형/, "병원"],
  [/숙소|호텔|펜션|모텔|리조트|게스트하우스|민박/, "숙소"],
  [/캠핑|글램핑/, "캠핑장"],
  [/미용|헤어|살롱|네일|뷰티|속눈썹/, "미용실"],
  [/학원|교습|과외|스터디/, "학원"],
  [/헬스|피트니스|요가|필라테스|짐|크로스핏/, "헬스장"],
  [/마사지|스파|찜질/, "마사지"],
  [/동물|수의|펫/, "동물병원"],
  [/꽃|플라워/, "꽃집"],
  [/음식|식당|레스토랑|맛집|한식|중식|일식|양식|곱창|삼겹|치킨|피자|국밥|냉면|칼국수|분식|고기|해물|횟집|초밥|돈까스|떡볶이|족발|보쌈|샤브|뷔페|쌀국수|라멘|우동/, "음식점"],
];

function detectIndustry(category: string, name: string): string {
  const text = `${category} ${name}`.toLowerCase();
  for (const [pat, key] of INDUSTRY_PATTERNS) {
    if (pat.test(text)) return key;
  }
  return "음식점"; // 기본
}

// ── 근교 도시 매핑 (시/군 → 가장 가까운 대도시) ──
const NEARBY_CITY_MAP: Record<string, string> = {
  // 대구 생활권
  칠곡군: "대구", 구미시: "대구", 김천시: "대구", 상주시: "대구", 영천시: "대구", 경산시: "대구", 성주군: "대구", 고령군: "대구", 달성군: "대구", 군위군: "대구",
  // 서울 근교
  가평군: "서울", 양평군: "서울", 포천시: "서울", 남양주시: "서울", 파주시: "서울", 양주시: "서울", 연천군: "서울", 동두천시: "서울",
  하남시: "서울", 구리시: "서울", 광주시: "서울", 성남시: "서울", 용인시: "서울", 화성시: "서울", 수원시: "서울", 안양시: "서울",
  의왕시: "서울", 과천시: "서울", 안산시: "서울", 시흥시: "서울", 부천시: "서울", 김포시: "서울", 고양시: "서울", 의정부시: "서울",
  // 서울(강원) 근교
  양양군: "서울", 속초시: "서울", 강릉시: "서울", 춘천시: "서울", 홍천군: "서울", 인제군: "서울", 평창군: "서울", 정선군: "서울", 원주시: "서울",
  // 부산 생활권
  거제시: "부산", 통영시: "부산", 남해군: "부산", 하동군: "부산", 사천시: "부산", 진주시: "부산", 김해시: "부산", 양산시: "부산", 창원시: "부산", 밀양시: "부산",
  // 광주 생활권
  여수시: "광주", 순천시: "광주", 광양시: "광주", 담양군: "광주", 나주시: "광주", 화순군: "광주", 곡성군: "광주", 구례군: "광주",
  // 대전 생활권
  태안군: "대전", 서천군: "대전", 보령시: "대전", 공주시: "대전", 논산시: "대전", 계룡시: "대전", 금산군: "대전", 세종시: "대전", 청주시: "대전", 천안시: "대전", 아산시: "대전",
};

// ── 도 → 도청소재지 ──
const PROVINCE_CAPITAL: Record<string, string> = {
  경기: "서울", 강원: "서울", 충북: "대전", 충남: "대전",
  전북: "전주", 전남: "광주", 경북: "대구", 경남: "부산", 제주: "제주",
};

interface AddressParts {
  sido: string;     // 서울, 경기, 경북 등
  sigungu: string;  // 송파구, 칠곡군, 속초시
  dong: string;     // 방이동, 석촌동 등
  nearCity: string; // 근교 대도시
}

function parseAddress(address: string): AddressParts {
  const parts = address.split(" ");
  let sido = "";
  let sigungu = "";
  let dong = "";

  // 유명 생활권 매핑
  const stationMap: Record<string, string> = {
    방이동: "잠실", 잠실동: "잠실", 석촌동: "잠실", 송파동: "송파",
    신사동: "신사", 압구정동: "압구정", 역삼동: "강남", 서초동: "강남",
    삼성동: "삼성", 이태원동: "이태원", 한남동: "한남", 망원동: "망원",
    연남동: "연남", 합정동: "합정", 성수동: "성수", 회기동: "회기",
  };

  for (const part of parts) {
    if (!sido && (part.endsWith("도") || part.endsWith("시") || part.endsWith("특별시") || part.endsWith("광역시") || part === "서울" || part === "세종" || part === "제주")) {
      sido = part.replace(/(특별시|광역시|특별자치시|특별자치도)$/, "");
    } else if (!sigungu && (part.endsWith("구") || part.endsWith("군") || part.endsWith("시"))) {
      sigungu = part;
    } else if (!dong && part.endsWith("동") && !part.includes("로") && !part.includes("길")) {
      dong = part;
    } else if (!dong && (part.endsWith("읍") || part.endsWith("면"))) {
      dong = part;
    }
  }

  // 도로명 주소에서 동 못찾으면 stationMap 키 매칭
  if (!dong && sigungu) {
    for (const d of Object.keys(stationMap)) {
      if (address.includes(d)) { dong = d; break; }
    }
  }

  // 근교 도시 결정
  let nearCity = "";
  if (sigungu && NEARBY_CITY_MAP[sigungu]) {
    nearCity = NEARBY_CITY_MAP[sigungu];
  } else if (sido) {
    const shortSido = sido.replace(/(도|시)$/, "");
    nearCity = PROVINCE_CAPITAL[shortSido] ?? "";
  }

  return { sido, sigungu, dong, nearCity };
}

function generateKeywordCandidates(
  collected: CollectedData
): Array<{ keyword: string; source: string }> {
  // 도로명 + 지번 둘 다 파싱하여 동 정보 보완
  const addrRoad = parseAddress(collected.roadAddress || collected.address);
  const addrJibun = collected.address ? parseAddress(collected.address) : addrRoad;
  const addr = {
    ...addrRoad,
    dong: addrRoad.dong || addrJibun.dong, // 도로명에서 동 못찾으면 지번에서
  };
  const industry = detectIndustry(collected.category, collected.name);
  const subKws = INDUSTRY_SUB_KEYWORDS[industry] ?? ["맛집"];

  // 병원인 경우 카테고리에서 전문과목 추출
  if (industry === "병원") {
    const specialties = collected.category.split(/[,>]/).map(s => s.trim()).filter(Boolean);
    for (const sp of specialties) {
      if (!subKws.includes(sp)) subKws.push(sp);
    }
  }

  const candidates: Array<{ keyword: string; source: string }> = [];
  const seen = new Set<string>();
  const add = (kw: string, source: string) => {
    const clean = kw.trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    candidates.push({ keyword: clean, source });
  };

  // ── 지역 변형 생성 ──
  const regions: Array<{ name: string; source: string }> = [];

  // 1단계: 동/면/읍
  if (addr.dong) {
    const shortDong = addr.dong.replace(/(동|읍|면)$/, "");
    regions.push({ name: shortDong, source: "행정구역(동)" });
    regions.push({ name: addr.dong, source: "행정구역(동)" });
  }
  // 2단계: 시/군/구
  if (addr.sigungu) {
    const shortSigungu = addr.sigungu.replace(/(구|군|시)$/, "");
    regions.push({ name: addr.sigungu, source: "행정구역(구)" });
    regions.push({ name: shortSigungu, source: "행정구역(구)" });
    // 도+시군구
    if (addr.sido && addr.sido !== "서울") {
      regions.push({ name: `${addr.sido.replace(/(도|시)$/, "")} ${shortSigungu}`, source: "행정구역(시도)" });
    }
  }
  // 3단계: 근교 대도시
  if (addr.nearCity && addr.nearCity !== addr.sido?.replace(/(도|시)$/, "")) {
    regions.push({ name: `${addr.nearCity} 근교`, source: "생활권/근교" });
  }

  // ── 지역 × 업종 조합 ──
  for (const region of regions) {
    for (const sub of subKws) {
      add(`${region.name} ${sub}`, region.source);
    }
  }

  // ── 추가 패턴 ──
  const primaryRegion = addr.dong
    ? addr.dong.replace(/(동|읍|면)$/, "")
    : addr.sigungu?.replace(/(구|군|시)$/, "") ?? "";

  if (primaryRegion) {
    add(`${primaryRegion} ${subKws[0]} 추천`, "추천패턴");
    add(`${primaryRegion} ${subKws[0]} 가성비`, "가성비패턴");
    // 서비스 라벨 기반 특성 키워드
    for (const label of collected.serviceLabels.slice(0, 3)) {
      add(`${primaryRegion} ${label} ${subKws[0]}`, "특성키워드");
    }
  }

  // 브랜드 키워드
  add(collected.name, "브랜드");

  return candidates;
}

// ═══════════════════════════════════════════
// Step 4. 검색량 조회 + 필터링 (v2)
// ═══════════════════════════════════════════

interface KeywordItemV2 extends KeywordItem {
  source: string;
}

async function analyzeKeywordsV2(
  candidates: Array<{ keyword: string; source: string }>,
  brandName: string
): Promise<KeywordItemV2[]> {
  // 검색량 조회 (네이버 광고 API)
  const volumeMap = new Map<string, number>();
  try {
    const { getKeywordSearchVolume } = await import("@/lib/naver-keyword-api");
    const allKws = candidates.map(c => c.keyword);
    for (let i = 0; i < allKws.length; i += 5) {
      const batch = allKws.slice(i, i + 5);
      try {
        const volumes = await getKeywordSearchVolume(batch);
        for (const v of volumes) {
          volumeMap.set(v.keyword, v.monthlyTotal);
        }
      } catch { /* API 키 없을 수 있음 */ }
      if (i + 5 < allKws.length) await sleep(300); // rate limit
    }
  } catch { /* 모듈 로드 실패 */ }

  // 검색량 매핑 + 필터링
  const hasVolumeData = volumeMap.size > 0;
  const results: KeywordItemV2[] = [];
  for (const c of candidates) {
    const cleanKw = c.keyword.replace(/\s+/g, "");
    const vol = volumeMap.get(cleanKw) ?? 0;

    // 검색량 데이터가 있을 때만 0인 키워드 필터링 (API 실패 시 전부 유지)
    if (hasVolumeData && vol === 0 && c.source !== "브랜드") continue;

    let priority: "high" | "medium" | "low" = "medium";
    if (hasVolumeData) {
      if (vol >= 3000) priority = "high";
      else if (vol < 500) priority = "low";
    } else {
      // 검색량 없을 때 소스 기반 우선순위
      if (c.source.includes("동") || c.source === "브랜드") priority = "high";
      else if (c.source.includes("구")) priority = "medium";
      else priority = "low";
    }
    if (c.source === "브랜드") priority = "high";

    let intent = "정보성 검색";
    if (c.keyword.includes("추천") || c.keyword.includes("가성비"))
      intent = "비교/추천 검색";
    else if (c.keyword.includes("데이트") || c.keyword.includes("회식") || c.keyword.includes("혼밥"))
      intent = "상황별 검색";
    else if (c.source === "브랜드")
      intent = "브랜드 직접 검색";
    else if (c.source.startsWith("생활권"))
      intent = "근교/여행 검색";
    else
      intent = "지역 검색";

    results.push({
      keyword: c.keyword,
      intent,
      priority,
      monthlySearch: vol || undefined,
      competition: hasVolumeData
        ? (vol > 5000 ? "높음" : vol > 1000 ? "중간" : "낮음")
        : undefined,
      source: c.source,
    });
  }

  // 검색량 높은 순 정렬 (검색량 없으면 우선순위 기반)
  results.sort((a, b) => {
    if ((a.monthlySearch ?? 0) !== (b.monthlySearch ?? 0)) {
      return (b.monthlySearch ?? 0) - (a.monthlySearch ?? 0);
    }
    const prio = { high: 3, medium: 2, low: 1 };
    return prio[b.priority] - prio[a.priority];
  });

  return results.slice(0, 20);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════
// Step 5-A. 마케팅 종합 점수 (데이터 기반 v2)
// ═══════════════════════════════════════════

interface ScoreBreakdown {
  review_reputation: { score: number; max: number; details: string };
  naver_keyword: { score: number; max: number; details: string; place_score?: number; place_max?: number; blog_score?: number; blog_max?: number };
  google_keyword: { score: number; max: number; details: string };
  image_quality: { score: number; max: number; details: string };
  online_channels: { score: number; max: number; details: string };
  seo_aeo_readiness: { score: number; max: number; details: string };
}

interface MarketingScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  improvements: string[];
}

async function calculateMarketingScore(
  collected: CollectedData,
  keywords: KeywordItemV2[],
  brandName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageAnalysis?: any,
  keywordRankings?: KeywordRanking[],
): Promise<MarketingScoreResult> {
  const improvements: string[] = [];

  // ① 네이버 리뷰/평판 (20점)
  let reviewScore = 0;
  let reviewDetail = "";
  const vr = collected.visitorReviewCount;
  const br = collected.blogReviewCount;

  if (vr >= 500) reviewScore += 8;
  else if (vr >= 100) reviewScore += 5;
  else if (vr >= 10) reviewScore += 3;
  else { reviewScore += 0; improvements.push(`방문자 리뷰가 ${vr}건으로 적어요 → 리뷰 이벤트로 100건 이상 확보 시 +${5 - reviewScore}점`); }

  if (br >= 200) reviewScore += 7;
  else if (br >= 50) reviewScore += 4;
  else if (br >= 10) reviewScore += 2;
  else { improvements.push(`블로그 리뷰가 ${br}건이에요 → 블로그 콘텐츠 발행으로 50건 이상 달성 시 +${4 - Math.min(reviewScore - 8, 2)}점`); }

  // 별점은 플레이스에서 직접 가져올 수 없으므로 리뷰 수 기반 보정 (5점 할당)
  if (vr >= 100) reviewScore += 5;
  else if (vr >= 30) reviewScore += 3;
  else reviewScore += 1;

  reviewDetail = `방문자 ${vr.toLocaleString()}건 / 블로그 ${br.toLocaleString()}건`;

  // ② 네이버 키워드 노출 (25점 = 플레이스 15 + 블로그 10)
  const topKeyword = keywords.find(k => k.source !== "브랜드" && (k.monthlySearch ?? 0) > 0);
  const mainKw = topKeyword?.keyword ?? brandName;

  // ②-A: 플레이스(로컬) 검색 노출 (15점) — keyword_rankings 활용
  let placeScore = 0;
  let placeDetail = "";
  if (keywordRankings && keywordRankings.length > 0) {
    const scores: number[] = keywordRankings.map(kr => {
      if (!kr.rank) return 0;
      if (kr.rank <= 3) return 100;
      if (kr.rank <= 5) return 80;
      if (kr.rank <= 10) return 60;
      if (kr.rank <= 20) return 30;
      return 10;
    });
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    placeScore = Math.round((avgScore / 100) * 15);
    const top3Count = keywordRankings.filter(kr => kr.rank && kr.rank <= 3).length;
    const exposedCount = keywordRankings.filter(kr => kr.rank !== null).length;
    placeDetail = `플레이스 TOP3 ${top3Count}개, 노출 ${exposedCount}/${keywordRankings.length}`;
    if (placeScore < 10) {
      improvements.push(`플레이스 검색 노출이 약해요 → 플레이스 최적화로 +${15 - placeScore}점 가능`);
    }
  } else {
    placeDetail = "플레이스 순위 데이터 없음";
  }

  // ②-B: 블로그 검색 노출 (10점) — 기존 로직 유지
  let blogScore = 0;
  let blogDetail = "";
  try {
    const { searchNaverBlog } = await import("@/lib/naver-search-api");
    const blogResult = await searchNaverBlog(mainKw, 30);
    let foundRank: number | null = null;
    for (let i = 0; i < blogResult.items.length; i++) {
      const item = blogResult.items[i];
      const titleClean = item.title.replace(/<[^>]+>/g, "");
      if (titleClean.includes(brandName) || item.description.replace(/<[^>]+>/g, "").includes(brandName)) {
        foundRank = i + 1;
        break;
      }
    }

    if (foundRank && foundRank <= 3) { blogScore = 10; blogDetail = `블로그 TOP${foundRank}`; }
    else if (foundRank && foundRank <= 10) { blogScore = 7; blogDetail = `블로그 ${foundRank}위`; }
    else if (foundRank && foundRank <= 30) { blogScore = 4; blogDetail = `블로그 ${foundRank}위`; }
    else { blogScore = 0; blogDetail = "블로그 미노출"; improvements.push(`"${mainKw}" 블로그 노출이 없어요 → 콘텐츠 발행 시 +10점 가능`); }
  } catch {
    blogDetail = "블로그 검색 API 미연결";
  }

  const naverKwScore = placeScore + blogScore;
  const naverKwDetail = `${placeDetail} / ${blogDetail}`;

  // ③ 구글 키워드 노출 (15점) — MVP: 측정 예정
  const googleKwScore = 0;
  const googleKwDetail = "측정 예정 (Google Search API 연동 후 측정)";

  // ④ 이미지 품질 (10점)
  let imageScore = 0;
  let imageDetail = "";

  if (imageAnalysis && imageAnalysis.analyses?.length > 0) {
    // Vision AI 분석 결과 있음 → 10점 만점
    // (a) 이미지 수: 3점 만점
    let countScore = 0;
    if (collected.imageCount >= 50) countScore = 3;
    else if (collected.imageCount >= 20) countScore = 2;
    else if (collected.imageCount >= 5) countScore = 1;

    // (b) 평균 quality_score: 4점 만점
    const avgQ = imageAnalysis.avgQuality ?? 0;
    let qualityScore = 0;
    if (avgQ >= 8) qualityScore = 4;
    else if (avgQ >= 6) qualityScore = 3;
    else if (avgQ >= 4) qualityScore = 2;
    else qualityScore = 1;

    // (c) 평균 marketing_usability: 3점 만점
    const avgU = imageAnalysis.avgUsability ?? 0;
    let usabilityScore = 0;
    if (avgU >= 8) usabilityScore = 3;
    else if (avgU >= 6) usabilityScore = 2;
    else usabilityScore = 1;

    imageScore = countScore + qualityScore + usabilityScore;
    imageDetail = `이미지 ${collected.imageCount}장 / AI 품질 ${avgQ.toFixed(1)}/10 / 활용도 ${avgU.toFixed(1)}/10`;

    if (imageScore < 7) {
      const tips = imageAnalysis.improvementTips ?? [];
      if (tips.length > 0) {
        improvements.push(`이미지 품질 개선: ${tips[0]} → +${10 - imageScore}점 가능`);
      }
    }
  } else {
    // Vision AI 미실행 → 이미지 수 기반 5점 만점 (기존 MVP)
    if (collected.imageCount >= 50) imageScore = 5;
    else if (collected.imageCount >= 20) imageScore = 3;
    else if (collected.imageCount >= 5) imageScore = 1;
    else { improvements.push(`이미지가 ${collected.imageCount}장이에요 → 고품질 사진 50장 이상 등록 시 +${5 - imageScore}점`); }
    imageDetail = `이미지 ${collected.imageCount}장 등록 (Vision AI 분석 시 더 정확한 평가 가능)`;
  }

  // ⑤ 온라인 채널 완성도 (15점)
  let channelScore = 0;
  const channelParts: string[] = [];
  if (collected.homepageUrl) { channelScore += 5; channelParts.push("홈페이지 ✓"); }
  else { improvements.push("홈페이지가 없어요 → 홈페이지 개설 시 +5점"); }
  if (collected.snsUrl) { channelScore += 3; channelParts.push("SNS ✓"); }
  else { improvements.push("SNS 채널이 없어요 → 인스타그램/블로그 개설 시 +3점"); }
  if (collected.serviceLabels.some(l => /예약|reservation/i.test(l))) { channelScore += 3; channelParts.push("네이버 예약 ✓"); }
  else { improvements.push("네이버 예약이 비활성화 → 활성화 시 +3점"); }
  if (collected.serviceLabels.some(l => /톡톡|talktalk/i.test(l))) { channelScore += 2; channelParts.push("네이버 톡톡 ✓"); }
  if (collected.businessHours) { channelScore += 2; channelParts.push("영업시간 ✓"); }
  const channelDetail = channelParts.length > 0 ? channelParts.join(" / ") : "등록된 채널 없음";

  // ⑥ SEO/AEO 준비도 (15점) — MVP: 블로그 기반 10점
  let seoScore = 0;
  let seoDetail = "";
  try {
    const { searchNaverBlog } = await import("@/lib/naver-search-api");
    // 브랜드명 검색
    const brandResult = await searchNaverBlog(brandName, 10);
    const hasBrandBlog = brandResult.items.some(item =>
      item.title.replace(/<[^>]+>/g, "").includes(brandName)
    );
    if (hasBrandBlog) { seoScore += 5; seoDetail += "브랜드 블로그 글 ✓"; }
    else { improvements.push(`"${brandName}" 검색 시 블로그 글이 없어요 → 브랜드 리뷰 콘텐츠 발행 시 +5점`); seoDetail += "브랜드 블로그 글 ✗"; }

    // 메인 키워드 검색
    if (topKeyword) {
      const kwResult = await searchNaverBlog(`${topKeyword.keyword} ${brandName}`, 10);
      const hasKwBlog = kwResult.items.some(item =>
        item.title.replace(/<[^>]+>/g, "").includes(brandName)
      );
      if (hasKwBlog) { seoScore += 5; seoDetail += " / 키워드 블로그 ✓"; }
      else { improvements.push(`"${topKeyword.keyword}" 관련 블로그 글이 없어요 → 키워드 타겟 콘텐츠 발행 시 +5점`); seoDetail += " / 키워드 블로그 ✗"; }
    }
  } catch {
    seoDetail = "네이버 검색 API 미연결";
  }

  // 총점 계산 (MVP 측정 가능 영역: 20+25+5+15+10 = 75점)
  const measurableMax = 20 + 25 + 5 + 15 + 10; // 75
  const rawScore = reviewScore + naverKwScore + imageScore + channelScore + seoScore;
  const normalizedScore = Math.round((rawScore / measurableMax) * 100);

  // 개선 포인트를 효과 큰 순으로 정렬 (점수 숫자 추출)
  improvements.sort((a, b) => {
    const extractPts = (s: string) => {
      const m = s.match(/\+(\d+)점/);
      return m ? parseInt(m[1], 10) : 0;
    };
    return extractPts(b) - extractPts(a);
  });

  return {
    score: Math.min(100, normalizedScore),
    breakdown: {
      review_reputation: { score: reviewScore, max: 20, details: reviewDetail },
      naver_keyword: { score: naverKwScore, max: 25, details: naverKwDetail, place_score: placeScore, place_max: 15, blog_score: blogScore, blog_max: 10 },
      google_keyword: { score: googleKwScore, max: 15, details: googleKwDetail },
      image_quality: { score: imageScore, max: 10, details: imageDetail },
      online_channels: { score: channelScore, max: 15, details: channelDetail },
      seo_aeo_readiness: { score: seoScore, max: 15, details: seoDetail },
    },
    improvements,
  };
}

// ═══════════════════════════════════════════
// Step 5-B. AI 콘텐츠 전략 분석 (Claude API)
// ═══════════════════════════════════════════

async function analyzeWithClaude(
  collected: CollectedData,
  keywords: KeywordItemV2[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const systemPrompt = `당신은 B2B 마케팅 전략 컨설턴트입니다.
네이버 플레이스 업체 데이터를 분석하여 콘텐츠 마케팅 전략을 수립합니다.
마케팅 점수는 별도 시스템이 계산하므로 포함하지 마세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "brand_analysis": {
    "industry": {"main": "대분류", "sub": "소분류"},
    "tone": {
      "style": "글쓰기 스타일",
      "personality": "브랜드 성격",
      "example_phrases": ["예시 표현 3~5개"]
    },
    "target_audience": {
      "primary": "주요 타겟",
      "secondary": "보조 타겟",
      "pain_points": ["고객 고민 3~5개"],
      "search_intent": "핵심 검색 의도"
    },
    "usp": ["차별화 포인트 3~5개"],
    "selling_points_from_reviews": ["리뷰 기반 강점 3~5개"],
    "price_position": "가격 포지셔닝",
    "signature_products": ["시그니처 메뉴/상품 3~5개"],
    "cta": {"primary": "메인 CTA", "secondary": "보조 CTA"},
    "forbidden_terms": ["금기 표현 3~5개"]
  },
  "content_strategy": {
    "recommended_content_types": ["list", "single" 등],
    "posting_frequency": "주 N회",
    "competitor_differentiation": "경쟁사 차별화 전략",
    "content_angles": ["콘텐츠 주제 5~10개"]
  }
}`;

  const topKws = keywords.slice(0, 10).map(k => `${k.keyword}(${k.monthlySearch ?? 0})`).join(", ");
  const userPrompt = `아래 업체 데이터를 분석하세요:

## 수집 데이터
- 업체명: ${collected.name}
- 카테고리: ${collected.category}
- 주소: ${collected.roadAddress || collected.address}
- 방문자리뷰: ${collected.visitorReviewCount}건 / 블로그리뷰: ${collected.blogReviewCount}건
- 이미지: ${collected.imageCount}장
- 서비스: ${collected.serviceLabels.join(", ") || "없음"}
- 홈페이지: ${collected.homepageUrl || "없음"}
- SNS: ${collected.snsUrl || "없음"}

## 키워드 TOP 10 (검색량순)
${topKws}

## 분석 요청
1. 업종 분류, 톤앤매너, USP, 타겟 분석
2. 리뷰 기반 강점 추정
3. 콘텐츠 전략 (타입, 빈도, 주제)

JSON으로만 응답하세요.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Claude API error: ${resp.status} ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  let text = data.content?.[0]?.text ?? "";

  // JSON 추출
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) text = jsonMatch[1];
  else {
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) text = braceMatch[0];
  }

  return JSON.parse(text);
}

// ═══════════════════════════════════════════
// Main orchestrator
// ═══════════════════════════════════════════

export async function runFullAnalysis(analysisId: string): Promise<void> {
  const db = createAdminClient();

  // 분석 레코드 가져오기
  const { data: analysis, error } = await db
    .from("brand_analyses")
    .select("*")
    .eq("id", analysisId)
    .single();

  if (error || !analysis) throw new Error("Analysis not found");

  // status → analyzing
  await db
    .from("brand_analyses")
    .update({ status: "analyzing" })
    .eq("id", analysisId);

  try {
    // Step 1: URL 파싱
    const parsed = await parseUrl(analysis.input_url);

    if (!parsed.placeId) {
      await db.from("brand_analyses").update({
        status: "failed",
        basic_info: { error: "place_id를 찾을 수 없습니다. 네이버 플레이스 URL을 직접 입력해주세요." },
      }).eq("id", analysisId);
      return;
    }

    // place_id 저장
    await db
      .from("brand_analyses")
      .update({
        place_id: parsed.placeId,
        url_type: parsed.urlType,
      })
      .eq("id", analysisId);

    // Step 2: 데이터 수집
    const collected = await collectPlaceData(parsed.placeId);

    if (!collected.name) {
      await db.from("brand_analyses").update({
        status: "failed",
        basic_info: { error: "매장 정보를 수집할 수 없습니다." },
      }).eq("id", analysisId);
      return;
    }

    // Step 3: 키워드 후보 대량 생성
    const candidates = generateKeywordCandidates(collected);

    // Step 4: 검색량 조회 + 필터링
    const keywords = await analyzeKeywordsV2(candidates, collected.name);

    // Step 5-B: AI 콘텐츠 전략 분석
    const aiResult = await analyzeWithClaude(collected, keywords);

    // 지역 추출
    const addr = parseAddress(collected.roadAddress || collected.address);
    const region = addr.dong
      ? `${addr.sigungu} ${addr.dong}`
      : addr.sigungu || "";

    // Step 6: 이미지 분석 (Vision AI — 설정에서 활성화된 경우만)
    // 이미지 수집은 collectPlaceData에서 이미 완료됨 (collected.imageUrls)
    console.log(`[place-analyzer] 이미지 수집 완료: ${collected.imageUrls.length}장`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let imageAnalysisResult: any = null;
    try {
      const { getAnalysisOptions } = await import("@/lib/actions/settings-actions");
      const opts = await getAnalysisOptions();
      console.log(`[place-analyzer] 이미지 분석 설정: enabled=${opts.image_analysis_enabled}, count=${opts.image_analysis_count}`);
      if (opts.image_analysis_enabled && collected.imageUrls.length > 0) {
        const { analyzeImages } = await import("@/lib/image-analyzer");
        imageAnalysisResult = await analyzeImages(
          collected.imageUrls.slice(0, opts.image_analysis_count),
          collected.name,
          collected.category,
        );
      }
    } catch (imgErr) {
      console.error("Image analysis failed (non-blocking):", imgErr);
    }

    // Step 6.5: SEO 결격 사유 진단 (non-blocking)
    let seoAuditResult: SeoAudit | null = null;
    try {
      const industry = detectIndustry(collected.category, collected.name);
      seoAuditResult = await analyzeSeoAudit(
        collected,
        parsed.placeId,
        region,
        industry,
        !!imageAnalysisResult,
      );
    } catch (seoErr) {
      console.error("SEO audit failed (non-blocking):", seoErr);
    }

    // Step 6.6: 키워드 순위 체크 (non-blocking)
    // 지역 키워드 우선 (브랜드명 제외), 검색량 순
    let keywordRankingsResult: KeywordRanking[] = [];
    try {
      const rankTargets = [
        ...keywords.filter(k => k.source !== "브랜드"),
        ...keywords.filter(k => k.source === "브랜드"),
      ].slice(0, 3).map(k => ({ keyword: k.keyword, monthlySearch: k.monthlySearch }));
      keywordRankingsResult = await checkKeywordRankings(
        rankTargets,
        collected.name,
        collected.roadAddress || collected.address,
      );
    } catch (kwErr) {
      console.error("Keyword ranking check failed (non-blocking):", kwErr);
    }

    // Step 5-A: 마케팅 점수 산출 (이미지 분석 + 키워드 순위 반영)
    let scoreResult = await calculateMarketingScore(
      collected, keywords, collected.name,
      imageAnalysisResult ?? undefined,
      keywordRankingsResult.length > 0 ? keywordRankingsResult : undefined,
    );

    // DB 저장
    const basicInfo = {
      name: collected.name,
      category: collected.category,
      business_type: collected.businessType,
      address: collected.roadAddress || collected.address,
      phone: collected.phone,
      hours: collected.businessHours,
      homepage_url: collected.homepageUrl,
      sns_url: collected.snsUrl,
      visitor_reviews: collected.visitorReviewCount,
      blog_reviews: collected.blogReviewCount,
      service_labels: collected.serviceLabels,
      image_count: collected.imageCount,
      facilities: collected.facilities,
      payment_methods: collected.paymentMethods,
      reservation_url: collected.reservationUrl,
      nearby_competitors: collected.nearbyCompetitors || undefined,
      region,
    };

    const topKw = keywords[0];
    const keywordAnalysis = {
      main_keyword: topKw?.keyword ?? "",
      secondary_keyword: keywords[1]?.keyword ?? "",
      tertiary_keyword: keywords[2]?.keyword ?? "",
      brand_keyword: collected.name,
      keywords: keywords.map(k => ({
        keyword: k.keyword,
        intent: k.intent,
        priority: k.priority,
        monthlySearch: k.monthlySearch,
        competition: k.competition,
        source: k.source,
      })),
    };

    const menuAnalysis = {
      signature_products: aiResult.brand_analysis?.signature_products ?? [],
      price_position: aiResult.brand_analysis?.price_position ?? "",
    };

    const reviewAnalysis = {
      selling_points: aiResult.brand_analysis?.selling_points_from_reviews ?? [],
      usp: aiResult.brand_analysis?.usp ?? [],
      visitor_reviews: collected.visitorReviewCount,
      blog_reviews: collected.blogReviewCount,
      review_keywords: collected.reviewKeywords.length > 0 ? collected.reviewKeywords : undefined,
    };

    // 이미지 분석 JSONB 구성 (항상 non-null — 수집 상태 기록)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let imageAnalysisData: Record<string, any>;
    if (imageAnalysisResult) {
      imageAnalysisData = {
        total_images: collected.imageCount,
        analyzed_count: imageAnalysisResult.analyses?.length ?? 0,
        avg_quality: imageAnalysisResult.avgQuality ?? 0,
        avg_marketing_usability: imageAnalysisResult.avgUsability ?? 0,
        dominant_mood: imageAnalysisResult.dominantMood ?? "",
        color_palette: imageAnalysisResult.colorPalette ?? [],
        images: imageAnalysisResult.analyses ?? [],
        improvement_tips: imageAnalysisResult.improvementTips ?? [],
        collected_urls: collected.imageUrls.slice(0, 10),
      };
    } else if (collected.imageUrls.length > 0) {
      imageAnalysisData = {
        total_images: collected.imageCount,
        analyzed_count: 0,
        collected_urls: collected.imageUrls.slice(0, 10),
      };
    } else {
      // 수집 자체 실패 — place에 이미지 없거나 수집 불가
      imageAnalysisData = {
        total_images: 0,
        analyzed_count: 0,
        collected_urls: [],
        collection_failed: true,
      };
    }

    // SEO 진단 결과 → 개선포인트 추가
    const seoImprovements = seoAuditResult ? seoAuditToImprovements(seoAuditResult) : [];
    const allImprovements = [...seoImprovements, ...scoreResult.improvements];

    const contentStrategy = {
      ...aiResult.content_strategy,
      brand_analysis: aiResult.brand_analysis,
      score_breakdown: scoreResult.breakdown,
      improvements: allImprovements,
    };

    await db
      .from("brand_analyses")
      .update({
        status: "completed",
        basic_info: basicInfo,
        menu_analysis: menuAnalysis,
        review_analysis: reviewAnalysis,
        keyword_analysis: keywordAnalysis,
        content_strategy: contentStrategy,
        marketing_score: scoreResult.score,
        image_analysis: imageAnalysisData,
        seo_audit: seoAuditResult,
        keyword_rankings: keywordRankingsResult.length > 0 ? keywordRankingsResult : null,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", analysisId);

    // ── Slack 알림 + 영업사원 카운터 (non-blocking) ──
    try {
      const salesRef = analysis.sales_ref as string | null;
      const placeName = (basicInfo as Record<string, unknown>)?.name ?? "알 수 없는 매장";
      const category = (basicInfo as Record<string, unknown>)?.category ?? "";
      const topKws = ((keywordAnalysis as Record<string, unknown>)?.keywords as Array<{keyword: string; monthlySearch?: number}> ?? [])
        .slice(0, 3)
        .map((k) => `${k.keyword} ${k.monthlySearch ? k.monthlySearch.toLocaleString() : ""}`)
        .join(", ");
      const kwCount = ((keywordAnalysis as Record<string, unknown>)?.keywords as unknown[] ?? []).length;
      const topImprove = ((contentStrategy as Record<string, unknown>)?.improvements as string[] ?? [])[0] ?? "";

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://waide.co.kr");
      const resultUrl = `${baseUrl}/analysis/${analysisId}`;

      const slackMsg = [
        `🔔 *[분석 완료] 새 리드가 들어왔어요!*`,
        ``,
        `📍 매장명: ${placeName}`,
        category ? `🏷️ 업종: ${category}` : null,
        `📊 마케팅 점수: ${scoreResult.score}/100`,
        `🔍 공략 키워드: ${kwCount}개 (${topKws})`,
        topImprove ? `\n💡 핵심 개선: ${topImprove}` : null,
        `\n👉 분석 결과 보기: ${resultUrl}`,
        salesRef ? `🎯 담당 영업: ${salesRef}` : null,
      ].filter(Boolean).join("\n");

      const slackToken = process.env.SLACK_BOT_TOKEN;
      if (slackToken) {
        let channel = process.env.SLACK_ALERTS_CHANNEL || "#alerts";

        if (salesRef) {
          // 영업사원 DM + 카운터 증가
          const { data: agent } = await db
            .from("sales_agents")
            .select("id, slack_user_id, total_analyses")
            .eq("ref_code", salesRef)
            .eq("is_active", true)
            .single();

          if (agent) {
            if (agent.slack_user_id) channel = agent.slack_user_id;
            await db.from("sales_agents").update({
              total_analyses: (agent.total_analyses ?? 0) + 1,
              updated_at: new Date().toISOString(),
            }).eq("id", agent.id);
          }
        }

        await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${slackToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ channel, text: slackMsg }),
        }).catch(() => {});
      }
    } catch {
      // Slack 실패해도 파이프라인 블로킹 금지
    }
  } catch (err) {
    console.error("Analysis failed:", err);
    await db.from("brand_analyses").update({
      status: "failed",
      basic_info: { error: String(err) },
    }).eq("id", analysisId);
  }
}

/** 기존 분석 결과 조회 (place_id 기준) */
export async function findExistingAnalysis(placeId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("brand_analyses")
    .select("id")
    .eq("place_id", placeId)
    .eq("status", "completed")
    .limit(1);

  return data?.[0]?.id ?? null;
}

// ═══════════════════════════════════════════
// SEO 결격 사유 진단 (Step 6.5)
// ═══════════════════════════════════════════

export interface AuditItem {
  key: string;
  label: string;
  value: string;
  status: "good" | "warning" | "danger" | "unknown";
  detail: string;
}

export interface SeoAudit {
  items: AuditItem[];
  totalIssues: number;
  criticalIssues: number;
  score: number;
}

function getCurrentSeason(): string {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "봄";
  if (m >= 6 && m <= 8) return "여름";
  if (m >= 9 && m <= 11) return "가을";
  return "겨울";
}

/** 2-1. 리뷰 답글률 (플레이스 리뷰 API — 여러 URL 시도) */
async function checkReviewReplyRate(placeId: string): Promise<AuditItem> {
  try {
    const query = `{ visitorReviews(input: {businessId: "${placeId}", page: 1, size: 30, sort: "recent", bookingBusinessId: null, businessType: "place"}) { items { body created reply { body } } total } }`;
    const resp = await fetch("https://pcmap-api.place.naver.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BROWSER_UA,
        Accept: "*/*",
        Origin: "https://m.place.naver.com",
        Referer: "https://m.place.naver.com/",
      },
      body: JSON.stringify({ query }),
    });
    if (!resp.ok) {
      return { key: "review_reply_rate", label: "최근 리뷰 답글률", value: "측정 불가", status: "unknown", detail: "리뷰 API 접근 실패" };
    }

    const gqlRes = await resp.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviews: any[] = gqlRes?.data?.visitorReviews?.items ?? [];
    if (reviews.length === 0) {
      return { key: "review_reply_rate", label: "최근 리뷰 답글률", value: "리뷰 없음", status: "unknown", detail: "방문자 리뷰가 없습니다" };
    }

    const repliedCount = reviews.filter((r: { reply?: { body?: string | null } }) =>
      r.reply?.body
    ).length;
    const replyRate = Math.round((repliedCount / reviews.length) * 100);

    const status = replyRate >= 80 ? "good" : replyRate >= 50 ? "warning" : "danger";
    return {
      key: "review_reply_rate",
      label: "최근 리뷰 답글률",
      value: `${replyRate}%`,
      status,
      detail: `최근 ${reviews.length}건 중 ${repliedCount}건 답글`,
    };
  } catch {
    return { key: "review_reply_rate", label: "최근 리뷰 답글률", value: "측정 불가", status: "unknown", detail: "리뷰 API 접근 실패" };
  }
}

/** 2-2. 대표 사진 분석 (Vision AI) */
async function checkMainPhoto(
  thumbnailUrl: string | undefined,
  businessName: string,
  category: string,
): Promise<AuditItem> {
  if (!thumbnailUrl) return { key: "photo_analysis", label: "대표 사진 분석", value: "사진 없음", status: "danger", detail: "대표 사진이 등록되지 않았습니다" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { key: "photo_analysis", label: "대표 사진 분석", value: "미분석", status: "unknown", detail: "API 키 미설정" };

  try {
    const season = getCurrentSeason();
    const month = new Date().getMonth() + 1;
    const prompt = `이 이미지는 "${businessName}" (${category})의 네이버 플레이스 대표 사진입니다.
현재 월: ${month}월 (${season})

마케팅/SEO 관점에서 분석해주세요. JSON만 출력:
{
  "season_match": true,
  "season_issue": "",
  "quality_score": 7,
  "appeal_score": 7,
  "is_professional": true,
  "main_issue": "",
  "improvement": ""
}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: [{ type: "image", source: { type: "url", url: thumbnailUrl } }, { type: "text", text: prompt }] }],
      }),
    });
    if (!resp.ok) return { key: "photo_analysis", label: "대표 사진 분석", value: "분석 실패", status: "unknown", detail: "Vision API 응답 실패" };

    const data = await resp.json();
    let text = data.content?.[0]?.text ?? "";
    const jsonM = text.match(/\{[\s\S]*\}/);
    if (jsonM) text = jsonM[0];
    const parsed = JSON.parse(text);

    if (!parsed.season_match) {
      return { key: "photo_analysis", label: "대표 사진 분석", value: "시즌 부적합", status: "danger", detail: parsed.season_issue || `${season}에 맞지 않는 사진` };
    }
    const q = Number(parsed.quality_score) || 5;
    if (q < 5) {
      return { key: "photo_analysis", label: "대표 사진 분석", value: `품질 개선 필요 (${q}/10)`, status: "warning", detail: parsed.main_issue || "품질 개선 필요" };
    }
    return { key: "photo_analysis", label: "대표 사진 분석", value: `양호 (${q}/10)`, status: "good", detail: parsed.improvement || "양호" };
  } catch {
    return { key: "photo_analysis", label: "대표 사진 분석", value: "분석 불가", status: "unknown", detail: "이미지 분석 실패" };
  }
}

/** 2-3. 정보성 키워드 밀도 */
function checkKeywordDensity(
  description: string,
  regionName: string,
  categoryName: string,
  subCategories: string[],
  facilities: string[],
): AuditItem {
  if (!description || description.length < 10) {
    return { key: "keyword_density", label: "정보성 키워드 밀도", value: "소개글 미등록", status: "danger", detail: "플레이스 소개글이 비어있습니다" };
  }

  const mustHaveKeywords = [
    regionName,
    categoryName,
    ...subCategories.slice(0, 3),
    ...facilities.filter(f => ["수영장", "바베큐", "조식", "주차", "와이파이", "키즈"].some(k => f.includes(k))),
  ].filter(Boolean);

  const unique = [...new Set(mustHaveKeywords)];
  if (unique.length === 0) return { key: "keyword_density", label: "정보성 키워드 밀도", value: "검증 불가", status: "unknown", detail: "비교 키워드 없음" };

  const found = unique.filter(kw => description.includes(kw));
  const missing = unique.filter(kw => !description.includes(kw));
  const density = Math.round((found.length / unique.length) * 100);

  const status = density >= 70 ? "good" : density >= 40 ? "warning" : "danger";
  const labelVal = density >= 70 ? "충분" : density >= 40 ? "보통" : "부족";

  return {
    key: "keyword_density",
    label: "정보성 키워드 밀도",
    value: labelVal,
    status,
    detail: missing.length > 0 ? `누락: ${missing.join(", ")}` : "모든 핵심 키워드 포함",
  };
}

/** 2-4. 영업시간 정확성 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkBusinessHours(businessHours: any): AuditItem {
  if (!businessHours) {
    return { key: "business_hours", label: "영업시간 정보", value: "미등록", status: "danger", detail: "영업시간이 등록되지 않았습니다" };
  }
  // 문자열이면 등록된 것으로 간주
  if (typeof businessHours === "string" && businessHours.length > 0) {
    return { key: "business_hours", label: "영업시간 정보", value: "정상", status: "good", detail: "영업시간 등록됨" };
  }
  // 배열이면 요일 수 체크
  if (Array.isArray(businessHours)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valid = businessHours.filter((h: any) => h.startTime || h.openTime).length;
    if (valid >= 5) return { key: "business_hours", label: "영업시간 정보", value: "정상", status: "good", detail: `${valid}/7일 등록` };
    return { key: "business_hours", label: "영업시간 정보", value: "일부만 등록", status: "warning", detail: `${valid}/7일만 등록` };
  }
  return { key: "business_hours", label: "영업시간 정보", value: "정상", status: "good", detail: "영업시간 등록됨" };
}

/** 2-5. 메뉴/가격 정보 — 편의시설 기반 체크 */
function checkMenuInfo(collected: CollectedData): AuditItem {
  const isAccommodation = ["숙박", "펜션", "호텔", "모텔", "리조트", "캠핑", "글램핑"].some(k => collected.category.includes(k));
  const label = isAccommodation ? "객실/요금 정보" : "메뉴/가격 정보";

  // 플레이스 API에서 메뉴는 별도 엔드포인트 → 서비스 라벨과 편의시설 기반 판단
  const hasMenu = collected.serviceLabels.some(l => /메뉴|menu|가격|price/i.test(l));
  if (hasMenu) return { key: "menu_completeness", label, value: "등록됨", status: "good", detail: "메뉴/가격 정보 확인" };

  // 서비스 라벨에 없지만 업종이 음식점이면 warning
  const isFood = ["음식", "식당", "맛집", "카페", "커피", "술", "치킨", "피자"].some(k => collected.category.includes(k));
  if (isFood) return { key: "menu_completeness", label, value: "미확인", status: "warning", detail: "메뉴 정보를 등록하면 고객 전환률이 높아집니다" };

  return { key: "menu_completeness", label, value: "해당없음", status: "good", detail: "업종 특성상 필수 아님" };
}

/** 2-6. 편의시설 태그 */
function checkFacilities(facilities: string[]): AuditItem {
  const count = facilities?.length || 0;
  const status = count >= 5 ? "good" : count >= 3 ? "warning" : "danger";
  return {
    key: "facility_tags",
    label: "편의시설 태그",
    value: count >= 5 ? `양호 (${count}개)` : count >= 3 ? `보통 (${count}개)` : `부족 (${count}개)`,
    status,
    detail: count > 0 ? facilities.join(", ") : "편의시설 태그 미등록",
  };
}

/** 2-7. SNS/톡톡 연동 */
function checkSnsIntegration(collected: CollectedData): AuditItem {
  const checks: Record<string, boolean> = {
    "네이버톡톡": collected.serviceLabels.some(l => /톡톡|talktalk/i.test(l)),
    "블로그/SNS": !!collected.snsUrl,
    "홈페이지": !!collected.homepageUrl,
    "예약": !!collected.reservationUrl || collected.serviceLabels.some(l => /예약|reservation/i.test(l)),
  };
  const connected = Object.entries(checks).filter(([, v]) => v).map(([k]) => k);
  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  const count = connected.length;

  const status = count >= 3 ? "good" : count >= 1 ? "warning" : "danger";
  return {
    key: "sns_integration",
    label: "SNS/채널 연동",
    value: count >= 3 ? `양호 (${count}개)` : count >= 1 ? `부족 (${count}개)` : "미연동",
    status,
    detail: missing.length > 0 ? `미연동: ${missing.join(", ")}` : "모든 채널 연동 완료",
  };
}

/** 2-8. 통합 SEO 진단 */
async function analyzeSeoAudit(
  collected: CollectedData,
  placeId: string,
  region: string,
  industry: string,
  imageEnabled: boolean,
): Promise<SeoAudit> {
  const items: AuditItem[] = [];

  // 1. 리뷰 답글률
  items.push(await checkReviewReplyRate(placeId));

  // 2. 대표 사진 (Vision AI)
  if (imageEnabled && collected.imageUrls.length > 0) {
    items.push(await checkMainPhoto(collected.imageUrls[0]?.url, collected.name, collected.category));
  } else {
    items.push({
      key: "photo_analysis", label: "대표 사진 분석",
      value: collected.imageUrls.length === 0 ? "사진 없음" : "미분석",
      status: collected.imageUrls.length === 0 ? "danger" : "unknown",
      detail: collected.imageUrls.length === 0 ? "대표 사진이 없습니다" : "이미지 분석 비활성화",
    });
  }

  // 3. 키워드 밀도
  const subCats = INDUSTRY_SUB_KEYWORDS[industry] ?? [];
  items.push(checkKeywordDensity(collected.description, region, industry, subCats, collected.facilities));

  // 4. 영업시간
  items.push(checkBusinessHours(collected.businessHours));

  // 5. 메뉴/가격
  items.push(checkMenuInfo(collected));

  // 6. 편의시설
  items.push(checkFacilities(collected.facilities));

  // 7. SNS 연동
  items.push(checkSnsIntegration(collected));

  // 집계
  const totalIssues = items.filter(i => i.status === "warning" || i.status === "danger").length;
  const criticalIssues = items.filter(i => i.status === "danger").length;
  const scorable = items.filter(i => i.status !== "unknown");
  const goodCount = scorable.filter(i => i.status === "good").length;
  const score = scorable.length > 0 ? Math.round((goodCount / scorable.length) * 100) : 0;

  return { items, totalIssues, criticalIssues, score };
}

// ═══════════════════════════════════════════
// 키워드 순위 체크 (Step 6.6)
// ═══════════════════════════════════════════

export interface KeywordRanking {
  keyword: string;
  searchVolume: number;
  rank: number | null;
  status: "good" | "warning" | "danger" | "not_found";
}

async function checkKeywordRankings(
  topKeywords: Array<{ keyword: string; monthlySearch?: number }>,
  placeName: string,
  placeAddress: string,
): Promise<KeywordRanking[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  // TOP 3 키워드만 (API 부하 최소화)
  const targets = [...topKeywords]
    .sort((a, b) => (b.monthlySearch ?? 0) - (a.monthlySearch ?? 0))
    .slice(0, 3);

  const results: KeywordRanking[] = [];
  const cleanPlaceName = placeName.replace(/\s/g, "");

  for (const kw of targets) {
    let rank: number | null = null;

    try {
      // 네이버 로컬 검색 API — 5개씩 최대 50위까지
      for (let start = 1; start <= 46; start += 5) {
        const params = new URLSearchParams({ query: kw.keyword, display: "5", start: String(start) });
        const res = await fetch(`https://openapi.naver.com/v1/search/local.json?${params}`, {
          headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret },
        });
        if (!res.ok) break;
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = data.items ?? [];
        if (items.length === 0) break;

        const idx = items.findIndex(item => {
          const title = (item.title ?? "").replace(/<[^>]*>/g, "").replace(/\s/g, "");
          return title.includes(cleanPlaceName) || cleanPlaceName.includes(title) || (item.address ?? "").includes(placeAddress);
        });

        if (idx !== -1) {
          rank = start + idx;
          break;
        }
      }
    } catch (error) {
      console.error(`[keyword-ranking] ${kw.keyword} 검색 실패:`, error);
    }

    results.push({
      keyword: kw.keyword,
      searchVolume: kw.monthlySearch ?? 0,
      rank,
      status: rank === null ? "not_found" : rank <= 5 ? "good" : rank <= 20 ? "warning" : "danger",
    });

    // API 부하 방지
    await sleep(300);
  }

  return results;
}

// ═══════════════════════════════════════════
// SEO 진단 → 개선포인트 변환 (Step 7)
// ═══════════════════════════════════════════

const AUDIT_ACTIONS: Record<string, string> = {
  review_reply_rate: "리뷰 답글을 꾸준히 작성하세요. 답글률 80% 이상이 권장됩니다.",
  photo_analysis: "현재 시즌에 맞는 대표 사진으로 교체하세요. 밝고 매력적인 사진이 클릭률을 높입니다.",
  keyword_density: "플레이스 소개글에 지역명, 업종명, 특장점 키워드를 자연스럽게 포함시키세요.",
  business_hours: "정확한 영업시간을 등록하세요. 요일별로 설정하는 것이 좋습니다.",
  menu_completeness: "모든 메뉴에 가격을 등록하세요. 사진도 함께 올리면 효과적입니다.",
  facility_tags: "편의시설 태그를 5개 이상 등록하세요 (주차, 와이파이, 배달 등).",
  sns_integration: "네이버톡톡, 인스타그램, 예약 기능을 연동하세요.",
};

function seoAuditToImprovements(audit: SeoAudit): string[] {
  const result: string[] = [];
  for (const item of audit.items) {
    if (item.status === "danger") {
      result.push(`[SEO 결격] ${item.label}: ${item.value} → ${AUDIT_ACTIONS[item.key] ?? "개선이 필요합니다."}`);
    } else if (item.status === "warning") {
      result.push(`[SEO 개선] ${item.label}: ${item.value} → ${AUDIT_ACTIONS[item.key] ?? "개선이 필요합니다."}`);
    }
  }
  return result;
}
