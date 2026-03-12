/**
 * 네이버 DataLab 통합검색어 트렌드 API
 *
 * 네이버 광고 API 키가 없는 고객사의 키워드 검색량을 추정하는 폴백 모듈.
 *
 * 필요 환경변수 (.env.local):
 *   NAVER_CLIENT_ID       : 네이버 개발자센터 Client ID
 *   NAVER_CLIENT_SECRET   : 네이버 개발자센터 Client Secret
 *
 * 발급: https://developers.naver.com → 애플리케이션 등록 → 데이터랩(검색어트렌드)
 *
 * 제한:
 *   - 1회 요청당 최대 5개 그룹 (각 그룹 내 최대 20개 키워드)
 *   - 하루 1,000회 호출 제한
 *   - 응답은 상대적 비율(ratio, 0~100)이므로 절대 검색량이 아님
 */

const DATALAB_URL = "https://openapi.naver.com/v1/datalab/search";

export interface DatalabTrendResult {
  keyword: string;
  ratio: number;       // DataLab 상대 비율 (0~100)
  estimatedPc: number; // 추정 월간 PC 검색량
  estimatedMo: number; // 추정 월간 MO 검색량
  estimatedTotal: number;
}

interface DatalabApiResponse {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: Array<{
    title: string;
    keywords: string[];
    data: Array<{ period: string; ratio: number }>;
  }>;
}

/**
 * DataLab 트렌드 API로 키워드 검색 비율 조회.
 *
 * @param keywords - 최대 5개 키워드
 * @param calibrationFactor - 보정계수 (광고API 실측값으로 산출, 기본 1000)
 * @returns 키워드별 추정 검색량
 */
export async function getKeywordTrendVolume(
  keywords: string[],
  calibrationFactor: number = 1000
): Promise<DatalabTrendResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "네이버 DataLab API 키가 설정되지 않았습니다.\n" +
      ".env.local에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET를 추가하세요.\n" +
      "발급: https://developers.naver.com → 애플리케이션 등록"
    );
  }

  const batch = keywords.slice(0, 5);

  // 최근 30일 기간 설정
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  // 각 키워드를 개별 그룹으로 (그룹별 비율 비교용)
  const keywordGroups = batch.map((kw) => ({
    groupName: kw,
    keywords: [kw.replace(/\s+/g, "")],  // 공백 제거
  }));

  const body = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    timeUnit: "month",
    keywordGroups,
  };

  const res = await fetch(DATALAB_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataLab API 오류 (${res.status}): ${text}`);
  }

  const data: DatalabApiResponse = await res.json();

  return (data.results ?? []).map((group) => {
    // 최근 월의 ratio 사용 (마지막 데이터 포인트)
    const latestRatio = group.data.length > 0
      ? group.data[group.data.length - 1].ratio
      : 0;

    // ratio × 보정계수 → 추정 검색량
    // PC:MO 비율은 약 1:4로 추정 (한국 모바일 중심 시장)
    const estimatedTotal = Math.round(latestRatio * calibrationFactor / 100);
    const estimatedPc = Math.round(estimatedTotal * 0.2);
    const estimatedMo = estimatedTotal - estimatedPc;

    return {
      keyword: group.title,
      ratio: latestRatio,
      estimatedPc,
      estimatedMo,
      estimatedTotal,
    };
  });
}

/**
 * 보정계수 산출.
 *
 * 네이버 광고 API로 조회된 실측 검색량과 DataLab ratio를 비교하여
 * ratio → 절대 검색량 변환용 보정계수를 계산한다.
 *
 * 공식: calibrationFactor = (실측 검색량 / ratio) * 100
 *
 * @param knownVolume - 네이버 광고 API에서 확인된 월간 검색량 합계 (PC + MO)
 * @param ratio - 동일 키워드의 DataLab ratio (0~100)
 * @returns 보정계수 (최소 100)
 */
export function calculateCalibrationFactor(
  knownVolume: number,
  ratio: number
): number {
  if (ratio <= 0 || knownVolume <= 0) return 1000; // 기본값
  const factor = Math.round((knownVolume / ratio) * 100);
  return Math.max(100, factor); // 최소 100
}

/**
 * DB에 저장된 기존 키워드 검색량으로 보정계수를 추정.
 *
 * 같은 client 내에서 naver_ad로 조회된 키워드들의 평균 보정계수를 산출.
 * 해당 키워드가 없으면 기본값 1000을 반환한다.
 */
export async function estimateCalibrationFactor(
  clientId: string
): Promise<number> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/service");
    const db = createAdminClient();

    // naver_ad로 검색량이 조회된 키워드 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("keywords")
      .select("keyword, monthly_search_total")
      .eq("client_id", clientId)
      .eq("search_volume_source", "naver_ad")
      .not("monthly_search_total", "is", null)
      .gt("monthly_search_total", 0)
      .limit(10);

    if (!data || data.length === 0) return 1000;

    // 이 키워드들의 DataLab ratio 조회
    const clientIdEnv = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientIdEnv || !clientSecret) return 1000;

    const sampleKeywords = data.slice(0, 5).map((k: { keyword: string }) => k.keyword);
    const trends = await getKeywordTrendVolume(sampleKeywords, 1000);

    const factors: number[] = [];
    for (const trend of trends) {
      const known = data.find((k: { keyword: string; monthly_search_total: number }) =>
        k.keyword === trend.keyword
      );
      if (known && trend.ratio > 0) {
        factors.push(calculateCalibrationFactor(known.monthly_search_total, trend.ratio));
      }
    }

    if (factors.length === 0) return 1000;
    return Math.round(factors.reduce((a, b) => a + b, 0) / factors.length);
  } catch {
    return 1000;
  }
}
