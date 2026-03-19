/**
 * image-gap-analyzer.ts
 * 콘텐츠 H2 섹션 vs 기존 이미지 분석 → 이미지 갭 식별 + 무료 이미지 검색어 생성
 */

export interface ImageGap {
  sectionHeading: string;
  sectionIndex: number;
  requiredType: string;
  searchQueries: string[]; // 무료 이미지 검색용 영문 쿼리
  koreanHint: string; // UI 표시용 한글 설명
}

interface MinimalAnalysis {
  url: string;
  type: string;
  description: string;
  mood?: string;
  colors?: string[];
}

// 타입 간 유사 그룹 — 같은 그룹이면 갭으로 간주하지 않음
const TYPE_SIMILARITY_GROUPS: string[][] = [
  ["portfolio", "branding", "product", "result"],
  ["interior", "workspace", "classroom", "facility"],
  ["exterior", "view"],
  ["team", "process", "treatment"],
  ["food", "menu"],
  ["equipment", "material"],
  ["display", "detail", "packaging"],
];

function getTypeGroup(type: string): string[] | null {
  return TYPE_SIMILARITY_GROUPS.find((g) => g.includes(type)) ?? null;
}

function typesAreSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  const groupA = getTypeGroup(a);
  if (!groupA) return false;
  return groupA.includes(b);
}

// H2 키워드 → 이미지 타입 매핑
const SECTION_TYPE_MAP: Record<string, string[]> = {
  food: ["메뉴", "맛", "음식", "요리", "디저트", "커피", "식사", "먹거리", "맛집", "추천메뉴"],
  interior: ["매장", "분위기", "인테리어", "내부", "공간", "좌석", "실내"],
  exterior: ["외관", "입구", "건물", "위치", "찾아가", "접근"],
  view: ["전경", "뷰", "풍경", "경치", "전망", "야경", "주변"],
  facility: ["편의", "시설", "주차", "화장실", "키즈", "설비"],
  portfolio: ["포트폴리오", "작업물", "작업", "사례", "결과물", "프로젝트", "레퍼런스"],
  branding: ["브랜딩", "로고", "CI", "BI", "아이덴티티", "디자인", "비주얼"],
  product: ["제품", "상품", "서비스", "솔루션", "결과", "완성"],
  team: ["팀", "전문가", "대표", "인물", "스태프", "강사", "의료진", "트레이너"],
  process: ["과정", "프로세스", "진행", "단계", "방법", "시술", "수업"],
  result: ["성과", "결과", "변화", "비포", "애프터", "Before", "After", "후기"],
  treatment: ["시술", "진료", "치료", "관리", "케어"],
  equipment: ["장비", "기구", "도구", "기기"],
  classroom: ["교실", "수업", "강의실", "학습", "레슨"],
};

// 이미지 타입 → Unsplash/Pexels 영문 검색어 매핑
const TYPE_SEARCH_QUERIES: Record<string, string[]> = {
  food: ["food photography", "restaurant dish", "gourmet food plating"],
  interior: ["cafe interior", "restaurant interior design", "cozy interior"],
  exterior: ["storefront", "building exterior", "shop entrance"],
  view: ["scenic view", "landscape photography", "cityscape"],
  facility: ["modern facility", "amenity space", "clean facility"],
  portfolio: ["design portfolio", "creative work", "project showcase"],
  branding: ["brand identity", "logo design", "brand guidelines"],
  product: ["product photography", "product showcase", "commercial product"],
  team: ["professional team", "business team", "team portrait"],
  process: ["work process", "behind the scenes", "workflow"],
  result: ["before after", "transformation", "results showcase"],
  treatment: ["beauty treatment", "spa treatment", "wellness"],
  equipment: ["professional equipment", "tools", "modern equipment"],
  classroom: ["classroom", "learning space", "workshop"],
  workspace: ["modern workspace", "office space", "creative studio"],
  display: ["product display", "showcase", "store display"],
  detail: ["close up detail", "texture", "macro photography"],
  packaging: ["product packaging", "package design", "gift wrap"],
  event: ["event photography", "seminar", "workshop event"],
  material: ["educational material", "books", "learning resources"],
  menu: ["menu board", "price list", "food menu"],
  service: ["customer service", "professional service", "consultation"],
  other: ["business", "professional", "modern"],
};

// 카테고리별 검색어 보강
const CATEGORY_CONTEXT: Record<string, string> = {
  음식: "restaurant korean food",
  카페: "cafe coffee shop",
  디자인: "design studio creative",
  마케팅: "marketing agency",
  미용: "beauty salon hair",
  병원: "medical clinic hospital",
  교육: "education academy school",
  숙박: "hotel accommodation",
  쇼핑: "retail shop store",
  피트니스: "fitness gym",
  요가: "yoga studio",
  꽃: "flower shop florist",
};

