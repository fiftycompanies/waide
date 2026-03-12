"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "FAILED" | "CANCELLED";
export type AgentType =
  | "ACCOUNT_MANAGER"
  | "CMO"
  | "COPYWRITER"
  | "OPS_QUALITY"
  | "OPS_PUBLISHER"
  | "RND"
  | "SYSTEM";

export interface Job {
  id: string;
  client_id: string | null;
  parent_job_id: string | null;
  job_type: string;
  title: string;
  priority: string;
  assigned_agent: AgentType;
  triggered_by: AgentType | null;
  trigger_type: string;
  status: JobStatus;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  quality_gate_result: string | null;
  quality_gate_score: number | null;
  quality_gate_notes: string | null;
  retry_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  title: string | null;
  word_count: number | null;
  publish_status: string;
  created_at: string;
  tags: string[] | null;
  body: string | null;
  meta_description: string | null;
  content_type: string | null;
  client_id: string | null;
  keyword_id: string;
  url: string | null;
  is_active: boolean | null;
  // 신규 컬럼 (012_contents_enrich)
  published_url: string | null;
  published_at: string | null;
  actual_title: string | null;
  actual_word_count: number | null;
  actual_image_count: number | null;
  actual_h2_count: number | null;
  actual_h3_count: number | null;
  peak_rank_naver: number | null;
  peak_rank_google: number | null;
  is_tracking: boolean | null;
  seo_checklist: Record<string, boolean> | null;
  // 블로그 계정 연결 (P2-A)
  blog_account_id: string | null;
  // 신규 컬럼 (016_contents_campaigns_extend)
  refresh_count: number | null;
  refreshed_at: string | null;
  // 생성 주체
  generated_by: string | null;
  // v2 파이프라인 메타데이터 (QC 결과, 재작성 이력 등)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any> | null;
  // 전체 보기 모드
  client_name?: string | null;
}

// ─── createContent ─────────────────────────────────────────────────────────────

