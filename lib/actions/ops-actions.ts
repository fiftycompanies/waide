"use server";

import { createAdminClient } from "@/lib/supabase/service";

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
  content_type: string;
  client_id: string | null;
  keyword_id: string;
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
 * Get contents list (latest 50), optionally filtered by publish_status
 */
export async function getContents(params?: {
  publishStatus?: string;
}): Promise<Content[]> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("contents")
    .select(
      "id, title, word_count, publish_status, created_at, tags, body, meta_description, content_type, client_id, keyword_id"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (params?.publishStatus) {
    query = query.eq("publish_status", params.publishStatus);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[ops-actions] getContents error:", error);
    return [];
  }

  return (data as Content[]) ?? [];
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
      "id, title, word_count, publish_status, created_at, updated_at, tags, body, meta_description, content_type, client_id, keyword_id"
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
