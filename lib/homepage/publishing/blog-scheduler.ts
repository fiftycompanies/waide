import { SupabaseClient } from "@supabase/supabase-js";
import type {
  HomepageBlogType,
  BlogTypeLabel,
  BlogConfig,
  ContentCalendarItem,
  ContentGenerationResult,
} from "./content-types";
import { generateSlug, ensureUniqueSlug } from "./slug-generator";

/**
 * 월간 발행 스케줄 결과
 */
export interface MonthlySchedule {
  /** 정보성 블로그 스케줄 */
  infoPosts: Array<{ keyword: string; scheduledDate: string }>;
  /** 후기성 블로그 스케줄 */
  reviewPosts: Array<{ keyword: string; scheduledDate: string }>;
}

/**
 * 발행 통계
 */
export interface PublicationStats {
  /** 전체 발행 수 */
  totalPublished: number;
  /** 이번 달 발행 수 */
  thisMonth: number;
  /** 타입별 발행 수 */
  byType: Record<string, number>;
  /** 월별 발행 추이 */
  monthlyTrend: Array<{ month: string; count: number }>;
}

/**
 * 홈페이지 블로그 월간 발행 스케줄러.
 *
 * homepage_projects.blog_config를 기반으로 키워드 선택,
 * 콘텐츠 생성 일정 배분, 스케줄 실행을 수행한다.
 * 미발행 키워드를 우선 선택하여 키워드 로테이션을 보장한다.
 *
 * @example
 * ```ts
 * const scheduler = new BlogScheduler(supabase);
 * const schedule = await scheduler.generateMonthlySchedule("project-uuid");
 * await scheduler.executeSchedule("project-uuid");
 * ```
 */
export class BlogScheduler {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 월간 콘텐츠 캘린더를 생성한다.
   *
   * 1. keywords 테이블에서 blog_target 소스 키워드 조회
   * 2. 이미 발행된 키워드를 필터링하여 미발행 키워드 우선 선택
   * 3. blog_config 설정에 따라 정보성/후기성 비율 배분
   * 4. 월간 발행 일정을 3~4일 간격으로 분배
   *
   * @param projectId - 대상 홈페이지 프로젝트 ID
   * @returns 월간 발행 스케줄
   */
  async generateMonthlySchedule(
    projectId: string
  ): Promise<MonthlySchedule> {
    // 1. 프로젝트 정보 조회
    const { data: project, error: projectError } = await this.supabase
      .from("homepage_projects")
      .select("client_id, blog_config")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error(
        `프로젝트 조회 실패: ${projectError?.message || "프로젝트를 찾을 수 없습니다"}`
      );
    }

    const blogConfig = (project.blog_config || {}) as Partial<BlogConfig>;
    const postsPerMonth = blogConfig.postsPerMonth ?? 8;
    const infoRatio = blogConfig.infoRatio ?? 0.5;
    const reviewRatio = blogConfig.reviewRatio ?? 0.5;

    const infoCount = Math.round(postsPerMonth * infoRatio);
    const reviewCount = postsPerMonth - infoCount;

    // 2. 타겟 키워드 조회 (blog_target 소스)
    const { data: keywords, error: keywordsError } = await this.supabase
      .from("keywords")
      .select("id, keyword, metadata")
      .eq("client_id", project.client_id)
      .eq("source", "blog_target")
      .eq("status", "active");

    if (keywordsError) {
      throw new Error(`키워드 조회 실패: ${keywordsError.message}`);
    }

    if (!keywords || keywords.length === 0) {
      return { infoPosts: [], reviewPosts: [] };
    }

    // 3. 키워드를 유형별로 분류하고 미발행 키워드 우선 정렬
    const infoKeywords = keywords
      .filter(
        (k) =>
          k.metadata?.blog_type === "정보성" || k.metadata?.blog_type === "AEO"
      )
      .sort(
        (a, b) =>
          (a.metadata?.publish_count || 0) - (b.metadata?.publish_count || 0)
      );

    const reviewKeywords = keywords
      .filter((k) => k.metadata?.blog_type === "후기성")
      .sort(
        (a, b) =>
          (a.metadata?.publish_count || 0) - (b.metadata?.publish_count || 0)
      );

    // 4. 키워드 선택 (미발행 우선, 부족하면 순환)
    const selectedInfoKeywords = this.selectKeywords(infoKeywords, infoCount);
    const selectedReviewKeywords = this.selectKeywords(
      reviewKeywords,
      reviewCount
    );

