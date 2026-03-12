/**
 * wordpress-publisher.ts
 * WordPress REST API 발행 엔진
 * Application Password 인증 (Basic Auth)
 */

import type { BlogAccountForPublish, ContentForPublish, PublishOptions, PublishResult } from "./index";
import { convertMarkdownToHtml, generateSchemaMarkup, generateCanonicalTag } from "./markdown-to-html";

/**
 * WordPress에 콘텐츠 발행
 */
export async function publishToWordPress(
  account: BlogAccountForPublish,
  content: ContentForPublish,
  options: PublishOptions = {}
): Promise<PublishResult> {
  // api_key = username, api_secret = application password
  if (!account.api_key || !account.api_secret) {
    return { success: false, error: "WordPress 사용자명과 앱 비밀번호가 필요합니다." };
  }

  if (!account.blog_url) {
    return { success: false, error: "WordPress 사이트 URL이 설정되지 않았습니다." };
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

  // 2. Basic Auth 헤더 생성
  const authHeader = `Basic ${Buffer.from(`${account.api_key}:${account.api_secret}`).toString("base64")}`;

  // 3. 사이트 URL 정규화
  const siteUrl = account.blog_url.replace(/\/+$/, "");
  const apiUrl = `${siteUrl}/wp-json/wp/v2/posts`;

  // 4. WordPress REST API 호출
  try {
    const body: Record<string, unknown> = {
      title: content.title,
      content: htmlContent,
      status: options.publishAsDraft ? "draft" : "publish",
    };

    // 태그 → WordPress 태그 (문자열로 전달, WP가 자동 생성)
    if (content.tags?.length) {
      // WordPress는 tags를 ID로 받음 — 문자열 태그는 먼저 생성해야 함
      // 간소화: excerpt에 태그 포함
      body.excerpt = content.meta_description || content.tags.join(", ");
    }

    if (content.meta_description) {
      body.excerpt = content.meta_description;
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMsg = `WordPress API 오류 (${res.status})`;
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.message || errorMsg;
      } catch {
        // text 파싱 실패 시 기본 메시지
      }
      return { success: false, error: errorMsg };
    }

    const data = await res.json();

    return {
      success: true,
      external_url: data.link || data.guid?.rendered,
      external_post_id: String(data.id),
    };
  } catch (error) {
    return {
      success: false,
      error: `WordPress API 호출 실패: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

/**
 * WordPress 연동 테스트
 */
export async function testWordPressConnection(
  siteUrl: string,
  username: string,
  appPassword: string
): Promise<{ success: boolean; siteName?: string; error?: string }> {
  try {
    const url = siteUrl.replace(/\/+$/, "");
    const authHeader = `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`;

    const res = await fetch(`${url}/wp-json/wp/v2/posts?per_page=1`, {
      headers: { Authorization: authHeader },
    });

    if (res.ok) {
      // 사이트 정보도 조회
      const siteRes = await fetch(`${url}/wp-json`, {
        headers: { Authorization: authHeader },
      });
      const siteData = siteRes.ok ? await siteRes.json() : null;

      return {
        success: true,
        siteName: siteData?.name || url,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: "인증 실패: 사용자명 또는 앱 비밀번호를 확인하세요." };
    }

    return { success: false, error: `WordPress API 오류 (${res.status})` };
  } catch (error) {
    return {
      success: false,
      error: `연결 실패: ${error instanceof Error ? error.message : "서버에 접근할 수 없습니다"}`,
    };
  }
}
