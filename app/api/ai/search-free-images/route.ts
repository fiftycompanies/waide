import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FreeImage {
  id: string;
  url: string; // 블로그 삽입용 URL (regular size)
  thumbnail: string; // 미리보기용
  photographer: string;
  source: "unsplash" | "pexels";
  sourceUrl: string; // 원본 페이지 링크 (저작권 표기용)
  alt: string;
  width: number;
  height: number;
}

/**
 * POST /api/ai/search-free-images
 * 무료 이미지 검색 (Unsplash → Pexels 폴백)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, perPage = 6 } = body as { query: string; perPage?: number };

    if (!query?.trim()) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    // Unsplash 우선 시도
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      const images = await searchUnsplash(query.trim(), perPage, unsplashKey);
      if (images.length > 0) {
        return NextResponse.json({ images, source: "unsplash" });
      }
    }

    // Pexels 폴백
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (pexelsKey) {
      const images = await searchPexels(query.trim(), perPage, pexelsKey);
      if (images.length > 0) {
        return NextResponse.json({ images, source: "pexels" });
      }
    }

    // 두 API 키 모두 없는 경우
    if (!unsplashKey && !pexelsKey) {
      return NextResponse.json(
        { error: "UNSPLASH_ACCESS_KEY 또는 PEXELS_API_KEY 환경변수가 필요합니다.", images: [] },
        { status: 200 }
      );
    }

    return NextResponse.json({ images: [], source: null });
  } catch (err) {
    console.error("[search-free-images] Error:", err);
    return NextResponse.json(
      { error: "이미지 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

async function searchUnsplash(
  query: string,
  perPage: number,
  accessKey: string,
): Promise<FreeImage[]> {
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(Math.min(perPage, 30)));
    url.searchParams.set("orientation", "landscape");

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!resp.ok) {
      console.error(`[Unsplash] ${resp.status} ${await resp.text().then((t) => t.slice(0, 200))}`);
      return [];
    }

    const data = await resp.json();
    const results = data.results || [];

    return results.map((item: UnsplashPhoto) => ({
      id: `unsplash-${item.id}`,
      url: item.urls.regular,
      thumbnail: item.urls.small,
      photographer: item.user.name,
      source: "unsplash" as const,
      sourceUrl: item.links.html,
      alt: item.alt_description || item.description || query,
      width: item.width,
      height: item.height,
    }));
  } catch (err) {
    console.error("[Unsplash] Search failed:", err);
    return [];
  }
}

async function searchPexels(
  query: string,
  perPage: number,
  apiKey: string,
): Promise<FreeImage[]> {
  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(Math.min(perPage, 30)));
    url.searchParams.set("orientation", "landscape");

    const resp = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
    });

    if (!resp.ok) {
      console.error(`[Pexels] ${resp.status} ${await resp.text().then((t) => t.slice(0, 200))}`);
      return [];
    }

    const data = await resp.json();
    const photos = data.photos || [];

    return photos.map((item: PexelsPhoto) => ({
      id: `pexels-${item.id}`,
      url: item.src.large,
      thumbnail: item.src.medium,
      photographer: item.photographer,
      source: "pexels" as const,
      sourceUrl: item.url,
      alt: item.alt || query,
      width: item.width,
      height: item.height,
    }));
  } catch (err) {
    console.error("[Pexels] Search failed:", err);
    return [];
  }
}

// Unsplash API types
interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  description: string | null;
  alt_description: string | null;
  urls: { raw: string; full: string; regular: string; small: string; thumb: string };
  links: { html: string };
  user: { name: string };
}

// Pexels API types
interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  alt: string | null;
  src: { original: string; large: string; medium: string; small: string };
}
