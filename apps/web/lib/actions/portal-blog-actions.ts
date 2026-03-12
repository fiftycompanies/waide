"use server";

import { createAdminClient } from "@/lib/supabase/service";

// 블로그 계정 목록 조회
export async function getPortalBlogAccounts(clientId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("blog_accounts")
    .select("id, platform, account_name, blog_url, auth_type, is_default, last_published_at, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return data || [];
}

// 자동 발행 설정 조회
export async function getPortalAutoPublishSettings(clientId: string) {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("auto_publish_settings")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  return data;
}

// 자동 발행 설정 저장 (UPSERT)
export async function savePortalAutoPublishSettings(
  clientId: string,
  settings: {
    is_enabled: boolean;
    tistory_enabled: boolean;
    wordpress_enabled: boolean;
    publish_as_draft: boolean;
    default_blog_account_id: string | null;
  }
) {
  const db = createAdminClient();
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("auto_publish_settings")
    .upsert({
      client_id: clientId,
      ...settings,
      updated_at: now,
    });
  return { success: !error, error: error?.message };
}

// 발행 이력 조회
export async function getPortalPublications(clientId: string) {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("publications")
    .select("id, platform, external_url, status, publish_type, published_at, created_at, content_id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data || data.length === 0) return [];

  // content titles 조회
  const contentIds = [...new Set(data.map((p: { content_id: string }) => p.content_id))];
  const { data: contents } = await db
    .from("contents")
    .select("id, title, keyword")
    .in("id", contentIds);

  const contentMap = Object.fromEntries(
    (contents || []).map((c: { id: string; title: string; keyword: string }) => [c.id, c])
  );

  return data.map((p: {
    id: string;
    platform: string;
    external_url: string | null;
    status: string;
    publish_type: string;
    published_at: string | null;
    created_at: string;
    content_id: string;
  }) => ({
    ...p,
    content_title: contentMap[p.content_id]?.title || "제목 없음",
    content_keyword: contentMap[p.content_id]?.keyword || "",
  }));
}

// 네이버 블로그 수동 연결
export async function connectNaverBlog(clientId: string, blogUrl: string, accountName: string) {
  const db = createAdminClient();
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("blog_accounts")
    .insert({
      client_id: clientId,
      platform: "naver",
      account_name: accountName,
      blog_url: blogUrl,
      auth_type: "manual",
      is_default: false,
      created_at: now,
      updated_at: now,
    });
  return { success: !error, error: error?.message };
}

// 블로그 계정 삭제
export async function disconnectBlogAccount(accountId: string) {
  const db = createAdminClient();
  const { error } = await db
    .from("blog_accounts")
    .delete()
    .eq("id", accountId);
  return { success: !error, error: error?.message };
}

// 기본 계정 설정
export async function setDefaultBlogAccount(accountId: string, clientId: string) {
  const db = createAdminClient();
  // 먼저 모든 계정의 is_default를 false로
  await db
    .from("blog_accounts")
    .update({ is_default: false })
    .eq("client_id", clientId);
  // 선택한 계정을 default로
  const { error } = await db
    .from("blog_accounts")
    .update({ is_default: true })
    .eq("id", accountId);
  return { success: !error, error: error?.message };
}
