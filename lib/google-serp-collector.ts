/**
 * 구글 SERP 수집 모듈 (Serper API 기반)
 *
 * 기존 네이버 SERP 수집(serp-collector.ts)과 병렬로 동작하며
 * 구글 검색에서 우리 콘텐츠의 순위를 수집한다.
 *
 * - SERPER_API_KEY 없으면 graceful skip (에러 아님)
 * - keywords.current_rank_google 업데이트
 * - keyword_visibility.rank_google 업데이트
 *
 * 사용처:
 *   - keyword-actions.ts → triggerClientSerpCheck()
 *   - 향후 cron/serp 스케줄러 연동 가능
 */

import { createAdminClient } from "@/lib/supabase/service";
import { searchGoogle, findGoogleRank } from "@/lib/google-serp-api";

// ── 상수 ────────────────────────────────────────────────
const DELAY_MS = 1500; // Serper Rate limit 방지

// ── 타입 ────────────────────────────────────────────────
export interface GoogleSerpResult {
  keywordId: string;
  keyword: string;
  rank: number | null;
  url: string | null;
  title: string | null;
}

export interface GoogleSerpCollectionSummary {
  total: number;
  collected: number;
  exposed: number;
  failed: number;
  skipped: boolean;
  results: GoogleSerpResult[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── 클라이언트 타겟 URL 조회 ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getClientTargetUrls(db: any, clientId: string): Promise<string[]> {
  const urls: string[] = [];

  // 블로그 계정
  const { data: accounts } = await db
    .from("blog_accounts")
    .select("account_name, blog_url")
    .eq("client_id", clientId)
    .eq("is_active", true);

  for (const acct of accounts ?? []) {
    if (acct.blog_url) urls.push(acct.blog_url);
    else if (acct.account_name) urls.push(`https://blog.naver.com/${acct.account_name}`);
  }

  // 클라이언트 웹사이트
  const { data: client } = await db
    .from("clients")
    .select("website_url")
    .eq("id", clientId)
    .single();

  if (client?.website_url) urls.push(client.website_url);

  return urls;
}

// ── 단일 키워드 구글 SERP 수집 ──────────────────────────

export async function collectGoogleSerpForKeyword(
  keywordId: string,
): Promise<{ success: boolean; result?: GoogleSerpResult; error?: string; skipped?: boolean }> {
  if (!process.env.SERPER_API_KEY) {
    return { success: true, skipped: true };
  }

  const db = createAdminClient();

  const { data: kw } = await db
    .from("keywords")
    .select("id, keyword, sub_keyword, client_id")
    .eq("id", keywordId)
    .single();

  if (!kw) return { success: false, error: "키워드를 찾을 수 없습니다." };

  const targetUrls = await getClientTargetUrls(db, kw.client_id);
  const kwText = kw.sub_keyword || kw.keyword;

  if (targetUrls.length === 0) {
    return {
      success: true,
      result: { keywordId, keyword: kwText, rank: null, url: null, title: null },
    };
  }

  try {
    const searchResp = await searchGoogle(kwText);
    if (!searchResp) {
      return { success: true, skipped: true };
    }

    const rankResult = findGoogleRank(searchResp.organic || [], targetUrls);
    const today = new Date().toISOString().slice(0, 10);

    // keywords.current_rank_google 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("keywords").update({
      current_rank_google: rankResult.rank,
      last_tracked_at: new Date().toISOString(),
    }).eq("id", keywordId);

    // keyword_visibility.rank_google 업데이트 (기존 행에 추가, 다른 컬럼 미변경)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from("keyword_visibility").upsert(
        {
          client_id: kw.client_id,
          keyword_id: keywordId,
          measured_at: today,
          rank_google: rankResult.rank,
        },
        { onConflict: "keyword_id,measured_at" },
      );
    } catch (visErr) {
      // rank_google 컬럼 미존재 시 graceful skip (053 마이그레이션 미실행)
      console.warn("[google-serp-collector] keyword_visibility 업데이트 스킵:", visErr);
    }

    return {
      success: true,
      result: { keywordId, keyword: kwText, rank: rankResult.rank, url: rankResult.url, title: rankResult.title },
    };
  } catch (e) {
    console.warn("[google-serp-collector] 수집 실패:", e instanceof Error ? e.message : e);
    return { success: false, error: e instanceof Error ? e.message : "알 수 없는 오류" };
  }
}