function getCategoryContext(category: string): string {
  const cat = (category || "").toLowerCase();
  for (const [key, value] of Object.entries(CATEGORY_CONTEXT)) {
    if (cat.includes(key)) return value;
  }
  return "business professional";
}

/**
 * 콘텐츠(마크다운)와 기존 이미지 분석을 비교하여 이미지 갭 식별
 */
export function analyzeImageGaps(
  markdown: string,
  existingAnalyses: MinimalAnalysis[],
  category: string,
): ImageGap[] {
  if (!markdown) return [];

  // H2 섹션 추출
  const h2Regex = /^##\s+(.+)$/gm;
  const sections: Array<{ heading: string; index: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = h2Regex.exec(markdown)) !== null) {
    sections.push({ heading: match[1], index: sections.length });
  }

  if (sections.length === 0) return [];

  // 기존 이미지 타입 집합
  const existingTypes = new Set(existingAnalyses.map((a) => a.type));

  const gaps: ImageGap[] = [];
  const catContext = getCategoryContext(category);

  for (const sec of sections) {
    const headingLower = sec.heading.toLowerCase();

    // H2 → 필요 이미지 타입 결정
    let requiredType = "other";
    for (const [type, keywords] of Object.entries(SECTION_TYPE_MAP)) {
      if (keywords.some((kw) => headingLower.includes(kw))) {
        requiredType = type;
        break;
      }
    }

    // 기존 이미지 중 해당 타입(또는 유사 타입)이 있는지 확인
    let covered = false;
    for (const existType of existingTypes) {
      if (typesAreSimilar(requiredType, existType)) {
        covered = true;
        break;
      }
    }

    // description 기반 매칭 — 기존 이미지 설명에 H2 키워드가 포함되면 커버
    if (!covered) {
      for (const analysis of existingAnalyses) {
        const desc = (analysis.description || "").toLowerCase();
        const keywords = SECTION_TYPE_MAP[requiredType] || [];
        if (keywords.some((kw) => desc.includes(kw) || headingLower.includes(kw.toLowerCase()))) {
          covered = true;
          break;
        }
      }
    }

    if (!covered && requiredType !== "other") {
      // 검색어 생성
      const baseQueries = TYPE_SEARCH_QUERIES[requiredType] || TYPE_SEARCH_QUERIES.other;
      const searchQueries = baseQueries.map((q) => `${q} ${catContext}`).slice(0, 2);

      // 기존 이미지의 mood/colors로 스타일 참조 추가
      const moods = existingAnalyses.map((a) => a.mood).filter(Boolean);
      if (moods.length > 0) {
        const dominantMood = moods[0];
        searchQueries.push(`${dominantMood} ${baseQueries[0]}`);
      }

      const koreanHints: Record<string, string> = {
        food: "음식/메뉴 사진", interior: "매장 내부 사진", exterior: "매장 외관 사진",
        view: "전경/뷰 사진", facility: "시설 사진", portfolio: "포트폴리오 이미지",
        branding: "브랜딩 이미지", product: "제품/상품 사진", team: "팀/전문가 사진",
        process: "과정/프로세스 사진", result: "성과/결과 사진", treatment: "시술/관리 사진",
        equipment: "장비/도구 사진", classroom: "수업/교육 사진", workspace: "작업공간 사진",
        display: "진열/전시 사진", detail: "디테일 사진", packaging: "포장/패키지 사진",
      };

      gaps.push({
        sectionHeading: sec.heading,
        sectionIndex: sec.index,
        requiredType,
        searchQueries,
        koreanHint: koreanHints[requiredType] || "관련 이미지",
      });
    }
  }

  return gaps;
}

/**
 * 사용자 키워드를 영문 검색어로 변환 (간단 매핑)
 */
export function buildSearchQuery(
  keyword: string,
  category: string,
): string {
  const catContext = getCategoryContext(category);
  // 한글이면 카테고리 컨텍스트 + 범용 검색어
  const hasKorean = /[가-힣]/.test(keyword);
  if (hasKorean) {
    // 한글 키워드에서 타입 매칭 시도
    const keywordLower = keyword.toLowerCase();
    for (const [type, keywords] of Object.entries(SECTION_TYPE_MAP)) {
      if (keywords.some((kw) => keywordLower.includes(kw))) {
        const queries = TYPE_SEARCH_QUERIES[type] || [];
        return `${queries[0] || type} ${catContext}`;
      }
    }
    return `${catContext} ${keyword}`;
  }
  return `${keyword} ${catContext}`;
}
