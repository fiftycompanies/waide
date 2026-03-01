"use client";

import { useEffect, useState } from "react";
import {
  BarChart2,
  CheckCircle2,
  Clock,
  FileText,
  Key,
  Lightbulb,
  Loader2,
  Phone,
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

interface DashboardData {
  kpi: KpiData;
  latestAnalysis: {
    marketing_score: number;
    keyword_rankings: Array<{ keyword: string; rank: number | null }>;
    analyzed_at: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analysis_result?: any;
  } | null;
  brandName: string;
  brandPersona: {
    one_liner?: string;
    positioning?: string;
    strengths?: string[];
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
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  const { kpi } = data;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {data.brandName || "대시보드"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          마케팅 현황을 한눈에 확인하세요
        </p>
      </div>

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
