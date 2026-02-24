"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export interface ContentSource {
  id: string;
  client_id: string;
  source_type: string;
  title: string | null;
  url: string | null;
  content_data: Record<string, unknown>;
  content_text: string | null;
  content_structure: {
    word_count?: number;
    h2_count?: number;
    h3_count?: number;
    image_count?: number;
    keyword_density?: number;
  } | null;
  content_id: string | null;
  usage_mode: string;
  tags: string[];
  used_count: number;
  is_active: boolean;
  created_at: string;
  client_name?: string | null;
}

const SELECT_FIELDS =
  "id, client_id, source_type, title, url, content_data, content_text, content_structure, content_id, usage_mode, tags, used_count, is_active, created_at, clients(name)";

function revalidateSourcePaths() {
  revalidatePath("/campaigns/new");
  revalidatePath("/sources");
}

/** clientId === null 이면 전체 브랜드 소스 반환 */
export async function getContentSources(clientId: string | null): Promise<ContentSource[]> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db as any)
      .from("content_sources")
      .select(SELECT_FIELDS)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[content-source-actions] getContentSources error:", error);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((s: any) => ({
      ...s,
      client_name: s.clients?.name ?? null,
      clients: undefined,
    })) as ContentSource[];
  } catch {
    return [];
  }
}

/** 소스 단건 조회 */
export async function getContentSourceById(id: string): Promise<ContentSource | null> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from("content_sources")
      .select(SELECT_FIELDS)
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return {
      ...data,
      client_name: data.clients?.name ?? null,
      clients: undefined,
    } as ContentSource;
  } catch {
    return null;
  }
}

