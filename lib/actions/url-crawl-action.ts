"use server";

export interface CrawlResult {
  title: string | null;
  publishedDate: string | null;
  blogAccountId: string | null;
  blogAccountName: string | null;
  error?: string;
}

/**
 * URL을 fetch하여 제목, 발행일, 블로그 계정(네이버 아이디)을 추출한다.
 * Edge에서 실행되지 않으므로 Node.js fetch 사용.
 */
export async function crawlPublishedUrl(
  url: string,
  blogAccounts: Array<{ id: string; blog_id: string | null; account_name: string }>
): Promise<CrawlResult> {
  if (!url || !url.startsWith("http")) {
    return { title: null, publishedDate: null, blogAccountId: null, blogAccountName: null, error: "유효하지 않은 URL입니다." };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AI-Marketer/1.0; +https://ai-marketer.kr/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { title: null, publishedDate: null, blogAccountId: null, blogAccountName: null, error: `HTTP ${res.status}` };
    }

    const html = await res.text();

    // ── 제목 추출 ─────────────────────────────────────────────
    const title =
      extractMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      extractTag(html, "title") ||
      null;

    // ── 발행일 추출 ───────────────────────────────────────────
    let publishedDate: string | null = null;

    // 1) og:article:published_time
    const ogDate = extractMeta(html, "article:published_time") || extractMeta(html, "og:article:published_time");
    if (ogDate) {
      publishedDate = ogDate.split("T")[0];
    }

    // 2) 네이버 블로그 패턴: ?날짜 in URL (e.g. /PostView.nhn?... 또는 blog.naver.com/{id}/{postno})
    if (!publishedDate) {
      const naverDateMatch = html.match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})/);
      if (naverDateMatch) {
        publishedDate = `${naverDateMatch[1]}-${naverDateMatch[2]}-${naverDateMatch[3]}`;
      }
    }

    // ── 블로그 계정 매칭 ──────────────────────────────────────
    let blogAccountId: string | null = null;
    let blogAccountName: string | null = null;

    // 네이버 블로그: URL에 blog.naver.com/{id} 패턴
    const naverIdMatch = url.match(/blog\.naver\.com\/([A-Za-z0-9_]+)/);
    const naverId = naverIdMatch?.[1];

    if (naverId) {
      const matched = blogAccounts.find(
        (a) =>
          (a.blog_id && a.blog_id.toLowerCase() === naverId.toLowerCase()) ||
          a.account_name.toLowerCase().includes(naverId.toLowerCase())
      );
      if (matched) {
        blogAccountId = matched.id;
        blogAccountName = matched.account_name;
      }
    }

    return {
      title: title?.trim() || null,
      publishedDate,
      blogAccountId,
      blogAccountName,
    };
  } catch (e) {
    return {
      title: null,
      publishedDate: null,
      blogAccountId: null,
      blogAccountName: null,
      error: e instanceof Error ? e.message : "크롤링 실패",
    };
  }
}

function extractMeta(html: string, property: string): string | null {
  // property="..." content="..."
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const m = html.match(regex);
  if (m) return m[1];

  // content="..." property="..."
  const regex2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeRegex(property)}["']`,
    "i"
  );
  const m2 = html.match(regex2);
  return m2 ? m2[1] : null;
}

function extractTag(html: string, tag: string): string | null {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, "i"));
  return m ? m[1] : null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
