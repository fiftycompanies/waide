"use server";

/**
 * publish-actions.ts
 * 발행 관련 서버 액션
 * - 발행 실행 (수동/자동)
 * - 자동 발행 설정 CRUD
 * - 발행 이력 조회
 * - 연동 테스트
 * - 자동 발행 트리거 (checkAutoPublish)
 */

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import {
  publishContent,
  type BlogAccountForPublish,
  type ContentForPublish,
  type PublishOptions,
  type PublishResult,
} from "@/lib/publishers";
import { testWordPressConnection } from "@/lib/publishers/wordpress-publisher";
import { getTistoryBlogInfo } from "@/lib/publishers/tistory-publisher";
import { getMediumUser } from "@/lib/publishers/medium-publisher";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface Publication {
  id: string;
  content_id: string;
  client_id: string;
  blog_account_id: string | null;
  platform: string;
  external_url: string | null;
  external_post_id: string | null;
  status: string;
  publish_type: string;
  error_message: string | null;
  retry_count: number;
  published_at: string | null;
  created_at: string;
  // joined
  content_title?: string | null;
  account_name?: string | null;
}

export interface AutoPublishSettings {
  id: string;
  client_id: string;
  is_enabled: boolean;
  default_platform: string | null;
  default_blog_account_id: string | null;
  tistory_enabled: boolean;
  wordpress_enabled: boolean;
  medium_enabled: boolean;
  publish_as_draft: boolean;
  add_canonical_url: boolean;
  add_schema_markup: boolean;
}

// ═══════════════════════════════════════════
// 발행 실행
// ═══════════════════════════════════════════

/**
 * 콘텐츠를 특정 플랫폼으로 발행
 */
export async function executePublish(params: {
  contentId: string;
  clientId: string;
  blogAccountId: string;
  platform: "tistory" | "wordpress" | "medium" | "homepage";
  publishAsDraft?: boolean;
  categoryId?: string;
  publishType?: "manual" | "auto";
}): Promise<{ success: boolean; publication?: Publication; error?: string }> {
  const db = createAdminClient();

  // ── Homepage 플랫폼: publishing_accounts + HomepagePublisher 경유 ──
  if (params.platform === "homepage") {
    return _publishToHomepage(db, params);
  }

  // 1. 블로그 계정 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account, error: accErr } = await (db as any)
    .from("blog_accounts")
    .select("*")
    .eq("id", params.blogAccountId)
    .single();

  if (accErr || !account) {
    return { success: false, error: "블로그 계정을 찾을 수 없습니다." };
  }

  // 2. 콘텐츠 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: content, error: cErr } = await (db as any)
    .from("contents")
    .select("id, title, body, meta_description, content_type, tags")
    .eq("id", params.contentId)
    .single();

  if (cErr || !content) {
    return { success: false, error: "콘텐츠를 찾을 수 없습니다." };
  }

  // 3. publications에 pending 레코드 생성
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pub, error: pubErr } = await (db as any)
    .from("publications")
    .insert({
      content_id: params.contentId,
      client_id: params.clientId,
      blog_account_id: params.blogAccountId,
      platform: params.platform,
      status: "publishing",
      publish_type: params.publishType || "manual",
    })
    .select("id")
    .single();

  if (pubErr) {
    return { success: false, error: `발행 레코드 생성 실패: ${pubErr.message}` };
  }

  // 4. 자동 발행 설정 조회 (옵션)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (db as any)
    .from("auto_publish_settings")
    .select("*")
    .eq("client_id", params.clientId)
    .single();

  const options: PublishOptions = {
    publishAsDraft: params.publishAsDraft ?? settings?.publish_as_draft ?? false,
    addCanonicalUrl: settings?.add_canonical_url ?? true,
    addSchemaMarkup: settings?.add_schema_markup ?? true,
    categoryId: params.categoryId,
  };

  // 5. 발행 실행
  const result = await publishContent(
    params.platform,
    account as BlogAccountForPublish,
    content as ContentForPublish,
    options
  );

  // 6. 결과 저장
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .from("publications")
    .update({
      status: result.success ? "published" : "failed",
      external_url: result.external_url || null,
      external_post_id: result.external_post_id || null,
      error_message: result.error || null,
      published_at: result.success ? now : null,
    })
    .eq("id", pub.id);

  // 7. 성공 시 contents 업데이트 (대표 URL)
  if (result.success && result.external_url) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("contents")
      .update({
        published_url: result.external_url,
        publish_status: "published",
        is_tracking: true,
        published_at: now,
        account_id: params.blogAccountId,
        updated_at: now,
      })
      .eq("id", params.contentId);

    // blog_accounts 최종 발행일 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("blog_accounts")
      .update({ last_published_at: now, updated_at: now })
      .eq("id", params.blogAccountId);
  }

  // Phase 4: 발행 완료/실패 알림 생성
  if (result.success) {
    try {
      const { createNotification } = await import("@/lib/actions/notification-actions");
      await createNotification({
        clientId: params.clientId,
        type: "publish_complete",
        title: `"${content.title || "Untitled"}" 발행 완료`,
        body: result.external_url || undefined,
        metadata: { content_id: params.contentId, platform: params.platform, published_url: result.external_url },
      });

      // 잔여 포인트 경고 알림
      const { getPortalPointBalance } = await import("@/lib/actions/portal-actions");
      const balance = await getPortalPointBalance(params.clientId);
      if (balance <= 3) {
        await createNotification({
          clientId: params.clientId,
          type: "quota_warning",
          title: `잔여 포인트 ${balance}건 남음`,
          body: "포인트가 부족하면 발행이 중단됩니다.",
        });
      }
    } catch (notifErr) {
      console.error("[publish-actions] notification creation failed:", notifErr);
    }
  }

  revalidatePath("/publish");
  revalidatePath("/contents");

  return {
    success: result.success,
    error: result.error,
    publication: {
      id: pub.id,
      content_id: params.contentId,
      client_id: params.clientId,
      blog_account_id: params.blogAccountId,
      platform: params.platform,
      external_url: result.external_url ?? null,
      external_post_id: result.external_post_id ?? null,
      status: result.success ? "published" : "failed",
      publish_type: params.publishType || "manual",
      error_message: result.error ?? null,
      retry_count: 0,
      published_at: result.success ? now : null,
      created_at: now,
    },
  };
}

