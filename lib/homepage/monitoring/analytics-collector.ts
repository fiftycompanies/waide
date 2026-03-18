import { SupabaseClient } from "@supabase/supabase-js";

/**
 * 방문 통계 조회 기간
 */
export type AnalyticsPeriod = "day" | "week" | "month";

/**
 * 방문 통계 데이터
 */
export interface VisitStats {
  /** 전체 방문 수 */
  totalVisits: number;
  /** 고유 방문자 수 */
  uniqueVisitors: number;
  /** 페이지별 조회수 */
  pageViews: Record<string, number>;
  /** 유입 경로별 방문수 */
  referrers: Record<string, number>;
  /** 일별 방문 추이 */
  dailyTrend: Array<{ date: string; visits: number }>;
}

/**
 * 상담 통계 데이터
 */
export interface InquiryStats {
  /** 전체 상담 수 */
  total: number;
  /** 상태별 상담 수 */
  byStatus: Record<string, number>;
  /** 전환율 (상담 수 / 방문 수) */
  conversionRate: number;
  /** 월별 상담 추이 */
  monthlyTrend: Array<{ month: string; count: number }>;
}

/**
 * 방문 기록 데이터 (page_views 테이블용)
 */
interface PageViewRecord {
  project_id: string;
  page: string;
  referrer: string | null;
  visitor_id: string;
  created_at: string;
}

/**
 * 홈페이지 방문/상담 통계 수집기.
 *
 * 홈페이지 방문 기록을 Supabase에 저장하고,
 * 다양한 기간/조건으로 통계를 조회한다.
 * Vercel Analytics API를 보완하는 자체 경량 분석 기능을 제공한다.
 *
 * @example
 * ```ts
 * const collector = new AnalyticsCollector(supabase);
 * await collector.recordVisit("project-id", "/portfolio", "https://google.com");
 * const stats = await collector.getVisitStats("project-id", "month");
 * ```
 */
export class AnalyticsCollector {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 페이지 방문을 기록한다.
   *
   * 홈페이지의 각 페이지 로드 시 호출되어 방문 기록을 저장한다.
   * visitor_id는 세션 기반 고유 식별자를 사용한다.
   *
   * @param projectId - 홈페이지 프로젝트 ID
   * @param page - 방문 페이지 경로 (예: "/", "/portfolio/modern-living")
   * @param referrer - 유입 경로 URL (직접 방문 시 null)
   * @param visitorId - 방문자 고유 식별자 (선택, 미입력 시 자동 생성)
   */
  async recordVisit(
    projectId: string,
    page: string,
    referrer: string | null,
    visitorId?: string
  ): Promise<void> {
    const record: PageViewRecord = {
      project_id: projectId,
      page: page || "/",
      referrer: referrer ? this.normalizeReferrer(referrer) : null,
      visitor_id: visitorId || this.generateVisitorId(),
      created_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from("homepage_page_views")
      .insert(record);

    if (error) {
      console.error(`방문 기록 실패: ${error.message}`);
    }

    // 프로젝트 총 방문수 증가 (비동기, 실패해도 무시)
    try {
      await this.supabase.rpc("increment_total_visits", {
        p_project_id: projectId,
      });
    } catch {
      // RPC 없어도 무시
    }
  }

  /**
   * 방문 통계를 조회한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param period - 조회 기간 ("day", "week", "month")
   * @returns 방문 통계 (총 방문수, 고유 방문자, 페이지별/유입경로별/일별 데이터)
   */
  async getVisitStats(
    projectId: string,
    period: AnalyticsPeriod
  ): Promise<VisitStats> {
    const startDate = this.getPeriodStartDate(period);
    const startDateStr = startDate.toISOString();

    // 전체 방문 기록 조회
    const { data: pageViews, error } = await this.supabase
      .from("homepage_page_views")
      .select("page, referrer, visitor_id, created_at")
      .eq("project_id", projectId)
      .gte("created_at", startDateStr)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`방문 통계 조회 실패: ${error.message}`);
    }

    const views = pageViews || [];

    // 총 방문수
    const totalVisits = views.length;

    // 고유 방문자수
    const uniqueVisitorIds = new Set(views.map((v) => v.visitor_id));
    const uniqueVisitors = uniqueVisitorIds.size;

    // 페이지별 조회수
    const pageViewCounts: Record<string, number> = {};
    for (const view of views) {
      const page = view.page || "/";
      pageViewCounts[page] = (pageViewCounts[page] || 0) + 1;
    }

    // 유입 경로별 방문수
    const referrerCounts: Record<string, number> = {};
    for (const view of views) {
      const source = this.classifyReferrer(view.referrer);
      referrerCounts[source] = (referrerCounts[source] || 0) + 1;
    }

    // 일별 방문 추이
    const dailyMap: Record<string, number> = {};
    for (const view of views) {
      const date = view.created_at.split("T")[0];
      dailyMap[date] = (dailyMap[date] || 0) + 1;
    }

