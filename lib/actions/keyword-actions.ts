"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export interface Keyword {
  id: string;
  keyword: string;
  sub_keyword: string | null;
  platform: string | null;
  monthly_search_total: number | null;
  monthly_search_pc: number | null;
  monthly_search_mo: number | null;
  competition_level: string | null;
  competition_index: number | null;
  priority_score: number | null;
  // 신규 SERP 순위 컬럼 (P2-A)
  current_rank_naver_pc: number | null;
  current_rank_naver_mo: number | null;
  rank_change_pc: number | null;
  rank_change_mo: number | null;
  last_tracked_at: string | null;
  // 레거시 (호환성 유지)
  current_rank_naver: number | null;
  current_rank_google: number | null;
  status: string;
  client_id: string | null;
  client_name?: string | null;   // 전체 보기 모드: 소속 브랜드명
  created_at: string;
}

/** clientId === null 이면 전체 브랜드 키워드 반환 */
export async function getKeywords(clientId: string | null): Promise<Keyword[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("keywords")
    .select(
      "id, keyword, sub_keyword, platform, monthly_search_total, monthly_search_pc, monthly_search_mo, competition_level, competition_index, priority_score, current_rank_naver, current_rank_google, current_rank_naver_pc, current_rank_naver_mo, rank_change_pc, rank_change_mo, last_tracked_at, status, client_id, created_at, clients(name)"
    )
    .neq("status", "archived")
    .order("priority_score", { ascending: false, nullsFirst: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[keyword-actions] getKeywords error:", error);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((k: any) => ({
    ...k,
    client_name: k.clients?.name ?? null,
    clients: undefined,
  })) as Keyword[];
}

export async function createKeyword(payload: {
  clientId: string;
  keyword: string;
  subKeyword?: string | null;
  platform: string;
  monthlySearchTotal?: number | null;
  monthlySearchPc?: number | null;
  monthlySearchMo?: number | null;
  competitionLevel: string;
}): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await db.from("keywords").insert({
    client_id: payload.clientId,
    keyword: payload.keyword.trim(),
    sub_keyword: payload.subKeyword?.trim() || null,
    platform: payload.platform,
    monthly_search_total: payload.monthlySearchTotal ?? 0,
    monthly_search_pc: payload.monthlySearchPc ?? null,
    monthly_search_mo: payload.monthlySearchMo ?? null,
    competition_level: payload.competitionLevel,
    status: "active",
    is_tracking: true,
    updated_at: now,
  });

  if (error) {
    // 중복 키워드 처리
    if (error.code === "23505") {
      return { success: false, error: "이미 등록된 키워드입니다." };
    }
    return { success: false, error: error.message };
  }
  revalidatePath("/keywords");
  return { success: true };
}

export async function updateKeywordStatus(
  id: string,
  status: "active" | "paused" | "archived" | "queued" | "refresh"
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  const { error } = await db
    .from("keywords")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/keywords");
  return { success: true };
}

// soft delete
export async function archiveKeyword(
  id: string
): Promise<{ success: boolean; error?: string }> {
  return updateKeywordStatus(id, "archived");
}

// ── 상세 페이지용 ──────────────────────────────────────────────────────────────

export async function getKeyword(id: string): Promise<Keyword | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("keywords")
    .select(
      "id, keyword, sub_keyword, platform, monthly_search_total, monthly_search_pc, monthly_search_mo, competition_level, competition_index, priority_score, current_rank_naver, current_rank_google, current_rank_naver_pc, current_rank_naver_mo, rank_change_pc, rank_change_mo, last_tracked_at, status, client_id, created_at"
    )
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Keyword;
}

export interface KeywordContent {
  id: string;
  title: string | null;
  content_type: string | null;
  publish_status: string;
  word_count: number | null;
  published_at: string | null;
  generated_by: string | null;
  blog_account_id: string | null;
  blog_account_name: string | null;
  peak_rank: number | null;
  peak_rank_naver: number | null;
  peak_rank_google: number | null;
  current_rank_naver_pc: number | null;
  current_rank_naver_mo: number | null;
  created_at: string;
}

