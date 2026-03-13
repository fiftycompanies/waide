"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Key,
  Lightbulb,
  Loader2,
  Phone,
  PenLine,
  Rss,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import {
  getPortalDashboardV2,
  getPortalHealthScore,
  getPortalUrgentBannerCondition,
  getPortalPublishStatusBreakdown,
  getPortalKeywordTop3WithDelta,
  getPortalRecommendedActions,
} from "@/lib/actions/portal-actions";
import KeywordOccupancySection from "@/components/portal/keyword-occupancy-section";
import AnalysisRequiredBanner from "@/components/portal/analysis-required-banner";
import NaverGoogleSection from "@/components/portal/dashboard/naver-google-section";
import { getPortalPlaceAndVisibilityData } from "@/lib/actions/portal-actions";
import { AlertTriangle, Activity, X } from "lucide-react";

interface KpiData {
  activeKeywords: number;
  monthlyContents: number;
  suggestedKeywords: number;
  avgQcScore: number | null;
}

interface RecentContent {
  id: string;
  title: string;
  keyword: string;
  status: string;
  date: string;
}

interface RecentKeywordActivity {
  id: string;
  keyword: string;
  status: string;
  date: string;
}

interface ScoreArea {
  score: number;
  max?: number;
  details?: string;
  detail?: string;
}

interface OnboardingChecklist {
  analysisComplete: boolean;
  keywordsSet: boolean;
  blogConnected: boolean;
  firstContent: boolean;
  firstPublish: boolean;
}

interface DashboardData {
  kpi: KpiData;
  latestAnalysis: {
    marketing_score: number;
    keyword_rankings: Array<{ keyword: string; rank: number | null }>;
    analyzed_at: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analysis_result?: any;
  } | null;
  scoreBreakdown: Record<string, ScoreArea> | null;
  brandName: string;
  clientCreatedAt: string | null;
  onboardingChecklist: OnboardingChecklist;
  brandPersona: {
    one_liner?: string;
    positioning?: string;
    strengths?: string[];
    weaknesses?: string[];
    tone?: string;
  } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  improvementPlan: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  seoComments: any;
  recentContents: RecentContent[];
  recentKeywordActivity: RecentKeywordActivity[];
  salesAgent: { name: string; phone: string; email: string } | null;
  subscription: { status: string; products: { name: string } | null } | null;
  pointBalance: number;
  aeoScore: {
    score: number | null;
    trend: number;
    byModel: Record<string, number>;
  } | null;
  keywordOccupancy: {
    total: number;
    exposed: number;
    keywords: { keyword_id: string; keyword?: string | null; rank_pc: number | null; rank_mo: number | null; is_exposed: boolean }[];
  };
}

interface HealthScoreData {
  totalScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  blog: { score: number };
  seo: { score: number };
  serp: { score: number };
  place: { score: number };
  prevMonthScore: number | null;
  delta: number | null;
}

interface UrgentBannerData {
  show: boolean;
  reason: "rank_drop" | "no_publish_14d" | "no_publish_this_month" | "low_quota";
  criticalKeywordId: string | null;
  message: string;
}

interface PublishStatus {
  published_count: number;
  scheduled_count: number;
  draft_count: number;
  remaining: number;
}

interface KeywordTop3Item {
  keyword_id: string;
  keyword: string;
  rank: number | null;
  rank_google: number | null;
  delta: number | null;
}

interface RecommendedAction {
  type: "serp_drop" | "no_publish" | "low_points" | "seo_low" | "add_keyword";
  keyword?: string;
  link: string;
  title: string;
  description: string;
}

// Mini sparkline SVG for keyword rows
function MiniSparkline({ data, width = 60, height = 20 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const validData = data.filter((v) => v > 0);
  if (validData.length < 2) return null;
  const minVal = Math.min(...validData);
  const maxVal = Math.max(...validData);
  const range = maxVal - minVal || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = v > 0 ? height - ((v - minVal) / range) * (height - 4) - 2 : height / 2;
    return `${x},${y}`;
  }).join(" ");
  const isUp = data[data.length - 1] < data[0]; // lower rank = better
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={isUp ? "#10b981" : "#ef4444"} strokeWidth="1.5" points={points} />
    </svg>
  );
}

