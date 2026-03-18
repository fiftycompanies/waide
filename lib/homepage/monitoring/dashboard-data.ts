import { SupabaseClient } from "@supabase/supabase-js";
import { AnalyticsCollector } from "./analytics-collector";

/**
 * 대시보드 KPI 데이터
 */
export interface DashboardKpis {
  /** 월간 방문수 */
  monthlyVisits: number;
  /** 월간 상담 접수 */
  monthlyInquiries: number;
  /** 전환율 (%) */
  conversionRate: number;
  /** 블로그 발행 수 */
  blogPosts: number;
  /** 전월 대비 방문수 증감률 (%) */
  visitsGrowth: number;
  /** 전월 대비 상담수 증감률 (%) */
  inquiriesGrowth: number;
}

/**
 * 대시보드 차트 데이터
 */
export interface DashboardCharts {
  /** 일별 방문 추이 (최근 30일) */
  dailyVisits: Array<{ date: string; visits: number }>;
  /** 상담 상태 분포 */
  inquiryStatus: Record<string, number>;
  /** 인기 페이지 TOP 10 */
  topPages: Array<{ path: string; views: number }>;
  /** 유입 경로 분포 */
  referrers: Array<{ source: string; count: number }>;
}

/**
 * 대시보드 전체 데이터
 */
export interface DashboardData {
  /** KPI 지표 */
  kpis: DashboardKpis;
  /** 차트 데이터 */
  charts: DashboardCharts;
}

/**
 * 프로젝트별 대시보드 데이터를 조회한다.
 *
 * 어드민 대시보드에 필요한 모든 KPI와 차트 데이터를
 * 한 번의 호출로 집계하여 반환한다.
 *
 * @param projectId - 대상 프로젝트 ID
 * @param supabase - Supabase 클라이언트
 * @returns KPI 지표와 차트 데이터
 *
 * @example
 * ```ts
 * const data = await getDashboardData("project-uuid", supabase);
 * console.log(data.kpis.monthlyVisits); // 1234
 * console.log(data.charts.dailyVisits); // [{ date: "2026-03-01", visits: 42 }, ...]
 * ```
 */
export async function getDashboardData(
  projectId: string,
  supabase: SupabaseClient
): Promise<DashboardData> {
  const analytics = new AnalyticsCollector(supabase);

  // 병렬로 모든 데이터 수집
  const [visitStats, inquiryStats, growthData, blogStats] = await Promise.all([
    analytics.getVisitStats(projectId, "month"),
    analytics.getInquiryStats(projectId),
    analytics.getMonthOverMonthGrowth(projectId),
    getBlogPostCount(projectId, supabase),
  ]);

  // KPI 계산
  const conversionRate =
    visitStats.totalVisits > 0
      ? Math.round(
          (inquiryStats.total / visitStats.totalVisits) * 10000
        ) / 100
      : 0;

  const kpis: DashboardKpis = {
    monthlyVisits: visitStats.totalVisits,
    monthlyInquiries: inquiryStats.total,
    conversionRate,
    blogPosts: blogStats,
    visitsGrowth: growthData.visitsGrowth,
    inquiriesGrowth: growthData.inquiriesGrowth,
  };

  // 차트 데이터 구성
  const topPages = Object.entries(visitStats.pageViews)
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const referrers = Object.entries(visitStats.referrers)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const charts: DashboardCharts = {
    dailyVisits: visitStats.dailyTrend,
    inquiryStatus: inquiryStats.byStatus,
    topPages,
    referrers,
  };

  return { kpis, charts };
}

/**
 * 운영 대시보드 전체 데이터를 조회한다.
 *
 * 모든 라이브 프로젝트의 KPI를 집계하여
 * 운영팀이 전체 현황을 파악할 수 있는 데이터를 제공한다.
 *
 * @param supabase - Supabase 클라이언트
 * @returns 전체 프로젝트 집계 데이터
 */
