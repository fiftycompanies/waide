/**
 * SERP 수집 모듈 (네이버 검색 API 기반)
 *
 * 네이버 블로그 검색 API(openapi.naver.com/v1/search/blog.json)를 사용하여
 * 우리 블로그 계정의 키워드별 순위를 수집한다.
 *
 * - HTML 파싱 방식에서 공식 API 방식으로 교체 (정확도 향상)
 * - PC/MO 구분 없음 → 동일 순위로 기록
 * - 일일 25,000회 제한 고려하여 1초 딜레이 유지
 *
 * 사용처:
 *   - 키워드 상세 → [순위 즉시 수집] 버튼
 *   - SERP 스케줄러 → [지금 수집 시작] 버튼
 */

import { createAdminClient } from "@/lib/supabase/service";
import { searchNaverBlog, findBlogRank } from "@/lib/naver-search-api";

// ── 상수 ────────────────────────────────────────────────
const RANK_MAX = 100;
const DELAY_MS = 1200;

// ── 타입 ────────────────────────────────────────────────
export interface SerpRankResult {
  keywordId: string;
  keyword: string;
  pcRank: number | null;
  moRank: number | null;
  isExposed: boolean;
  postUrl: string | null;
}

export interface SerpCollectionSummary {
  date: string;
  total: number;
  exposed: number;
  notExposed: number;
  failed: number;
  avgRankPc: number | null;
  avgRankMo: number | null;
  top3: number;
  top10: number;
  exposureRate: number;
  weightedVisibilityPc: number;
  weightedVisibilityMo: number;
  results: SerpRankResult[];
}

function visibilityScore(rank: number | null): number {
  if (rank == null || rank > 20) return 0;
  return Math.round(Math.max(0, ((21 - rank) / 20) * 100) * 100) / 100;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── 단일 키워드 SERP 수집 ───────────────────────────────
export async function collectSerpForKeyword(
  keywordId: string
): Promise<{ success: boolean; result?: SerpRankResult; error?: string }> {
  const db = createAdminClient();

  // 키워드 조회
  const { data: kw } = await db
    .from("keywords")
    .select("id, keyword, sub_keyword, client_id, monthly_search_pc, monthly_search_mo")
    .eq("id", keywordId)
    .single();

  if (!kw) return { success: false, error: "키워드를 찾을 수 없습니다." };

  // 블로그 계정 로드
  const { data: accounts } = await db
    .from("blog_accounts")
    .select("id, account_name, blog_url")
    .eq("client_id", kw.client_id)
    .eq("is_active", true);

  const ourBlogIds: string[] = [];
  const blogAccountMap: Record<string, string> = {};

  for (const acct of accounts ?? []) {
    let blogId = acct.account_name;
    if (acct.blog_url) {
      const m = acct.blog_url.match(/blog\.naver\.com\/([a-zA-Z0-9_]+)/);
      if (m) blogId = m[1];
    }
    ourBlogIds.push(blogId);
    blogAccountMap[blogId.toLowerCase()] = acct.id;
  }

  const kwText = kw.sub_keyword || kw.keyword;
  const today = new Date().toISOString().slice(0, 10);

  try {
    // 네이버 검색 API 호출 (1회로 PC/MO 통합)
    const searchResp = await searchNaverBlog(kwText, 100, "sim");
    const result = findBlogRank(searchResp.items, ourBlogIds, RANK_MAX);

    const rank = result.rank;
    const isExposed = rank != null;
    const postUrl = result.matchedUrl;

    // 콘텐츠 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contents } = await (db as any)
      .from("contents")
      .select("id, account_id")
      .eq("keyword_id", keywordId);

    const targetContent = (contents ?? [])[0];

    if (targetContent) {
      // contents.url 업데이트
      if (postUrl) {
        await db.from("contents").update({ url: postUrl }).eq("id", targetContent.id);
      }

      // serp_results upsert — PC/MO 동일 순위 기록
      for (const device of ["PC", "MO"] as const) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).from("serp_results").upsert(
          {
            content_id: targetContent.id,
            device,
            rank,
            rank_change: 0,
            is_exposed: isExposed,
            search_platform: "NAVER_SERP",
            captured_at: today,
            collection_method: "api",
          },
          { onConflict: "content_id,device,captured_at" }
        );
      }

      // peak_rank 갱신
      if (rank != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cur } = await (db as any)
          .from("contents")
          .select("peak_rank")
          .eq("id", targetContent.id)
          .single();
        if (!cur?.peak_rank || rank < cur.peak_rank) {
          await db.from("contents").update({ peak_rank: rank, peak_rank_at: today }).eq("id", targetContent.id);
        }
      }
    }

    // keywords 테이블 현재 순위 업데이트 (PC/MO 동일)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("keywords").update({
      current_rank_naver_pc: rank,
      current_rank_naver_mo: rank,
      last_tracked_at: new Date().toISOString(),
    }).eq("id", keywordId);

    // keyword_visibility upsert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("keyword_visibility").upsert(
      {
        client_id: kw.client_id,
        keyword_id: keywordId,
        measured_at: today,
        rank_pc: rank,
        rank_mo: rank,
        visibility_score_pc: visibilityScore(rank),
        visibility_score_mo: visibilityScore(rank),
        search_volume_pc: kw.monthly_search_pc || 0,
        search_volume_mo: kw.monthly_search_mo || 0,
        is_exposed: isExposed,
      },
      { onConflict: "keyword_id,measured_at" }
    );

    const serpResult: SerpRankResult = {
      keywordId,
      keyword: kwText,
      pcRank: rank,
      moRank: rank,
      isExposed,
      postUrl,
    };

    return { success: true, result: serpResult };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "알 수 없는 오류" };
  }
}

