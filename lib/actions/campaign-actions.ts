"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export interface Campaign {
  id: string;
  client_id: string;
  keyword_id: string | null;
  title: string;
  status: string;
  target_platform: string | null;
  created_at: string;
  keyword_name?: string | null;
  client_name?: string | null;    // 전체 보기 모드: 소속 브랜드명
  // 신규 컬럼 (016_contents_campaigns_extend)
  publish_count: number | null;
  content_type: string | null;
  source_ids: string[] | null;
  target_client_ids: string[] | null;
}

export interface StyleRefContent {
  id: string;
  title: string | null;
  peak_rank_naver: number | null;
  peak_rank_google: number | null;
  peak_rank: number | null;          // 레거시 컬럼 (fallback)
  published_url: string | null;
}

/** clientId === null 이면 전체 브랜드 캠페인 반환 */
export async function getCampaigns(clientId: string | null): Promise<Campaign[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("campaigns")
    .select("id, client_id, keyword_id, title, status, target_platform, created_at, clients(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[campaign-actions] getCampaigns error:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped: Campaign[] = (data ?? []).map((c: any) => ({
    ...c,
    client_name: c.clients?.name ?? null,
    clients: undefined,
  }));

  const kwIds = [...new Set(mapped.map((c) => c.keyword_id).filter(Boolean))];
  if (kwIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: kws } = await (db as any)
      .from("keywords")
      .select("id, keyword")
      .in("id", kwIds);
    const kwMap = Object.fromEntries(
      (kws ?? []).map((k: { id: string; keyword: string }) => [k.id, k.keyword])
    );
    return mapped.map((c) => ({
      ...c,
      keyword_name: kwMap[c.keyword_id ?? ""] ?? null,
    }));
  }
  return mapped;
}

export async function getActiveKeywordsForClient(
  clientId: string
): Promise<{ id: string; keyword: string; platform: string | null }[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("keywords")
    .select("id, keyword, platform")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("priority_score", { ascending: false, nullsFirst: false });

  if (error) return [];
  return (data ?? []) as { id: string; keyword: string; platform: string | null }[];
}

export async function getBestRankContents(clientId: string): Promise<StyleRefContent[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("contents")
    .select("id, title, peak_rank_naver, peak_rank_google, peak_rank, published_url")
    .eq("client_id", clientId)
    .or("peak_rank_naver.lte.10,peak_rank_google.lte.10,peak_rank.lte.10")
    .order("peak_rank_naver", { ascending: true, nullsFirst: false })
    .limit(20);

  if (error) {
    console.error("[campaign-actions] getBestRankContents error:", error);
    return [];
  }
  return (data ?? []) as StyleRefContent[];
}

export async function createCampaignWithJob(payload: {
  clientId: string;
  keywordId: string;
  keywordText: string;
  referenceContentIds: string[];
  contentType?: string;
  publishCount?: number;
  sourceIds?: string[];
  targetClientIds?: string[];
}): Promise<{ success: boolean; campaignId?: string; jobId?: string; error?: string }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // Step 1: campaigns INSERT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign, error: campaignError } = await (db as any)
    .from("campaigns")
    .insert({
      client_id: payload.clientId,
      keyword_id: payload.keywordId,
      title: `[캠페인] ${payload.keywordText}`,
      reference_content_ids: payload.referenceContentIds,
      status: "active",
      content_type: payload.contentType ?? "single",
      publish_count: payload.publishCount ?? 1,
      source_ids: payload.sourceIds ?? [],
      target_client_ids: payload.targetClientIds ?? [],
      updated_at: now,
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    return { success: false, error: campaignError?.message ?? "캠페인 생성 실패" };
  }

  // Step 2: jobs INSERT (CMO CAMPAIGN_PLAN)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job, error: jobError } = await (db as any)
    .from("jobs")
    .insert({
      client_id: payload.clientId,
      campaign_id: campaign.id,
      assigned_agent: "CMO",
      job_type: "CAMPAIGN_PLAN",
      status: "PENDING",
      title: `[캠페인 기획] ${payload.keywordText}`,
      trigger_type: "USER",
      triggered_by: "SYSTEM",
      priority: "medium",
      input_payload: {
        keyword: payload.keywordText,
        keyword_id: payload.keywordId,
        style_ref_ids: payload.referenceContentIds,
        content_type: payload.contentType ?? "single",
        publish_count: payload.publishCount ?? 1,
        source_ids: payload.sourceIds ?? [],
        target_client_ids: payload.targetClientIds ?? [],
      },
      retry_count: 0,
      updated_at: now,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    // 롤백
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("campaigns").delete().eq("id", campaign.id);
    return { success: false, error: jobError?.message ?? "Job 생성 실패" };
  }

  revalidatePath("/campaigns");
  return { success: true, campaignId: campaign.id, jobId: job.id };
}

