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

  // 1) client_id로 직접 연결된 분석 결과 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("brand_analyses")
    .select("id, basic_info, content_strategy, keyword_analysis, analysis_result, place_id, input_url, url_type")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return data as BrandAnalysisForPublishing;
  }

  // 2) client_id 미연결 — clients.brand_persona에서 폴백
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client } = await (db as any)
    .from("clients")
    .select("name, brand_persona")
    .eq("id", clientId)
    .maybeSingle();

  if (client?.brand_persona) {
    const bp = client.brand_persona as Record<string, unknown>;
    return {
      id: "",
      basic_info: {
        name: client.name || (bp.name as string) || "",
        category: (bp.category as string) || "",
        region: (bp.region as string) || (bp.location as string) || "",
        homepage_url: (bp.homepage_url as string) || (bp.website as string) || "",
        address: (bp.address as string) || "",
      },
      content_strategy: bp.content_strategy ? bp.content_strategy as Record<string, unknown> : null,
      keyword_analysis: null,
      analysis_result: null,
      place_id: (bp.place_id as string) || null,
      input_url: null,
      url_type: null,
    } as BrandAnalysisForPublishing;
  }

  // 3) brand_persona도 없으면 클라이언트 기본 이름만
  if (client) {
    return {
      id: "",
      basic_info: { name: client.name || "" },
      content_strategy: null,
      keyword_analysis: null,
      analysis_result: null,
      place_id: null,
      input_url: null,
      url_type: null,
    } as BrandAnalysisForPublishing;
  }

  return null;
}

type BrandAnalysisForPublishing = {
  id: string;
  basic_info: Record<string, unknown> | null;
  content_strategy: Record<string, unknown> | null;
  keyword_analysis: Record<string, unknown> | null;
  analysis_result: Record<string, unknown> | null;
  place_id: string | null;
  input_url: string | null;
  url_type: string | null;
};

/** 콘텐츠 생성 후 DB 저장 */
export async function saveGeneratedContent(payload: {
  clientId: string;
  title: string;
  body: string;
  mainKeyword: string;
  subKeywords: string[];
  contentType: string;
  keywordId?: string;
  metaDescription?: string;
  tags?: string[];
  publishingAccountId?: string;
  imageUrls?: string[];
  publishedUrl?: string;
}): Promise<{ success: boolean; contentId?: string; error?: string }> {
  const db = createAdminClient();

  const wordCount = payload.body.replace(/\s/g, "").length;
  const hasPublishedUrl = !!payload.publishedUrl?.trim();

  // main_keyword/sub_keywords는 DB 컬럼이 아니므로 metadata에 저장
  const meta: Record<string, unknown> = {};
  if (payload.imageUrls?.length) meta.selected_images = payload.imageUrls;
  if (payload.mainKeyword) meta.main_keyword = payload.mainKeyword;
  if (payload.subKeywords?.length) meta.sub_keywords = payload.subKeywords;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("contents")
    .insert({
      client_id: payload.clientId,
      title: payload.title,
      body: payload.body,
      keyword_id: payload.keywordId || null,
      content_type: payload.contentType,
      meta_description: payload.metaDescription || null,
      tags: payload.tags || [],
      publish_status: hasPublishedUrl ? "tracking" : "draft",
      published_url: hasPublishedUrl ? payload.publishedUrl!.trim() : null,
      is_tracking: hasPublishedUrl,
      generated_by: "human",
      word_count: wordCount,
      publishing_account_id: payload.publishingAccountId || null,
      metadata: Object.keys(meta).length > 0 ? meta : null,
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

/** 콘텐츠 추적 시작 (발행 URL + 추적 상태 업데이트) */
export async function updateContentForTracking(payload: {
  contentId: string;
  publishingAccountId?: string;
  publishedUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("contents")
    .update({
      publishing_account_id: payload.publishingAccountId || null,
      published_url: payload.publishedUrl.trim(),
      publish_status: "tracking",
      is_tracking: true,
    })
    .eq("id", payload.contentId);

  if (error) {
    console.error("[publishing-account-actions] updateContentForTracking:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/contents");
  return { success: true };
}