export async function getContentsByKeyword(keywordId: string): Promise<KeywordContent[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("contents")
    .select(
      "id, title, content_type, publish_status, word_count, published_at, generated_by, blog_account_id:account_id, peak_rank, peak_rank_naver, peak_rank_google, created_at"
    )
    .eq("keyword_id", keywordId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[keyword-actions] getContentsByKeyword:", error);
    return [];
  }

  const contents = (data ?? []) as Array<KeywordContent & { blog_account_id: string | null }>;

  // blog_account_id → account_name 조회
  const accountIds = [...new Set(contents.map((c) => c.blog_account_id).filter(Boolean))] as string[];
  let accountMap: Record<string, string> = {};
  if (accountIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: accs } = await (db as any)
      .from("blog_accounts")
      .select("id, account_name")
      .in("id", accountIds);
    accountMap = Object.fromEntries((accs ?? []).map((a: { id: string; account_name: string }) => [a.id, a.account_name]));
  }

  return contents.map((c) => ({
    ...c,
    blog_account_name: c.blog_account_id ? (accountMap[c.blog_account_id] ?? null) : null,
    current_rank_naver_pc: null,
    current_rank_naver_mo: null,
  }));
}

export interface SerpPoint {
  captured_at: string;
  content_id: string;
  content_title: string;
  rank_pc: number | null;
  rank_mo: number | null;
}

export async function getSerpByKeyword(keywordId: string): Promise<SerpPoint[]> {
  const db = createAdminClient();

  // 해당 키워드의 contents id 목록
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contentRows } = await (db as any)
    .from("contents")
    .select("id, title")
    .eq("keyword_id", keywordId);

  if (!contentRows || contentRows.length === 0) return [];

  const contentIds = contentRows.map((c: { id: string }) => c.id);
  const titleMap: Record<string, string> = Object.fromEntries(
    contentRows.map((c: { id: string; title: string | null }) => [c.id, c.title ?? c.id.slice(0, 8)])
  );

  // serp_results 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: serp } = await (db as any)
    .from("serp_results")
    .select("content_id, device, rank, captured_at")
    .in("content_id", contentIds)
    .order("captured_at", { ascending: true });

  if (!serp || serp.length === 0) return [];

  // (content_id, date) → {pc, mo} 병합
  const map: Record<string, { content_id: string; captured_at: string; rank_pc: number | null; rank_mo: number | null }> = {};
  for (const row of serp) {
    const key = `${row.content_id}__${row.captured_at}`;
    if (!map[key]) map[key] = { content_id: row.content_id, captured_at: row.captured_at, rank_pc: null, rank_mo: null };
    if (row.device === "PC") map[key].rank_pc = row.rank;
    else if (row.device === "MO") map[key].rank_mo = row.rank;
  }

  return Object.values(map).map((v) => ({
    captured_at: v.captured_at,
    content_id: v.content_id,
    content_title: titleMap[v.content_id] ?? v.content_id.slice(0, 8),
    rank_pc: v.rank_pc,
    rank_mo: v.rank_mo,
  })).sort((a, b) => a.captured_at.localeCompare(b.captured_at));
}

export interface AccountPerf {
  blog_account_id: string;
  account_name: string;
  publish_count: number;
  avg_rank: number | null;
  best_rank: number | null;
  active_count: number;
}

// ── CSV 대량 등록 ─────────────────────────────────────────────────────────────