export async function getOpsOverviewData(
  supabase: SupabaseClient
): Promise<{
  totalLiveProjects: number;
  totalVisits: number;
  totalInquiries: number;
  avgConversionRate: number;
  projects: Array<{
    id: string;
    name: string;
    subdomain: string;
    status: string;
    visits: number;
    inquiries: number;
    conversionRate: number;
    lastDeployedAt: string | null;
  }>;
}> {
  // 라이브 프로젝트 목록 조회
  const { data: projects, error } = await supabase
    .from("homepage_projects")
    .select(
      "id, project_name, subdomain, status, total_visits, total_inquiries, last_deployed_at"
    )
    .in("status", ["live", "preview"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`프로젝트 목록 조회 실패: ${error.message}`);
  }

  const liveProjects = projects || [];
  const totalLiveProjects = liveProjects.length;

  // 집계
  let totalVisits = 0;
  let totalInquiries = 0;

  const projectSummaries = liveProjects.map((project) => {
    const visits = project.total_visits || 0;
    const inquiries = project.total_inquiries || 0;
    totalVisits += visits;
    totalInquiries += inquiries;

    const conversionRate =
      visits > 0 ? Math.round((inquiries / visits) * 10000) / 100 : 0;

    return {
      id: project.id,
      name: project.project_name,
      subdomain: project.subdomain || "",
      status: project.status,
      visits,
      inquiries,
      conversionRate,
      lastDeployedAt: project.last_deployed_at,
    };
  });

  // 평균 전환율
  const projectsWithVisits = projectSummaries.filter((p) => p.visits > 0);
  const avgConversionRate =
    projectsWithVisits.length > 0
      ? Math.round(
          (projectsWithVisits.reduce((sum, p) => sum + p.conversionRate, 0) /
            projectsWithVisits.length) *
            100
        ) / 100
      : 0;

  return {
    totalLiveProjects,
    totalVisits,
    totalInquiries,
    avgConversionRate,
    projects: projectSummaries,
  };
}

/**
 * 담당자별 상담 처리 현황을 조회한다.
 *
 * @param supabase - Supabase 클라이언트
 * @returns 담당자별 상담 건수 및 처리율
 */
export async function getAssigneeStats(
  supabase: SupabaseClient
): Promise<
  Array<{
    assigneeId: string | null;
    assigneeName: string;
    total: number;
    completed: number;
    completionRate: number;
  }>
> {
  const { data: inquiries, error } = await supabase
    .from("homepage_inquiries")
    .select("assigned_to, status");

  if (error) {
    throw new Error(`상담 현황 조회 실패: ${error.message}`);
  }

  const allInquiries = inquiries || [];

  // 담당자별 집계
  const assigneeMap: Record<
    string,
    { total: number; completed: number }
  > = {};

  for (const inquiry of allInquiries) {
    const assigneeId = inquiry.assigned_to || "unassigned";

    if (!assigneeMap[assigneeId]) {
      assigneeMap[assigneeId] = { total: 0, completed: 0 };
    }

    assigneeMap[assigneeId].total++;

    if (
      inquiry.status === "contracted" ||
      inquiry.status === "lost"
    ) {
      assigneeMap[assigneeId].completed++;
    }
  }

  return Object.entries(assigneeMap).map(([assigneeId, stats]) => ({
    assigneeId: assigneeId === "unassigned" ? null : assigneeId,
    assigneeName: assigneeId === "unassigned" ? "미배정" : assigneeId,
    total: stats.total,
    completed: stats.completed,
    completionRate:
      stats.total > 0
        ? Math.round((stats.completed / stats.total) * 10000) / 100
        : 0,
  }));
}

/**
 * 프로젝트의 블로그 발행 수를 조회한다. (이번 달)
 */
async function getBlogPostCount(
  projectId: string,
  supabase: SupabaseClient
): Promise<number> {
  const { data: project } = await supabase
    .from("homepage_projects")
    .select("client_id")
    .eq("id", projectId)
    .single();

  if (!project) return 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { count } = await supabase
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", project.client_id)
    .in("content_type", ["hp_blog_info", "hp_blog_review"])
    .eq("publish_status", "published")
    .gte("published_at", monthStart.toISOString());

  return count || 0;
}
