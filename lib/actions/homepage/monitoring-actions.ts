'use server';

import { createAdminClient } from '@/lib/supabase/service';
import {
  AnalyticsCollector,
  NotificationService,
  ReportGenerator,
  getDashboardData,
  getOpsOverviewData,
} from '@/lib/homepage/monitoring';
import type { AnalyticsPeriod, VisitStats, InquiryStats } from '@/lib/homepage/monitoring';
import type { DashboardData } from '@/lib/homepage/monitoring';
import type { MonthlyReport } from '@/lib/homepage/monitoring';

type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * 방문 통계 조회
 */
export async function getVisitStats(
  projectId: string,
  period: AnalyticsPeriod = 'month'
): Promise<ActionResult<VisitStats>> {
  try {
    const supabase = createAdminClient();
    const collector = new AnalyticsCollector(supabase);
    const stats = await collector.getVisitStats(projectId, period);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '방문 통계 조회에 실패했습니다.',
    };
  }
}

/**
 * 상담 통계 조회
 */
export async function getInquiryStats(
  projectId: string
): Promise<ActionResult<InquiryStats>> {
  try {
    const supabase = createAdminClient();
    const collector = new AnalyticsCollector(supabase);
    const stats = await collector.getInquiryStats(projectId);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '상담 통계 조회에 실패했습니다.',
    };
  }
}

/**
 * 전월 대비 성장률 조회
 */
export async function getMonthOverMonthGrowth(
  projectId: string
): Promise<ActionResult<{ visitsGrowth: number; inquiriesGrowth: number }>> {
  try {
    const supabase = createAdminClient();
    const collector = new AnalyticsCollector(supabase);
    const growth = await collector.getMonthOverMonthGrowth(projectId);

    return {
      success: true,
      data: growth,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '성장률 조회에 실패했습니다.',
    };
  }
}

/**
 * 대시보드 데이터 조회
 */
export async function getDashboardDataAction(
  projectId: string
): Promise<ActionResult<DashboardData>> {
  try {
    const supabase = createAdminClient();
    const data = await getDashboardData(projectId, supabase);

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '대시보드 데이터 조회에 실패했습니다.',
    };
  }
}

/**
 * 운영 총괄 데이터 조회
 */
export async function getOpsOverviewDataAction(): Promise<
  ActionResult<{
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
  }>
> {
  try {
    const supabase = createAdminClient();
    const data = await getOpsOverviewData(supabase);

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '운영 데이터 조회에 실패했습니다.',
    };
  }
}

/**
 * 월간 리포트 생성
 */
export async function generateMonthlyReport(
  projectId: string,
  year: number,
  month: number
): Promise<ActionResult<MonthlyReport>> {
  try {
    const supabase = createAdminClient();
    const collector = new AnalyticsCollector(supabase);
    const generator = new ReportGenerator(collector, supabase);

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const report = await generator.generateMonthlyReport(projectId, monthStr);

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '월간 리포트 생성에 실패했습니다.',
    };
  }
}

/**
 * 테스트 알림 발송
 */
export async function sendTestNotification(
  projectId: string
): Promise<ActionResult<{ message: string }>> {
  try {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!slackWebhookUrl) {
      return {
        success: false,
        error: 'Slack Webhook URL이 설정되지 않았습니다.',
      };
    }

    const notifier = new NotificationService(
      { webhookUrl: slackWebhookUrl, channel: '#homepage-alerts' },
      resendApiKey || ''
    );

    const result = await notifier.sendTestNotification('slack');

    return {
      success: result.success,
      data: { message: result.message },
      error: result.success ? undefined : result.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '테스트 알림 발송에 실패했습니다.',
    };
  }
}
