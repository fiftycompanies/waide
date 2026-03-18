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
  // Phase 6 확장
  auth_type?: string;
  access_token?: string | null;
  api_key?: string | null;
  api_secret?: string | null;
  blog_id?: string | null;
  platform_user_id?: string | null;
  is_default?: boolean;
  last_published_at?: string | null;
}

// ── 조회 ──────────────────────────────────────────────────────────────────────

/** clientId === null 이면 전체 브랜드 계정 반환 */
export async function getBlogAccounts(clientId: string | null): Promise<BlogAccount[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("blog_accounts")
    .select("id, client_id, account_name, platform, blog_url, blog_score, fixed_ip, is_active, created_at, auth_type, blog_id, platform_user_id, is_default, last_published_at, clients(name)")
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

// ── 홈페이지 블로그 상태 / 등록 ────────────────────────────────────────────────

export interface HomepageBlogStatus {
  hasHomepage: boolean;
  isLive: boolean;
  blogConnected: boolean;
  subdomain: string | null;
  deploymentUrl: string | null;
  projectId: string | null;
}

/** 클라이언트의 홈페이지 블로그 연결 상태 조회 */
export async function getHomepageBlogStatus(
  clientId: string | null
): Promise<HomepageBlogStatus> {
  const empty: HomepageBlogStatus = {
    hasHomepage: false,
    isLive: false,
    blogConnected: false,
    subdomain: null,
    deploymentUrl: null,
    projectId: null,
  };

  if (!clientId) return empty;

  const db = createAdminClient();

  // homepage_projects에서 해당 브랜드의 최신 프로젝트 조회
  const { data: project } = await db
    .from("homepage_projects")
    .select("id, status, subdomain, vercel_deployment_url, blog_config")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!project) return empty;

  const isLive = project.status === "live";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blogConfig = (project.blog_config ?? {}) as any;
  const blogEnabled = blogConfig.blog_enabled === true;

  // publishing_accounts에서 homepage 플랫폼 등록 여부 확인
  const { data: pubAccount } = await db
    .from("publishing_accounts")
    .select("id")
    .eq("client_id", clientId)
    .eq("platform", "homepage")
    .maybeSingle();

  return {
    hasHomepage: true,
    isLive,
    blogConnected: blogEnabled && !!pubAccount,
    subdomain: project.subdomain,
    deploymentUrl: project.vercel_deployment_url,
    projectId: project.id,
  };
}

/** 홈페이지 블로그를 발행 계정으로 등록 */
export async function registerHomepageBlogAccount(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();

    // 프로젝트 조회
    const { data: project } = await db
      .from("homepage_projects")
      .select("id, subdomain, status")
      .eq("client_id", clientId)
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!project || !project.subdomain) {
      return { success: false, error: "라이브 상태의 홈페이지가 없습니다." };
    }

    // HomepagePublisher를 통해 등록
    const { HomepagePublisher } = await import("@/lib/homepage/publishing");
    const publisher = new HomepagePublisher(db);
    await publisher.registerHomepagePlatform(
      clientId,
      project.id,
      project.subdomain
    );

    revalidatePath("/blog-accounts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "등록 실패",
    };
  }
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
