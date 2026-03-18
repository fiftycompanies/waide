// ============================================================
// 자동 키워드 생성 엔진
// 서비스 지역 x 키워드 패턴 매트릭스 기반 키워드 자동 생성
// ============================================================

import {
  KEYWORD_PATTERNS,
  type KeywordPattern,
  type PatternSource,
  type PatternPriority,
  type PatternBlogType,
} from './seo-keyword-matrix';

// ----------------------------------------------------------------
// 타입 정의
// ----------------------------------------------------------------

export interface KeywordEntry {
  keyword: string;
  source: PatternSource;
  priority: PatternPriority;
  is_primary: boolean;
  metadata: {
    blog_type?: PatternBlogType;
    content_format?: string;
    region?: string;
    last_published_at?: string | null;
    publish_count?: number;
    generated_by: string;
    project_id?: string;
    category?: string;
  };
}

export interface GenerateKeywordsResult {
  keywords: KeywordEntry[];
  totalGenerated: number;
  categoryBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
}

// ----------------------------------------------------------------
// 키워드 생성 함수
// ----------------------------------------------------------------

/**
 * 서비스 지역과 서비스 유형을 기반으로 SEO 키워드를 자동 생성합니다.
 *
 * @param serviceRegions - 서비스 지역 배열 (예: ["강남구", "서초구", "송파구"])
 * @param serviceTypes - 서비스 유형 배열 (예: ["아파트 인테리어", "리모델링"])
 * @param projectId - 홈페이지 프로젝트 ID (선택)
 * @returns 생성된 키워드 엔트리 배열과 통계
 */
export function generateHomepageKeywords(
  serviceRegions: string[],
  serviceTypes: string[],
  projectId?: string
): GenerateKeywordsResult {
  const keywords: KeywordEntry[] = [];
  const seen = new Set<string>(); // 중복 방지

  const categoryBreakdown: Record<string, number> = {};
  const sourceBreakdown: Record<string, number> = {};
  const priorityBreakdown: Record<string, number> = {};

  // 헬퍼: 키워드 추가 (중복 방지)
  function addKeyword(
    keyword: string,
    pattern: KeywordPattern,
    region?: string,
    isPrimary: boolean = false
  ) {
    const normalizedKeyword = keyword.trim();
    if (seen.has(normalizedKeyword)) return;
    seen.add(normalizedKeyword);

    const entry: KeywordEntry = {
      keyword: normalizedKeyword,
      source: pattern.source,
      priority: pattern.priority,
      is_primary: isPrimary,
      metadata: {
        blog_type: pattern.metadata?.blog_type,
        content_format: pattern.metadata?.content_format,
        region: region,
        last_published_at: null,
        publish_count: 0,
        generated_by: 'homepage_auto',
        project_id: projectId,
        category: pattern.category,
      },
    };

    keywords.push(entry);

    // 통계 업데이트
    categoryBreakdown[pattern.category] = (categoryBreakdown[pattern.category] || 0) + 1;
    sourceBreakdown[pattern.source] = (sourceBreakdown[pattern.source] || 0) + 1;
    priorityBreakdown[pattern.priority] = (priorityBreakdown[pattern.priority] || 0) + 1;
  }

  // ----------------------------------------------------------------
  // 패턴별 키워드 생성
  // ----------------------------------------------------------------

  for (const pattern of KEYWORD_PATTERNS) {
    if (pattern.requiresRegion && pattern.requiresServiceType) {
      // 지역 x 서비스 유형 조합
      for (let ri = 0; ri < serviceRegions.length; ri++) {
        const region = serviceRegions[ri];
        for (const serviceType of serviceTypes) {
          const keyword = pattern.template
            .replace('{region}', region)
            .replace('{service_type}', serviceType);

          // 첫 번째 지역의 첫 번째 critical 키워드를 대표 키워드로 설정
          const isPrimary = ri === 0 && pattern.priority === 'critical' && keywords.filter(k => k.is_primary).length === 0;
          addKeyword(keyword, pattern, region, isPrimary);
        }
      }
    } else if (pattern.requiresRegion) {
      // 지역만 필요한 패턴
      for (let ri = 0; ri < serviceRegions.length; ri++) {
        const region = serviceRegions[ri];
        const keyword = pattern.template.replace('{region}', region);

        // 첫 번째 지역의 첫 번째 critical 키워드를 대표 키워드로 설정
        const isPrimary = ri === 0 && pattern.priority === 'critical' && keywords.filter(k => k.is_primary).length === 0;
        addKeyword(keyword, pattern, region, isPrimary);
      }
    } else {
      // 지역 독립적 패턴 (1회만 생성)
      addKeyword(pattern.template, pattern, undefined, false);
    }
  }

  return {
    keywords,
    totalGenerated: keywords.length,
    categoryBreakdown,
    sourceBreakdown,
    priorityBreakdown,
  };
}

