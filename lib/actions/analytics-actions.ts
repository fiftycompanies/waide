"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Analytics record type
export interface AnalyticsRecord {
  id: string;
  content_id: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  date: string;
  created_at: string;
}

// KPI data type
export interface AnalyticsKPIs {
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalClicks: number;
  engagementRate: number;
  avgDailyImpressions: number;
}

// Chart data type
export interface ChartDataPoint {
  date: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
}

// Top post type
export interface TopPost {
  id: string;
  topic: string;
  caption: string;
  totalLikes: number;
  totalComments: number;
  totalImpressions: number;
}

/**
 * Helper: Get authenticated user's workspace ID
 */
async function getAuthWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return (membership as { workspace_id: string } | null)?.workspace_id || null;
}

/**
 * Generate mock analytics data for testing
 */
export async function generateMockAnalytics(): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    console.log("[Analytics] Starting mock data generation...");

    const workspaceId = await getAuthWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    const supabase = await createClient();

    // Get all contents for this workspace
    const { data: contentsData, error: contentsError } = await supabase
      .from("contents")
      .select("id")
      .eq("workspace_id", workspaceId);

    if (contentsError) {
      console.error("[Analytics] Contents fetch error:", contentsError);
      return { success: false, error: "콘텐츠를 불러오는데 실패했습니다." };
    }

    const contents = contentsData as { id: string }[] | null;

    if (!contents || contents.length === 0) {
      return { success: false, error: "분석할 콘텐츠가 없습니다. 먼저 콘텐츠를 생성해주세요." };
    }

    // Delete existing analytics data for this workspace's contents
    const contentIds = contents.map((c) => c.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("analytics").delete().in("content_id", contentIds);

    // Generate mock data for the last 30 days
    const analyticsRecords: Array<{
      content_id: string;
      impressions: number;
      likes: number;
      comments: number;
      shares: number;
      clicks: number;
      date: string;
    }> = [];

    const today = new Date();

    for (const content of contents) {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // Generate random but realistic-looking data
        const dayMultiplier = 1 + (29 - i) * 0.03;
        const baseImpressions = Math.floor(Math.random() * 500 + 100) * dayMultiplier;
        const impressions = Math.floor(baseImpressions);
        const likes = Math.floor(impressions * (Math.random() * 0.08 + 0.02));
        const comments = Math.floor(likes * (Math.random() * 0.3 + 0.05));
        const shares = Math.floor(likes * (Math.random() * 0.2 + 0.02));
        const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));

        analyticsRecords.push({
          content_id: content.id,
          impressions,
          likes,
          comments,
          shares,
          clicks,
          date: date.toISOString().split("T")[0],
        });
      }
    }

    // Insert all analytics records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from("analytics")
      .insert(analyticsRecords);

    if (insertError) {
      console.error("[Analytics] Insert error:", insertError);
      return { success: false, error: `데이터 생성 실패: ${insertError.message}` };
    }

    console.log(`[Analytics] ✅ Generated ${analyticsRecords.length} mock records`);

    revalidatePath("/analytics");
    return { success: true, count: analyticsRecords.length };
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}

/**
 * Get analytics data for the dashboard
 */
export async function getAnalyticsData(): Promise<{
  success: boolean;
  kpis?: AnalyticsKPIs;
  chartData?: ChartDataPoint[];
  topPosts?: TopPost[];
  error?: string;
}> {
  try {
    const workspaceId = await getAuthWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    const supabase = await createClient();

    // Content type for this query
    type ContentRow = { id: string; topic: string; caption: string };

    // Get content IDs for this workspace
    const { data: contentsRaw } = await supabase
      .from("contents")
      .select("id, topic, caption")
      .eq("workspace_id", workspaceId);

    const contents = contentsRaw as ContentRow[] | null;

    if (!contents || contents.length === 0) {
      return {
        success: true,
        kpis: {
          totalImpressions: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalClicks: 0,
          engagementRate: 0,
          avgDailyImpressions: 0,
        },
        chartData: [],
        topPosts: [],
      };
    }

    const contentIds = contents.map((c) => c.id);

    // Get all analytics data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: analyticsRaw, error: analyticsError } = await (supabase as any)
      .from("analytics")
      .select("*")
      .in("content_id", contentIds)
      .order("date", { ascending: true });

    if (analyticsError) {
      console.error("[Analytics] Fetch error:", analyticsError);
      return { success: false, error: "분석 데이터를 불러오는데 실패했습니다." };
    }

    const analytics = analyticsRaw as AnalyticsRecord[] | null;

    if (!analytics || analytics.length === 0) {
      return {
        success: true,
        kpis: {
          totalImpressions: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalClicks: 0,
          engagementRate: 0,
          avgDailyImpressions: 0,
        },
        chartData: [],
        topPosts: [],
      };
    }

    // Calculate KPIs
    const totalImpressions = analytics.reduce((sum, a) => sum + (a.impressions || 0), 0);
    const totalLikes = analytics.reduce((sum, a) => sum + (a.likes || 0), 0);
    const totalComments = analytics.reduce((sum, a) => sum + (a.comments || 0), 0);
    const totalShares = analytics.reduce((sum, a) => sum + (a.shares || 0), 0);
    const totalClicks = analytics.reduce((sum, a) => sum + (a.clicks || 0), 0);

    const totalEngagement = totalLikes + totalComments + totalShares;
    const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

    const uniqueDates = new Set(analytics.map((a) => a.date));
    const avgDailyImpressions = uniqueDates.size > 0 ? totalImpressions / uniqueDates.size : 0;

    const kpis: AnalyticsKPIs = {
      totalImpressions,
      totalLikes,
      totalComments,
      totalShares,
      totalClicks,
      engagementRate: Math.round(engagementRate * 100) / 100,
      avgDailyImpressions: Math.round(avgDailyImpressions),
    };

    // Aggregate chart data by date
    const chartDataMap = new Map<string, ChartDataPoint>();

    for (const record of analytics) {
      const existing = chartDataMap.get(record.date);
      if (existing) {
        existing.impressions += record.impressions || 0;
        existing.likes += record.likes || 0;
        existing.comments += record.comments || 0;
        existing.shares += record.shares || 0;
      } else {
        chartDataMap.set(record.date, {
          date: record.date,
          impressions: record.impressions || 0,
          likes: record.likes || 0,
          comments: record.comments || 0,
          shares: record.shares || 0,
          engagement: 0,
        });
      }
    }

    const chartData = Array.from(chartDataMap.values()).map((point) => ({
      ...point,
      engagement: point.likes + point.comments + point.shares,
    }));

    chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate top posts
    const postStats = new Map<string, { likes: number; comments: number; impressions: number }>();

    for (const record of analytics) {
      const existing = postStats.get(record.content_id);
      if (existing) {
        existing.likes += record.likes || 0;
        existing.comments += record.comments || 0;
        existing.impressions += record.impressions || 0;
      } else {
        postStats.set(record.content_id, {
          likes: record.likes || 0,
          comments: record.comments || 0,
          impressions: record.impressions || 0,
        });
      }
    }

    const topPosts: TopPost[] = contents
      .map((content) => {
        const stats = postStats.get(content.id) || { likes: 0, comments: 0, impressions: 0 };
        return {
          id: content.id,
          topic: content.topic,
          caption: content.caption,
          totalLikes: stats.likes,
          totalComments: stats.comments,
          totalImpressions: stats.impressions,
        };
      })
      .sort((a, b) => b.totalLikes - a.totalLikes)
      .slice(0, 5);

    return {
      success: true,
      kpis,
      chartData,
      topPosts,
    };
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}
