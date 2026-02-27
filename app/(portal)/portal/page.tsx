"use client";

import { useEffect, useState } from "react";
import {
  BarChart2,
  FileText,
  Key,
  Loader2,
  Phone,
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
