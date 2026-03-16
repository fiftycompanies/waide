"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export interface PublishingAccount {
  id: string;
  client_id: string;
  platform: string;
  account_name: string;
  account_url: string | null;
  is_default: boolean;
  is_active: boolean;
  memo: string | null;
  created_at: string;
}

/** 클라이언트의 발행 채널 목록 조회 */
export async function getPublishingAccounts(
  clientId: string
): Promise<PublishingAccount[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("publishing_accounts")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[publishing-account-actions] getPublishingAccounts:", error);
    return [];
  }
  return (data ?? []) as PublishingAccount[];
}

/** 발행 채널 생성 */
export async function createPublishingAccount(payload: {
  clientId: string;
  platform: string;
  accountName: string;
  accountUrl?: string;
  isDefault?: boolean;
  memo?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("publishing_accounts")
    .insert({
      client_id: payload.clientId,
      platform: payload.platform,
      account_name: payload.accountName.trim(),
      account_url: payload.accountUrl?.trim() || null,
      is_default: payload.isDefault ?? false,
      memo: payload.memo?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "이미 해당 플랫폼의 기본 계정이 존재합니다." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/contents");
  return { success: true, id: data?.id };
}

/** 브랜드 분석 기본 정보 조회 (basic_info, content_strategy) */
export async function getBrandAnalysisForPublishing(clientId: string) {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("brand_analyses")
    .select("id, basic_info, content_strategy, keyword_analysis, analysis_result, place_id")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("[publishing-account-actions] getBrandAnalysis:", error);
    return null;
  }
  return data as {
    id: string;
    basic_info: Record<string, unknown> | null;
    content_strategy: Record<string, unknown> | null;
    keyword_analysis: Record<string, unknown> | null;
    analysis_result: Record<string, unknown> | null;
    place_id: string | null;
  } | null;
}

/** 콘텐츠 생성 후 DB 저장 */
export async function saveGeneratedContent(payload: {
  clientId: string;
  title: string;
  body: string;
  mainKeyword: string;
  subKeywords: string[];
  contentType: string;
  metaDescription?: string;
  tags?: string[];
  publishingAccountId?: string;
  imageUrls?: string[];
  publishedUrl?: string;
}): Promise<{ success: boolean; contentId?: string; error?: string }> {
  const db = createAdminClient();

  const wordCount = payload.body.replace(/\s/g, "").length;
  const hasPublishedUrl = !!payload.publishedUrl?.trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("contents")
    .insert({
      client_id: payload.clientId,
      title: payload.title,
      body: payload.body,
      main_keyword: payload.mainKeyword,
      sub_keywords: payload.subKeywords,
      content_type: payload.contentType,
      meta_description: payload.metaDescription || null,
      tags: payload.tags || [],
      publish_status: hasPublishedUrl ? "tracking" : "draft",
      published_url: hasPublishedUrl ? payload.publishedUrl!.trim() : null,
      is_tracking: hasPublishedUrl,
      generated_by: "human",
      word_count: wordCount,
      publishing_account_id: payload.publishingAccountId || null,
      metadata: payload.imageUrls?.length
        ? { selected_images: payload.imageUrls }
        : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[publishing-account-actions] saveGeneratedContent:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/contents");
  return { success: true, contentId: data?.id };
}