// ── 전체 키워드 배치 SERP 수집 ──────────────────────────
export async function collectSerpAll(
  clientId?: string
): Promise<SerpCollectionSummary> {
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // 블로그 계정 로드
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let acctQuery = (db as any)
    .from("blog_accounts")
    .select("id, account_name, blog_url, client_id")
    .eq("is_active", true);
  if (clientId) acctQuery = acctQuery.eq("client_id", clientId);

  const { data: accounts } = await acctQuery;

  const blogAccountMap: Record<string, string> = {};
  const clientBlogMap: Record<string, string[]> = {};

  for (const acct of accounts ?? []) {
    let blogId = acct.account_name;
    if (acct.blog_url) {
      const m = acct.blog_url.match(/blog\.naver\.com\/([a-zA-Z0-9_]+)/);
      if (m) blogId = m[1];
    }
    blogAccountMap[blogId.toLowerCase()] = acct.id;
    if (!clientBlogMap[acct.client_id]) clientBlogMap[acct.client_id] = [];
    clientBlogMap[acct.client_id].push(blogId);
  }

  // 키워드 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let kwQuery = (db as any)
    .from("keywords")
    .select("id, keyword, sub_keyword, client_id, monthly_search_pc, monthly_search_mo")
    .neq("status", "archived")
    .order("created_at", { ascending: true });
  if (clientId) kwQuery = kwQuery.eq("client_id", clientId);

  const { data: keywords } = await kwQuery;

  // 콘텐츠 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contentQuery = (db as any)
    .from("contents")
    .select("id, keyword_id, account_id");
  if (clientId) contentQuery = contentQuery.eq("client_id", clientId);

  const { data: contents } = await contentQuery;

  const kwContentMap: Record<string, Array<{ id: string; account_id: string | null }>> = {};
  for (const c of contents ?? []) {
    if (!kwContentMap[c.keyword_id]) kwContentMap[c.keyword_id] = [];
    kwContentMap[c.keyword_id].push(c);
  }

  const total = (keywords ?? []).length;
  const results: SerpRankResult[] = [];
  let exposed = 0;
  let notExposed = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const kw = keywords![i];
    const kwText = kw.sub_keyword || kw.keyword;
    const kwBlogIds = clientBlogMap[kw.client_id] || [];

    try {
      // 네이버 검색 API 1회 호출 (PC/MO 통합)
      const searchResp = await searchNaverBlog(kwText, 100, "sim");
      const rankResult = findBlogRank(searchResp.items, kwBlogIds, RANK_MAX);

      const rank = rankResult.rank;
      const isExposed = rank != null;
      const postUrl = rankResult.matchedUrl;

      if (isExposed) exposed++;
      else notExposed++;

      // 콘텐츠 업데이트
      const kwContents = kwContentMap[kw.id] || [];
      const matchedAccountId = rankResult.matchedBlogId
        ? blogAccountMap[rankResult.matchedBlogId.toLowerCase()]
        : null;
      let targetContent = kwContents[0];
      if (matchedAccountId) {
        const sameAcct = kwContents.find((c) => c.account_id === matchedAccountId);
        if (sameAcct) targetContent = sameAcct;
      }

      if (targetContent) {
        if (postUrl) {
          await db.from("contents").update({ url: postUrl }).eq("id", targetContent.id);
        }

        // serp_results upsert — PC/MO 동일 순위
        for (const device of ["PC", "MO"] as const) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).from("serp_results").upsert(
            {
              content_id: targetContent.id,
              device,
              rank,
              rank_change: 0,
              is_exposed: isExposed,
              search_platform: "NAVER_SERP",
              captured_at: today,
              collection_method: "api",
            },
            { onConflict: "content_id,device,captured_at" }
          );
        }

        // peak_rank 갱신
        if (rank != null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: cur } = await (db as any)
            .from("contents")
            .select("peak_rank")
            .eq("id", targetContent.id)
            .single();
          if (!cur?.peak_rank || rank < cur.peak_rank) {
            await db.from("contents").update({ peak_rank: rank, peak_rank_at: today }).eq("id", targetContent.id);
          }
        }
      }

      // keywords 현재 순위 (PC/MO 동일)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from("keywords").update({
        current_rank_naver_pc: rank,
        current_rank_naver_mo: rank,
        last_tracked_at: new Date().toISOString(),
      }).eq("id", kw.id);

      results.push({ keywordId: kw.id, keyword: kwText, pcRank: rank, moRank: rank, isExposed, postUrl });
    } catch {
      failed++;
      results.push({ keywordId: kw.id, keyword: kwText, pcRank: null, moRank: null, isExposed: false, postUrl: null });
    }

    if (i < total - 1) await sleep(DELAY_MS);
  }

  // ── keyword_visibility 배치 upsert ─────────────────
  const visRecords = results.map((r) => {
    const kw = keywords!.find((k: { id: string }) => k.id === r.keywordId);
    return {
      client_id: kw?.client_id,
      keyword_id: r.keywordId,
      measured_at: today,
      rank_pc: r.pcRank,
      rank_mo: r.moRank,
      visibility_score_pc: visibilityScore(r.pcRank),
      visibility_score_mo: visibilityScore(r.moRank),
      search_volume_pc: kw?.monthly_search_pc || 0,
      search_volume_mo: kw?.monthly_search_mo || 0,
      is_exposed: r.isExposed,
    };
  });

  for (let i = 0; i < visRecords.length; i += 50) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("keyword_visibility")
      .upsert(visRecords.slice(i, i + 50), { onConflict: "keyword_id,measured_at" });
  }

  // ── daily_visibility_summary ───────────────────────
  const clientIds = [...new Set(visRecords.map((r) => r.client_id).filter(Boolean))] as string[];

  for (const cid of clientIds) {
    const cRecords = visRecords.filter((r) => r.client_id === cid);
    const totalKw = cRecords.length;
    const exposedKw = cRecords.filter((r) => r.is_exposed).length;
    const pcRanks = cRecords.map((r) => r.rank_pc).filter((r): r is number => r != null);

    const avgRankPc = pcRanks.length > 0 ? Math.round((pcRanks.reduce((a, b) => a + b, 0) / pcRanks.length) * 100) / 100 : null;
    const top3 = pcRanks.filter((r) => r <= 3).length;
    const top10 = pcRanks.filter((r) => r <= 10).length;
    const exposureRate = totalKw > 0 ? Math.round((exposedKw / totalKw) * 10000) / 100 : 0;

    const totalVolPc = cRecords.reduce((s, r) => s + r.search_volume_pc, 0);
    const totalVolMo = cRecords.reduce((s, r) => s + r.search_volume_mo, 0);

    const wVisPc =
      totalVolPc > 0
        ? Math.round((cRecords.reduce((s, r) => s + r.visibility_score_pc * r.search_volume_pc, 0) / totalVolPc) * 100) / 100
        : totalKw > 0
          ? Math.round((cRecords.reduce((s, r) => s + r.visibility_score_pc, 0) / totalKw) * 100) / 100
          : 0;
    const wVisMo =
      totalVolMo > 0
        ? Math.round((cRecords.reduce((s, r) => s + r.visibility_score_mo * r.search_volume_mo, 0) / totalVolMo) * 100) / 100
        : totalKw > 0
          ? Math.round((cRecords.reduce((s, r) => s + r.visibility_score_mo, 0) / totalKw) * 100) / 100
          : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("daily_visibility_summary").upsert(
      {
        client_id: cid,
        measured_at: today,
        total_keywords: totalKw,
        exposed_keywords: exposedKw,
        exposure_rate: exposureRate,
        weighted_visibility_pc: wVisPc,
        weighted_visibility_mo: wVisMo,
        avg_rank_pc: avgRankPc,
        avg_rank_mo: avgRankPc, // API는 PC/MO 통합이므로 동일
        top3_count: top3,
        top10_count: top10,
      },
      { onConflict: "client_id,measured_at" }
    );
  }

  // ── 요약 계산 ──────────────────────────────────────
  const allRanks = results.map((r) => r.pcRank).filter((r): r is number => r != null);

  return {
    date: today,
    total,
    exposed,
    notExposed,
    failed,
    avgRankPc: allRanks.length > 0 ? Math.round((allRanks.reduce((a, b) => a + b, 0) / allRanks.length) * 100) / 100 : null,
    avgRankMo: allRanks.length > 0 ? Math.round((allRanks.reduce((a, b) => a + b, 0) / allRanks.length) * 100) / 100 : null,
    top3: allRanks.filter((r) => r <= 3).length,
    top10: allRanks.filter((r) => r <= 10).length,
    exposureRate: total > 0 ? Math.round((exposed / total) * 10000) / 100 : 0,
    weightedVisibilityPc: visRecords.length > 0
      ? Math.round((visRecords.reduce((s, r) => s + r.visibility_score_pc, 0) / visRecords.length) * 100) / 100
      : 0,
    weightedVisibilityMo: visRecords.length > 0
      ? Math.round((visRecords.reduce((s, r) => s + r.visibility_score_mo, 0) / visRecords.length) * 100) / 100
      : 0,
    results,
  };
}
