// ── 마케팅 개선 추천 항목 매핑 + 파서 유틸 ──────────────────────────────────

export type ActionCategory = "self" | "pro";

export interface MarketingAction {
  item: string;
  label: string;
  category: ActionCategory;
  description: string;
  selfGuide?: string;
  potentialScore: number; // 파싱 시 동적 계산
}

interface ActionDef {
  item: string;
  label: string;
  category: ActionCategory;
  description: string;
  selfGuide?: string;
}

// ── self: 직접 해결 4가지 ──
const SELF_ACTIONS: ActionDef[] = [
  {
    item: "naver_reservation",
    label: "네이버 예약 등록",
    category: "self",
    description: "네이버 예약 기능을 등록하여 고객 유입 채널을 확보합니다",
    selfGuide: "네이버 플레이스 관리자 → 예약 설정에서 등록",
  },
  {
    item: "naver_talktalk",
    label: "네이버 톡톡 연동",
    category: "self",
    description: "네이버 톡톡을 연동하여 실시간 고객 문의를 받습니다",
    selfGuide: "네이버 톡톡 센터(partner.talk.naver.com)에서 설정",
  },
  {
    item: "business_hours",
    label: "영업시간 등록",
    category: "self",
    description: "정확한 영업시간 표시로 고객 신뢰도를 높입니다",
    selfGuide: "네이버 플레이스 관리자 → 기본 정보에서 입력",
  },
  {
    item: "sns",
    label: "SNS 계정 연동",
    category: "self",
    description: "SNS 계정을 연동하여 온라인 채널 완성도를 높입니다",
    selfGuide: "네이버 플레이스 관리자 → SNS 정보에서 입력",
  },
];

// ── pro: 전문 마케팅 14가지 ──
const PRO_ACTIONS: ActionDef[] = [
  {
    item: "visitor_review_count",
    label: "방문자 리뷰 확보 전략",
    category: "pro",
    description: "방문자 리뷰를 체계적으로 확보하여 매장 신뢰도를 높입니다",
  },
  {
    item: "blog_review_count",
    label: "블로그 리뷰 마케팅",
    category: "pro",
    description: "블로그 체험단/리뷰를 통해 검색 노출을 강화합니다",
  },
  {
    item: "review_volume_bonus",
    label: "리뷰 볼륨 확대",
    category: "pro",
    description: "리뷰 수를 늘려 플레이스 알고리즘 점수를 높입니다",
  },
  {
    item: "place_exposure",
    label: "플레이스 상위노출 최적화",
    category: "pro",
    description: "네이버 플레이스 검색 시 상위에 노출되도록 최적화합니다",
  },
  {
    item: "blog_exposure",
    label: "블로그 상위노출 (키워드 SEO)",
    category: "pro",
    description: "타겟 키워드로 블로그 검색 상위 노출을 달성합니다",
  },
  {
    item: "google_exposure",
    label: "구글 검색 노출 최적화",
    category: "pro",
    description: "구글 검색에서의 매장 노출을 최적화합니다",
  },
  {
    item: "image_count",
    label: "매장 이미지 촬영/보강",
    category: "pro",
    description: "충분한 매장 이미지로 고객의 방문 의향을 높입니다",
  },
  {
    item: "image_count_basic",
    label: "매장 이미지 촬영/보강",
    category: "pro",
    description: "기본 매장 이미지를 보강하여 첫인상을 개선합니다",
  },
  {
    item: "image_quality",
    label: "전문 사진 촬영 (프로 포토)",
    category: "pro",
    description: "전문 포토그래퍼의 촬영으로 매장 이미지 품질을 높입니다",
  },
  {
    item: "image_usability",
    label: "이미지 활용 최적화",
    category: "pro",
    description: "다양한 채널에 맞게 이미지를 최적화하여 활용합니다",
  },
  {
    item: "homepage",
    label: "홈페이지 제작/리뉴얼",
    category: "pro",
    description: "전문 홈페이지로 브랜드 신뢰도와 검색 노출을 높입니다",
  },
  {
    item: "brand_blog",
    label: "브랜드 블로그 운영 대행",
    category: "pro",
    description: "브랜드 블로그를 전문적으로 운영하여 콘텐츠 자산을 쌓습니다",
  },
  {
    item: "keyword_blog",
    label: "키워드 블로그 콘텐츠 작성",
    category: "pro",
    description: "타겟 키워드 기반 블로그 콘텐츠를 작성하여 유입을 늘립니다",
  },
  {
    item: "google_seo",
    label: "구글 SEO 컨설팅",
    category: "pro",
    description: "구글 검색 최적화 전략을 수립하고 실행합니다",
  },
];

