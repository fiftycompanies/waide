import { NextRequest, NextResponse } from "next/server";

const VPS_BASE_URL = "http://115.68.231.90:8000";

/**
 * VPS 이미지 파이프라인 프록시
 * POST /api/vps/image?action=crawl-images|wash-image|upload-image
 */
export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");

  if (!action || !["crawl-images", "wash-image", "upload-image"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Use: crawl-images, wash-image, upload-image" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const resp = await fetch(`${VPS_BASE_URL}/api/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: data.detail || "VPS request failed" },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[vps/image] Proxy error:", err);
    return NextResponse.json(
      { error: "VPS 서버에 연결할 수 없습니다" },
      { status: 502 }
    );
  }
}
