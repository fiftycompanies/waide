/**
 * scoring-engine.ts
 * scoring_criteria 테이블 기반 채점 엔진
 *
 * - 마케팅 점수(100점), QC 검수(100점) 등을 테이블에서 기준을 읽어 판단
 * - 기존 place-analyzer.ts의 하드코딩 로직과 병행 (폴백)
 */

import { createAdminClient } from "@/lib/supabase/service";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface ScoringResult {
  category: string;
  item: string;
  score: number;
  maxScore: number;
  label: string;
  currentValue: unknown;
}

export interface ScoringCriteria {
  id: string;
  category_group: string;
  category: string;
  item: string;
  description: string | null;
  max_score: number;
  rules: RuleEntry[];
  is_active: boolean;
  sort_order: number;
}

interface RuleEntry {
  condition: string;
  score_pct: number;
  label: string;
  note?: string;
}

// ═══════════════════════════════════════════
// 기준 로딩
// ═══════════════════════════════════════════

let criteriaCache: Record<string, ScoringCriteria[]> = {};
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

export async function loadCriteria(categoryGroup: string): Promise<ScoringCriteria[]> {
  const now = Date.now();

  // 캐시 확인
  if (criteriaCache[categoryGroup] && now - cacheTimestamp < CACHE_TTL_MS) {
    return criteriaCache[categoryGroup];
  }

  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("scoring_criteria")
    .select("*")
    .eq("category_group", categoryGroup)
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("[scoring-engine] loadCriteria error:", error);
    return [];
  }

  const result = (data ?? []) as ScoringCriteria[];
  criteriaCache[categoryGroup] = result;
  cacheTimestamp = now;
  return result;
}

/** 캐시 강제 무효화 */
export function invalidateScoringCache(): void {
  criteriaCache = {};
  cacheTimestamp = 0;
}

// ═══════════════════════════════════════════
// 단일 항목 채점
// ═══════════════════════════════════════════

export function scoreItem(
  criteria: ScoringCriteria,
  currentValue: number | string | boolean,
): ScoringResult {
  const rules = criteria.rules;
  if (!rules || rules.length === 0) {
    return {
      category: criteria.category,
      item: criteria.item,
      score: 0,
      maxScore: criteria.max_score,
      label: "기준 없음",
      currentValue,
    };
  }

  let matchedRule = rules[rules.length - 1]; // 기본: 마지막 룰 (최저)

  for (const rule of rules) {
    if (evaluateCondition(rule.condition, currentValue)) {
      matchedRule = rule;
      break;
    }
  }

  const score = Math.round(criteria.max_score * (matchedRule.score_pct / 100));

  return {
    category: criteria.category,
    item: criteria.item,
    score,
    maxScore: criteria.max_score,
    label: matchedRule.label,
    currentValue,
  };
}

// ═══════════════════════════════════════════
// 조건 평가
// ═══════════════════════════════════════════

function evaluateCondition(condition: string, value: unknown): boolean {
  // 존재/비존재 조건
  if (condition === "exists") return !!value;
  if (condition === "not_exists") return !value;
  if (condition === "found") return !!value;
  if (condition === "not_found") return !value;
  if (condition === "not_implemented") return true; // 항상 매칭 (0점)

  // 수치 비교
  const numValue = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(numValue)) return false;

  if (condition.startsWith(">=")) return numValue >= parseFloat(condition.slice(2));
  if (condition.startsWith("<=")) return numValue <= parseFloat(condition.slice(2));
  if (condition.startsWith(">")) return numValue > parseFloat(condition.slice(1));
  if (condition.startsWith("<")) return numValue < parseFloat(condition.slice(1));
  if (condition.startsWith("==")) return String(value) === condition.slice(2);

  // 특수 조건 (블로그 순위 등)
  if (condition.startsWith("rank<=")) {
    return numValue <= parseFloat(condition.slice(6));
  }

  return false;
}

// ═══════════════════════════════════════════
// 마케팅 점수용 값 추출 + 산출
// ═══════════════════════════════════════════

interface MarketingScoreInput {
  visitorReviewCount: number;
  blogReviewCount: number;
  imageCount: number;
  homepageUrl: string;
  snsUrl: string;
  serviceLabels: string[];
  businessHours: string;
  imageAnalysis?: {
    avgQuality?: number;
    avgUsability?: number;
  };
  blogRank?: number | null;          // 메인 키워드 블로그 순위
  placeAvgScore?: number | null;     // keywordRankings 평균 점수 (0~100)
  hasBrandBlog?: boolean;
  hasKeywordBlog?: boolean;
}

/**
 * scoring_criteria 테이블 기반 마케팅 점수 산출
 * place-analyzer.ts의 calculateMarketingScore() 대안
 */
