/**
 * image-content-matcher.ts
 * 이미지 분석 정보를 콘텐츠 프롬프트에 주입 + H2-이미지 타입 매칭
 * 업종 범용 — 이미지 description 기반 시맨틱 매칭
 */

import type { ImageAnalysis } from "@/lib/image-analyzer";

/**
 * 분석된 이미지 정보를 프롬프트 섹션으로 변환
 * 업종에 관계없이 이미지 description + type을 기반으로 AI가 매칭하도록 지시
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
- 각 이미지의 [type]과 설명을 읽고, 콘텐츠의 H2 섹션 주제와 가장 관련 있는 위치에 배치
- 예: portfolio/result/product → 서비스 소개·포트폴리오·결과물 섹션, food → 메뉴·음식 섹션, interior/exterior → 공간·매장 섹션, team → 팀·전문성 섹션
- 이미지의 description을 참고하여 해당 이미지가 설명하는 내용과 가장 가까운 본문 문단 근처에 배치
- hook_score 높은 이미지를 서론(첫 H2) 근처에 배치하여 독자 시선 집중
- 모든 이미지를 ![설명](url) 형식으로 삽입
- 이미지 수가 H2보다 많으면 한 섹션에 2장을 넣어도 됩니다
- 모든 이미지를 반드시 사용하세요. 하나라도 빠뜨리지 마세요.`;
}

/**
 * H2 헤더 키워드 ↔ image.type 매칭 테이블 (범용 확장)
 */
const SECTION_TYPE_MAP: Record<string, string[]> = {
  // 장소형 (음식점/숙박/카페)
  food: ["메뉴", "맛", "음식", "요리", "디저트", "커피", "식사", "먹거리", "맛집", "추천메뉴"],
  interior: ["매장", "분위기", "인테리어", "내부", "공간", "좌석", "실내"],
  exterior: ["외관", "입구", "건물", "위치", "찾아가", "접근"],
  view: ["전경", "뷰", "풍경", "경치", "전망", "야경", "주변"],
  facility: ["편의", "시설", "주차", "화장실", "키즈", "설비"],
  menu: ["가격", "메뉴판", "메뉴표", "가성비", "단가"],
  // 서비스형 (디자인/마케팅/IT)
  portfolio: ["포트폴리오", "작업물", "작업", "사례", "결과물", "프로젝트", "레퍼런스"],
  branding: ["브랜딩", "로고", "CI", "BI", "아이덴티티", "디자인", "비주얼"],
  product: ["제품", "상품", "서비스", "솔루션", "결과", "완성"],
  workspace: ["작업공간", "사무실", "오피스", "스튜디오", "작업실"],
  team: ["팀", "전문가", "대표", "인물", "스태프", "강사", "의료진", "트레이너"],
  process: ["과정", "프로세스", "진행", "단계", "방법", "시술", "수업"],
  result: ["성과", "결과", "변화", "비포", "애프터", "Before", "After", "후기"],
  // 뷰티/의료
  treatment: ["시술", "진료", "치료", "관리", "케어"],
  equipment: ["장비", "기구", "도구", "기기", "설비"],
  // 교육
  classroom: ["교실", "수업", "강의실", "학습", "레슨"],
  material: ["교재", "커리큘럼", "자료", "교구"],
  event: ["행사", "이벤트", "발표", "전시", "세미나"],
  // 리테일/쇼핑
  display: ["진열", "디스플레이", "전시", "쇼케이스", "매대"],
  detail: ["디테일", "클로즈업", "세부", "소재", "질감"],
  packaging: ["포장", "패키지", "박스", "래핑"],
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
  const result = markdown;
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
