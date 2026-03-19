/**
 * image-analyzer.ts
 * Claude Vision API로 네이버 플레이스 이미지 분석
 */

import { createAdminClient } from "@/lib/supabase/service";

export interface ImageAnalysis {
  url: string;
  description: string;
  type: "exterior" | "interior" | "food" | "menu" | "facility" | "view" | "other";
  mood: string;
  quality_score: number;
  colors: string[];
  food_appeal?: number;
  marketing_usability: number;
  improvement_tip: string;
  hook_score: number; // 1-10, 블로그 시선 집중도
}

export interface ImageAnalysisResult {
  analyses: ImageAnalysis[];
  avgQuality: number;
  avgUsability: number;
  dominantMood: string;
  colorPalette: string[];
  improvementTips: string[];
}

/**
 * 이미지 배열을 Claude Vision으로 분석
 * @param images - { url, type }[]
 * @param placeName - 업체명
 * @param category - 업종
 * @returns ImageAnalysisResult
 */
export async function analyzeImages(
  images: Array<{ url: string; type: string }>,
  placeName: string,
  category: string,
): Promise<ImageAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const analyses: ImageAnalysis[] = [];

  // 이미지별 개별 분석 (병렬, 최대 5장)
  const targets = images.slice(0, 5);
  const promises = targets.map(async (img) => {
    try {
      return await analyzeSingleImage(apiKey, img, placeName, category);
    } catch (err) {
      console.error(`Image analysis failed for ${img.url}:`, err);
      return null;
    }
  });

  const results = await Promise.all(promises);
  for (const r of results) {
    if (r) analyses.push(r);
  }

  if (analyses.length === 0) {
    return {
      analyses: [],
      avgQuality: 0,
      avgUsability: 0,
      dominantMood: "",
      colorPalette: [],
      improvementTips: [],
    };
  }

  // 집계
  const avgQuality = Math.round(
    (analyses.reduce((sum, a) => sum + a.quality_score, 0) / analyses.length) * 10
  ) / 10;
  const avgUsability = Math.round(
    (analyses.reduce((sum, a) => sum + a.marketing_usability, 0) / analyses.length) * 10
  ) / 10;

  // 가장 많이 나온 mood
  const moodCounts: Record<string, number> = {};
  for (const a of analyses) {
    moodCounts[a.mood] = (moodCounts[a.mood] ?? 0) + 1;
  }
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  // 컬러 팔레트 (중복 제거)
  const colorSet = new Set<string>();
  for (const a of analyses) {
    for (const c of a.colors) colorSet.add(c);
  }
  const colorPalette = Array.from(colorSet).slice(0, 6);

  // 개선 팁 (중복 제거)
  const tipSet = new Set<string>();
  for (const a of analyses) {
    if (a.improvement_tip) tipSet.add(a.improvement_tip);
  }
  const improvementTips = Array.from(tipSet).slice(0, 5);

  return {
    analyses,
    avgQuality,
    avgUsability,
    dominantMood,
    colorPalette,
    improvementTips,
  };
}

