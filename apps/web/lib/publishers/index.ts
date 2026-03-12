/**
 * publishers/index.ts
 * 공통 퍼블리셔 인터페이스 + 라우터
 */

import { publishToTistory, refreshTistoryToken } from "./tistory-publisher";
import { publishToWordPress } from "./wordpress-publisher";
import { publishToMedium } from "./medium-publisher";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface PublishResult {
  success: boolean;
  external_url?: string;
  external_post_id?: string;
  error?: string;
}

export interface BlogAccountForPublish {
  id: string;
  platform: string;
  auth_type: string;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  api_key?: string | null;
  api_secret?: string | null;
  blog_id?: string | null;
  blog_url?: string | null;
  platform_user_id?: string | null;
  account_name: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface ContentForPublish {
  id: string;
  title: string;
  body: string;
  meta_description?: string | null;
  content_type?: string | null;
  tags?: string[] | null;
  keyword?: string;
}

export interface PublishOptions {
  publishAsDraft?: boolean;
  addCanonicalUrl?: boolean;
  addSchemaMarkup?: boolean;
  canonicalUrl?: string;
  categoryId?: string;
}

// ═══════════════════════════════════════════
// 메인 라우터
// ═══════════════════════════════════════════

/**
 * 플랫폼별 퍼블리셔 라우터
 */
export async function publishContent(
  platform: "tistory" | "wordpress" | "medium",
  account: BlogAccountForPublish,
  content: ContentForPublish,
  options: PublishOptions = {}
): Promise<PublishResult> {
  try {
    switch (platform) {
      case "tistory":
        return await publishToTistory(account, content, options);
      case "wordpress":
        return await publishToWordPress(account, content, options);
      case "medium":
        return await publishToMedium(account, content, options);
      default:
        return { success: false, error: `지원하지 않는 플랫폼: ${platform}` };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "알 수 없는 발행 오류";
    console.error(`[publisher] ${platform} 발행 실패:`, error);
    return { success: false, error: msg };
  }
}

// Re-export
export { refreshTistoryToken };