/**
 * Homepage 플랫폼 내부 발행 로직
 * publishing_accounts.memo에서 project_id를 추출하여 HomepagePublisher로 발행
 */
async function _publishToHomepage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  params: {
    contentId: string;
    clientId: string;
    blogAccountId: string; // publishing_accounts.id
    publishType?: "manual" | "auto";
  }
): Promise<{ success: boolean; publication?: Publication; error?: string }> {
  // 1. publishing_accounts에서 project_id 추출
  let projectId: string | null = null;

  if (params.blogAccountId) {
    const { data: account } = await db
      .from("publishing_accounts")
      .select("memo")
      .eq("id", params.blogAccountId)
      .maybeSingle();

    if (account?.memo) {
      try {
        const memo = typeof account.memo === "string" ? JSON.parse(account.memo) : account.memo;
        projectId = memo?.project_id || null;
      } catch { /* memo parse failed */ }
    }
  }

  // blogAccountId가 없거나 memo에 project_id가 없으면 client의 homepage 프로젝트 조회
  if (!projectId) {
    const { data: hpProject } = await db
      .from("homepage_projects")
      .select("id")
      .eq("client_id", params.clientId)
      .eq("status", "deployed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    projectId = hpProject?.id || null;
  }

  if (!projectId) {
    return { success: false, error: "홈페이지 프로젝트를 찾을 수 없습니다. 홈페이지가 배포되어 있는지 확인하세요." };
  }

  // 2. HomepagePublisher로 발행
  try {
    const { HomepagePublisher } = await import("@/lib/homepage/publishing/homepage-publisher");
    const publisher = new HomepagePublisher(db);
    const result = await publisher.publishToHomepage(params.contentId, projectId);

    // 3. contents 추가 필드 업데이트 (published_url, is_tracking — HomepagePublisher가 미처리)
    const now = new Date().toISOString();
    await db
      .from("contents")
      .update({
        published_url: result.blogUrl,
        is_tracking: true,
        updated_at: now,
      })
      .eq("id", params.contentId);

    // 4. 알림 생성
    try {
      const { data: content } = await db
        .from("contents")
        .select("title")
        .eq("id", params.contentId)
        .single();

      const { createNotification } = await import("@/lib/actions/notification-actions");
      await createNotification({
        clientId: params.clientId,
        type: "publish_complete",
        title: `"${content?.title || "Untitled"}" 홈페이지 발행 완료`,
        body: result.blogUrl,
        metadata: { content_id: params.contentId, platform: "homepage", published_url: result.blogUrl },
      });
    } catch (notifErr) {
      console.error("[publish-actions] homepage notification failed:", notifErr);
    }

    revalidatePath("/publish");
    revalidatePath("/contents");

    const now2 = new Date().toISOString();
    return {
      success: true,
      publication: {
        id: result.publicationId,
        content_id: params.contentId,
        client_id: params.clientId,
        blog_account_id: params.blogAccountId || null,
        platform: "homepage",
        external_url: result.blogUrl,
        external_post_id: null,
        status: "published",
        publish_type: params.publishType || "manual",
        error_message: null,
        retry_count: 0,
        published_at: now2,
        created_at: now2,
      },
    };
  } catch (err) {
    console.error("[publish-actions] homepage publish failed:", err);
    return {
      success: false,
      error: `홈페이지 발행 실패: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

/**
 * 발행 재시도
 */
export async function retryPublish(
  publicationId: string
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pub, error: pErr } = await (db as any)
    .from("publications")
    .select("*")
    .eq("id", publicationId)
    .single();

  if (pErr || !pub) {
    return { success: false, error: "발행 레코드를 찾을 수 없습니다." };
  }

  if (pub.retry_count >= 3) {
    return { success: false, error: "최대 재시도 횟수(3회)를 초과했습니다. 수동 발행으로 전환하세요." };
  }

  // 재시도
  const result = await executePublish({
    contentId: pub.content_id,
    clientId: pub.client_id,
    blogAccountId: pub.blog_account_id,
    platform: pub.platform,
    publishType: pub.publish_type,
  });

  // retry_count 증가
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .from("publications")
    .update({ retry_count: pub.retry_count + 1 })
    .eq("id", publicationId);

  return result;
}

// ═══════════════════════════════════════════
// 자동 발행 트리거
// ═══════════════════════════════════════════

/**
 * QC 통과 후 자동 발행 체크
 * 콘텐츠 생성 파이프라인에서 호출
 */
export async function checkAutoPublish(
  contentId: string,
  clientId: string
): Promise<void> {
  const db = createAdminClient();

  // 1. auto_publish_settings 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (db as any)
    .from("auto_publish_settings")
    .select("*")
    .eq("client_id", clientId)
    .single();

  // 2. 자동 발행 OFF → return
  if (!settings?.is_enabled) return;

  // 3. 활성화된 채널 확인
  const channels: ("tistory" | "wordpress" | "medium")[] = [];
  if (settings.tistory_enabled) channels.push("tistory");
  if (settings.wordpress_enabled) channels.push("wordpress");
  if (settings.medium_enabled) channels.push("medium");

  if (channels.length === 0) return;

  // 4. Phase 4: confirm_count 체크 (처음 3건 컨펌)
  const extSettings = settings?.settings as Record<string, unknown> | null;
  const confirmCount = (extSettings?.confirm_count as number) ?? 0;
  if (confirmCount < 3) {
    // 콘텐츠 제목 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: confirmContent } = await (db as any)
      .from("contents")
      .select("title")
      .eq("id", contentId)
      .single();

    try {
      const { createNotification } = await import("@/lib/actions/notification-actions");
      await createNotification({
        clientId,
        type: "auto_publish_confirm",
        title: `자동발행 확인 필요: "${confirmContent?.title || "Untitled"}"`,
        body: "발행 전 내용을 확인해주세요.",
        metadata: { content_id: contentId },
      });
    } catch (notifErr) {
      console.error("[publish-actions] auto_publish_confirm notification failed:", notifErr);
    }
    return; // 컨펌 필요 시 자동발행 스킵
  }

  // 4b. 콘텐츠 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: content } = await (db as any)
    .from("contents")
    .select("id, title, body, meta_description, content_type, tags")
    .eq("id", contentId)
    .single();

  if (!content) return;

  // 5. 각 채널별 발행 실행
  let firstSuccessUrl: string | null = null;

  for (const platform of channels) {
    // 해당 플랫폼의 기본 계정 찾기
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: accounts } = await (db as any)
      .from("blog_accounts")
      .select("*")
      .eq("client_id", clientId)
      .eq("platform", platform)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1);

    const account = accounts?.[0];
    if (!account) continue; // 계정 미연동 → skip

    try {
      const result = await executePublish({
        contentId,
        clientId,
        blogAccountId: account.id,
        platform,
        publishType: "auto",
      });

      if (result.success && result.publication?.external_url && !firstSuccessUrl) {
        firstSuccessUrl = result.publication.external_url;
      }
    } catch (err) {
      console.error(`[auto-publish] ${platform} 자동 발행 실패:`, err);
      // 한 채널 실패해도 다른 채널 계속 진행
    }
  }
}

// ═══════════════════════════════════════════
// 자동 발행 설정 CRUD
// ═══════════════════════════════════════════

export async function getAutoPublishSettings(
  clientId: string
): Promise<AutoPublishSettings | null> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("auto_publish_settings")
    .select("*")
    .eq("client_id", clientId)
    .single();

  return (data as AutoPublishSettings) || null;
}

export async function updateAutoPublishSettings(
  clientId: string,
  updates: Partial<Omit<AutoPublishSettings, "id" | "client_id">>
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  // UPSERT
  const payload = {
    client_id: clientId,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("auto_publish_settings")
    .upsert(payload, { onConflict: "client_id" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/publish");
  return { success: true };
}

// ═══════════════════════════════════════════
// 발행 이력 조회
// ═══════════════════════════════════════════

export async function getPublications(params: {
  clientId?: string | null;
  status?: string;
  limit?: number;
}): Promise<Publication[]> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("publications")
    .select("*, contents(title), blog_accounts(account_name)")
    .order("created_at", { ascending: false })
    .limit(params.limit || 100);

  if (params.clientId) {
    query = query.eq("client_id", params.clientId);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[publish-actions] getPublications:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((p: any) => ({
    ...p,
    content_title: p.contents?.title ?? null,
    account_name: p.blog_accounts?.account_name ?? null,
    contents: undefined,
    blog_accounts: undefined,
  }));
}

// ═══════════════════════════════════════════
// 연동 테스트
// ═══════════════════════════════════════════

export async function testBlogConnection(params: {
  platform: string;
  accessToken?: string;
  apiKey?: string;
  apiSecret?: string;
  blogUrl?: string;
}): Promise<{ success: boolean; info?: string; error?: string }> {
  try {
    switch (params.platform) {
      case "tistory": {
        if (!params.accessToken) return { success: false, error: "Access token이 필요합니다." };
        const result = await getTistoryBlogInfo(params.accessToken);
        if (result.success) {
          return { success: true, info: `연동 성공! 블로그: ${result.blogName}` };
        }
        return { success: false, error: result.error };
      }
      case "wordpress": {
        if (!params.blogUrl || !params.apiKey || !params.apiSecret) {
          return { success: false, error: "사이트 URL, 사용자명, 앱 비밀번호가 필요합니다." };
        }
        const result = await testWordPressConnection(params.blogUrl, params.apiKey, params.apiSecret);
        if (result.success) {
          return { success: true, info: `연동 성공! 사이트: ${result.siteName}` };
        }
        return { success: false, error: result.error };
      }
      case "medium": {
        if (!params.apiKey) return { success: false, error: "Integration Token이 필요합니다." };
        const result = await getMediumUser(params.apiKey);
        if (result.success) {
          return { success: true, info: `연동 성공! 사용자: ${result.name || result.username}` };
        }
        return { success: false, error: result.error };
      }
      default:
        return { success: false, error: "지원하지 않는 플랫폼입니다." };
    }
  } catch (error) {
    return { success: false, error: `연동 테스트 실패: ${error instanceof Error ? error.message : "unknown"}` };
  }
}

// ═══════════════════════════════════════════
// 블로그 계정 확장 (OAuth + API키)
// ═══════════════════════════════════════════

/**
 * API키/토큰 기반 블로그 계정 생성 (WordPress, Medium)
 */
export async function createApiKeyAccount(params: {
  clientId: string;
  platform: "wordpress" | "medium";
  accountName: string;
  blogUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  platformUserId?: string;
}): Promise<{ success: boolean; accountId?: string; error?: string }> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("blog_accounts")
    .insert({
      client_id: params.clientId,
      platform: params.platform,
      auth_type: "api_key",
      account_name: params.accountName.trim(),
      blog_url: params.blogUrl?.trim() || null,
      api_key: params.apiKey || null,
      api_secret: params.apiSecret || null,
      platform_user_id: params.platformUserId || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { success: false, error: "이미 등록된 계정명입니다." };
    return { success: false, error: error.message };
  }

  revalidatePath("/blog-accounts");
  return { success: true, accountId: data?.id };
}

/**
 * 블로그 계정 기본 설정 토글
 */
export async function setDefaultAccount(
  accountId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  // 같은 클라이언트의 기존 기본 계정 해제
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .from("blog_accounts")
    .update({ is_default: false })
    .eq("client_id", clientId);

  // 새 기본 계정 설정
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("blog_accounts")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/blog-accounts");
  return { success: true };
}

/**
 * 클라이언트의 플랫폼별 연결된 계정 조회
 */
export async function getClientBlogAccounts(
  clientId: string,
  platform?: string
): Promise<BlogAccountForPublish[]> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("blog_accounts")
    .select("id, platform, auth_type, access_token, refresh_token, token_expires_at, api_key, api_secret, blog_id, blog_url, platform_user_id, account_name, is_default, is_active")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data } = await query;
  return (data ?? []) as BlogAccountForPublish[];
}