export async function calculateMarketingScoreFromCriteria(
  input: MarketingScoreInput,
): Promise<{
  totalScore: number;
  normalizedScore: number;
  breakdown: ScoringResult[];
  measurableMax: number;
}> {
  const criteria = await loadCriteria("marketing");
  if (criteria.length === 0) {
    throw new Error("scoring_criteria 테이블에 marketing 기준 없음");
  }

  const results: ScoringResult[] = [];
  const hasVisionAI = !!(input.imageAnalysis?.avgQuality);

  for (const c of criteria) {
    const key = `${c.category}_${c.item}`;
    let value: unknown = 0;

    switch (key) {
      // 리뷰
      case "review_visitor_review_count":
        value = input.visitorReviewCount;
        break;
      case "review_blog_review_count":
        value = input.blogReviewCount;
        break;
      case "review_review_volume_bonus":
        value = input.visitorReviewCount; // 리뷰수 기반 보정
        break;

      // 키워드
      case "keyword_place_exposure":
        // 특수 로직: keywordRankings 평균 점수를 15점으로 환산
        if (input.placeAvgScore !== null && input.placeAvgScore !== undefined) {
          const score = Math.round((input.placeAvgScore / 100) * c.max_score);
          results.push({
            category: c.category,
            item: c.item,
            score,
            maxScore: c.max_score,
            label: score >= 10 ? "양호" : score >= 5 ? "보통" : "부족",
            currentValue: input.placeAvgScore,
          });
          continue; // scoreItem 건너뜀
        }
        value = 0;
        break;
      case "keyword_blog_exposure":
        value = input.blogRank ?? 999;
        // 순위 기반: rank<=3 → 100%, rank<=10 → 70%, rank<=30 → 40%, else → 0%
        if (input.blogRank && input.blogRank <= 3) {
          results.push({ category: c.category, item: c.item, score: c.max_score, maxScore: c.max_score, label: "TOP3", currentValue: input.blogRank });
        } else if (input.blogRank && input.blogRank <= 10) {
          results.push({ category: c.category, item: c.item, score: Math.round(c.max_score * 0.7), maxScore: c.max_score, label: "TOP10", currentValue: input.blogRank });
        } else if (input.blogRank && input.blogRank <= 30) {
          results.push({ category: c.category, item: c.item, score: Math.round(c.max_score * 0.4), maxScore: c.max_score, label: "TOP30", currentValue: input.blogRank });
        } else {
          results.push({ category: c.category, item: c.item, score: 0, maxScore: c.max_score, label: "미노출", currentValue: input.blogRank });
        }
        continue;

      // 구글
      case "google_google_exposure":
        value = 0; // 미구현
        break;

      // 이미지 (Vision AI 실행 여부에 따라 분기)
      case "image_image_count":
        if (!hasVisionAI) continue; // Vision AI 없으면 basic 사용
        value = input.imageCount;
        break;
      case "image_image_quality":
        if (!hasVisionAI) continue;
        value = input.imageAnalysis?.avgQuality ?? 0;
        break;
      case "image_image_usability":
        if (!hasVisionAI) continue;
        value = input.imageAnalysis?.avgUsability ?? 0;
        break;
      case "image_image_count_basic":
        if (hasVisionAI) continue; // Vision AI 있으면 상세 항목 사용
        value = input.imageCount;
        break;

      // 채널
      case "channel_homepage":
        value = input.homepageUrl ? "exists" : "";
        break;
      case "channel_sns":
        value = input.snsUrl ? "exists" : "";
        break;
      case "channel_naver_reservation":
        value = input.serviceLabels.some(l => /예약|reservation/i.test(l)) ? "exists" : "";
        break;
      case "channel_naver_talktalk":
        value = input.serviceLabels.some(l => /톡톡|talktalk/i.test(l)) ? "exists" : "";
        break;
      case "channel_business_hours":
        value = input.businessHours ? "exists" : "";
        break;

      // SEO
      case "seo_brand_blog":
        value = input.hasBrandBlog ? "found" : "";
        break;
      case "seo_keyword_blog":
        value = input.hasKeywordBlog ? "found" : "";
        break;
      case "seo_google_seo":
        value = 0; // 미구현
        break;

      default:
        continue;
    }

    results.push(scoreItem(c, value as number | string | boolean));
  }

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const measurableMax = results.reduce((sum, r) => sum + r.maxScore, 0);
  const normalizedScore = measurableMax > 0
    ? Math.min(100, Math.round((totalScore / measurableMax) * 100))
    : 0;

  return { totalScore, normalizedScore, breakdown: results, measurableMax };
}