/**
 * 대표 키워드가 설정되어 있지 않은 경우 첫 번째 critical 키워드를 대표로 설정합니다.
 */
export function ensurePrimaryKeyword(keywords: KeywordEntry[]): KeywordEntry[] {
  const hasPrimary = keywords.some(k => k.is_primary);

  if (!hasPrimary && keywords.length > 0) {
    // critical 우선, 그 다음 high 우선
    const criticalIndex = keywords.findIndex(k => k.priority === 'critical');
    const targetIndex = criticalIndex >= 0 ? criticalIndex : 0;

    return keywords.map((k, i) => ({
      ...k,
      is_primary: i === targetIndex,
    }));
  }

  return keywords;
}

/**
 * 키워드를 배치 단위로 분할합니다.
 * 대량 INSERT 시 타임아웃 방지를 위해 100개 단위로 분할합니다.
 */
export function batchKeywords(keywords: KeywordEntry[], batchSize: number = 100): KeywordEntry[][] {
  const batches: KeywordEntry[][] = [];

  for (let i = 0; i < keywords.length; i += batchSize) {
    batches.push(keywords.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * 기존 키워드와 비교하여 중복을 제거합니다.
 *
 * @param newKeywords - 새로 생성된 키워드
 * @param existingKeywords - 이미 DB에 존재하는 키워드 문자열 배열
 * @returns 중복이 제거된 키워드와 중복 수
 */
export function deduplicateKeywords(
  newKeywords: KeywordEntry[],
  existingKeywords: string[]
): {
  unique: KeywordEntry[];
  duplicatesSkipped: number;
} {
  const existingSet = new Set(existingKeywords.map(k => k.trim().toLowerCase()));

  const unique: KeywordEntry[] = [];
  let duplicatesSkipped = 0;

  for (const entry of newKeywords) {
    if (existingSet.has(entry.keyword.trim().toLowerCase())) {
      duplicatesSkipped++;
    } else {
      unique.push(entry);
    }
  }

  return { unique, duplicatesSkipped };
}

/**
 * 키워드 카테고리별 요약 통계를 생성합니다.
 */
export function getKeywordSummary(keywords: KeywordEntry[]): {
  total: number;
  homepage_seo: number;
  blog_target: number;
  info: number;
  review: number;
  aeo: number;
  primary: string | null;
} {
  const homepage_seo = keywords.filter(k => k.source === 'homepage_seo').length;
  const blog_target = keywords.filter(k => k.source === 'blog_target').length;
  const info = keywords.filter(k => k.metadata.blog_type === '정보성').length;
  const review = keywords.filter(k => k.metadata.blog_type === '후기성').length;
  const aeo = keywords.filter(k => k.metadata.blog_type === 'AEO').length;
  const primary = keywords.find(k => k.is_primary)?.keyword ?? null;

  return {
    total: keywords.length,
    homepage_seo,
    blog_target,
    info,
    review,
    aeo,
    primary,
  };
}