const ALL_ACTIONS: ActionDef[] = [...SELF_ACTIONS, ...PRO_ACTIONS];
const ACTION_MAP = new Map(ALL_ACTIONS.map((a) => [a.item, a]));

// ── score_breakdown 파싱 유틸 ──

export interface DeficientItem extends MarketingAction {
  currentScore: number;
  maxScore: number;
}

/**
 * score_breakdown의 6개 영역 details를 파싱하여
 * "부족" 상태인 항목만 추출한다.
 *
 * details 문자열 예시:
 *   "visitor_review_count: 5/10(부족), blog_review_count: 3/5(양호), ..."
 *   "방문자 리뷰: 5/10(부족), 블로그 리뷰: 3/5(양호), ..."
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseDeficientItems(scoreBreakdown: Record<string, any> | undefined | null): DeficientItem[] {
  if (!scoreBreakdown) return [];

  const deficient: DeficientItem[] = [];

  // 한글 → 영문 역매핑
  const REVERSE_LABEL_MAP: Record<string, string> = {
    "방문자 리뷰": "visitor_review_count",
    "블로그 리뷰": "blog_review_count",
    "리뷰 보정": "review_volume_bonus",
    "플레이스 노출": "place_exposure",
    "블로그 노출": "blog_exposure",
    "구글 노출": "google_exposure",
    "이미지 수": "image_count",
    "이미지 품질": "image_quality",
    "이미지 활용도": "image_usability",
    "홈페이지": "homepage",
    "SNS": "sns",
    "네이버 예약": "naver_reservation",
    "네이버 톡톡": "naver_talktalk",
    "영업시간": "business_hours",
    "브랜드 블로그": "brand_blog",
    "키워드 블로그": "keyword_blog",
    "구글 SEO": "google_seo",
  };

  for (const area of Object.values(scoreBreakdown)) {
    if (!area || typeof area !== "object") continue;
    const detailStr = (area as { details?: string; detail?: string }).details
      || (area as { details?: string; detail?: string }).detail
      || "";
    if (!detailStr) continue;

    // "key: score/max(상태)" 패턴 파싱
    const pattern = /([\w가-힣_\s]+?):\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*\(([^)]+)\)/g;
    let match;
    while ((match = pattern.exec(detailStr)) !== null) {
      const rawKey = match[1].trim();
      const currentScore = parseFloat(match[2]);
      const maxScore = parseFloat(match[3]);
      const status = match[4].trim();

      // "부족" 상태만
      if (status !== "부족") continue;

      // 한글이면 역매핑, 영문이면 그대로
      const itemKey = REVERSE_LABEL_MAP[rawKey] || rawKey;

      const actionDef = ACTION_MAP.get(itemKey);
      if (!actionDef) continue;

      // 중복 방지 (image_count와 image_count_basic은 같은 카테고리)
      if (itemKey === "image_count_basic" && deficient.some((d) => d.item === "image_count")) {
        continue;
      }
      if (itemKey === "image_count" && deficient.some((d) => d.item === "image_count_basic")) {
        // 기존 image_count_basic을 image_count로 교체
        const idx = deficient.findIndex((d) => d.item === "image_count_basic");
        if (idx >= 0) deficient.splice(idx, 1);
      }

      deficient.push({
        ...actionDef,
        potentialScore: maxScore - currentScore,
        currentScore,
        maxScore,
      });
    }
  }

  // 정렬: pro 먼저 → potentialScore 내림차순
  deficient.sort((a, b) => {
    if (a.category !== b.category) return a.category === "pro" ? -1 : 1;
    return b.potentialScore - a.potentialScore;
  });

  return deficient;
}
