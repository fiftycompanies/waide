/**
 * medium-publisher.ts
 * Medium API 발행 엔진
 * https://github.com/Medium/medium-api-docs
 */

import type { BlogAccountForPublish, ContentForPublish, PublishOptions, PublishResult } from "./index";

const MEDIUM_API_BASE = "https://api.medium.com/v1";

/**
 * Medium에 콘텐츠 발행
 * Medium은 마크다운을 직접 지원하므로 HTML 변환 불필요
 */
export async function publishToMedium(
  account: BlogAccountForPublish,
  content: ContentForPublish,
  options: PublishOptions = {}
): Promise<PublishResult> {
  // api_key = Integration Token
  const token = account.api_key;
  if (!token) {
    return { success: false, error: "Medium Integration Token이 필요합니다." };
  }

  // 1. authorId 조회 (저장된 값 또는 API 조회)
  let authorId = account.platform_user_id;
  if (!authorId) {
    const meResult = await getMediumUser(token);
    if (!meResult.success || !meResult.userId) {
      return { success: false, error: meResult.error || "Medium 사용자 정보를 가져올 수 없습니다." };
    }
    authorId = meResult.userId;
  }

  // 2. Medium API 호출 (마크다운 그대로 전송)
  try {
    const body: Record<string, unknown> = {
      title: content.title,
      contentFormat: "markdown",
      content: content.body,
      publishStatus: options.publishAsDraft ? "draft" : "public",
    };

    // 태그 (최대 5개)
    if (content.tags?.length) {
      body.tags = content.tags.slice(0, 5);
    }

    // Canonical URL
    if (options.addCanonicalUrl && options.canonicalUrl) {
      body.canonicalUrl = options.canonicalUrl;
    }

    const res = await fetch(`${MEDIUM_API_BASE}/users/${authorId}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMsg = `Medium API 오류 (${res.status})`;
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.errors?.[0]?.message || errorMsg;
      } catch {
        // 파싱 실패 시 기본 메시지
      }
      return { success: false, error: errorMsg };
    }

    const data = await res.json();
    const post = data.data;

    return {
      success: true,
      external_url: post?.url,
      external_post_id: post?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: `Medium API 호출 실패: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

/**
 * Medium 사용자 정보 조회 (/v1/me)
 */
export async function getMediumUser(
  token: string
): Promise<{ success: boolean; userId?: string; username?: string; name?: string; error?: string }> {
  try {
    const res = await fetch(`${MEDIUM_API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: "인증 실패: Integration Token을 확인하세요." };
      }
      return { success: false, error: `Medium API 오류 (${res.status})` };
    }

    const data = await res.json();
    const user = data.data;

    return {
      success: true,
      userId: user?.id,
      username: user?.username,
      name: user?.name,
    };
  } catch (error) {
    return {
      success: false,
      error: `Medium 연결 실패: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}