export async function bulkCreateKeywords(
  clientId: string,
  rows: Array<{
    keyword: string;
    subKeyword?: string | null;
    platform: string;
    priority: string;
  }>
): Promise<{ success: boolean; inserted: number; skipped: number; errors: string[] }> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const errors: string[] = [];
  let inserted = 0;

  // 기존 키워드 조회 (중복 제거)
  const { data: existing } = await db
    .from("keywords")
    .select("keyword")
    .eq("client_id", clientId);
  const existingSet = new Set(
    (existing ?? []).map((k: { keyword: string }) => k.keyword.toLowerCase().trim())
  );

  const validRows = rows.filter((r) => r.keyword.trim() && !existingSet.has(r.keyword.toLowerCase().trim()));
  const skipped = rows.length - validRows.length;

  if (validRows.length === 0) return { success: true, inserted: 0, skipped, errors: [] };

  const records = validRows.map((r) => ({
    client_id: clientId,
    keyword: r.keyword.trim(),
    sub_keyword: r.subKeyword?.trim() || null,
    platform: ["naver", "google", "both"].includes(r.platform) ? r.platform : "both",
    competition_level: ["high", "medium", "low"].includes(r.priority) ? r.priority : "medium",
    status: "active",
    is_tracking: true,
    monthly_search_total: 0,
    updated_at: now,
  }));

  const BATCH = 100;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await db.from("keywords").insert(batch);
    if (error) {
      errors.push(`배치 ${Math.floor(i / BATCH) + 1}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  if (inserted > 0) revalidatePath("/keywords");
  return { success: errors.length === 0, inserted, skipped, errors };
}

// ── SERP 수집 (serp-collector.ts 직접 호출) ──────────────────────────────────

export async function triggerSerpCheck(
  keywordId: string
): Promise<{ success: boolean; pcRank?: number | null; moRank?: number | null; error?: string }> {
  try {
    const { collectSerpForKeyword } = await import("@/lib/serp-collector");
    const result = await collectSerpForKeyword(keywordId);

    if (!result.success) return { success: false, error: result.error };

    revalidatePath(`/keywords/${keywordId}`);
    return {
      success: true,
      pcRank: result.result?.pcRank ?? null,
      moRank: result.result?.moRank ?? null,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

export async function triggerAllSerpCheck(): Promise<{
  success: boolean;
  count?: number;
  exposed?: number;
  error?: string;
}> {
  try {
    const { collectSerpAll } = await import("@/lib/serp-collector");
    const summary = await collectSerpAll();

    revalidatePath("/ops/serp-settings");
    return {
      success: true,
      count: summary.total,
      exposed: summary.exposed,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

export async function getAccountPerfByKeyword(keywordId: string): Promise<AccountPerf[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contents } = await (db as any)
    .from("contents")
    .select("id, blog_account_id, peak_rank, peak_rank_naver, is_active")
    .eq("keyword_id", keywordId)
    .not("blog_account_id", "is", null);

  if (!contents || contents.length === 0) return [];

  const accountIds = [...new Set(contents.map((c: { blog_account_id: string }) => c.blog_account_id))] as string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accs } = await (db as any)
    .from("blog_accounts")
    .select("id, account_name")
    .in("id", accountIds);
  const accMap: Record<string, string> = Object.fromEntries(
    (accs ?? []).map((a: { id: string; account_name: string }) => [a.id, a.account_name])
  );

  const grouped: Record<string, { ranks: number[]; active: number; total: number }> = {};
  for (const c of contents) {
    const aid = c.blog_account_id;
    if (!grouped[aid]) grouped[aid] = { ranks: [], active: 0, total: 0 };
    grouped[aid].total++;
    if (c.is_active) grouped[aid].active++;
    const rank = c.peak_rank_naver ?? c.peak_rank;
    if (rank != null) grouped[aid].ranks.push(rank);
  }

  return accountIds.map((aid) => {
    const g = grouped[aid] ?? { ranks: [], active: 0, total: 0 };
    const avg = g.ranks.length > 0 ? g.ranks.reduce((a, b) => a + b, 0) / g.ranks.length : null;
    const best = g.ranks.length > 0 ? Math.min(...g.ranks) : null;
    return {
      blog_account_id: aid,
      account_name: accMap[aid] ?? aid,
      publish_count: g.total,
      avg_rank: avg != null ? Math.round(avg * 10) / 10 : null,
      best_rank: best,
      active_count: g.active,
    };
  }).sort((a, b) => (a.best_rank ?? 999) - (b.best_rank ?? 999));
}

// ── 검색량 갱신 (고객사별 API 키 분기 + DataLab 폴백) ────────────────────────

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 고객사의 네이버 광고 API 키 조회 */
async function getClientCredentials(clientId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("clients")
    .select("naver_ad_api_key, naver_ad_secret_key, naver_ad_customer_id")
    .eq("id", clientId)
    .single();
  if (data?.naver_ad_api_key && data?.naver_ad_secret_key && data?.naver_ad_customer_id) {
    return {
      apiKey: data.naver_ad_api_key as string,
      secretKey: data.naver_ad_secret_key as string,
      customerId: data.naver_ad_customer_id as string,
    };
  }
  return null;
}

/** 단일 키워드 검색량 조회 */
export async function refreshKeywordSearchVolume(
  keywordId: string
): Promise<{ success: boolean; pc?: number; mo?: number; total?: number; source?: string; error?: string }> {
  const db = createAdminClient();
  const { data: kw } = await db
    .from("keywords")
    .select("keyword, client_id")
    .eq("id", keywordId)
    .single();
  if (!kw) return { success: false, error: "키워드를 찾을 수 없습니다." };

  // 1. 고객사 API 키 확인
  const creds = kw.client_id ? await getClientCredentials(kw.client_id) : null;

  // 2-a. 네이버 광고 API 시도
  if (creds) {
    try {
      const { getKeywordSearchVolume } = await import("@/lib/naver-keyword-api");
      const results = await getKeywordSearchVolume([kw.keyword], creds);
      const cleaned = kw.keyword.replace(/\s+/g, "");
      const found = results.find((r) => r.keyword === cleaned) ?? results[0];
      if (found) {
        const pc = found.monthlyPc;
        const mo = found.monthlyMo;
        const total = pc + mo;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).from("keywords").update({
          monthly_search_pc: pc,
          monthly_search_mo: mo,
          monthly_search_total: total,
          search_volume_source: "naver_ad",
        }).eq("id", keywordId);
        revalidatePath(`/keywords/${keywordId}`);
        return { success: true, pc, mo, total, source: "naver_ad" };
      }
    } catch (err) {
      console.error("[refreshKeywordSearchVolume] 광고 API 실패:", err);
      // 폴백으로 DataLab 시도
    }
  }

  // 2-b. DataLab 폴백
  try {
    const { getKeywordTrendVolume, estimateCalibrationFactor } = await import("@/lib/naver-datalab-api");
    const factor = kw.client_id ? await estimateCalibrationFactor(kw.client_id) : 1000;
    const trends = await getKeywordTrendVolume([kw.keyword], factor);
    const found = trends[0];
    if (found) {
      const pc = found.estimatedPc;
      const mo = found.estimatedMo;
      const total = found.estimatedTotal;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from("keywords").update({
        monthly_search_pc: pc,
        monthly_search_mo: mo,
        monthly_search_total: total,
        search_volume_source: "datalab",
      }).eq("id", keywordId);
      revalidatePath(`/keywords/${keywordId}`);
      return { success: true, pc, mo, total, source: "datalab" };
    }
    return { success: false, error: "DataLab 검색량 데이터 없음" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

/** 고객사 전체 키워드 배치 검색량 조회 */
export async function refreshBulkKeywordSearchVolume(
  clientId: string,
  offset: number = 0,
  limit: number = 0,
): Promise<{
  success: boolean;
  total: number;
  updated: number;
  failed: number;
  source: string;
  error?: string;
}> {
  const db = createAdminClient();

  // 키워드 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("keywords")
    .select("id, keyword")
    .eq("client_id", clientId)
    .neq("status", "archived")
    .order("created_at", { ascending: true });

  if (offset > 0) query = query.range(offset, offset + (limit || 1000) - 1);
  else if (limit > 0) query = query.limit(limit);

  const { data: keywords, error } = await query;
  if (error) return { success: false, total: 0, updated: 0, failed: 0, source: "", error: error.message };
  if (!keywords || keywords.length === 0) return { success: true, total: 0, updated: 0, failed: 0, source: "none" };

  const creds = await getClientCredentials(clientId);
  let updated = 0;
  let failed = 0;
  const source = creds ? "naver_ad" : "datalab";

  if (creds) {
    // ── 네이버 광고 API: 1개씩 호출 (공백 키워드 에러 방지) ──
    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      try {
        const { getKeywordSearchVolume } = await import("@/lib/naver-keyword-api");
        const results = await getKeywordSearchVolume([kw.keyword], creds);
        const cleaned = kw.keyword.replace(/\s+/g, "");
        const found = results.find((r: { keyword: string }) => r.keyword === cleaned) ?? results[0];
        if (found) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).from("keywords").update({
            monthly_search_pc: found.monthlyPc,
            monthly_search_mo: found.monthlyMo,
            monthly_search_total: found.monthlyTotal,
            search_volume_source: "naver_ad",
          }).eq("id", kw.id);
          updated++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      if (i < keywords.length - 1) await sleep(BATCH_DELAY_MS);
    }
  } else {
    // ── DataLab: 5개씩 배치 호출 ──
    const { getKeywordTrendVolume, estimateCalibrationFactor } = await import("@/lib/naver-datalab-api");
    const factor = await estimateCalibrationFactor(clientId);

    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE);
      try {
        const trends = await getKeywordTrendVolume(
          batch.map((k: { keyword: string }) => k.keyword),
          factor
        );
        for (const kw of batch) {
          const found = trends.find((t) => t.keyword === kw.keyword);
          if (found) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (db as any).from("keywords").update({
              monthly_search_pc: found.estimatedPc,
              monthly_search_mo: found.estimatedMo,
              monthly_search_total: found.estimatedTotal,
              search_volume_source: "datalab",
            }).eq("id", kw.id);
            updated++;
          } else {
            failed++;
          }
        }
      } catch {
        failed += batch.length;
      }
      if (i + BATCH_SIZE < keywords.length) await sleep(BATCH_DELAY_MS);
    }
  }

  revalidatePath("/keywords");
  return { success: true, total: keywords.length, updated, failed, source };
}