// ── 전체/고객사별 구글 SERP 배치 수집 ───────────────────

export async function collectGoogleSerpAll(
  clientId?: string,
): Promise<GoogleSerpCollectionSummary> {
  if (!process.env.SERPER_API_KEY) {
    console.warn("[google-serp-collector] SERPER_API_KEY 미설정 — 구글 수집 스킵");
    return { total: 0, collected: 0, exposed: 0, failed: 0, skipped: true, results: [] };
  }

  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // ── 타겟 URL 수집 (클라이언트별) ──

  const clientUrlMap: Record<string, string[]> = {};

  // 블로그 계정 로드
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let acctQuery = (db as any)
    .from("blog_accounts")
    .select("id, account_name, blog_url, client_id")
    .eq("is_active", true);
  if (clientId) acctQuery = acctQuery.eq("client_id", clientId);
  const { data: accounts } = await acctQuery;

  for (const acct of accounts ?? []) {
    const cid = acct.client_id;
    if (!clientUrlMap[cid]) clientUrlMap[cid] = [];
    if (acct.blog_url) clientUrlMap[cid].push(acct.blog_url);
    else if (acct.account_name) clientUrlMap[cid].push(`https://blog.naver.com/${acct.account_name}`);
  }

  // 클라이언트 웹사이트 URL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientQuery = (db as any).from("clients").select("id, website_url");
  if (clientId) clientQuery = clientQuery.eq("id", clientId);
  const { data: clients } = await clientQuery;

  for (const c of clients ?? []) {
    if (c.website_url) {
      if (!clientUrlMap[c.id]) clientUrlMap[c.id] = [];
      clientUrlMap[c.id].push(c.website_url);
    }
  }

  // ── 키워드 조회 ──

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let kwQuery = (db as any)
    .from("keywords")
    .select("id, keyword, sub_keyword, client_id")
    .neq("status", "archived")
    .order("created_at", { ascending: true });
  if (clientId) kwQuery = kwQuery.eq("client_id", clientId);
  const { data: keywords } = await kwQuery;

  const total = (keywords ?? []).length;
  const results: GoogleSerpResult[] = [];
  let collected = 0;
  let exposed = 0;
  let failed = 0;

  // ── 키워드별 구글 검색 ──

  for (let i = 0; i < total; i++) {
    const kw = keywords![i];
    const kwText = kw.sub_keyword || kw.keyword;
    const targetUrls = clientUrlMap[kw.client_id] || [];

    if (targetUrls.length === 0) {
      results.push({ keywordId: kw.id, keyword: kwText, rank: null, url: null, title: null });
      collected++;
      continue;
    }

    try {
      const searchResp = await searchGoogle(kwText);
      if (!searchResp) {
        failed++;
        results.push({ keywordId: kw.id, keyword: kwText, rank: null, url: null, title: null });
        continue;
      }

      const rankResult = findGoogleRank(searchResp.organic || [], targetUrls);

      if (rankResult.rank != null) exposed++;
      collected++;

      // keywords.current_rank_google 업데이트
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from("keywords").update({
        current_rank_google: rankResult.rank,
        last_tracked_at: new Date().toISOString(),
      }).eq("id", kw.id);

      results.push({
        keywordId: kw.id,
        keyword: kwText,
        rank: rankResult.rank,
        url: rankResult.url,
        title: rankResult.title,
      });
    } catch {
      failed++;
      results.push({ keywordId: kw.id, keyword: kwText, rank: null, url: null, title: null });
    }

    if (i < total - 1) await sleep(DELAY_MS);
  }

  // ── keyword_visibility 배치 업데이트 (rank_google만) ──

  const visRecords = results.map((r) => {
    const kw = keywords!.find((k: { id: string }) => k.id === r.keywordId);
    return {
      client_id: kw?.client_id,
      keyword_id: r.keywordId,
      measured_at: today,
      rank_google: r.rank,
    };
  });

  try {
    for (let i = 0; i < visRecords.length; i += 50) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .from("keyword_visibility")
        .upsert(visRecords.slice(i, i + 50), { onConflict: "keyword_id,measured_at" });
    }
  } catch (visErr) {
    // rank_google 컬럼 미존재 시 graceful skip (053 마이그레이션 미실행)
    console.warn("[google-serp-collector] keyword_visibility 배치 업데이트 스킵:", visErr);
  }

  return { total, collected, exposed, failed, skipped: false, results };
}
