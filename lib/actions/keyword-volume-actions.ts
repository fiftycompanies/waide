"use server";

/**
 * keyword-volume-actions.ts
 * Phase 7-10: 키워드 검색량 조회 (네이버 광고 API 연동)
 *
 * 기존 naver-keyword-api.ts 래핑 + keywords 테이블 업데이트
 */

import { createAdminClient } from "@/lib/supabase/service";
import { getKeywordSearchVolume, type KeywordVolume } from "@/lib/naver-keyword-api";
import { revalidatePath } from "next/cache";

export interface VolumeResult {
  keyword: string;
  monthlyTotal: number;
  monthlyPc: number;
  monthlyMo: number;
  competition?: string;
}

/**
 * 키워드 검색량 조회 (최대 5개씩)
 */
export async function queryKeywordVolume(
  keywords: string[],
): Promise<{ success: boolean; results: VolumeResult[]; error?: string }> {
  // API 키 체크
  if (!process.env.NAVER_AD_API_KEY || !process.env.NAVER_AD_SECRET_KEY || !process.env.NAVER_AD_CUSTOMER_ID) {
    return {
      success: false,
      results: [],
      error: "네이버 광고 API 키가 설정되지 않았습니다. 환경변수를 확인하세요.",
    };
  }

  try {
    // 5개씩 배치 처리
    const allResults: VolumeResult[] = [];
    for (let i = 0; i < keywords.length; i += 5) {
      const batch = keywords.slice(i, i + 5);
      const volumes = await getKeywordSearchVolume(batch);

      for (const v of volumes) {
        allResults.push({
          keyword: v.keyword,
          monthlyTotal: v.monthlyTotal,
          monthlyPc: v.monthlyPc,
          monthlyMo: v.monthlyMo,
        });
      }

      // Rate limit: 배치간 1초 딜레이
      if (i + 5 < keywords.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return { success: true, results: allResults };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "검색량 조회 실패";
    console.error("[keyword-volume] queryKeywordVolume error:", err);
    return { success: false, results: [], error: errorMessage };
  }
}

/**
 * 검색량 결과에서 선택한 키워드를 등록
 */
export async function registerKeywordsFromVolume(
  clientId: string,
  keywords: { keyword: string; monthlyTotal: number; monthlyPc: number; monthlyMo: number }[],
): Promise<{ success: boolean; inserted: number; error?: string }> {
  const db = createAdminClient();
  let inserted = 0;

  for (const kw of keywords) {
    // 중복 체크
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (db as any)
      .from("keywords")
      .select("id")
      .eq("client_id", clientId)
      .eq("keyword", kw.keyword)
      .maybeSingle();

    if (existing) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("keywords")
      .insert({
        client_id: clientId,
        keyword: kw.keyword,
        status: "active",
        source: "volume_search",
        monthly_search_volume: kw.monthlyTotal,
        pc_volume: kw.monthlyPc,
        mobile_volume: kw.monthlyMo,
        volume_updated_at: new Date().toISOString(),
        metadata: {
          source: "volume_search",
          registered_at: new Date().toISOString(),
        },
      });

    if (!error) inserted++;
  }

  revalidatePath("/keywords");
  return { success: true, inserted };
}

/**
 * 기존 활성 키워드의 검색량 일괄 업데이트
 */
export async function updateKeywordVolumes(
  clientId: string,
): Promise<{ success: boolean; updated: number; error?: string }> {
  if (!process.env.NAVER_AD_API_KEY || !process.env.NAVER_AD_SECRET_KEY || !process.env.NAVER_AD_CUSTOMER_ID) {
    return { success: false, updated: 0, error: "네이버 광고 API 키 미설정" };
  }

  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: keywords } = await (db as any)
    .from("keywords")
    .select("id, keyword")
    .eq("client_id", clientId)
    .eq("status", "active")
    .limit(100);

  if (!keywords || keywords.length === 0) {
    return { success: true, updated: 0 };
  }

  let updated = 0;
  // 5개씩 배치
  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5);
    const keywordTexts = batch.map((k: { keyword: string }) => k.keyword);

    try {
      const volumes = await getKeywordSearchVolume(keywordTexts);
      const volumeMap = new Map<string, KeywordVolume>();
      for (const v of volumes) {
        // 원본 키워드와 API 결과 매칭 (공백 제거된 키워드)
        volumeMap.set(v.keyword.replace(/\s+/g, ""), v);
      }

      for (const kw of batch) {
        const cleanKey = kw.keyword.replace(/\s+/g, "");
        const vol = volumeMap.get(cleanKey);
        if (vol) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any)
            .from("keywords")
            .update({
              monthly_search_volume: vol.monthlyTotal,
              pc_volume: vol.monthlyPc,
              mobile_volume: vol.monthlyMo,
              volume_updated_at: new Date().toISOString(),
            })
            .eq("id", kw.id);
          updated++;
        }
      }

      // Rate limit
      if (i + 5 < keywords.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error("[keyword-volume] batch update error:", err);
    }
  }

  revalidatePath("/keywords");
  return { success: true, updated };
}

/**
 * 네이버 광고 API 키 설정 여부 확인
 */
export async function checkNaverAdApiAvailable(): Promise<boolean> {
  return !!(process.env.NAVER_AD_API_KEY && process.env.NAVER_AD_SECRET_KEY && process.env.NAVER_AD_CUSTOMER_ID);
}