const statusLabels: Record<string, { text: string; color: string }> = {
  published: { text: "발행됨", color: "bg-emerald-100 text-emerald-700" },
  approved: { text: "검수완료", color: "bg-blue-100 text-blue-700" },
  review: { text: "검토중", color: "bg-amber-100 text-amber-700" },
  draft: { text: "작성중", color: "bg-gray-100 text-gray-600" },
  rejected: { text: "반려", color: "bg-red-100 text-red-700" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

const actionIcons: Record<string, typeof TrendingDown> = {
  serp_drop: TrendingDown,
  no_publish: PenLine,
  low_points: Zap,
  seo_low: Search,
  add_keyword: Key,
};

const actionColors: Record<string, string> = {
  serp_drop: "text-red-500 bg-red-50",
  no_publish: "text-amber-500 bg-amber-50",
  low_points: "text-violet-500 bg-violet-50",
  seo_low: "text-blue-500 bg-blue-50",
  add_keyword: "text-emerald-500 bg-emerald-50",
};

export default function PortalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null);
  const [urgentBanner, setUrgentBanner] = useState<UrgentBannerData | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus | null>(null);
  const [kwTop3, setKwTop3] = useState<KeywordTop3Item[]>([]);
  const [recActions, setRecActions] = useState<RecommendedAction[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [placeData, setPlaceData] = useState<any>(null);

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const cid = el?.getAttribute("content") || "";
    setClientId(cid);
    if (cid) {
      // Check sessionStorage for banner dismissal
      const dismissedToday = sessionStorage.getItem("urgent_banner_dismissed");
      if (dismissedToday === new Date().toISOString().slice(0, 10)) {
        setBannerDismissed(true);
      }
      // Load all data in parallel
      Promise.all([
        getPortalDashboardV2(cid),
        getPortalHealthScore(cid).catch(() => null),
        getPortalUrgentBannerCondition(cid).catch(() => null),
        getPortalPublishStatusBreakdown(cid).catch(() => null),
        getPortalKeywordTop3WithDelta(cid).catch(() => []),
        getPortalPlaceAndVisibilityData(cid).catch(() => null),
      ]).then(([d, hs, ub, ps, top3, pd]) => {
        setData(d as DashboardData);
        if (hs) setHealthScore(hs as HealthScoreData);
        if (ub) setUrgentBanner(ub as UrgentBannerData);
        if (ps) setPublishStatus(ps as PublishStatus);
        setKwTop3((top3 || []) as KeywordTop3Item[]);
        if (pd) setPlaceData(pd);
        setLoading(false);
        // Load recommended actions after healthScore is available
        getPortalRecommendedActions(cid, hs as HealthScoreData | null)
          .then((actions) => setRecActions(actions))
          .catch(() => setRecActions([]));
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-4">
          <BarChart2 className="h-7 w-7 text-gray-400" />
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-1">데이터를 불러올 수 없습니다</p>
        <p className="text-sm text-gray-500">잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  const { kpi, onboardingChecklist } = data;

  // 가입일로부터 N일째 계산
  const daysSinceJoin = data.clientCreatedAt
    ? Math.max(1, Math.ceil((Date.now() - new Date(data.clientCreatedAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  // 온보딩 체크리스트 항목
  const checklistItems = [
    { key: "analysisComplete", label: onboardingChecklist.analysisComplete ? "네이버 플레이스 분석" : "네이버 플레이스 분석", desc: onboardingChecklist.analysisComplete ? undefined : "업체 URL을 등록하고 AI 분석을 시작하세요", done: onboardingChecklist.analysisComplete, href: onboardingChecklist.analysisComplete ? "#analysis" : "#analysis-start" },
    { key: "keywordsSet", label: "키워드 설정", desc: undefined as string | undefined, done: onboardingChecklist.keywordsSet, href: "/portal/keywords" },
    { key: "blogConnected", label: "블로그 연결", desc: undefined as string | undefined, done: onboardingChecklist.blogConnected, href: "/portal/blog" },
    { key: "firstContent", label: "첫 콘텐츠 생성", desc: undefined as string | undefined, done: onboardingChecklist.firstContent, href: "/portal/write" },
    { key: "firstPublish", label: onboardingChecklist.firstPublish ? "첫 발행 완료" : "첫 콘텐츠 발행하기", desc: onboardingChecklist.firstPublish ? undefined : "작성된 콘텐츠를 블로그에 발행하세요", done: onboardingChecklist.firstPublish, href: "/portal/contents" },
  ];
  const completedCount = checklistItems.filter((i) => i.done).length;
  const progressPct = Math.round((completedCount / checklistItems.length) * 100);

  // 키워드 순위 요약 (TOP3/TOP10) — 기존 유지
  const kwRankings = (data.latestAnalysis?.keyword_rankings ?? []) as Array<{ keyword: string; rank: number | null }>;
  const rankedKws = kwRankings.filter((k) => k.rank != null && k.rank > 0);
  const top3Count = rankedKws.filter((k) => k.rank! <= 3).length;
  const top10Count = rankedKws.filter((k) => k.rank! <= 10).length;

  return (
    <div className="space-y-4">
      {/* ── 섹션 1: 환영 카드 + 잔여 포인트 ── */}
      <div className="rounded-xl border bg-gradient-to-r from-emerald-50 to-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              안녕하세요, {data.brandName || "고객"}님!
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {daysSinceJoin
                ? `Waide와 함께한 지 ${daysSinceJoin}일째 운영 중이에요`
                : "마케팅 현황을 한눈에 확인하세요"}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 shrink-0">
            <span className="text-base">🪙</span>
            <span className="text-sm text-gray-700">
              잔여 포인트: <span className="font-bold text-amber-700">{data.pointBalance ?? 0}건</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 긴급 후킹 배너 ── */}
      {urgentBanner?.show && !bannerDismissed && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">{urgentBanner.message}</p>
          </div>
          {urgentBanner.criticalKeywordId && (
            <Link
              href={`/portal/blog/write?keyword_id=${urgentBanner.criticalKeywordId}&urgent=true`}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
            >
              지금 발행하기
            </Link>
          )}
          <button
            onClick={() => {
              setBannerDismissed(true);
              sessionStorage.setItem("urgent_banner_dismissed", new Date().toISOString().slice(0, 10));
            }}
            className="shrink-0 p-1 rounded hover:bg-red-100 transition-colors"
          >
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* ── 네이버/구글 현황 섹션 (Phase 4) ── */}
      {placeData && (
        <NaverGoogleSection
          keywords={placeData.keywords}
          primaryKeyword={placeData.primaryKeyword}
          placeRank={placeData.placeRank}
          placeHistory={placeData.placeHistory}
          visibilityByKeyword={placeData.visibilityByKeyword}
          brandName={data.brandName || ""}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CARD 01 + 02: 마케팅 건강 점수 + 이번 달 발행 현황 (2컬럼)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD 01 — 마케팅 건강 점수 */}
        {healthScore ? (
          <div className="rounded-xl border bg-white p-4">
            <p className="text-[10px] font-medium text-gray-400 tracking-wider mb-2">CARD 01 · 마케팅 건강 점수</p>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-sm font-bold ${
                  healthScore.grade === "A" ? "bg-emerald-100 text-emerald-700" :
                  healthScore.grade === "B" ? "bg-blue-100 text-blue-700" :
                  healthScore.grade === "C" ? "bg-amber-100 text-amber-700" :
                  healthScore.grade === "D" ? "bg-orange-100 text-orange-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {healthScore.grade}
                </span>
                <span className="text-2xl font-bold text-gray-900">{healthScore.totalScore}</span>
                <span className="text-sm text-gray-400">/100</span>
              </div>
              {healthScore.delta != null && (
                <span className={`text-xs font-medium mt-1 ${healthScore.delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  전월 대비 {healthScore.delta >= 0 ? "+" : ""}{healthScore.delta}점
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: "블로그", score: healthScore.blog.score, color: "bg-purple-500" },
                { label: "SEO", score: healthScore.seo.score, color: "bg-blue-500" },
                { label: "SERP", score: healthScore.serp.score, color: "bg-emerald-500" },
                { label: "플레이스", score: healthScore.place.score, color: "bg-amber-500" },
              ].map(({ label, score, color }) => (
                <div key={label} className="text-center">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-500">{label}</p>
                  <p className="text-xs font-bold text-gray-700">{score}</p>
                </div>
              ))}
            </div>
            <Link
              href="/portal/reports"
              className="block w-full text-center py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors"
            >
              점수 상세 보기 →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-4">
            <p className="text-[10px] font-medium text-gray-400 tracking-wider mb-2">CARD 01 · 마케팅 건강 점수</p>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Activity className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">분석 데이터를 준비 중입니다</p>
            </div>
          </div>
        )}

        {/* CARD 02 — 이번 달 발행 현황 */}
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[10px] font-medium text-gray-400 tracking-wider mb-2">CARD 02 · 이번 달 발행 현황</p>
          {publishStatus ? (
            <>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-center">
                  <p className="text-xl font-bold text-emerald-700">{publishStatus.published_count}</p>
                  <p className="text-[10px] text-emerald-600">발행완료</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-2 text-center">
                  <p className="text-xl font-bold text-blue-700">{publishStatus.scheduled_count}</p>
                  <p className="text-[10px] text-blue-600">예약대기</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2 text-center">
                  <p className="text-xl font-bold text-gray-700">{publishStatus.draft_count}</p>
                  <p className="text-[10px] text-gray-500">초안</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2 text-center">
                  <p className="text-xl font-bold text-amber-700">{publishStatus.remaining}</p>
                  <p className="text-[10px] text-amber-600">잔여</p>
                </div>
              </div>
              {publishStatus.remaining > 0 ? (
                <Link
                  href="/portal/blog/write"
                  className="block w-full text-center py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                >
                  새 글 쓰기
                </Link>
              ) : (
                <div className="block w-full text-center py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-medium cursor-not-allowed">
                  포인트 부족 · <Link href="/portal/settings" className="text-emerald-600 hover:underline">업그레이드</Link>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="rounded-lg bg-emerald-50 p-2 text-center">
                <p className="text-xl font-bold text-emerald-700">{kpi.monthlyContents}</p>
                <p className="text-[10px] text-emerald-600">이번달</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 text-center">
                <p className="text-xl font-bold text-blue-700">-</p>
                <p className="text-[10px] text-blue-600">예약대기</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2 text-center">
                <p className="text-xl font-bold text-gray-700">-</p>
                <p className="text-[10px] text-gray-500">초안</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 text-center">
                <p className="text-xl font-bold text-amber-700">{data.pointBalance ?? 0}</p>
                <p className="text-[10px] text-amber-600">잔여</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CARD 03: 키워드 순위 Top3 + delta
         ══════════════════════════════════════════════════════════════════ */}
      {kwTop3.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-medium text-gray-400 tracking-wider">CARD 03 · 키워드 순위 Top3</p>
            <Link href="/portal/serp" className="text-xs text-emerald-600 hover:underline">전체 보기 →</Link>
          </div>
          <div className="space-y-0">
            {kwTop3.map((kw) => {
              const isDrop = kw.delta !== null && kw.delta < -10;
              return (
                <div
                  key={kw.keyword_id}
                  className={`flex items-center gap-3 py-2.5 border-b last:border-0 ${isDrop ? "bg-red-50/60 -mx-4 px-4 rounded" : ""}`}
                >
                  <span className="text-sm text-gray-700 font-medium flex-1 min-w-0 truncate">{kw.keyword}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {kw.rank != null && (
                      <span className="text-xs text-gray-400" title="네이버">N</span>
                    )}
                    <span className={`text-sm font-bold ${
                      kw.rank != null && kw.rank <= 3 ? "text-emerald-600" :
                      kw.rank != null && kw.rank <= 10 ? "text-blue-600" : "text-gray-500"
                    }`}>
                      {kw.rank != null ? `${kw.rank}위` : "-"}
                    </span>
                  </div>
                  {kw.rank_google != null && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-gray-400" title="구글">G</span>
                      <span className="text-sm font-bold text-gray-500">{kw.rank_google}위</span>
                    </div>
                  )}
                  <div className="shrink-0 w-16 text-right">
                    {kw.delta != null ? (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                        kw.delta > 0 ? "bg-emerald-50 text-emerald-600" :
                        kw.delta < 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400"
                      }`}>
                        {kw.delta > 0 ? "▲" : kw.delta < 0 ? "▼" : "−"}{Math.abs(kw.delta)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300">-</span>
                    )}
                  </div>
                  <Link
                    href={`/portal/blog/write?keyword_id=${kw.keyword_id}`}
                    className="shrink-0 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium hover:bg-emerald-100 transition-colors"
                  >
                    발행
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CARD 04: 추천 액션 3개
         ══════════════════════════════════════════════════════════════════ */}
      {recActions.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[10px] font-medium text-gray-400 tracking-wider mb-3">CARD 04 · 추천 액션</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recActions.map((action, i) => {
              const Icon = actionIcons[action.type] || Lightbulb;
              const colorClass = actionColors[action.type] || "text-gray-500 bg-gray-50";
              const [iconColor, iconBg] = colorClass.split(" ");
              return (
                <div key={i} className="rounded-lg border p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${iconBg}`}>
                      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-800">{action.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 flex-1">{action.description}</p>
                  <Link
                    href={action.link}
                    className="block text-center py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-medium hover:bg-gray-100 transition-colors"
                  >
                    실행 →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CARD 05: 키워드 점유율 (기존 컴포넌트)
         ══════════════════════════════════════════════════════════════════ */}
      <KeywordOccupancySection data={data.keywordOccupancy} />

      {/* ── 온보딩 체크리스트 ── */}
      {completedCount < checklistItems.length && (
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">시작 가이드</h2>
            <span className="text-xs text-emerald-600 font-medium">{completedCount}/{checklistItems.length} 완료</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="space-y-2">
            {checklistItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-3 group"
                onClick={(e) => {
                  if (item.href.startsWith("#")) {
                    e.preventDefault();
                    const target = document.getElementById(item.href.slice(1));
                    target?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-emerald-100" : "bg-gray-100"}`}>
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${item.done ? "text-gray-400 line-through" : "text-gray-700 font-medium group-hover:underline"}`}>
                    {item.label}
                  </span>
                  {!item.done && item.desc && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  )}
                </div>
                {!item.done && (
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* AEO Score Card */}
      {data.aeoScore && data.aeoScore.score !== null && (
        <div className="rounded-xl border bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200/60 p-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Target className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-medium">AEO Visibility Score</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{data.aeoScore.score.toFixed(1)}</span>
            {data.aeoScore.trend !== 0 && (
              <span className={`text-sm font-medium ${data.aeoScore.trend > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {data.aeoScore.trend > 0 ? "+" : ""}{data.aeoScore.trend.toFixed(1)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">AI 엔진에서 브랜드가 언급되는 비율</p>
          {Object.keys(data.aeoScore.byModel).length > 0 && (
            <div className="flex gap-3 mt-2">
              {Object.entries(data.aeoScore.byModel).map(([model, count]) => (
                <span key={model} className="text-xs text-gray-500">
                  {model === "perplexity" ? "Perplexity" : model === "claude" ? "Claude" : model === "chatgpt" ? "ChatGPT" : "Gemini"}: {count}회
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brand Persona One-liner / Analysis Start */}
      {data.brandPersona?.one_liner ? (
        <div className="rounded-xl border bg-gradient-to-r from-emerald-50 to-white p-4">
          <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium mb-1">
            <Sparkles className="h-4 w-4" />
            브랜드 한줄 정리
          </div>
          <p className="text-sm text-gray-700 font-medium">
            &ldquo;{data.brandPersona.one_liner}&rdquo;
          </p>
          {data.brandPersona.positioning && (
            <p className="text-xs text-gray-500 mt-1">{data.brandPersona.positioning}</p>
          )}
        </div>
      ) : (
        <div id="analysis-start" className="rounded-xl border bg-white overflow-hidden">
          <AnalysisRequiredBanner clientId={clientId || undefined} />
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {(data.brandPersona?.strengths?.length || data.brandPersona?.weaknesses?.length) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.brandPersona?.strengths && data.brandPersona.strengths.length > 0 && (
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-medium mb-2">
                <TrendingUp className="h-3.5 w-3.5" />
                브랜드 강점
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.brandPersona.strengths.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs border border-emerald-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.brandPersona?.weaknesses && data.brandPersona.weaknesses.length > 0 && (
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-medium mb-2">
                <Target className="h-3.5 w-3.5" />
                개선 영역
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.brandPersona.weaknesses.map((w, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs border border-amber-100">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Improvement Suggestions (Top 3) */}
      {data.improvementPlan?.roadmap && (
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-900 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">AI 개선 제안</h2>
          </div>
          <div className="space-y-2">
            {(() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const roadmap = data.improvementPlan.roadmap as Record<string, any>;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const actions: any[] = [
                ...(roadmap.week1?.actions || []),
                ...(roadmap.month1?.actions || []),
              ].slice(0, 3);

              if (actions.length === 0) return <p className="text-sm text-gray-400">개선 제안을 준비 중입니다</p>;

              return actions.map((action, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50">
                  <div className="mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{action.title || action.action || "개선 항목"}</p>
                    {action.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                    )}
                    <div className="flex gap-2 mt-0.5">
                      {action.score_gain && (
                        <span className="text-xs text-emerald-600 font-medium">+{action.score_gain}점 예상</span>
                      )}
                      {action.effort && (
                        <span className="text-xs text-gray-400">{action.effort}</span>
                      )}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* SEO AI Comments */}
      {data.seoComments?.priority_actions && data.seoComments.priority_actions.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-900 mb-3">
            <BarChart2 className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold">SEO 진단 코멘트</h2>
          </div>
          <div className="space-y-1.5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data.seoComments.priority_actions as any[]).slice(0, 3).map((action, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5 border-b last:border-0">
                <span className={`mt-0.5 text-sm ${
                  action.status === "good" ? "text-emerald-500" : action.status === "warning" ? "text-amber-500" : "text-red-500"
                }`}>
                  {action.status === "good" ? "✓" : action.status === "warning" ? "△" : "✕"}
                </span>
                <div>
                  <p className="text-sm text-gray-800">{action.item}</p>
                  <p className="text-xs text-gray-500">{action.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Timeline */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2 text-gray-900 mb-3">
          <Clock className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold">최근 활동</h2>
        </div>
        {data.recentContents.length === 0 && data.recentKeywordActivity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">아직 활동 내역이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {/* Recent contents */}
            {data.recentContents.map((c) => {
              const st = statusLabels[c.status] || statusLabels.draft;
              return (
                <div key={`c-${c.id}`} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                  <div className="h-7 w-7 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{c.title || "제목 없음"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.keyword && (
                        <span className="text-xs text-gray-500">{c.keyword}</span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${st.color}`}>
                        {st.text}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.date)}</span>
                </div>
              );
            })}
            {/* Recent keyword activity */}
            {data.recentKeywordActivity.slice(0, 3).map((k) => (
              <div key={`k-${k.id}`} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                  k.status === "active" ? "bg-emerald-50" : "bg-gray-50"
                }`}>
                  <Target className={`h-3.5 w-3.5 ${k.status === "active" ? "text-emerald-500" : "text-gray-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{k.keyword}</p>
                  <p className="text-xs text-gray-500">
                    {k.status === "active" ? "키워드 승인됨" : "키워드 보관됨"}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{timeAgo(k.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sales Agent */}
      {data.salesAgent && (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            담당 매니저
          </h2>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {data.salesAgent.name}
              </p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                {data.salesAgent.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {data.salesAgent.phone}
                  </span>
                )}
                {data.salesAgent.email && (
                  <span>{data.salesAgent.email}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
