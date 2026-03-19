import { NextRequest } from "next/server";
import { getOrAnalyzeImages } from "@/lib/image-analyzer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrls, placeName, category, placeId } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "imageUrls 배열이 필요합니다" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await getOrAnalyzeImages(
      imageUrls,
      placeName || "",
      category || "",
      placeId || null,
    );

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[analyze-images] Error:", err);
    return new Response(
      JSON.stringify({ error: "이미지 분석에 실패했습니다" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