export async function createContentSource(payload: {
  clientId: string;
  sourceType: string;
  title?: string | null;
  url?: string | null;
  contentText?: string | null;
  contentStructure?: Record<string, unknown>;
  contentId?: string | null;
  contentData?: Record<string, unknown>;
  usageMode?: string;
  tags?: string[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const db = createAdminClient();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from("content_sources")
      .insert({
        client_id: payload.clientId,
        source_type: payload.sourceType,
        title: payload.title ?? null,
        url: payload.url ?? null,
        content_text: payload.contentText ?? null,
        content_structure: payload.contentStructure ?? {},
        content_id: payload.contentId ?? null,
        content_data: payload.contentData ?? {},
        usage_mode: payload.usageMode ?? "reference",
        tags: payload.tags ?? [],
        updated_at: now,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[content-source-actions] createContentSource error:", error);
      return { success: false, error: error.message };
    }

    revalidateSourcePaths();
    return { success: true, id: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateContentSource(
  id: string,
  payload: {
    title?: string | null;
    url?: string | null;
    sourceType?: string;
    contentText?: string | null;
    contentStructure?: Record<string, unknown>;
    usageMode?: string;
    tags?: string[];
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = { updated_at: new Date().toISOString() };
    if (payload.title !== undefined) update.title = payload.title;
    if (payload.url !== undefined) update.url = payload.url;
    if (payload.sourceType !== undefined) update.source_type = payload.sourceType;
    if (payload.contentText !== undefined) update.content_text = payload.contentText;
    if (payload.contentStructure !== undefined) update.content_structure = payload.contentStructure;
    if (payload.usageMode !== undefined) update.usage_mode = payload.usageMode;
    if (payload.tags !== undefined) update.tags = payload.tags;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("content_sources")
      .update(update)
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidateSourcePaths();
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** 소프트 삭제 (아카이브) */
export async function archiveContentSource(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("content_sources")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidateSourcePaths();
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// 하위 호환 유지
export const deleteContentSource = archiveContentSource;

/** URL 크롤링 → 제목, 본문 텍스트, 구조 분석 */
export async function crawlSourceUrl(url: string): Promise<{
  title: string | null;
  contentText: string | null;
  contentStructure: {
    word_count: number;
    h2_count: number;
    h3_count: number;
    image_count: number;
  };
  error?: string;
}> {
  const empty = {
    title: null,
    contentText: null,
    contentStructure: { word_count: 0, h2_count: 0, h3_count: 0, image_count: 0 },
  };

  if (!url || !url.startsWith("http")) {
    return { ...empty, error: "유효하지 않은 URL입니다." };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI-Marketer/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { ...empty, error: `HTTP ${res.status}` };

    const html = await res.text();

    // 제목 추출
    const title =
      extractMeta(html, "og:title") ??
      extractMeta(html, "twitter:title") ??
      extractTag(html, "title") ??
      null;

    // 본문 텍스트 추출 (HTML 태그 제거)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch?.[1] ?? html;
    // 스크립트·스타일 제거
    const cleaned = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "");
    // 태그 제거 + 공백 정리
    const textContent = cleaned
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    // 10000자 제한
    const contentText = textContent.slice(0, 10000);

    // 구조 분석
    const h2_count = (html.match(/<h2[\s>]/gi) || []).length;
    const h3_count = (html.match(/<h3[\s>]/gi) || []).length;
    const image_count = (html.match(/<img[\s>]/gi) || []).length;
    const word_count = contentText.length;

    return {
      title: title?.trim() ?? null,
      contentText,
      contentStructure: { word_count, h2_count, h3_count, image_count },
    };
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : "크롤링 실패" };
  }
}

function extractMeta(html: string, property: string): string | null {
  const esc = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const r1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m1 = html.match(r1);
  if (m1) return m1[1];
  const r2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${esc}["']`,
    "i",
  );
  const m2 = html.match(r2);
  return m2 ? m2[1] : null;
}

function extractTag(html: string, tag: string): string | null {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
  return m ? m[1] : null;
}

/** peak_rank 1~5 콘텐츠를 own_best 소스로 자동 등록 */
export async function registerBestContentAsSources(clientId?: string): Promise<{
  registered: number;
  skipped: number;
}> {
  const db = createAdminClient();
  let result = { registered: 0, skipped: 0 };

  // peak_rank 1~5 콘텐츠 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any)
    .from("contents")
    .select("id, title, keyword, url, peak_rank, body, client_id")
    .lte("peak_rank", 5)
    .gte("peak_rank", 1);
  if (clientId) q = q.eq("client_id", clientId);
  const { data: bestContents } = await q;

  if (!bestContents || bestContents.length === 0) return result;

  // 이미 등록된 content_id 조회
  const contentIds = bestContents.map((c: { id: string }) => c.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("content_sources")
    .select("content_id")
    .in("content_id", contentIds)
    .eq("is_active", true);

  const existingIds = new Set(
    ((existing ?? []) as { content_id: string }[]).map((e) => e.content_id),
  );

  for (const content of bestContents as {
    id: string;
    title: string | null;
    keyword: string | null;
    url: string | null;
    body: string | null;
    peak_rank: number;
    client_id: string;
  }[]) {
    if (existingIds.has(content.id)) {
      result.skipped++;
      continue;
    }

    const bodyText = content.body ?? "";
    const wordCount = bodyText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
    const h2Count = (bodyText.match(/<h2[\s>]/gi) || []).length;
    const h3Count = (bodyText.match(/<h3[\s>]/gi) || []).length;
    const imgCount = (bodyText.match(/<img[\s>]/gi) || []).length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("content_sources").insert({
      client_id: content.client_id,
      source_type: "own_best",
      title: content.title ?? content.keyword ?? "베스트 콘텐츠",
      url: content.url ?? null,
      content_text: bodyText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 10000),
      content_structure: {
        word_count: wordCount,
        h2_count: h2Count,
        h3_count: h3Count,
        image_count: imgCount,
        peak_rank: content.peak_rank,
      },
      content_id: content.id,
      usage_mode: "style",
    });
    result.registered++;
  }

  if (result.registered > 0) revalidateSourcePaths();
  return result;
}
