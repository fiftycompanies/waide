"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  getRevenueData,
  type RevenueData,
} from "@/lib/actions/revenue-actions";

function formatWon(amount: number): string {
  if (amount >= 100000000) return `₩${(amount / 100000000).toFixed(1)}억`;
  if (amount >= 10000) return `₩${(amount / 10000).toFixed(0)}만`;
  return `₩${amount.toLocaleString()}`;
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getRevenueData();
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

  const { kpi, planDistribution, mrrTrend, recentChanges } = data;
  const maxPlanMrr = Math.max(...planDistribution.map((p) => p.mrr), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">매출 현황</h1>
        <p className="text-sm text-muted-foreground mt-1">
          MRR, ARR 및 플랜별 매출 분포를 확인합니다
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "MRR", value: formatWon(kpi.mrr), icon: "💰", color: "from-emerald-50 to-green-50 border-emerald-100" },
          { label: "ARR", value: formatWon(kpi.arr), icon: "📈", color: "from-blue-50 to-sky-50 border-blue-100" },
          { label: "신규 MRR", value: `+${formatWon(kpi.newMrr)}`, icon: "🆕", color: "from-amber-50 to-yellow-50 border-amber-100" },
          { label: "이탈 MRR", value: `-${formatWon(kpi.churnedMrr)}`, icon: "📉", color: "from-red-50 to-rose-50 border-red-100" },
        ].map((k) => (
          <div key={k.label} className={`p-5 rounded-lg border bg-gradient-to-br ${k.color}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{k.label}</p>
              <span className="text-xl">{k.icon}</span>
            </div>
            <p className="text-2xl font-bold mt-2">{k.value}</p>
          </div>
        ))}
      </div>

      {/* MRR Trend */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-4">MRR 추이 (6개월)</h3>
        <div className="space-y-3">
          {mrrTrend.map((m) => {
            const maxMrr = Math.max(...mrrTrend.map((t) => t.mrr), 1);
            const pct = (m.mrr / maxMrr) * 100;
            return (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 shrink-0 font-mono">{m.month}</span>
                <div className="flex-1 h-6 bg-muted/50 rounded overflow-hidden relative">
                  <div
                    className="h-full rounded bg-emerald-500/80"
                    style={{ width: `${pct}%` }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                    {formatWon(m.mrr)}
                  </span>
                </div>
                <div className="flex gap-2 w-40 shrink-0 text-xs">
                  {m.newMrr > 0 && (
                    <span className="text-emerald-600 flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" />+{formatWon(m.newMrr)}
                    </span>
                  )}
                  {m.churnedMrr > 0 && (
                    <span className="text-red-500 flex items-center gap-0.5">
                      <TrendingDown className="h-3 w-3" />-{formatWon(m.churnedMrr)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-4">플랜별 매출 분포</h3>
        {planDistribution.length > 0 ? (
          <div className="space-y-3">
            {planDistribution.map((p) => (
              <div key={p.plan_name} className="flex items-center gap-3">
                <span className="text-sm font-medium w-28 shrink-0">{p.plan_name}</span>
                <span className="text-xs text-muted-foreground w-10 shrink-0">{p.count}개</span>
                <div className="flex-1 h-4 bg-muted/50 rounded overflow-hidden">
                  <div
                    className="h-full rounded bg-purple-500/70"
                    style={{ width: `${(p.mrr / maxPlanMrr) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold w-20 text-right">{formatWon(p.mrr)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">데이터 없음</p>
        )}
      </div>

      {/* Recent Changes */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-4">최근 변동</h3>
        {recentChanges.length > 0 ? (
          <div className="space-y-2">
            {recentChanges.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                <span className="text-muted-foreground text-xs w-16 shrink-0">
                  {new Date(c.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  c.type === "new" ? "bg-emerald-100 text-emerald-700"
                    : c.type === "upgrade" ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                }`}>
                  {c.type === "new" ? "신규" : c.type === "upgrade" ? "업그레이드" : "이탈"}
                </span>
                <span className="font-medium">{c.client_name}</span>
                {c.plan_name && <span className="text-xs text-muted-foreground">{c.plan_name}</span>}
                <span className={`ml-auto font-bold ${c.type === "churn" ? "text-red-500" : "text-emerald-600"}`}>
                  {c.type === "churn" ? "-" : "+"}{formatWon(c.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">이번 달 변동 없음</p>
        )}
      </div>
    </div>
  );
}
