import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  getVisibilityKpi,
  getVisibilityTrend,
  getKeywordDistribution,
  getRecentActivities,
  getAccountPerformanceSummary,
  getOpsSerp,
  getBrandSummaryStats,
  type VisibilityKpi,
  type VisibilityTrendPoint,
  type KeywordDistribution,
  type RecentActivity,
  type AccountPerfSummary,
  type SerpDataPoint,
  type SerpKeyword,
  type BrandSummaryStats,
} from "@/lib/actions/analytics-actions";
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import { getBrandAnalysisKpi, type BrandAnalysisKpi } from "@/lib/actions/analysis-brand-actions";
import { VisibilityTrendChart } from "@/components/dashboard/visibility-trend-chart";
import { KeywordDonutChart } from "@/components/dashboard/keyword-donut-chart";
import { SerpRankChart } from "@/components/analytics/serp-rank-chart";

// ── 델타 배지 ────────────────────────────────────────────────────────────────
function DeltaBadge({ value, inverse = false, unit = "%" }: { value: number; inverse?: boolean; unit?: string }) {
  if (value === 0)
    return <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> 유지</span>;
  const isGood = inverse ? value < 0 : value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGood ? "text-emerald-600" : "text-red-500"}`}>
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}{unit}p
    </span>
  );
}

// ── KPI 카드 ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  delta,
  desc,
  color,
  urgent,
}: {
  icon: string;
  label: string;
  value: string;
  delta?: React.ReactNode;
  desc: string;
  color: string;
  urgent?: boolean;
}) {
  return (
    <Card className={`bg-gradient-to-br ${color} border ${urgent ? "ring-2 ring-red-400/40" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className="text-xl">{icon}</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {urgent && <Badge variant="destructive" className="text-[10px] mb-0.5">긴급</Badge>}
        </div>
        <div className="mt-1 flex items-center gap-2">
          {delta}
          <span className="text-xs text-muted-foreground">{desc}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── 활동 피드 ────────────────────────────────────────────────────────────────
function ActivityFeed({ activities }: { activities: RecentActivity[] }) {
  function relTime(at: string) {
    const diff = Date.now() - new Date(at).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (h < 1) return "방금";
    if (h < 24) return `${h}시간 전`;
    return `${d}일 전`;
  }

  const typeIcon = (type: RecentActivity["type"]) => {
    if (type === "job") return "⚙️";
    if (type === "content") return "📝";
    return "📊";
  };

  if (activities.length === 0)
    return <p className="text-xs text-muted-foreground text-center py-4">최근 활동 없음</p>;

  return (
    <div className="space-y-2">
      {activities.map((a, i) => (
        <div key={i} className="flex items-start gap-2.5 text-xs">
          <span className="text-base shrink-0 mt-0.5">{typeIcon(a.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{a.title}</p>
            <p className="text-muted-foreground">{a.detail}</p>
          </div>
          <span className="text-muted-foreground shrink-0 whitespace-nowrap">{relTime(a.at)}</span>
        </div>
      ))}
    </div>
  );
}

// ── 계정별 성과 테이블 ────────────────────────────────────────────────────────
function AccountPerfTable({ accounts }: { accounts: AccountPerfSummary[] }) {
  if (accounts.length === 0)
    return <p className="text-xs text-muted-foreground text-center py-4">데이터 없음</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 text-left font-medium">계정</th>
            <th className="py-2 text-center font-medium">발행</th>
            <th className="py-2 text-center font-medium">평균순위</th>
            <th className="py-2 text-center font-medium">TOP3</th>
            <th className="py-2 text-center font-medium">활성</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {accounts.slice(0, 5).map((a) => (
            <tr key={a.account_name} className="hover:bg-muted/20">
              <td className="py-2 font-medium truncate max-w-[120px]">{a.account_name}</td>
              <td className="py-2 text-center">{a.publish_count}</td>
              <td className="py-2 text-center text-muted-foreground">
                {a.avg_rank != null ? `${a.avg_rank}위` : "—"}
              </td>
              <td className="py-2 text-center">
                {a.top3_count > 0 ? (
                  <span className="font-semibold text-violet-600">{a.top3_count}</span>
                ) : "—"}
              </td>
              <td className="py-2 text-center">{a.active_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 브랜드별 요약 테이블 (전체 보기 모드) ────────────────────────────────────
function BrandSummaryTable({ brands }: { brands: BrandSummaryStats[] }) {
  if (brands.length === 0)
    return <p className="text-xs text-muted-foreground text-center py-4">등록된 브랜드 없음</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 text-left font-medium">브랜드</th>
            <th className="py-2 text-center font-medium">활성 키워드</th>
            <th className="py-2 text-center font-medium">발행 계정</th>
            <th className="py-2 text-center font-medium">이번달 콘텐츠</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {brands.map((b) => (
            <tr key={b.brand_id} className="hover:bg-muted/20">
              <td className="py-2 font-medium truncate max-w-[140px]">{b.brand_name}</td>
              <td className="py-2 text-center">{b.active_keywords > 0 ? <span className="font-semibold text-violet-600">{b.active_keywords}</span> : "—"}</td>
              <td className="py-2 text-center">{b.active_accounts > 0 ? b.active_accounts : "—"}</td>
              <td className="py-2 text-center">{b.content_this_month > 0 ? <span className="font-semibold text-emerald-600">{b.content_this_month}</span> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 대시보드 데이터 섹션 ─────────────────────────────────────────────────────
interface DashboardData {
  kpi: VisibilityKpi;
  trend: VisibilityTrendPoint[];
  distribution: KeywordDistribution;
  activities: RecentActivity[];
  accounts: AccountPerfSummary[];
  serpTrend: SerpDataPoint[];
  serpKeywords: SerpKeyword[];
  brandSummary?: BrandSummaryStats[];
  analysisKpi: BrandAnalysisKpi;
}

async function fetchDashboardData(clientId?: string): Promise<DashboardData> {
  const isAllMode = !clientId;
  const [kpi, trend, distribution, activities, accounts, serpData, brandSummary, analysisKpi] = await Promise.all([
    getVisibilityKpi(clientId),
    getVisibilityTrend(clientId, 30),
    getKeywordDistribution(clientId),
    getRecentActivities(clientId, 5),
    getAccountPerformanceSummary(clientId),
    getOpsSerp(clientId, 14),
    isAllMode ? getBrandSummaryStats() : Promise.resolve(undefined),
    getBrandAnalysisKpi(clientId),
  ]);
  return {
    kpi,
    trend,
    distribution,
    activities,
    accounts,
    serpTrend: serpData.trend,
    serpKeywords: serpData.keywords,
    brandSummary,
    analysisKpi,
  };
}

async function DashboardSection() {
  const clientId = (await getSelectedClientId()) ?? undefined;
  const isAllMode = !clientId;
  const data = await fetchDashboardData(clientId);
  const { kpi, trend, distribution, activities, accounts, serpTrend, serpKeywords, brandSummary, analysisKpi } = data;

  return (
    <div className="space-y-6">
      {/* ── KPI 카드 5개 ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon="📊"
          label="노출 점유율"
          value={kpi.totalKeywords === 0 ? "--" : `${kpi.weightedVisibilityPc.toFixed(1)}%`}
          delta={kpi.totalKeywords === 0 ? undefined : <DeltaBadge value={kpi.visibilityDelta} />}
          desc={kpi.totalKeywords === 0 ? "SERP 데이터 수집 중" : "vs 지난주 (가중 평균)"}
          color="from-violet-50 to-purple-50 border-violet-100"
        />
        <KpiCard
          icon="🎯"
          label="단순 노출률"
          value={kpi.totalKeywords === 0 ? "--" : `${kpi.exposureRate.toFixed(1)}%`}
          delta={kpi.totalKeywords === 0 ? undefined : <DeltaBadge value={kpi.exposureRateDelta} />}
          desc={kpi.totalKeywords === 0 ? "SERP 데이터 수집 중" : `${kpi.exposedKeywords}/${kpi.totalKeywords} 키워드`}
          color="from-blue-50 to-sky-50 border-blue-100"
        />
        <KpiCard
          icon="🏆"
          label="상위 3위"
          value={`${kpi.top3Count}개`}
          delta={<DeltaBadge value={kpi.top3Delta} unit="" />}
          desc="현재 1~3위 달성"
          color="from-amber-50 to-yellow-50 border-amber-100"
        />
        <KpiCard
          icon="📝"
          label="이번달 발행"
          value={`${kpi.contentPublishedMonth}건`}
          desc="당월 발행 콘텐츠"
          color="from-green-50 to-emerald-50 border-green-100"
        />
        <KpiCard
          icon="⚠️"
          label="순위 하락"
          value={`${kpi.decliningCount}개`}
          desc="7일내 5위↓ 이상"
          color="from-red-50 to-rose-50 border-red-100"
          urgent={kpi.decliningCount > 0}
        />
      </div>

      {/* ── 중단: 노출 추이 + SERP 순위 추이 ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <VisibilityTrendChart data={trend} />
        <SerpRankChart trend={serpTrend} keywords={serpKeywords} />
      </div>

      {/* ── 하단: 도넛 차트 + 활동 피드 + 계정별 성과 ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <KeywordDonutChart data={distribution} />

        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={activities} />
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">계정별 성과</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountPerfTable accounts={accounts} />
          </CardContent>
        </Card>
      </div>

      {/* ── 전체 보기 모드: 브랜드별 요약 ── */}
      {isAllMode && brandSummary && brandSummary.length > 0 && (
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">브랜드별 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <BrandSummaryTable brands={brandSummary} />
          </CardContent>
        </Card>
      )}

      {/* ── AI 분석 요약 (브랜드 선택 모드) ── */}
      {!isAllMode && analysisKpi.hasAnalysis && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">AI 분석 요약</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">마케팅 점수</p>
                <p className="text-3xl font-bold mt-1">{analysisKpi.marketingScore ?? "—"}<span className="text-lg font-normal text-muted-foreground">/100</span></p>
                {Object.keys(analysisKpi.scoreBreakdown).length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {[
                      { key: "review_reputation", label: "리뷰" },
                      { key: "naver_keyword", label: "네이버" },
                      { key: "google_keyword", label: "구글" },
                      { key: "image_quality", label: "이미지" },
                      { key: "online_channels", label: "채널" },
                      { key: "seo_aeo_readiness", label: "SEO" },
                    ].map(({ key, label }) => {
                      const area = analysisKpi.scoreBreakdown[key];
                      if (!area) return null;
                      const pctVal = area.max > 0 ? (area.score / area.max) * 100 : 0;
                      const barColor = pctVal >= 80 ? "bg-emerald-500" : pctVal >= 50 ? "bg-amber-500" : "bg-red-400";
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-10 shrink-0">{label}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pctVal}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{area.score}/{area.max}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">공략 키워드</p>
                <p className="text-2xl font-bold mt-1">{analysisKpi.totalKeywords}개</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {analysisKpi.topKeywords.slice(0, 3).map((k, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{k.keyword}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">리뷰 현황</p>
                <p className="text-2xl font-bold mt-1">{(analysisKpi.visitorReviews + analysisKpi.blogReviews).toLocaleString()}건</p>
                <p className="text-xs text-muted-foreground mt-1">방문자 {analysisKpi.visitorReviews.toLocaleString()} · 블로그 {analysisKpi.blogReviews.toLocaleString()}</p>
                {analysisKpi.topSellingPoint && <p className="text-xs mt-1 truncate">💬 {analysisKpi.topSellingPoint}</p>}
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-100">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">콘텐츠 전략</p>
                <p className="text-lg font-bold mt-1">{analysisKpi.postingFrequency ?? "—"}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {analysisKpi.contentTypes.map((t, i) => (
                    <Badge key={i} className="text-[10px] bg-purple-100 text-purple-700">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 키워드 TOP 5 테이블 */}
          {analysisKpi.topKeywords.length > 0 && (
            <Card className="border-border/40">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">공략 키워드 TOP 5</CardTitle>
                <a href={`/brands/${clientId}`} className="text-xs text-amber-600 hover:underline">상세 분석 보기 →</a>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 text-left font-medium">키워드</th>
                        <th className="py-2 text-right font-medium">월간 검색량</th>
                        <th className="py-2 text-center font-medium">우선순위</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {analysisKpi.topKeywords.map((k, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="py-2 font-medium">{k.keyword}</td>
                          <td className="py-2 text-right font-mono">{k.monthlySearch?.toLocaleString() ?? "—"}</td>
                          <td className="py-2 text-center">
                            <Badge className={`text-[10px] ${k.priority === "high" ? "bg-red-100 text-red-700" : k.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{k.priority}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── 브랜드 선택됐지만 분석 없음 ── */}
      {!isAllMode && !analysisKpi.hasAnalysis && (
        <Card className="border-dashed border-border/40">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">AI 분석을 실행하면 키워드 전략과 마케팅 점수를 확인할 수 있어요</p>
            <a href={`/brands/${clientId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:underline">분석하기 →</a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">
          노출 점유율 · SERP 순위 · 최근 활동 한눈에 확인
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardSection />
      </Suspense>
    </div>
  );
}
