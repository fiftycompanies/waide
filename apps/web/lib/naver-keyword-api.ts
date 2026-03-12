/**
 * 네이버 검색광고 API — 키워드 도구 (검색량 조회)
 *
 * 고객사별 API 키를 지원한다.
 * credentials를 전달하면 해당 키를 사용하고, 없으면 환경변수 폴백.
 *
 * 발급 위치: https://searchad.naver.com → 설정 → API 관리
 */

import crypto from "crypto";

const BASE_URL = "https://api.naver.com";

export interface NaverAdCredentials {
  apiKey: string;
  secretKey: string;
  customerId: string;
}

function makeSignature(timestamp: number, method: string, uri: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");
}

export interface KeywordVolume {
  keyword: string;
  monthlyPc: number;
  monthlyMo: number;
  monthlyTotal: number;
}

function parseVolume(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    if (val === "< 10") return 5;
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * 최대 5개 키워드의 월 검색량 조회.
 * credentials를 전달하면 해당 키를 사용, 없으면 환경변수 폴백.
 */
export async function getKeywordSearchVolume(
  keywords: string[],
  credentials?: NaverAdCredentials
): Promise<KeywordVolume[]> {
  const apiKey = credentials?.apiKey ?? process.env.NAVER_AD_API_KEY;
  const secretKey = credentials?.secretKey ?? process.env.NAVER_AD_SECRET_KEY;
  const customerId = credentials?.customerId ?? process.env.NAVER_AD_CUSTOMER_ID;

  if (!apiKey || !secretKey || !customerId) {
    throw new Error(
      "네이버 광고 API 키가 설정되지 않았습니다.\n" +
      ".env.local에 NAVER_AD_API_KEY, NAVER_AD_SECRET_KEY, NAVER_AD_CUSTOMER_ID를 추가하세요.\n" +
      "발급: https://searchad.naver.com → 설정 → API 관리"
    );
  }

  const timestamp = Date.now();
  const uri = "/keywordstool";
  const signature = makeSignature(timestamp, "GET", uri, secretKey);

  // 키워드 공백 제거 후 1개씩 호출 (공백 포함 시 400 에러 발생)
  const cleanKeywords = keywords.slice(0, 5).map((kw) => kw.replace(/\s+/g, ""));

  const params = new URLSearchParams({
    hintKeywords: cleanKeywords.join(","),
    showDetail: "1",
  });

  const res = await fetch(`${BASE_URL}${uri}?${params}`, {
    headers: {
      "X-Timestamp": String(timestamp),
      "X-API-KEY": apiKey,
      "X-Customer": customerId,
      "X-Signature": signature,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`네이버 API 오류 (${res.status}): ${text}`);
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.keywordList ?? []).map((item: any) => {
    const pc = parseVolume(item.monthlyPcQcCnt);
    const mo = parseVolume(item.monthlyMobileQcCnt);
    return {
      keyword: item.relKeyword as string,
      monthlyPc: pc,
      monthlyMo: mo,
      monthlyTotal: pc + mo,
    };
  });
}
