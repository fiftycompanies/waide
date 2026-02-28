"use client";

import { useEffect, useState } from "react";
import {
  BarChart2,
  CheckCircle2,
  FileText,
  Key,
  Lightbulb,
  Loader2,
  Phone,
  Sparkles,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";
import { getPortalDashboard } from "@/lib/actions/portal-actions";

interface DashboardData {
  latestAnalysis: {
    marketing_score: number;
    keyword_rankings: Array<{ keyword: string; rank: number | null }>;
    analyzed_at: string;
  } | null;
  contentCount: number;
  monthlyContentCount: number;
  subscription: {
    status: string;
    products: { name: string } | null;
  } | null;
  salesAgent: { name: string; phone: string; email: string } | null;
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
}

export default function PortalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // clientId는 layout에서 확인됨, 여기서는 server action이 처리
    // 실제로는 clientId를 prop으로 받아야 하지만,
    // 포털 레이아웃에서 검증된 상태이므로 window의 meta에서 추출
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    if (clientId) {
      getPortalDashboard(clientId).then((d) => {
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

  const score = data?.latestAnalysis?.marketing_score ?? 0;
  const rankings = data?.latestAnalysis?.keyword_rankings ?? [];
  const top3Count = rankings.filter((kr) => kr.rank && kr.rank <= 3).length;
  const top10Count = rankings.filter((kr) => kr.rank && kr.rank <= 10).length;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {data?.brandName || "대시보드"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          마케팅 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* Score + KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Marketing Score */}
        <div className="col-span-2 lg:col-span-1 p-6 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <p className="text-emerald-100 text-sm font-medium">마케팅 종합 점수</p>
          <p className="text-4xl font-bold mt-2">{score}</p>
          <p className="text-emerald-200 text-sm mt-1">/100점</p>
        </div>

        {/* Place Ranking */}
        <div className="p-5 rounded-xl border bg-white">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
            플레이스 TOP 3
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{top3Count}개</p>
          <p className="text-xs text-gray-400 mt-1">
            {rankings.length}개 키워드 중
          </p>
        </div>

        {/* Top 10 Keywords */}
        <div className="p-5 rounded-xl border bg-white">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            TOP 10 키워드
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{top10Count}개</p>
          <p className="text-xs text-gray-400 mt-1">상위 노출 중</p>
        </div>

        {/* Monthly Content */}
        <div className="p-5 rounded-xl border bg-white">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <FileText className="h-4 w-4 text-purple-500" />
            이번 달 발행
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {data?.monthlyContentCount ?? 0}건
          </p>
          <p className="text-xs text-gray-400 mt-1">
            총 {data?.contentCount ?? 0}건 발행
          </p>
        </div>
      </div>

      {/* Brand Persona One-liner */}
      {data?.brandPersona?.one_liner && (
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
      )}

      {/* Improvement Suggestions (Top 3) */}
      {data?.improvementPlan?.roadmap && (
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2 text-gray-900 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">AI 개선 제안</h2>
          </div>
          <div className="space-y-3">
            {(() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const roadmap = data.improvementPlan.roadmap as Record<string, any>;
              // week1 액션 먼저, 없으면 month1에서 가져옴
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

      {/* SEO AI Comments (Priority Actions) */}
      {data?.seoComments?.priority_actions && data.seoComments.priority_actions.length > 0 && (
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

      {/* Keyword Rankings Summary */}
      {rankings.length > 0 && (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            키워드 순위 현황
          </h2>
          <div className="space-y-3">
            {rankings.map((kr, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <span className="text-sm text-gray-700">{kr.keyword}</span>
                <span
                  className={`text-sm font-bold ${
                    kr.rank && kr.rank <= 3
                      ? "text-emerald-600"
                      : kr.rank && kr.rank <= 10
                        ? "text-blue-600"
                        : "text-gray-400"
                  }`}
                >
                  {kr.rank ? `${kr.rank}위` : "미노출"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales Agent */}
      {data?.salesAgent && (
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

      {/* Subscription info */}
      {data?.subscription && (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            구독 정보
          </h2>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              {data.subscription.status === "active" ? "활성" : data.subscription.status}
            </span>
            <span className="text-sm text-gray-600">
              {data.subscription.products?.name || "기본 플랜"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
