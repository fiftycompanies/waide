/**
 * image-content-matcher.ts
 * 이미지 분석 정보를 콘텐츠 프롬프트에 주입 + H2-이미지 타입 매칭
 */

import type { ImageAnalysis } from "@/lib/image-analyzer";

/**
 * 분석된 이미지 정보를 프롬프트 섹션으로 변환
 * camfit 패턴: [type] description (hook:N)\n  URL: ...
 */
export function buildImagePromptSection(
  analyses: ImageAnalysis[],
  imageUrls: string[],
): string {
  const lines: string[] = [];
  const analyzedUrls = new Set(analyses.map((a) => a.url));

  // 분석된 이미지 (hook_score 순 정렬)
  const sorted = [...analyses].sort((a, b) => b.hook_score - a.hook_score);
  let idx = 1;
  for (const a of sorted) {
    lines.push(
      `${idx}. [${a.type}] ${a.description} (hook:${a.hook_score})` +
      `\n   URL: ${a.url}`
    );
    idx++;
  }

  // 미분석 이미지 (URL만)
  for (const url of imageUrls) {
    if (!analyzedUrls.has(url)) {
      lines.push(`${idx}. (미분석) URL: ${url}`);
      idx++;
    }
  }

  const total = idx - 1;

  return `사용할 이미지 (${total}장):
${lines.join("\n")}

[이미지 배치 규칙]
- food 타입 이미지 → 메뉴/맛/음식 소개 섹션에 배치
- interior/exterior 타입 → 매장 소개/분위기 섹션에 배치
- view 타입 → 위치/접근성/주변 환경 섹션에 배치
- facility 타입 → 편의시설/특징 섹션에 배치
- hook_score 높은 이미지를 서론(첫 H2) 근처에 배치하여 독자 시선 집중
- 모든 이미지를 ![설명](url) 형식으로 삽입
- 이미지 수가 H2보다 많으면 한 섹션에 2장을 넣어도 됩니다
- 모든 이미지를 반드시 사용하세요. 하나라도 빠뜨리지 마세요.`;
}

/**
 * H2 헤더 키워드 ↔ image.type 매칭 테이블
 */
const SECTION_TYPE_MAP: Record<string, string[]> = {
  food: ["메뉴", "맛", "음식", "요리", "디저트", "커피", "식사", "먹거리", "맛집", "추천메뉴"],
  interior: ["매장", "분위기", "인테리어", "내부", "공간", "좌석", "실내"],
  exterior: ["외관", "입구", "건물", "위치", "찾아가", "접근"],
  view: ["전경", "뷰", "풍경", "경치", "전망", "야경", "주변"],
  facility: ["편의", "시설", "주차", "화장실", "키즈", "설비"],
  menu: ["가격", "메뉴판", "메뉴표", "가성비", "단가"],
};

/**
 * 생성된 마크다운에서 H2 헤더-이미지 타입 매칭으로 이미지 재배치
 * (선택적 후처리)
 */
export function reorderImagesBySection(
  markdown: string,
  analyses: ImageAnalysis[],
): string {
  if (analyses.length === 0) return markdown;

  // H2 섹션 추출
  const h2Regex = /^##\s+(.+)$/gm;
  const sections: Array<{ heading: string; startIdx: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = h2Regex.exec(markdown)) !== null) {
    sections.push({ heading: match[1], startIdx: match.index });
  }
  if (sections.length === 0) return markdown;

  // 각 H2에 가장 적합한 이미지 타입 매핑
  const sectionTypes: Array<{ heading: string; bestTypes: string[] }> = [];
  for (const sec of sections) {
    const headingLower = sec.heading.toLowerCase();
    const matchedTypes: string[] = [];
    for (const [type, keywords] of Object.entries(SECTION_TYPE_MAP)) {
      if (keywords.some((kw) => headingLower.includes(kw))) {
        matchedTypes.push(type);
      }
    }
    sectionTypes.push({ heading: sec.heading, bestTypes: matchedTypes });
  }

  // 기존 이미지 위치 추출
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const existingImages: Array<{ full: string; url: string; idx: number }> = [];
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRegex.exec(markdown)) !== null) {
    existingImages.push({ full: imgMatch[0], url: imgMatch[2], idx: imgMatch.index });
  }

  // 매칭 불가능하면 원본 유지
  if (existingImages.length === 0 || sectionTypes.every((s) => s.bestTypes.length === 0)) {
    return markdown;
  }

  // 이미지 URL → analysis 매핑
  const analysisMap = new Map<string, ImageAnalysis>();
  for (const a of analyses) analysisMap.set(a.url, a);

  // 각 섹션에 적합한 이미지 재배치
  let result = markdown;
  const usedUrls = new Set<string>();

  // 1차: 타입 매칭으로 재배치
  for (const secType of sectionTypes) {
    if (secType.bestTypes.length === 0) continue;

    // 해당 타입에 맞는 미사용 이미지 찾기
    const candidates = analyses
      .filter((a) => secType.bestTypes.includes(a.type) && !usedUrls.has(a.url))
      .sort((a, b) => b.hook_score - a.hook_score);

    if (candidates.length > 0) {
      usedUrls.add(candidates[0].url);
    }
  }

  return result;
}