async function analyzeSingleImage(
  apiKey: string,
  img: { url: string; type: string },
  placeName: string,
  category: string,
): Promise<ImageAnalysis> {
  const prompt = `이 이미지는 "${placeName}" (${category || "매장"})의 네이버 플레이스 이미지입니다.
마케팅 관점에서 분석해주세요.

JSON만 출력:
{
  "description": "이미지 설명 (2문장)",
  "type": "exterior/interior/food/menu/facility/view/other",
  "mood": "분위기 형용사 한 단어",
  "quality_score": 7,
  "colors": ["주요 컬러톤 2~3개"],
  "food_appeal": 8,
  "marketing_usability": 7,
  "improvement_tip": "더 나은 사진을 위한 팁 1가지",
  "hook_score": 8
}

- quality_score: 1~10 (구도, 밝기, 매력도)
- food_appeal: 음식 이미지일 경우만 (식욕 자극도 1~10)
- marketing_usability: 마케팅 소재로 활용 가능성 1~10
- improvement_tip: 한 문장으로 간결하게
- hook_score: 블로그 독자 시선을 끄는 정도 1~10 (10=감성샷/야경/플레이팅, 7=깔끔한 음식/인테리어, 4=일반 시설, 1=안내문/간판/텍스트)`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: img.url },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Claude Vision error: ${resp.status} ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  let text = data.content?.[0]?.text ?? "";

  // JSON 추출
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) text = jsonMatch[1];
  else {
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) text = braceMatch[0];
  }

  const parsed = JSON.parse(text);

  return {
    url: img.url,
    description: parsed.description ?? "",
    type: parsed.type ?? "other",
    mood: parsed.mood ?? "",
    quality_score: Math.min(10, Math.max(1, Number(parsed.quality_score) || 5)),
    colors: Array.isArray(parsed.colors) ? parsed.colors : [],
    food_appeal: parsed.food_appeal ? Math.min(10, Math.max(1, Number(parsed.food_appeal))) : undefined,
    marketing_usability: Math.min(10, Math.max(1, Number(parsed.marketing_usability) || 5)),
    improvement_tip: parsed.improvement_tip ?? "",
    hook_score: Math.min(10, Math.max(1, Number(parsed.hook_score) || 5)),
  };
}

/**
 * 캐시 조회 + 미분석 이미지만 Vision 분석
 * brand_analyses.image_analysis JSONB에 결과 저장/재사용
 */
export async function getOrAnalyzeImages(
  imageUrls: string[],
  placeName: string,
  category: string,
  placeId?: string | null,
): Promise<{ analyses: ImageAnalysis[]; fromCache: number; newlyAnalyzed: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  let cachedAnalyses: ImageAnalysis[] = [];
  let brandAnalysisId: string | null = null;

  // 1. placeId로 기존 분석 캐시 조회
  if (placeId) {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("brand_analyses")
      .select("id, image_analysis")
      .eq("place_id", placeId)
      .not("image_analysis", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.image_analysis?.images) {
      brandAnalysisId = data.id;
      cachedAnalyses = data.image_analysis.images as ImageAnalysis[];
    }
  }

  // 2. URL 매칭으로 캐시 HIT / MISS 분리
  const cachedUrlSet = new Set(cachedAnalyses.map((a) => a.url));
  const hitAnalyses = cachedAnalyses.filter((a) => imageUrls.includes(a.url));
  const missUrls = imageUrls.filter((u) => !cachedUrlSet.has(u));

  // 3. 미분석 이미지만 Vision 호출 (최대 12장, 5장 배치 병렬)
  const newAnalyses: ImageAnalysis[] = [];
  const targets = missUrls.slice(0, 12);

  for (let i = 0; i < targets.length; i += 5) {
    const batch = targets.slice(i, i + 5);
    const promises = batch.map(async (url) => {
      try {
        return await analyzeSingleImage(apiKey, { url, type: "auto" }, placeName, category);
      } catch (err) {
        console.error(`[getOrAnalyzeImages] Vision failed for ${url}:`, err);
        return null;
      }
    });
    const results = await Promise.all(promises);
    for (const r of results) {
      if (r) newAnalyses.push(r);
    }
  }

  // 4. 신규 결과를 DB 캐시에 merge
  if (newAnalyses.length > 0 && brandAnalysisId) {
    const merged = [...cachedAnalyses];
    for (const na of newAnalyses) {
      const idx = merged.findIndex((a) => a.url === na.url);
      if (idx >= 0) merged[idx] = na;
      else merged.push(na);
    }

    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("brand_analyses")
      .update({
        image_analysis: {
          images: merged,
          collected_urls: merged.map((a) => a.url),
          updated_at: new Date().toISOString(),
        },
      })
      .eq("id", brandAnalysisId);
  }

  // 5. 전체 결과 반환 (캐시 HIT + 신규 분석)
  const allAnalyses = [...hitAnalyses, ...newAnalyses];
  return {
    analyses: allAnalyses,
    fromCache: hitAnalyses.length,
    newlyAnalyzed: newAnalyses.length,
  };
}
