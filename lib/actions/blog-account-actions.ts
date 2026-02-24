"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export interface BlogAccount {
  id: string;
  client_id: string;
  account_name: string;
  platform: string;
  blog_url: string | null;
  blog_score: string | null;
  fixed_ip: string | null;
  is_active: boolean;
  created_at: string;
  client_name?: string | null;  // 전체 보기 모드: 소속 브랜드명
}

// ── 조회 ──────────────────────────────────────────────────────────────────────

/** clientId === null 이면 전체 브랜드 계정 반환 */
export async function getBlogAccounts(clientId: string | null): Promise<BlogAccount[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("blog_accounts")
    .select("id, client_id, account_name, platform, blog_url, blog_score, fixed_ip, is_active, created_at, clients(name)")
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[blog-account-actions] getBlogAccounts:", error);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((a: any) => ({
    ...a,
    client_name: a.clients?.name ?? null,
    clients: undefined,
  })) as BlogAccount[];
}

// ── 생성 ──────────────────────────────────────────────────────────────────────

export async function createBlogAccount(payload: {
  clientId: string;
  accountName: string;
  platform: string;
  blogUrl?: string;
  blogScore?: string;
  fixedIp?: string;
}): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from("blog_accounts").insert({
    client_id:    payload.clientId,
    account_name: payload.accountName.trim(),
    platform:     payload.platform,
    blog_url:     payload.blogUrl?.trim() || null,
    blog_score:   payload.blogScore || null,
    fixed_ip:     payload.fixedIp?.trim() || null,
    is_active:    true,
  });

  if (error) {
    if (error.code === "23505") return { success: false, error: "이미 등록된 계정명입니다." };
    return { success: false, error: error.message };
  }
  revalidatePath("/blog-accounts");
  return { success: true };
}

// ── 수정 ──────────────────────────────────────────────────────────────────────

export async function updateBlogAccount(
  id: string,
  fields: Partial<{
    accountName: string;
    platform: string;
    blogUrl: string;
    blogScore: string;
    fixedIp: string;
    isActive: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  const updates: Record<string, unknown> = {};
  if (fields.accountName !== undefined) updates.account_name = fields.accountName;
  if (fields.platform   !== undefined) updates.platform      = fields.platform;
  if (fields.blogUrl    !== undefined) updates.blog_url      = fields.blogUrl || null;
  if (fields.blogScore  !== undefined) updates.blog_score    = fields.blogScore || null;
  if (fields.fixedIp    !== undefined) updates.fixed_ip      = fields.fixedIp || null;
  if (fields.isActive   !== undefined) updates.is_active     = fields.isActive;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from("blog_accounts").update(updates).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/blog-accounts");
  return { success: true };
}

// ── 삭제 ──────────────────────────────────────────────────────────────────────

export async function deleteBlogAccount(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from("blog_accounts").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/blog-accounts");
  return { success: true };
}

// ── 콘텐츠에 계정 연결 ────────────────────────────────────────────────────────

export async function linkContentBlogAccount(
  contentId: string,
  blogAccountId: string | null
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("contents")
    .update({ account_id: blogAccountId, updated_at: new Date().toISOString() })
    .eq("id", contentId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
