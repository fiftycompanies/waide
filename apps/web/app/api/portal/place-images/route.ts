import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ images: [], error: "clientId required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get latest brand_analyses for this client to find the place URL
    const { data: analysis } = await supabase
      .from("brand_analyses")
      .select("input_url, analysis_result")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!analysis?.input_url) {
      return NextResponse.json({ images: [], message: "분석 데이터가 없습니다" });
    }

    // Check if it's a Naver Place URL
    const isPlaceUrl =
      analysis.input_url.includes("place.naver.com") ||
      analysis.input_url.includes("naver.me") ||
      analysis.input_url.includes("map.naver.com");

    if (!isPlaceUrl) {
      return NextResponse.json({ images: [], message: "네이버 플레이스 URL이 아닙니다" });
    }

    // Try crawling place images from external crawler server
    try {
      const crawlerResp = await fetch("http://115.68.231.90:8000/crawl/place-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analysis.input_url }),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (crawlerResp.ok) {
        const crawlerData = await crawlerResp.json();
        const images = crawlerData.images || crawlerData.urls || [];
        return NextResponse.json({ images });
      }
    } catch {
      // Crawler server unavailable — fall through to analysis_result fallback
    }

    // Fallback: try to extract images from analysis_result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = analysis.analysis_result as any;
    const fallbackImages: string[] = [];

    if (result?.images && Array.isArray(result.images)) {
      for (const img of result.images) {
        const url = typeof img === "string" ? img : img?.url || img?.src;
        if (url && typeof url === "string") {
          fallbackImages.push(url);
        }
      }
    }

    return NextResponse.json({ images: fallbackImages });
  } catch (error) {
    console.error("[place-images] Error:", error);
    return NextResponse.json({ images: [], error: "이미지 조회 실패" }, { status: 500 });
  }
}
