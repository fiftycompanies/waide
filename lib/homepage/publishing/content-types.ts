/**
 * 홈페이지 블로그 콘텐츠 타입
 *
 * - hp_blog_info: 정보성 블로그 (비용 가이드, 인테리어 팁, 트렌드)
 * - hp_blog_review: 후기성 블로그 (시공 사례, Before/After, 견적 공개)
 * - hp_page: 홈페이지 정적 페이지 콘텐츠
 */
export type HomepageBlogType = "hp_blog_info" | "hp_blog_review" | "hp_page";

/**
 * 블로그 유형 한글 라벨
 */
export type BlogTypeLabel = "정보성" | "후기성";

/**
 * 브랜드 정보 (콘텐츠 생성 시 사용)
 */
export interface BrandInfo {
  /** 업체명 */
  name: string;
  /** 브랜드 페르소나 (clients.brand_persona) */
  persona: Record<string, unknown>;
  /** 인테리어 프로필 (clients.brand_persona.interior_profile) */
  interiorProfile: Record<string, unknown>;
}

/**
 * 블로그 콘텐츠 생성 요청
 */
export interface BlogGenerationRequest {
  /** 클라이언트(업체) ID */
  clientId: string;
  /** 홈페이지 프로젝트 ID */
  projectId: string;
  /** 콘텐츠 타입 */
  contentType: HomepageBlogType;
  /** 메인 타겟 키워드 */
  targetKeyword: string;
  /** 서브 키워드 목록 */
  subKeywords: string[];
  /** 블로그 유형 */
  blogType: BlogTypeLabel;
  /** 브랜드 정보 */
  brandInfo: BrandInfo;
}

/**
 * 블로그 게시물 (contents 테이블 기반)
 */
export interface BlogPost {
  /** 고유 ID */
  id: string;
  /** 제목 */
  title: string;
  /** URL 슬러그 */
  slug: string;
  /** 본문 (HTML 또는 Markdown) */
  body: string;
  /** 콘텐츠 타입 */
  contentType: HomepageBlogType;
  /** 메인 키워드 */
  mainKeyword: string;
  /** 발행 상태 */
  publishStatus: "draft" | "reviewing" | "published";
  /** 발행 일시 (ISO 8601) */
  publishedAt: string | null;
  /** 메타 설명 */
  metaDescription: string;
  /** 구조화 데이터 (JSON-LD Article) */
  schemaMarkup: Record<string, unknown>;
  /** 품질 점수 (QC 에이전트 산출) */
  qualityScore?: number;
  /** 생성 일시 */
  createdAt: string;
}

/**
 * 블로그 발행 설정 (homepage_projects.blog_config)
 */
export interface BlogConfig {
  /** 월간 발행 수 */
  postsPerMonth: number;
  /** 정보성 비율 (0.0 ~ 1.0) */
  infoRatio: number;
  /** 후기성 비율 (0.0 ~ 1.0) */
  reviewRatio: number;
  /** 자동 발행 여부 */
  autoPublish: boolean;
  /** 타겟 키워드 목록 */
  targetKeywords: string[];
  /** 콘텐츠 캘린더 */
  contentCalendar: ContentCalendarItem[];
  /** 교차 발행 설정 */
  crossPosting?: {
    naver?: boolean;
  };
}

/**
 * 콘텐츠 캘린더 항목
 */
export interface ContentCalendarItem {
  /** 예정 발행일 (YYYY-MM-DD) */
  scheduledDate: string;
  /** 타겟 키워드 */
  keyword: string;
  /** 블로그 유형 */
  blogType: BlogTypeLabel;
  /** 콘텐츠 타입 */
  contentType: HomepageBlogType;
  /** 발행 상태 */
  status: "scheduled" | "generating" | "reviewing" | "published" | "failed";
  /** 콘텐츠 ID (생성 후) */
  contentId?: string;
}

/**
 * 콘텐츠 생성 결과
 */
export interface ContentGenerationResult {
  /** 성공 여부 */
  success: boolean;
  /** 생성된 콘텐츠 ID */
  contentId?: string;
  /** 제목 */
  title?: string;
  /** 품질 점수 */
  qualityScore?: number;
  /** 실패 사유 */
  errorMessage?: string;
}

/**
 * 블로그 유형별 콘텐츠 포맷 가이드
 */
export const BLOG_FORMAT_GUIDE: Record<
  BlogTypeLabel,
  { formats: string[]; description: string }
> = {
  정보성: {
    formats: ["비용 분석표", "체크리스트", "트렌드 리포트", "가이드"],
    description:
      "인테리어 비용, 팁, 트렌드 등 정보 제공형 콘텐츠. 데이터와 표를 활용하여 신뢰성을 높인다.",
  },
  후기성: {
    formats: ["시공 후기", "Before/After", "견적 공개", "인터뷰"],
    description:
      "실제 시공 사례, 고객 후기, 견적 내역 등 경험 기반 콘텐츠. 구체적인 수치와 사진을 포함한다.",
  },
};