    // 5. 발행 일정 분배 (매월 1일부터 3~4일 간격)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 다음 달 기준
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const daysInMonth = new Date(nextYear, nextMonth, 0).getDate();

    const totalPosts = infoCount + reviewCount;
    const interval = Math.max(
      Math.floor(daysInMonth / (totalPosts + 1)),
      2
    );

    const infoPosts = selectedInfoKeywords.map((keyword, index) => ({
      keyword: keyword.keyword,
      scheduledDate: this.formatDate(
        nextYear,
        nextMonth,
        Math.min(1 + (index * 2) * interval, daysInMonth)
      ),
    }));

    const reviewPosts = selectedReviewKeywords.map((keyword, index) => ({
      keyword: keyword.keyword,
      scheduledDate: this.formatDate(
        nextYear,
        nextMonth,
        Math.min(1 + (index * 2 + 1) * interval, daysInMonth)
      ),
    }));

    return { infoPosts, reviewPosts };
  }

  /**
   * 오늘 예정된 스케줄을 실행한다.
   *
   * 1. 오늘 날짜의 예정된 발행 항목 조회
   * 2. 콘텐츠 생성 (AI 생성 - 플레이스홀더)
   * 3. QC 검수
   * 4. contents 테이블에 삽입
   * 5. 발행 상태 업데이트
   * 6. 홈페이지 재빌드 트리거
   *
   * @param projectId - 대상 홈페이지 프로젝트 ID
   */
  async executeSchedule(projectId: string): Promise<void> {
    const { data: project, error: projectError } = await this.supabase
      .from("homepage_projects")
      .select("client_id, blog_config, subdomain")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error(
        `프로젝트 조회 실패: ${projectError?.message || "프로젝트를 찾을 수 없습니다"}`
      );
    }

    const blogConfig = (project.blog_config || {}) as Partial<BlogConfig>;
    const calendar = blogConfig.contentCalendar ?? [];

    const today = new Date().toISOString().split("T")[0];

    // 오늘 예정된 항목 필터링
    const todayItems = calendar.filter(
      (item: ContentCalendarItem) =>
        item.scheduledDate === today && item.status === "scheduled"
    );

    if (todayItems.length === 0) {
      return;
    }

    // 기존 슬러그 조회 (고유성 보장용)
    const { data: existingPosts } = await this.supabase
      .from("contents")
      .select("slug")
      .eq("client_id", project.client_id)
      .in("content_type", ["hp_blog_info", "hp_blog_review"]);

    const existingSlugs = (existingPosts || []).map(
      (p: { slug: string }) => p.slug
    );

    for (const item of todayItems) {
      try {
        // 콘텐츠 생성 (실제 AI 호출은 별도 모듈)
        const result = await this.generateContent(
          project.client_id,
          projectId,
          item,
          existingSlugs
        );

        if (result.success && result.contentId) {
          // 캘린더 항목 상태 업데이트
          await this.updateCalendarItemStatus(
            projectId,
            item.scheduledDate,
            item.keyword,
            "published",
            result.contentId
          );

          // 키워드 발행 횟수 업데이트
          await this.incrementKeywordPublishCount(
            project.client_id,
            item.keyword
          );

          existingSlugs.push(result.contentId);
        } else {
          await this.updateCalendarItemStatus(
            projectId,
            item.scheduledDate,
            item.keyword,
            "failed"
          );
        }
      } catch (error) {
        console.error(
          `콘텐츠 생성 실패 [${item.keyword}]: ${(error as Error).message}`
        );
        await this.updateCalendarItemStatus(
          projectId,
          item.scheduledDate,
          item.keyword,
          "failed"
        );
      }
    }
  }

  /**
   * 발행 통계를 조회한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @returns 발행 통계 (전체 수, 이번 달 수, 타입별 수)
   */
  async getPublicationStats(
    projectId: string
  ): Promise<PublicationStats> {
    const { data: project } = await this.supabase
      .from("homepage_projects")
      .select("client_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return {
        totalPublished: 0,
        thisMonth: 0,
        byType: {},
        monthlyTrend: [],
      };
    }

    // 전체 발행 수
    const { data: allPosts, error: allError } = await this.supabase
      .from("contents")
      .select("id, content_type, published_at, created_at")
      .eq("client_id", project.client_id)
      .in("content_type", ["hp_blog_info", "hp_blog_review"])
      .eq("publish_status", "published");

    if (allError || !allPosts) {
      return {
        totalPublished: 0,
        thisMonth: 0,
        byType: {},
        monthlyTrend: [],
      };
    }

    const totalPublished = allPosts.length;

    // 이번 달 발행 수
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = allPosts.filter((post) => {
      const publishDate = new Date(post.published_at || post.created_at);
      return publishDate >= monthStart;
    }).length;

    // 타입별 발행 수
    const byType: Record<string, number> = {};
    for (const post of allPosts) {
      const type = post.content_type;
      byType[type] = (byType[type] || 0) + 1;
    }

    // 월별 발행 추이 (최근 6개월)
    const monthlyTrend: Array<{ month: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const count = allPosts.filter((post) => {
        const publishDate = new Date(post.published_at || post.created_at);
        return publishDate >= date && publishDate < nextDate;
      }).length;
      monthlyTrend.push({ month: monthKey, count });
    }

    return {
      totalPublished,
      thisMonth,
      byType,
      monthlyTrend,
    };
  }

  /**
   * 키워드 목록에서 필요한 수만큼 키워드를 선택한다.
   * 미발행(publish_count가 낮은) 키워드를 우선 선택한다.
   */
  private selectKeywords(
    keywords: Array<{ id: string; keyword: string; metadata: Record<string, unknown> }>,
    count: number
  ): Array<{ id: string; keyword: string }> {
    if (keywords.length === 0) {
      return [];
    }

    const selected: Array<{ id: string; keyword: string }> = [];
    let index = 0;

    while (selected.length < count) {
      selected.push({
        id: keywords[index % keywords.length].id,
        keyword: keywords[index % keywords.length].keyword,
      });
      index++;
    }

    return selected;
  }

  /**
   * 콘텐츠를 생성한다.
   * 실제 AI 생성은 SEO Writer 에이전트에 위임하며,
   * 여기서는 contents 테이블에 레코드를 삽입하는 역할을 한다.
   */
  private async generateContent(
    clientId: string,
    projectId: string,
    item: ContentCalendarItem,
    existingSlugs: string[]
  ): Promise<ContentGenerationResult> {
    const contentType: HomepageBlogType =
      item.blogType === "정보성" ? "hp_blog_info" : "hp_blog_review";

    // 제목 생성 (플레이스홀더 - 실제로는 AI가 생성)
    const title = this.generateTitle(item.keyword, item.blogType);
    const slug = ensureUniqueSlug(generateSlug(title), existingSlugs);

    // 본문 생성 (플레이스홀더 - 실제로는 SEO Writer 에이전트가 생성)
    const body = this.generatePlaceholderBody(item.keyword, item.blogType);

    // 메타 설명 생성
    const metaDescription = `${item.keyword}에 대한 ${item.blogType === "정보성" ? "상세 가이드" : "실제 후기"} - 전문 인테리어 업체가 알려드립니다.`;

    // JSON-LD Article 구조화 데이터
    const schemaMarkup = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: metaDescription,
      datePublished: new Date().toISOString(),
      author: {
        "@type": "Organization",
        name: "와이드와일드",
      },
    };

    // contents 테이블에 삽입
    const { data: content, error } = await this.supabase
      .from("contents")
      .insert({
        client_id: clientId,
        content_type: contentType,
        title,
        slug,
        body,
        main_keyword: item.keyword,
        meta_description: metaDescription,
        schema_markup: schemaMarkup,
        publish_status: "published",
        published_at: new Date().toISOString(),
        quality_score: 75, // 기본 점수 (실제로는 QC 에이전트가 산출)
      })
      .select("id")
      .single();

    if (error) {
      return {
        success: false,
        errorMessage: `콘텐츠 삽입 실패: ${error.message}`,
      };
    }

    return {
      success: true,
      contentId: content.id,
      title,
      qualityScore: 75,
    };
  }

  /**
   * 블로그 제목을 생성한다. (플레이스홀더)
   * 실제로는 AI가 생성하지만, 여기서는 기본 패턴을 사용한다.
   */
  private generateTitle(keyword: string, blogType: BlogTypeLabel): string {
    if (blogType === "정보성") {
      const templates = [
        `${keyword} 완벽 가이드 (2026년 최신)`,
        `${keyword} - 전문가가 알려주는 모든 것`,
        `${keyword} 비용부터 주의사항까지 총정리`,
        `${keyword} 시작 전 꼭 알아야 할 10가지`,
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    const templates = [
      `${keyword} 실제 시공 사례 공개`,
      `${keyword} Before & After 비교`,
      `${keyword} 고객 후기 - 3개월 거주 후 솔직 리뷰`,
      `${keyword} 견적서 전격 공개`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * 플레이스홀더 본문을 생성한다.
   * 실제 운영에서는 SEO Writer 에이전트가 AI로 본문을 생성한다.
   */
  private generatePlaceholderBody(
    keyword: string,
    blogType: BlogTypeLabel
  ): string {
    if (blogType === "정보성") {
      return `
<h2>${keyword}이란?</h2>
<p>${keyword}에 대해 궁금하신 분들을 위해 전문 인테리어 업체의 시선에서 상세하게 안내해 드립니다.</p>

<h2>비용 분석</h2>
<p>평균 비용, 항목별 견적, 추가 비용 등을 구체적인 수치와 함께 설명합니다.</p>

<table>
  <thead>
    <tr><th>항목</th><th>예상 비용</th><th>비고</th></tr>
  </thead>
  <tbody>
    <tr><td>철거</td><td>200~400만원</td><td>평수에 따라 변동</td></tr>
    <tr><td>바닥</td><td>300~600만원</td><td>자재에 따라 변동</td></tr>
    <tr><td>도배</td><td>100~200만원</td><td>실크/합지 선택</td></tr>
  </tbody>
</table>

<h2>주의사항</h2>
<p>시공 전 반드시 확인해야 할 체크리스트를 알려드립니다.</p>

<h2>마무리</h2>
<p>더 자세한 상담이 필요하시면 무료 상담을 신청해 주세요.</p>
      `.trim();
    }

    return `
<h2>시공 개요</h2>
<p>${keyword}에 대한 실제 시공 사례를 공개합니다.</p>

<h2>Before & After</h2>
<p>시공 전후 비교 사진과 함께 변화 과정을 보여드립니다.</p>

<h2>시공 과정</h2>
<p>상담부터 시공 완료까지의 전체 과정을 단계별로 설명합니다.</p>

<h2>견적 내역</h2>
<p>투명한 견적 공개로 신뢰를 드립니다.</p>

<h2>고객 후기</h2>
<p>실제 거주 후 느낀 만족도와 솔직한 후기를 공유합니다.</p>

<h2>상담 안내</h2>
<p>비슷한 공간의 인테리어를 고려하고 계신다면 부담 없이 상담을 신청해 주세요.</p>
    `.trim();
  }

  /**
   * 캘린더 항목의 상태를 업데이트한다.
   */
  private async updateCalendarItemStatus(
    projectId: string,
    scheduledDate: string,
    keyword: string,
    status: ContentCalendarItem["status"],
    contentId?: string
  ): Promise<void> {
    const { data: project } = await this.supabase
      .from("homepage_projects")
      .select("blog_config")
      .eq("id", projectId)
      .single();

    if (!project) return;

    const blogConfig = (project.blog_config || {}) as Partial<BlogConfig>;
    const calendar = blogConfig.contentCalendar ?? [];

    const updatedCalendar = calendar.map((item: ContentCalendarItem) => {
      if (item.scheduledDate === scheduledDate && item.keyword === keyword) {
        return { ...item, status, contentId: contentId || item.contentId };
      }
      return item;
    });

    await this.supabase
      .from("homepage_projects")
      .update({
        blog_config: {
          ...blogConfig,
          contentCalendar: updatedCalendar,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
  }

  /**
   * 키워드의 발행 횟수를 증가시킨다.
   */
  private async incrementKeywordPublishCount(
    clientId: string,
    keyword: string
  ): Promise<void> {
    const { data: kw } = await this.supabase
      .from("keywords")
      .select("id, metadata")
      .eq("client_id", clientId)
      .eq("keyword", keyword)
      .single();

    if (!kw) return;

    const metadata = kw.metadata || {};
    const currentCount = (metadata.publish_count as number) || 0;

    await this.supabase
      .from("keywords")
      .update({
        metadata: {
          ...metadata,
          publish_count: currentCount + 1,
          last_published_at: new Date().toISOString(),
        },
      })
      .eq("id", kw.id);
  }

  /**
   * 날짜를 YYYY-MM-DD 형식으로 포맷한다.
   */
  private formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
}
