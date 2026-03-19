/**
 * image-analyzer.ts
 * Claude Vision API로 네이버 플레이스 이미지 분석
 */

import { createAdminClient } from "@/lib/supabase/service";

export interface ImageAnalysis {
  url: string;
  description: string;
  type: string; // 업종별 동적 타입 (food/interior/portfolio/product/service/team 등)
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

/**
 * 업종별 이미지 타입 옵션 생성
 */
function getTypeOptionsForCategory(category: string): { types: string; examples: string } {
  const cat = (category || "").toLowerCase();

  // 음식/숙박/카페 등 장소형 업종
  if (/음식|식당|맛집|레스토랑|카페|커피|베이커리|빵집|술집|바|주점|횟집|고기|치킨|피자|분식|한식|일식|중식|양식|뷔페|호텔|숙박|펜션|모텔|리조트|민박|게스트하우스/.test(cat)) {
    return {
      types: "exterior/interior/food/menu/facility/view/other",
      examples: "exterior=건물외관, interior=매장내부, food=음식플레이팅, menu=메뉴판, facility=편의시설, view=전경/야경",
    };
  }

  // 디자인/마케팅/IT 서비스
  if (/디자인|브랜딩|마케팅|광고|에이전시|웹|앱|개발|IT|크리에이티브|스튜디오|영상|사진|촬영/.test(cat)) {
    return {
      types: "portfolio/branding/product/workspace/team/process/result/other",
      examples: "portfolio=작업물/결과물, branding=로고/CI/BI, product=제품사진, workspace=작업공간, team=팀/인물, process=작업과정, result=Before-After/성과",
    };
  }

  // 뷰티/미용
  if (/미용|헤어|네일|피부|에스테틱|뷰티|화장품|메이크업|성형/.test(cat)) {
    return {
      types: "result/interior/product/process/facility/team/other",
      examples: "result=시술결과/Before-After, interior=매장내부, product=제품/도구, process=시술과정, facility=시설, team=전문가/스태프",
    };
  }

  // 교육/학원
  if (/교육|학원|학교|레슨|과외|강의|유치원|어린이집|코칭|컨설팅/.test(cat)) {
    return {
      types: "facility/classroom/material/result/team/event/other",
      examples: "facility=시설외관, classroom=수업공간, material=교재/커리큘럼, result=수강생성과, team=강사진, event=행사/발표회",
    };
  }

  // 의료/건강
  if (/병원|의원|치과|한의원|약국|의료|건강|요가|필라테스|헬스|피트니스|체육/.test(cat)) {
    return {
      types: "facility/equipment/team/result/interior/treatment/other",
      examples: "facility=외관/시설, equipment=장비/기구, team=의료진/트레이너, result=시술결과/변화, interior=내부공간, treatment=진료/운동장면",
    };
  }

  // 쇼핑/리테일
  if (/쇼핑|매장|소품|의류|패션|잡화|가구|인테리어|꽃|플라워|플로리스트/.test(cat)) {
    return {
      types: "product/interior/display/detail/packaging/exterior/other",
      examples: "product=상품전체, interior=매장내부, display=진열/디스플레이, detail=제품디테일, packaging=포장, exterior=매장외관",
    };
  }

  // 기본 (범용)
  return {
    types: "exterior/interior/product/service/team/facility/result/other",
    examples: "exterior=외관, interior=내부, product=상품/결과물, service=서비스장면, team=인물/팀, facility=시설, result=성과/포트폴리오",
  };
}

async function analyzeSingleImage(
  apiKey: string,
  img: { url: string; type: string },
  placeName: string,
  category: string,
): Promise<ImageAnalysis> {
  const { types, examples } = getTypeOptionsForCategory(category);

  const prompt = `이 이미지는 "${placeName}" (${category || "업체"})의 마케팅용 이미지입니다.
블로그 콘텐츠에서 활용할 관점으로 분석해주세요.

JSON만 출력:
{
  "description": "이미지 설명 (2문장, 이 이미지가 무엇을 보여주는지 구체적으로)",
  "type": "${types}" 중 택1,
  "mood": "분위기 형용사 한 단어",
  "quality_score": 7,
  "colors": ["주요 컬러톤 2~3개"],
  "food_appeal": 8,
  "marketing_usability": 7,
  "improvement_tip": "더 나은 사진을 위한 팁 1가지",
  "hook_score": 8
}

타입 설명: ${examples}

- quality_score: 1~10 (구도, 밝기, 매력도)
- food_appeal: 음식 이미지일 경우만 (식욕 자극도 1~10, 해당 없으면 생략)
- marketing_usability: 마케팅 소재로 활용 가능성 1~10
- improvement_tip: 한 문장으로 간결하게
- hook_score: 블로그 독자 시선을 끄는 정도 1~10 (10=감성적/임팩트 있는 비주얼, 7=깔끔한 결과물, 4=일반적, 1=안내문/텍스트)`;

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
  // 캐시된 type이 현재 업종 타입 목록에 없으면 재분석 대상으로 전환
  const { types: validTypes } = getTypeOptionsForCategory(category);
  const validTypeSet = new Set(validTypes.split("/"));
  validTypeSet.add("other"); // other는 항상 유효

  const hitAnalyses = cachedAnalyses.filter(
    (a) => imageUrls.includes(a.url) && validTypeSet.has(a.type)
  );
  const hitUrlSet = new Set(hitAnalyses.map((a) => a.url));
  const missUrls = imageUrls.filter((u) => !hitUrlSet.has(u));

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