    // 기간 내 모든 날짜를 채움
    const dailyTrend: Array<{ date: string; visits: number }> = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (current <= today) {
      const dateStr = current.toISOString().split("T")[0];
      dailyTrend.push({
        date: dateStr,
        visits: dailyMap[dateStr] || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return {
      totalVisits,
      uniqueVisitors,
      pageViews: pageViewCounts,
      referrers: referrerCounts,
      dailyTrend,
    };
  }

  /**
   * 상담 통계를 조회한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @returns 상담 통계 (총 수, 상태별, 전환율, 월별 추이)
   */
  async getInquiryStats(projectId: string): Promise<InquiryStats> {
    // 전체 상담 조회
    const { data: inquiries, error: inquiryError } = await this.supabase
      .from("homepage_inquiries")
      .select("id, status, created_at")
      .eq("project_id", projectId);

    if (inquiryError) {
      throw new Error(`상담 통계 조회 실패: ${inquiryError.message}`);
    }

    const allInquiries = inquiries || [];
    const total = allInquiries.length;

    // 상태별 상담 수
    const byStatus: Record<string, number> = {};
    for (const inquiry of allInquiries) {
      const status = inquiry.status || "new";
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    // 전환율 계산 (방문수 대비 상담 비율)
    const { data: project } = await this.supabase
      .from("homepage_projects")
      .select("total_visits")
      .eq("id", projectId)
      .single();

    const totalVisits = project?.total_visits || 0;
    const conversionRate =
      totalVisits > 0 ? (total / totalVisits) * 100 : 0;

    // 월별 상담 추이 (최근 6개월)
    const now = new Date();
    const monthlyTrend: Array<{ month: string; count: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        1
      );
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const count = allInquiries.filter((inq) => {
        const inqDate = new Date(inq.created_at);
        return inqDate >= date && inqDate < nextDate;
      }).length;

      monthlyTrend.push({ month: monthKey, count });
    }

    return {
      total,
      byStatus,
      conversionRate: Math.round(conversionRate * 100) / 100,
      monthlyTrend,
    };
  }

  /**
   * 특정 기간의 인기 페이지 TOP N을 조회한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param period - 조회 기간
   * @param limit - 상위 N개 (기본값: 10)
   * @returns 인기 페이지 목록 (경로, 조회수)
   */
  async getTopPages(
    projectId: string,
    period: AnalyticsPeriod,
    limit: number = 10
  ): Promise<Array<{ path: string; views: number }>> {
    const stats = await this.getVisitStats(projectId, period);

    return Object.entries(stats.pageViews)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  /**
   * 전월 대비 증감률을 계산한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @returns 방문수/상담수 전월 대비 증감률
   */
  async getMonthOverMonthGrowth(projectId: string): Promise<{
    visitsGrowth: number;
    inquiriesGrowth: number;
  }> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 이번 달 방문수
    const { count: thisMonthVisits } = await this.supabase
      .from("homepage_page_views")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", thisMonthStart.toISOString());

    // 지난 달 방문수
    const { count: lastMonthVisits } = await this.supabase
      .from("homepage_page_views")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", lastMonthStart.toISOString())
      .lt("created_at", thisMonthStart.toISOString());

    // 이번 달 상담수
    const { count: thisMonthInquiries } = await this.supabase
      .from("homepage_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", thisMonthStart.toISOString());

    // 지난 달 상담수
    const { count: lastMonthInquiries } = await this.supabase
      .from("homepage_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", lastMonthStart.toISOString())
      .lt("created_at", thisMonthStart.toISOString());

    const calcGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 10000) / 100;
    };

    return {
      visitsGrowth: calcGrowth(
        thisMonthVisits || 0,
        lastMonthVisits || 0
      ),
      inquiriesGrowth: calcGrowth(
        thisMonthInquiries || 0,
        lastMonthInquiries || 0
      ),
    };
  }

  /**
   * 조회 기간의 시작 날짜를 계산한다.
   */
  private getPeriodStartDate(period: AnalyticsPeriod): Date {
    const now = new Date();
    switch (period) {
      case "day":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case "week":
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7
        );
      case "month":
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 30
        );
    }
  }

  /**
   * Referrer URL을 정규화한다.
   */
  private normalizeReferrer(referrer: string): string {
    try {
      const url = new URL(referrer);
      return url.hostname;
    } catch {
      return referrer;
    }
  }

  /**
   * Referrer를 카테고리로 분류한다.
   */
  private classifyReferrer(referrer: string | null): string {
    if (!referrer) return "직접 방문";

    const ref = referrer.toLowerCase();

    if (ref.includes("naver") || ref.includes("search.naver")) {
      return "네이버";
    }
    if (ref.includes("google")) {
      return "구글";
    }
    if (ref.includes("daum") || ref.includes("kakao")) {
      return "다음/카카오";
    }
    if (
      ref.includes("instagram") ||
      ref.includes("facebook") ||
      ref.includes("twitter") ||
      ref.includes("youtube")
    ) {
      return "SNS";
    }
    if (ref.includes("blog.naver")) {
      return "네이버 블로그";
    }

    return "기타";
  }

  /**
   * 간이 방문자 ID를 생성한다.
   * 실제 환경에서는 클라이언트 측에서 세션 ID를 전달받는다.
   */
  private generateVisitorId(): string {
    return `v_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
