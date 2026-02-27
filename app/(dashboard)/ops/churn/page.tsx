"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Phone, Shield, TrendingDown } from "lucide-react";
import {
  getBusinessDashboardData,
  type AtRiskClient,
  type BusinessDashboardData,
} from "@/lib/actions/dashboard-actions";

export default function ChurnPage() {
  const [data, setData] = useState<BusinessDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getBusinessDashboardData();
      setData(result);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { kpi, atRiskClients, statusDistribution } = data;
  const retentionRate = kpi.activeClients > 0
    ? ((1 - kpi.churnRate / 100) * 100).toFixed(1)
    : "100.0";

  // cancelled this month count from status distribution
  const churnedThisMonth = statusDistribution.churned; // approximate

  const highRisk = atRiskClients.filter((c) => c.severity === "high");
  const mediumRisk = atRiskClients.filter((c) => c.severity === "medium");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">이탈 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          At Risk 고객을 조기 식별하고 이탈을 방지합니다
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-5 rounded-lg border bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">At Risk</p>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{atRiskClients.length}개</p>
          <p className="text-xs text-muted-foreground mt-1">즉시 조치 필요</p>
        </div>
        <div className="p-5 rounded-lg border bg-gradient-to-br from-red-50 to-rose-50 border-red-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">이탈률</p>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{kpi.churnRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">이번 달</p>
        </div>
        <div className="p-5 rounded-lg border bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">리텐션율</p>
            <Shield className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{retentionRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">이번 달</p>
        </div>
      </div>

      {/* At Risk - High */}
      {highRisk.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="text-red-500">🔴</span> 위험도: 높음
          </h2>
          <div className="space-y-3">
            {highRisk.map((c) => (
              <AtRiskCard key={c.id} client={c} />
            ))}
          </div>
        </div>
      )}

      {/* At Risk - Medium */}
      {mediumRisk.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="text-amber-500">🟡</span> 위험도: 중간
          </h2>
          <div className="space-y-3">
            {mediumRisk.map((c) => (
              <AtRiskCard key={c.id} client={c} />
            ))}
          </div>
        </div>
      )}

      {atRiskClients.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium">모든 고객이 안정 상태입니다</p>
          <p className="text-xs mt-1">At Risk 조건에 해당하는 고객이 없습니다</p>
        </div>
      )}
    </div>
  );
}

function AtRiskCard({ client }: { client: AtRiskClient }) {
  const recommendedAction = client.severity === "high"
    ? "긴급 미팅 요청, 개선 리포트 발송"
    : "콘텐츠 발행 가속, 순위 원인 분석";

  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{client.brand_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{client.reasons.join(" · ")}</p>
        </div>
        <Link
          href={`/ops/clients/${client.id}`}
          className="text-xs text-primary font-medium hover:underline shrink-0"
        >
          상세보기
        </Link>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        {client.sales_agent_name && <span>담당: {client.sales_agent_name}</span>}
        {client.mrr > 0 && <span>MRR: ₩{client.mrr.toLocaleString()}</span>}
        {client.score !== null && (
          <span>
            점수: {client.score}
            {client.score_change != null && client.score_change !== 0 && (
              <span className={client.score_change < 0 ? "text-red-500" : "text-emerald-600"}>
                {" "}({client.score_change > 0 ? "+" : ""}{client.score_change})
              </span>
            )}
          </span>
        )}
        {client.days_until_expiry != null && client.days_until_expiry > 0 && (
          <span className="text-red-500 font-medium">D-{client.days_until_expiry}</span>
        )}
      </div>

      <div className="mt-3 p-2 rounded bg-blue-50 border border-blue-100">
        <p className="text-xs text-blue-700">💡 권장 조치: {recommendedAction}</p>
      </div>
    </div>
  );
}
