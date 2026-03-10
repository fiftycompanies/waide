"use server";

import { createAdminClient } from "@/lib/supabase/service";

export async function createPortalContentJob(payload: {
  clientId: string;
  keyword: string;
  keywordId?: string;
  count: number;
  contentType: string;
  referenceUrls: string[];
}) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // count 만큼 개별 job 생성
  const jobIds: string[] = [];

  for (let i = 0; i < payload.count; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: job, error } = await (db as any)
      .from("jobs")
      .insert({
        client_id: payload.clientId,
        assigned_agent: "COPYWRITER",
        job_type: "CONTENT_CREATE",
        status: "PENDING",
        title: `[포털 콘텐츠 생성] ${payload.keyword}${payload.count > 1 ? ` (${i + 1}/${payload.count})` : ""}`,
        trigger_type: "USER",
        triggered_by: "PORTAL",
        priority: "medium",
        input_payload: {
          keyword: payload.keyword,
          keyword_id: payload.keywordId || null,
          content_type: payload.contentType,
          reference_urls: payload.referenceUrls,
          source: "portal",
        },
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[portal-write-actions] createPortalContentJob:", error);
      return { success: false, error: error.message };
    }

    if (job) jobIds.push(job.id);
  }

  return { success: true, jobIds };
}

export async function registerPublishUrl(payload: {
  contentId: string;
  clientId: string;
  url: string;
  platform: string;
}) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // 1. publications INSERT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: pubError } = await (db as any)
    .from("publications")
    .insert({
      content_id: payload.contentId,
      client_id: payload.clientId,
      platform: payload.platform,
      external_url: payload.url,
      status: "published",
      publish_type: "manual",
      published_at: now,
      created_at: now,
    });

  if (pubError) {
    console.error("[portal-write-actions] registerPublishUrl pub:", pubError);
    return { success: false, error: pubError.message };
  }

  // 2. contents UPDATE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: contError } = await (db as any)
    .from("contents")
    .update({
      publish_status: "published",
      published_url: payload.url,
      published_at: now,
      is_tracking: true,
      updated_at: now,
    })
    .eq("id", payload.contentId);

  if (contError) {
    console.error("[portal-write-actions] registerPublishUrl cont:", contError);
    return { success: false, error: contError.message };
  }

  return { success: true };
}
