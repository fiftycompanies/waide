"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  MousePointer,
  TrendingUp,
  BarChart3,
  Sparkles,
  RefreshCw,
  Loader2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import {
  generateMockAnalytics,
  getAnalyticsData,
  type AnalyticsKPIs,
  type ChartDataPoint,
  type TopPost,
} from "@/lib/actions/analytics-actions";

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

// Format date for chart
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// KPI Card Component
function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  description?: string;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 ${color}`}
      />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color.replace("bg-", "text-")}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold">{value}</div>
          {trend !== undefined && trend !== 0 && (
            <Badge
              variant={trend > 0 ? "default" : "destructive"}
              className="text-xs"
            >
              {trend > 0 ? (
                <ArrowUp className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Empty State Component
function EmptyState({ onGenerate, isLoading }: { onGenerate: () => void; isLoading: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-6 mb-6">
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">아직 분석 데이터가 없습니다</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Mock 데이터를 생성하여 분석 대시보드를 미리 체험해보세요.
          <br />
          실제 소셜 미디어 연동 후에는 실시간 데이터가 표시됩니다.
        </p>
        <Button onClick={onGenerate} disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              🎲 Mock 데이터 생성하기
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Top Posts Component
function TopPostsCard({ posts }: { posts: TopPost[] }) {
  const router = useRouter();

  if (posts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          인기 콘텐츠 TOP 5
        </CardTitle>
        <CardDescription>가장 많은 좋아요를 받은 콘텐츠</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {posts.map((post, index) => (
            <div
              key={post.id}
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => router.push(`/campaigns/${post.id}`)}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0
                    ? "bg-yellow-500 text-white"
                    : index === 1
                    ? "bg-gray-400 text-white"
                    : index === 2
                    ? "bg-amber-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{post.topic || "제목 없음"}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {post.caption?.slice(0, 60)}...
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {formatNumber(post.totalImpressions)}
                </span>
                <span className="flex items-center gap-1 text-rose-500">
                  <Heart className="h-4 w-4" />
                  {formatNumber(post.totalLikes)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Custom Tooltip for Charts
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<AnalyticsKPIs | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Load analytics data
  const loadData = async () => {
    setIsLoading(true);
    const result = await getAnalyticsData();
    if (result.success) {
      setKpis(result.kpis || null);
      setChartData(result.chartData || []);
      setTopPosts(result.topPosts || []);
    } else {
      toast.error(result.error || "데이터를 불러오는데 실패했습니다.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate mock data
  const handleGenerateMock = () => {
    startTransition(async () => {
      const result = await generateMockAnalytics();
      if (result.success) {
        toast.success(`✅ ${result.count}개의 Mock 데이터가 생성되었습니다!`);
        loadData();
      } else {
        toast.error(result.error || "데이터 생성에 실패했습니다.");
      }
    });
  };

  // Format chart data for display
  const formattedChartData = chartData.map((point) => ({
    ...point,
    date: formatDate(point.date),
  }));

  const hasData = chartData.length > 0;

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-violet-500" />
            Performance Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            마케팅 성과를 한눈에 확인하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Button onClick={handleGenerateMock} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                🎲 Mock 데이터 생성
              </>
            )}
          </Button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState onGenerate={handleGenerateMock} isLoading={isPending} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <KPICard
              title="총 노출수"
              value={formatNumber(kpis?.totalImpressions || 0)}
              icon={Eye}
              color="bg-blue-500"
              description="전체 기간 누적"
            />
            <KPICard
              title="총 좋아요"
              value={formatNumber(kpis?.totalLikes || 0)}
              icon={Heart}
              color="bg-rose-500"
              description="전체 기간 누적"
            />
            <KPICard
              title="총 댓글"
              value={formatNumber(kpis?.totalComments || 0)}
              icon={MessageCircle}
              color="bg-green-500"
              description="전체 기간 누적"
            />
            <KPICard
              title="총 공유"
              value={formatNumber(kpis?.totalShares || 0)}
              icon={Share2}
              color="bg-purple-500"
              description="전체 기간 누적"
            />
            <KPICard
              title="참여율"
              value={`${kpis?.engagementRate || 0}%`}
              icon={TrendingUp}
              color="bg-orange-500"
              description="(좋아요+댓글+공유) / 노출"
            />
          </div>

          <Separator />

          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Area Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>노출수 & 참여 트렌드</CardTitle>
                <CardDescription>최근 30일간 성과 추이</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedChartData}>
                      <defs>
                        <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={formatNumber}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="impressions"
                        name="노출수"
                        stroke="#8b5cf6"
                        fillOpacity={1}
                        fill="url(#colorImpressions)"
                      />
                      <Area
                        type="monotone"
                        dataKey="engagement"
                        name="참여수"
                        stroke="#f97316"
                        fillOpacity={1}
                        fill="url(#colorEngagement)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>참여 유형별 분포</CardTitle>
                <CardDescription>좋아요, 댓글, 공유 비교</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={formattedChartData.slice(-7)}
                      layout="horizontal"
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={formatNumber}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="likes" name="좋아요" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="comments" name="댓글" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="shares" name="공유" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Posts */}
          <TopPostsCard posts={topPosts} />
        </>
      )}
    </div>
  );
}
