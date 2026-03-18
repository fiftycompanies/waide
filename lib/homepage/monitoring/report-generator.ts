import { SupabaseClient } from "@supabase/supabase-js";
import { AnalyticsCollector } from "./analytics-collector";

/**
 * 월간 리포트 데이터
 */
export interface MonthlyReport {
  /** 프로젝트 ID */
  projectId: string;
  /** 프로젝트명 */
  projectName: string;
  /** 리포트 기간 */
  period: { start: string; end: string };
  /** 홈페이지 성과 */
  homepage: {
    /** 총 방문수 */
    totalVisits: number;
    /** 총 상담 접수 */
    totalInquiries: number;
    /** 전환율 (%) */
    conversionRate: number;
    /** 인기 페이지 TOP 5 */
    topPages: Array<{ path: string; views: number }>;
    /** 유입 경로 분포 */
    referrers: Array<{ source: string; percentage: number }>;
    /** 상담 상태 분포 */
    inquiryStatus: Record<string, number>;
  };
  /** 블로그 성과 */
  blog: {
    /** 발행 수 */
    postsPublished: number;
    /** 블로그 총 조회수 */
    totalViews: number;
    /** 인기 게시물 TOP 5 */
    topPosts: Array<{ title: string; views: number }>;
  };
  /** SEO 성과 */
  seo: {
    /** 추적 키워드 수 */
    keywordsTracked: number;
    /** 평균 순위 */
    avgPosition: number;
    /** 주요 키워드 순위 */
    topKeywords: Array<{
      keyword: string;
      position: number;
      change: number;
    }>;
  };
}

/**
 * 월간 리포트 생성기.
 *
 * AnalyticsCollector와 Supabase 데이터를 결합하여
 * 홈페이지 프로젝트의 월간 성과 리포트를 생성한다.
 * 방문 통계, 상담 현황, 블로그 성과, SEO 순위 데이터를 포함한다.
 *
 * @example
 * ```ts
 * const generator = new ReportGenerator(analyticsCollector, supabase);
 * const report = await generator.generateMonthlyReport("project-id", "2026-03");
 * const html = await generator.generateReportHtml(report);
 * ```
 */
export class ReportGenerator {
  constructor(
    private analytics: AnalyticsCollector,
    private supabase: SupabaseClient
  ) {}

  /**
   * 월간 리포트를 생성한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param month - 대상 월 (YYYY-MM 형식)
   * @returns 월간 리포트 데이터
   */
  async generateMonthlyReport(
    projectId: string,
    month: string
  ): Promise<MonthlyReport> {
    // 프로젝트 정보 조회
    const { data: project, error: projectError } = await this.supabase
      .from("homepage_projects")
      .select("project_name, client_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error(
        `프로젝트 조회 실패: ${projectError?.message || "프로젝트를 찾을 수 없습니다"}`
      );
    }

    // 기간 설정
    const [year, monthNum] = month.split("-").map(Number);
    const periodStart = new Date(year, monthNum - 1, 1);
    const periodEnd = new Date(year, monthNum, 0); // 말일

    const period = {
      start: periodStart.toISOString().split("T")[0],
      end: periodEnd.toISOString().split("T")[0],
    };

    // 병렬로 데이터 수집
    const [
      homepageData,
      blogData,
      seoData,
    ] = await Promise.all([
      this.collectHomepageData(projectId, period),
      this.collectBlogData(project.client_id, period),
      this.collectSeoData(project.client_id),
    ]);