export async function createContent(payload: {
  clientId: string;
  keywordId?: string | null;
  blogAccountId?: string | null;
  title: string;
  body?: string | null;
  metaDescription?: string | null;
  contentType?: string;
  generatedBy?: string;
  publishStatus?: string;
  publishedUrl?: string | null;
  publishedDate?: string | null;
  isTracking?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const isPublished = payload.publishStatus === "published";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("contents")
    .insert({
      client_id:        payload.clientId,
      keyword_id:       payload.keywordId ?? null,
      account_id:       payload.blogAccountId ?? null,
      title:            payload.title,
      body:             payload.body ?? null,
      meta_description: payload.metaDescription ?? null,
      content_type:     payload.contentType ?? "single",
      generated_by:     payload.generatedBy ?? "human",
      publish_status:   payload.publishStatus ?? "draft",
      published_url:    payload.publishedUrl ?? null,
      url:              payload.publishedUrl ?? null,
      published_date:   payload.publishedDate ?? null,
      is_active:        true,
      is_tracking:      isPublished ? (payload.isTracking ?? true) : false,
      published_at:     isPublished ? now : null,
      word_count:       payload.body
        ? payload.body.replace(/\s+/g, " ").trim().split(" ").length
        : null,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[ops-actions] createContent error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/ops/contents");
  return { success: true, id: data?.id };
}

export interface OpsStats {
  activeBrands: number;
  contents24h: number;
  pendingJobs: number;
  doneJobsToday: number;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Get high-level ops statistics for the dashboard overview
 */
export async function getOpsStats(): Promise<OpsStats> {
  const supabase = createAdminClient();

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Run all counts in parallel
  const [
    { count: activeBrands },
    { count: contents24h },
    { count: pendingJobs },
    { count: doneJobsToday },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("contents")
      .select("id", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "DONE")
      .gte("completed_at", startOfToday),
  ]);

  return {
    activeBrands: activeBrands ?? 0,
    contents24h: contents24h ?? 0,
    pendingJobs: pendingJobs ?? 0,
    doneJobsToday: doneJobsToday ?? 0,
  };
}

/**
 * Get jobs list (latest 100), optionally filtered by client_id or status
 */
export async function getJobs(params?: {
  clientId?: string;
  status?: JobStatus;
}): Promise<Job[]> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("jobs")
    .select(
      "id, client_id, parent_job_id, job_type, title, priority, assigned_agent, triggered_by, trigger_type, status, input_payload, output_payload, quality_gate_result, quality_gate_score, quality_gate_notes, retry_count, error_message, started_at, completed_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (params?.clientId) {
    query = query.eq("client_id", params.clientId);
  }
  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[ops-actions] getJobs error:", error);
    return [];
  }

  return (data as Job[]) ?? [];
}

/**
 * Update job status (manual override)
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) {
    console.error("[ops-actions] updateJobStatus error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get contents list (latest 50), optionally filtered by publish_status / clientId
 */
export async function getContents(params?: {
  publishStatus?: string;
  generatedBy?: string;
  clientId?: string | null;
}): Promise<Content[]> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("contents")
    .select(
      "id, title, word_count, publish_status, created_at, generated_by, tags, body, meta_description, content_type, client_id, keyword_id, published_url, is_tracking, peak_rank_naver, peak_rank_google, metadata, clients(name)"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (params?.publishStatus) {
    query = query.eq("publish_status", params.publishStatus);
  }
  if (params?.generatedBy) {
    query = query.eq("generated_by", params.generatedBy);
  }
  if (params?.clientId) {
    query = query.eq("client_id", params.clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[ops-actions] getContents error:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((c: any) => ({
    ...c,
    client_name: c.clients?.name ?? null,
    clients: undefined,
  })) as Content[];
}

/**
 * Get single content by id (includes full body + metadata)
 */
export async function getContent(id: string): Promise<Content | null> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("contents")
    .select(
      "id, title, word_count, publish_status, created_at, updated_at, tags, body, meta_description, content_type, client_id, keyword_id, url, is_active, published_url, published_at, actual_title, actual_word_count, actual_image_count, actual_h2_count, actual_h3_count, peak_rank_naver, peak_rank_google, is_tracking, seo_checklist, blog_account_id:account_id, metadata"
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("[ops-actions] getContent error:", error);
    return null;
  }

  return data as Content;
}

/**
 * Update content (title + body)
 */
export async function updateContent(
  id: string,
  fields: { title?: string; body?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.title !== undefined) updateData.title = fields.title;
  if (fields.body !== undefined) {
    updateData.body = fields.body;
    updateData.word_count = fields.body.replace(/\s+/g, " ").trim().split(" ").length;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("contents")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("[ops-actions] updateContent error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 발행 완료 URL 저장 + SERP 추적 활성화
 * published_url 저장 → is_tracking=true → publish_status='published'
 */
export async function updatePublishedUrl(
  id: string,
  url: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("contents")
    .update({
      published_url: url,
      url,                       // 레거시 SERP 추적 컬럼도 동기화
      is_tracking: true,
      published_at: now,
      publish_status: "published",
      updated_at: now,
    })
    .eq("id", id);

  if (error) {
    console.error("[ops-actions] updatePublishedUrl error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ── CSV 대량 등록 (콘텐츠) ─────────────────────────────────────────────────────

export async function bulkCreateContents(
  clientId: string,
  rows: Array<{
    subKeyword: string;
    title: string;
    publishedUrl: string;
    accountName: string;
    publishedAt: string;
  }>
): Promise<{ success: boolean; inserted: number; skipped: number; errors: string[] }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const errors: string[] = [];
  let inserted = 0;

  // 사전 조회: keywords, blog_accounts, existing URLs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: kwData }, { data: accData }, { data: urlData }] = await Promise.all([
    (supabase as any).from("keywords").select("id, keyword, sub_keyword").eq("client_id", clientId),
    (supabase as any).from("blog_accounts").select("id, account_name").eq("client_id", clientId),
    (supabase as any).from("contents").select("published_url").eq("client_id", clientId).not("published_url", "is", null),
  ]);

  // keyword 검색 맵 (sub_keyword 우선, 없으면 keyword)
  const kwMap: Record<string, string> = {};
  for (const k of kwData ?? []) {
    if (k.sub_keyword) kwMap[k.sub_keyword.toLowerCase()] = k.id;
    kwMap[k.keyword.toLowerCase()] = k.id;
  }

  // account 검색 맵
  const accMap: Record<string, string> = {};
  for (const a of accData ?? []) {
    accMap[a.account_name.toLowerCase()] = a.id;
  }

  // 기존 URL 셋
  const existingUrls = new Set<string>(
    (urlData ?? []).map((c: { published_url: string }) => c.published_url)
  );

  const records: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const row of rows) {
    if (!row.title.trim() && !row.subKeyword.trim()) {
      skipped++;
      continue;
    }
    // URL 중복 체크
    if (row.publishedUrl && existingUrls.has(row.publishedUrl)) {
      skipped++;
      continue;
    }

    const keywordId = kwMap[row.subKeyword.toLowerCase()] ?? null;
    const accountId = row.accountName ? (accMap[row.accountName.toLowerCase()] ?? null) : null;

    records.push({
      client_id: clientId,
      keyword_id: keywordId,
      account_id: accountId,
      title: row.title.trim() || null,
      published_url: row.publishedUrl || null,
      url: row.publishedUrl || null,
      published_at: row.publishedAt || null,
      publish_status: row.publishedUrl ? "published" : "draft",
      generated_by: "human",
      content_type: "single",
      is_active: true,
      is_tracking: !!row.publishedUrl,
      created_at: now,
      updated_at: now,
    });

    if (row.publishedUrl) existingUrls.add(row.publishedUrl);
  }

  skipped += rows.length - records.length - skipped;

  if (records.length === 0) {
    return { success: true, inserted: 0, skipped: rows.length, errors: [] };
  }

  const BATCH = 100;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("contents").insert(batch);
    if (error) {
      errors.push(`배치 ${Math.floor(i / BATCH) + 1}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  if (inserted > 0) revalidatePath("/ops/contents");
  return { success: errors.length === 0, inserted, skipped, errors };
}
