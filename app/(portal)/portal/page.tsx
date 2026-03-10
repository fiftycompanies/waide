"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart2,
  CheckCircle2,
  Clock,
  FileText,
  Key,
  Lightbulb,
  Loader2,
  Phone,
  Rss,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";
import { getPortalDashboardV2 } from "@/lib/actions/portal-actions";

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
    keywords: { keyword_id: string; rank_pc: number | null; rank_mo: number | null; is_exposed: boolean }[];
  };
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

export default function PortalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    if (clientId) {
      getPortalDashboardV2(clientId).then((d) => {
        setData(d as DashboardData);
        setLoading(false);
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
    { key: "analysisComplete", label: "분석 완료", done: onboardingChecklist.analysisComplete },
    { key: "keywordsSet", label: "키워드 설정", done: onboardingChecklist.keywordsSet },
    { key: "blogConnected", label: "블로그 연결", done: onboardingChecklist.blogConnected },
    { key: "firstContent", label: "첫 콘텐츠 생성", done: onboardingChecklist.firstContent },
    { key: "firstPublish", label: "첫 발행 완료", done: onboardingChecklist.firstPublish },
  ];
  const completedCount = checklistItems.filter((i) => i.done).length;
  const progressPct = Math.round((completedCount / checklistItems.length) * 100);

  // 키워드 순위 요약 (TOP3/TOP10)
  const kwRankings = (data.latestAnalysis?.keyword_rankings ?? []) as Array<{ keyword: string; rank: number | null }>;
  const rankedKws = kwRankings.filter((k) => k.rank != null && k.rank > 0);
  const top3Count = rankedKws.filter((k) => k.rank! <= 3).length;
  const top10Count = rankedKws.filter((k) => k.rank! <= 10).length;
  const topKeywords = rankedKws
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ── 섹션 1: 환영 카드 ── */}
      <div className="rounded-xl border bg-gradient-to-r from-emerald-50 to-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요, {data.brandName || "고객"}님!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {daysSinceJoin
            ? `Waide와 함께한 지 ${daysSinceJoin}일째 운영 중이에요`
            : "마케팅 현황을 한눈에 확인하세요"}
        </p>
      </div>

      {/* ── 섹션 2: 빠른 액션 카드 ── */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/portal/keywords"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-white hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
        >
          <Key className="h-6 w-6 text-emerald-600" />
          <span className="text-sm font-medium text-gray-700">키워드 관리</span>
        </Link>
        <Link
          href="/portal/contents"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-white hover:bg-purple-50 hover:border-purple-200 transition-colors"
        >
          <FileText className="h-6 w-6 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">콘텐츠 현황</span>
        </Link>
        <Link
          href="/portal/blog"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-white hover:bg-blue-50 hover:border-blue-200 transition-colors"
        >
          <Rss className="h-6 w-6 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">블로그 관리</span>
        </Link>
      </div>

      {/* ── 섹션 3: 온보딩 체크리스트 ── */}
      {completedCount < checklistItems.length && (
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">시작 가이드</h2>
            <span className="text-sm text-emerald-600 font-medium">{completedCount}/{checklistItems.length} 완료</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="space-y-2.5">
            {checklistItems.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center ${item.done ? "bg-emerald-100" : "bg-gray-100"}`}>
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <span className={`text-sm ${item.done ? "text-gray-400 line-through" : "text-gray-700 font-medium"}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 섹션 4: 키워드 순위 현황 요약 ── */}
      {topKeywords.length > 0 && (
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2 text-gray-900 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold">키워드 순위 현황</h2>
          </div>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 rounded-lg bg-emerald-50 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{top3Count}</p>
              <p className="text-xs text-emerald-600">TOP 3</p>
            </div>
            <div className="flex-1 rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{top10Count}</p>
              <p className="text-xs text-blue-600">TOP 10</p>
            </div>
            <div className="flex-1 rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{rankedKws.length}</p>
              <p className="text-xs text-gray-500">전체 노출</p>
            </div>
          </div>
          <div className="space-y-2">
            {topKeywords.map((kw) => (
              <div key={kw.keyword} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <span className="text-sm text-gray-700">{kw.keyword}</span>
                <span className={`text-sm font-bold ${
                  kw.rank! <= 3 ? "text-emerald-600" : kw.rank! <= 10 ? "text-blue-600" : "text-gray-500"
                }`}>
                  {kw.rank}위
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border bg-white">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Key className="h-4 w-4 text-emerald-500" />
            활성 키워드
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {kpi.activeKeywords}개
          </p>
        </div>

        <div className="p-5 rounded-xl border bg-white">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <FileText className="h-4 w-4 text-purple-500" />
            이번 달 콘텐츠
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {kpi.monthlyContents}건
          </p>
        </div>

        <div className="p-5 rounded-xl border bg-white">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Sparkles className="h-4 w-4 text-violet-500" />
            AI 추천 대기
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {kpi.suggestedKeywords}개
          </p>
          {kpi.suggestedKeywords > 0 && (
            <p className="text-xs text-violet-600 mt-1">승인 대기 중</p>
          )}
        </div>

        <div className="p-5 rounded-xl border bg-white">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
            평균 QC 점수
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {kpi.avgQcScore !== null ? `${kpi.avgQcScore}점` : "-"}
          </p>
        </div>
      </div>

      {/* Point Balance Banner */}
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl border bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/60">
        <span className="text-lg">🪙</span>
        <span className="text-sm text-gray-700">
          잔여 포인트: <span className="font-bold text-amber-700">{data.pointBalance ?? 0}건</span>
        </span>
        <span className="text-xs text-gray-400 ml-auto">충전 문의: 담당자에게 연락하세요</span>
      </div>

      {/* AEO Score Card */}
      {data.aeoScore && data.aeoScore.score !== null && (
        <div className="rounded-xl border bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200/60 p-5">
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
            <div className="flex gap-3 mt-3">
              {Object.entries(data.aeoScore.byModel).map(([model, count]) => (
                <span key={model} className="text-xs text-gray-500">
                  {model === "perplexity" ? "Perplexity" : model === "claude" ? "Claude" : model === "chatgpt" ? "ChatGPT" : "Gemini"}: {count}회
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Marketing Score Card */}
      {data.latestAnalysis?.marketing_score != null && (
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2 text-gray-900 mb-4">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">마케팅 종합 점수</h2>
            {data.latestAnalysis.analyzed_at && (
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(data.latestAnalysis.analyzed_at).toLocaleDateString("ko-KR")} 분석
              </span>
            )}
          </div>
          <div className="flex items-center gap-6 mb-4">
            <div className="relative flex items-center justify-center h-20 w-20 shrink-0">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={data.latestAnalysis.marketing_score >= 70 ? "#10b981" : data.latestAnalysis.marketing_score >= 40 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${data.latestAnalysis.marketing_score} ${100 - data.latestAnalysis.marketing_score}`}
                />
              </svg>
              <span className="absolute text-lg font-bold text-gray-900">{data.latestAnalysis.marketing_score}</span>
            </div>
            <div className="flex-1 space-y-1.5">
              {(() => {
                const areas = [
                  { key: "review_reputation", label: "리뷰/평판", max: 20, color: "bg-emerald-500" },
                  { key: "naver_keyword", label: "키워드 노출", max: 25, color: "bg-blue-500" },
                  { key: "google_keyword", label: "구글 노출", max: 15, color: "bg-violet-500" },
                  { key: "image_quality", label: "이미지", max: 10, color: "bg-pink-500" },
                  { key: "online_channels", label: "채널 완성도", max: 15, color: "bg-amber-500" },
                  { key: "seo_aeo_readiness", label: "SEO 준비도", max: 15, color: "bg-cyan-500" },
                ];
                const breakdown = data.scoreBreakdown || {};
                return areas.map(({ key, label, max, color }) => {
                  const area = breakdown[key];
                  const score = area?.score ?? 0;
                  const areaMax = area?.max ?? max;
                  const pct = areaMax > 0 ? Math.min((score / areaMax) * 100, 100) : 0;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 w-16 shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-medium text-gray-600 w-10 text-right">{score}/{areaMax}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Brand Persona One-liner */}
      {data.brandPersona?.one_liner ? (
        <div className="rounded-xl border bg-gradient-to-r from-emerald-50 to-white p-5">
          <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium mb-2">
            <Sparkles className="h-4 w-4" />
            브랜드 한줄 정리
          </div>
          <p className="text-sm text-gray-700 font-medium">
            &ldquo;{data.brandPersona.one_liner}&rdquo;
          </p>
          {data.brandPersona.positioning && (
            <p className="text-xs text-gray-500 mt-2">{data.brandPersona.positioning}</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-gray-50 p-5 text-center">
          <Sparkles className="h-6 w-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">분석 준비 중입니다</p>
          <p className="text-xs text-gray-400 mt-1">브랜드 분석이 완료되면 맞춤 인사이트가 표시됩니다</p>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {(data.brandPersona?.strengths?.length || data.brandPersona?.weaknesses?.length) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.brandPersona?.strengths && data.brandPersona.strengths.length > 0 && (
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium mb-3">
                <TrendingUp className="h-4 w-4" />
                브랜드 강점
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.brandPersona.strengths.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs border border-emerald-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.brandPersona?.weaknesses && data.brandPersona.weaknesses.length > 0 && (
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-3">
                <Target className="h-4 w-4" />
                개선 영역
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.brandPersona.weaknesses.map((w, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs border border-amber-100">
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
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2 text-gray-900 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">AI 개선 제안</h2>
          </div>
          <div className="space-y-3">
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
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{action.title || action.action || "개선 항목"}</p>
                    {action.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                    )}
                    <div className="flex gap-2 mt-1">
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
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2 text-gray-900 mb-4">
            <BarChart2 className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">SEO 진단 코멘트</h2>
          </div>
          <div className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data.seoComments.priority_actions as any[]).slice(0, 3).map((action, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
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
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center gap-2 text-gray-900 mb-4">
          <Clock className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">최근 활동</h2>
        </div>
        {data.recentContents.length === 0 && data.recentKeywordActivity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">아직 활동 내역이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {/* Recent contents */}
            {data.recentContents.map((c) => {
              const st = statusLabels[c.status] || statusLabels.draft;
              return (
                <div key={`c-${c.id}`} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-purple-500" />
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
              <div key={`k-${k.id}`} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  k.status === "active" ? "bg-emerald-50" : "bg-gray-50"
                }`}>
                  <Target className={`h-4 w-4 ${k.status === "active" ? "text-emerald-500" : "text-gray-400"}`} />
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
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            담당 매니저
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {data.salesAgent.name}
              </p>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
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
          <p className="text-xs text-gray-400 mt-3">
            문의사항은 담당 매니저에게 연락하세요
          </p>
        </div>
      )}
    </div>
  );
}
