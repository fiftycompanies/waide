/**
 * tistory-publisher.ts
 * Tistory Open API 발행 엔진
 * https://tistory.github.io/document-tistory-apis/
 */

import type { BlogAccountForPublish, ContentForPublish, PublishOptions, PublishResult } from "./index";
import { convertMarkdownToHtml, generateSchemaMarkup, generateCanonicalTag } from "./markdown-to-html";
import { createAdminClient } from "@/lib/supabase/service";

const TISTORY_API_BASE = "https://www.tistory.com/apis";

/**
 * Tistory에 콘텐츠 발행
 */
export async function publishToTistory(
  account: BlogAccountForPublish,
  content: ContentForPublish,
  options: PublishOptions = {}
): Promise<PublishResult> {
  if (!account.access_token) {
    return { success: false, error: "Tistory access token이 없습니다. 재연동이 필요합니다." };
  }

  if (!account.blog_id) {
    return { success: false, error: "Tistory 블로그 이름(blog_id)이 설정되지 않았습니다." };
  }

  // 1. 마크다운 → HTML
  let htmlContent = convertMarkdownToHtml(content.body);

  // Schema 마크업 추가
  if (options.addSchemaMarkup) {
    htmlContent += generateSchemaMarkup({
      contentType: content.content_type ?? undefined,
      title: content.title,
      description: content.meta_description ?? undefined,
      keywords: content.tags ?? undefined,
    });
  }

  // Canonical URL 추가
  if (options.addCanonicalUrl && options.canonicalUrl) {
    htmlContent = generateCanonicalTag(options.canonicalUrl) + htmlContent;
  }

  // 2. 태그 문자열 변환
  const tagStr = content.tags?.slice(0, 10).join(",") ?? "";

  // 3. Tistory API 호출
  const params = new URLSearchParams({
    access_token: account.access_token,
    output: "json",
    blogName: account.blog_id,
    title: content.title,
    content: htmlContent,
    visibility: options.publishAsDraft ? "0" : "3", // 0=비공개, 3=공개
    tag: tagStr,
  });

  if (options.categoryId) {
    params.set("category", options.categoryId);
  }

  try {
    const res = await fetch(`${TISTORY_API_BASE}/post/write`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (res.status === 401) {
      // 토큰 만료 → 갱신 시도
      const refreshed = await refreshTistoryToken(account);
      if (refreshed) {
        // 갱신된 토큰으로 재시도
        params.set("access_token", refreshed);
        const retryRes = await fetch(`${TISTORY_API_BASE}/post/write`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });
        return parseTistoryResponse(retryRes, account.blog_id);
      }
      return { success: false, error: "Tistory 토큰이 만료되었습니다. 재연동이 필요합니다." };
    }

    return parseTistoryResponse(res, account.blog_id);
  } catch (error) {
    return { success: false, error: `Tistory API 호출 실패: ${error instanceof Error ? error.message : "unknown"}` };
  }
}

/**
 * Tistory API 응답 파싱
 */
async function parseTistoryResponse(
  res: Response,
  blogName: string
): Promise<PublishResult> {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { success: false, error: `Tistory 응답 파싱 실패: ${text.slice(0, 200)}` };
  }

  if (data.tistory?.status === "200" && data.tistory?.postId) {
    const postId = data.tistory.postId;
    const url = data.tistory.url || `https://${blogName}.tistory.com/${postId}`;
    return {
      success: true,
      external_url: url,
      external_post_id: String(postId),
    };
  }

  return {
    success: false,
    error: data.tistory?.error_message || `Tistory 발행 실패 (status: ${data.tistory?.status})`,
  };
}

/**
 * Tistory OAuth 토큰 갱신
 * Tistory는 refresh_token이 없음 — 재인증 필요
 * 향후 지원 가능성을 위해 함수 구조만 유지
 */
export async function refreshTistoryToken(
  account: BlogAccountForPublish
): Promise<string | null> {
  // Tistory Open API는 refresh_token을 지원하지 않음
  // 토큰 만료 시 재인증 필요
  if (!account.refresh_token) return null;

  const clientId = process.env.TISTORY_CLIENT_ID;
  const clientSecret = process.env.TISTORY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // 향후 refresh 지원 시 여기서 처리
  console.warn("[tistory] refresh_token 재발급 미지원 — 재인증 필요");
  return null;
}

/**
 * Tistory 블로그 정보 조회 (연동 테스트용)
 */
export async function getTistoryBlogInfo(
  accessToken: string
): Promise<{ success: boolean; blogName?: string; blogUrl?: string; error?: string }> {
  try {
    const res = await fetch(
      `${TISTORY_API_BASE}/blog/info?access_token=${encodeURIComponent(accessToken)}&output=json`
    );
    const data = await res.json();

    if (data.tistory?.status === "200" && data.tistory?.item?.blogs?.length > 0) {
      const blog = data.tistory.item.blogs[0];
      return {
        success: true,
        blogName: blog.name,
        blogUrl: blog.url,
      };
    }

    return { success: false, error: data.tistory?.error_message || "블로그 정보 조회 실패" };
  } catch (error) {
    return { success: false, error: `Tistory API 오류: ${error instanceof Error ? error.message : "unknown"}` };
  }
}

/**
 * Tistory 카테고리 목록 조회
 */
export async function getTistoryCategories(
  accessToken: string,
  blogName: string
): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch(
      `${TISTORY_API_BASE}/category/list?access_token=${encodeURIComponent(accessToken)}&output=json&blogName=${encodeURIComponent(blogName)}`
    );
    const data = await res.json();

    if (data.tistory?.status === "200" && data.tistory?.item?.categories) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.tistory.item.categories.map((c: any) => ({
        id: String(c.id),
        name: c.name,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Tistory access_token을 DB에 업데이트
 */
export async function saveTistoryAccount(params: {
  clientId: string;
  accessToken: string;
  blogName: string;
  blogUrl: string;
  accountName?: string;
}): Promise<{ success: boolean; accountId?: string; error?: string }> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("blog_accounts")
    .insert({
      client_id: params.clientId,
      platform: "tistory",
      auth_type: "oauth",
      account_name: params.accountName || params.blogName,
      access_token: params.accessToken,
      blog_id: params.blogName,
      blog_url: params.blogUrl,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, accountId: data?.id };
}