    return {
      projectId,
      projectName: project.project_name,
      period,
      homepage: homepageData,
      blog: blogData,
      seo: seoData,
    };
  }

  /**
   * 월간 리포트를 HTML 문자열로 렌더링한다.
   * 이메일 발송 또는 PDF 변환에 사용한다.
   *
   * @param report - 월간 리포트 데이터
   * @returns HTML 문자열
   */
  async generateReportHtml(report: MonthlyReport): Promise<string> {
    const topPagesHtml = report.homepage.topPages
      .map(
        (page, index) =>
          `<tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${page.path}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${page.views.toLocaleString()}</td>
          </tr>`
      )
      .join("");

    const referrersHtml = report.homepage.referrers
      .map(
        (ref) =>
          `<tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${ref.source}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${ref.percentage}%</td>
          </tr>`
      )
      .join("");

    const inquiryStatusHtml = Object.entries(report.homepage.inquiryStatus)
      .map(
        ([status, count]) =>
          `<tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${this.translateStatus(status)}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${count}건</td>
          </tr>`
      )
      .join("");

    const blogPostsHtml = report.blog.topPosts
      .map(
        (post, index) =>
          `<tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${post.title}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${post.views.toLocaleString()}</td>
          </tr>`
      )
      .join("");

    const seoKeywordsHtml = report.seo.topKeywords
      .map(
        (kw) => {
          const changeColor = kw.change > 0 ? "#ef4444" : kw.change < 0 ? "#10b981" : "#6b7280";
          const changeText = kw.change > 0 ? `+${kw.change}` : kw.change < 0 ? `${kw.change}` : "-";
          return `<tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${kw.keyword}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${kw.position}위</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${changeColor};">${changeText}</td>
          </tr>`;
        }
      )
      .join("");

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>월간 리포트 - ${report.projectName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: #111827;">
  <div style="max-width: 800px; margin: 0 auto; padding: 40px 24px;">

    <!-- 헤더 -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="font-size: 24px; font-weight: 700; margin: 0;">${report.projectName}</h1>
      <p style="font-size: 16px; color: #6b7280; margin: 8px 0 0;">
        월간 홈페이지 성과 리포트 | ${report.period.start} ~ ${report.period.end}
      </p>
    </div>

    <!-- KPI 카드 -->
    <div style="display: flex; gap: 16px; margin-bottom: 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="25%" style="padding: 20px; text-align: center; background-color: #eff6ff; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">방문수</p>
            <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #2563eb;">
              ${report.homepage.totalVisits.toLocaleString()}
            </p>
          </td>
          <td width="2%"></td>
          <td width="25%" style="padding: 20px; text-align: center; background-color: #f0fdf4; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">상담 접수</p>
            <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #10b981;">
              ${report.homepage.totalInquiries}건
            </p>
          </td>
          <td width="2%"></td>
          <td width="25%" style="padding: 20px; text-align: center; background-color: #fef3c7; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">전환율</p>
            <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #f59e0b;">
              ${report.homepage.conversionRate}%
            </p>
          </td>
          <td width="2%"></td>
          <td width="25%" style="padding: 20px; text-align: center; background-color: #f3e8ff; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">블로그 발행</p>
            <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #8b5cf6;">
              ${report.blog.postsPublished}건
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- 인기 페이지 -->
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">인기 페이지 TOP 5</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #6b7280;">#</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #6b7280;">페이지</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 13px; color: #6b7280;">조회수</th>
          </tr>
        </thead>
        <tbody>${topPagesHtml || '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #9ca3af;">데이터 없음</td></tr>'}</tbody>
      </table>
    </div>

    <!-- 유입 경로 -->
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">유입 경로</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #6b7280;">경로</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 13px; color: #6b7280;">비율</th>
          </tr>
        </thead>
        <tbody>${referrersHtml || '<tr><td colspan="2" style="padding: 16px; text-align: center; color: #9ca3af;">데이터 없음</td></tr>'}</tbody>
      </table>
    </div>

    <!-- 상담 현황 -->
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">상담 현황</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #6b7280;">상태</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 13px; color: #6b7280;">건수</th>
          </tr>
        </thead>
        <tbody>${inquiryStatusHtml || '<tr><td colspan="2" style="padding: 16px; text-align: center; color: #9ca3af;">데이터 없음</td></tr>'}</tbody>
      </table>
    </div>

    <!-- 블로그 성과 -->
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">블로그 인기 게시물</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #6b7280;">#</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #6b7280;">제목</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 13px; color: #6b7280;">조회수</th>
          </tr>
        </thead>
        <tbody>${blogPostsHtml || '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #9ca3af;">데이터 없음</td></tr>'}</tbody>
      </table>
    </div>

    <!-- SEO 키워드 순위 -->
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">SEO 키워드 순위</h2>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px;">
        추적 키워드 ${report.seo.keywordsTracked}개 | 평균 순위 ${report.seo.avgPosition}위
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #6b7280;">키워드</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 13px; color: #6b7280;">순위</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 13px; color: #6b7280;">변동</th>
          </tr>
        </thead>
        <tbody>${seoKeywordsHtml || '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #9ca3af;">데이터 없음</td></tr>'}</tbody>
      </table>
    </div>

    <!-- 푸터 -->
    <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        와이드와일드 홈페이지 서비스 | 자동 생성 리포트
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * 홈페이지 방문/상담 데이터를 수집한다.
   */
  private async collectHomepageData(
    projectId: string,
    period: { start: string; end: string }
  ): Promise<MonthlyReport["homepage"]> {
    // 방문 통계
    let totalVisits = 0;
    let pageViews: Record<string, number> = {};
    let referrers: Record<string, number> = {};

    try {
      const visitStats = await this.analytics.getVisitStats(projectId, "month");
      totalVisits = visitStats.totalVisits;
      pageViews = visitStats.pageViews;
      referrers = visitStats.referrers;
    } catch {
      // 방문 통계 조회 실패 시 기본값 사용
    }

    // 상담 통계
    let totalInquiries = 0;
    let inquiryStatus: Record<string, number> = {};

    try {
      const inquiryStats = await this.analytics.getInquiryStats(projectId);
      totalInquiries = inquiryStats.total;
      inquiryStatus = inquiryStats.byStatus;
    } catch {
      // 상담 통계 조회 실패 시 기본값 사용
    }

    // 전환율
    const conversionRate =
      totalVisits > 0
        ? Math.round((totalInquiries / totalVisits) * 10000) / 100
        : 0;

    // 인기 페이지 TOP 5
    const topPages = Object.entries(pageViews)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // 유입 경로 비율
    const totalReferrerVisits = Object.values(referrers).reduce(
      (sum, v) => sum + v,
      0
    );
    const referrerPercentages = Object.entries(referrers)
      .map(([source, count]) => ({
        source,
        percentage:
          totalReferrerVisits > 0
            ? Math.round((count / totalReferrerVisits) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return {
      totalVisits,
      totalInquiries,
      conversionRate,
      topPages,
      referrers: referrerPercentages,
      inquiryStatus,
    };
  }

  /**
   * 블로그 성과 데이터를 수집한다.
   */
  private async collectBlogData(
    clientId: string,
    period: { start: string; end: string }
  ): Promise<MonthlyReport["blog"]> {
    // 기간 내 발행된 블로그 수
    const { data: publishedPosts, error: pubError } = await this.supabase
      .from("contents")
      .select("id, title, slug")
      .eq("client_id", clientId)
      .in("content_type", ["hp_blog_info", "hp_blog_review"])
      .eq("publish_status", "published")
      .gte("published_at", `${period.start}T00:00:00Z`)
      .lte("published_at", `${period.end}T23:59:59Z`);

    const postsPublished = pubError ? 0 : (publishedPosts || []).length;

    // 블로그 페이지 조회수 (page_views에서 /blog/* 경로)
    const { data: blogViews } = await this.supabase
      .from("homepage_page_views")
      .select("page")
      .like("page", "/blog/%")
      .gte("created_at", `${period.start}T00:00:00Z`)
      .lte("created_at", `${period.end}T23:59:59Z`);

    const totalViews = blogViews?.length || 0;

    // 블로그별 조회수 집계
    const postViewCounts: Record<string, number> = {};
    for (const view of blogViews || []) {
      const slug = view.page.replace("/blog/", "").split("/")[0];
      postViewCounts[slug] = (postViewCounts[slug] || 0) + 1;
    }

    // 인기 게시물 TOP 5
    const topPosts = Object.entries(postViewCounts)
      .map(([slug, views]) => {
        const post = (publishedPosts || []).find(
          (p: { slug: string }) => p.slug === slug
        );
        return {
          title: post?.title || slug,
          views,
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    return {
      postsPublished,
      totalViews,
      topPosts,
    };
  }

  /**
   * SEO 순위 데이터를 수집한다.
   */
  private async collectSeoData(
    clientId: string
  ): Promise<MonthlyReport["seo"]> {
    // 추적 키워드 조회
    const { data: keywords } = await this.supabase
      .from("keywords")
      .select("id, keyword")
      .eq("client_id", clientId)
      .in("source", ["homepage_seo", "blog_target"])
      .eq("status", "active");

    const keywordsTracked = keywords?.length || 0;

    // 최신 keyword_visibility 데이터 조회
    const keywordIds = (keywords || []).map((k: { id: string }) => k.id);

    if (keywordIds.length === 0) {
      return {
        keywordsTracked: 0,
        avgPosition: 0,
        topKeywords: [],
      };
    }

    const { data: visibilityData } = await this.supabase
      .from("keyword_visibility")
      .select("keyword_id, naver_rank, google_rank, date")
      .in("keyword_id", keywordIds)
      .order("date", { ascending: false })
      .limit(keywordIds.length * 2); // 최근 2일치

    // 키워드별 최신 순위
    const latestRanks: Record<
      string,
      { current: number; previous: number }
    > = {};

    for (const vis of visibilityData || []) {
      const kwId = vis.keyword_id;
      const rank = vis.naver_rank || vis.google_rank || 100;

      if (!latestRanks[kwId]) {
        latestRanks[kwId] = { current: rank, previous: rank };
      } else {
        latestRanks[kwId].previous = rank;
      }
    }

    // 평균 순위
    const ranks = Object.values(latestRanks).map((r) => r.current);
    const avgPosition =
      ranks.length > 0
        ? Math.round(
            (ranks.reduce((sum, r) => sum + r, 0) / ranks.length) * 10
          ) / 10
        : 0;

    // 주요 키워드 순위 (상위 10개)
    const topKeywords = (keywords || [])
      .map((kw: { id: string; keyword: string }) => {
        const rank = latestRanks[kw.id];
        return {
          keyword: kw.keyword,
          position: rank?.current || 0,
          change: rank ? rank.previous - rank.current : 0,
        };
      })
      .filter((k: { position: number }) => k.position > 0)
      .sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position
      )
      .slice(0, 10);

    return {
      keywordsTracked,
      avgPosition,
      topKeywords,
    };
  }

  /**
   * 상담 상태를 한글로 번역한다.
   */
  private translateStatus(status: string): string {
    const statusMap: Record<string, string> = {
      new: "신규",
      contacted: "연락 완료",
      consulting: "상담 중",
      contracted: "계약 완료",
      lost: "이탈",
    };
    return statusMap[status] || status;
  }
}
