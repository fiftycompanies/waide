"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  Loader2,
  Search,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  getClientPortfolio,
  type ClientPortfolio,
  type ClientPortfolioData,
} from "@/lib/actions/client-portfolio-actions";

// ── Status Tab ─────────────────────────────────────────────────────────────

function StatusTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      }`}
    >
      {label} <span className="ml-1 font-bold">{count}</span>
    </button>
  );
}

// ── Client Card ────────────────────────────────────────────────────────────

function ClientCard({ client }: { client: ClientPortfolio }) {
  const statusColor = client.at_risk
    ? "border-l-amber-500"
    : client.subscription_status === "cancelled"
      ? "border-l-gray-400"
      : client.subscription_status === "active"
        ? "border-l-emerald-500"
        : "border-l-blue-400";

  const statusLabel = client.at_risk
    ? "At Risk"
    : client.subscription_status === "cancelled"
      ? "Churned"
      : client.onboarding_status && client.onboarding_status !== "completed"
        ? "Onboarding"
        : "Active";

  const statusBadgeColor = client.at_risk
    ? "bg-amber-100 text-amber-700"
    : client.subscription_status === "cancelled"
      ? "bg-gray-100 text-gray-600"
      : client.onboarding_status && client.onboarding_status !== "completed"
        ? "bg-blue-100 text-blue-700"
        : "bg-emerald-100 text-emerald-700";

  const daysSinceLogin = client.last_portal_login
    ? Math.floor((Date.now() - new Date(client.last_portal_login).getTime()) / 86400000)
    : null;

  const monthsSinceJoin = Math.floor(
    (Date.now() - new Date(client.created_at).getTime()) / (86400000 * 30),
  );

  return (
    <div
      className={`border rounded-lg bg-card p-4 border-l-4 ${statusColor} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{client.brand_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadgeColor}`}>
            {statusLabel}
          </span>
          {client.plan_name && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
              {client.plan_name}
            </span>
          )}
        </div>
      </div>

      {/* At Risk 경고 */}
      {client.at_risk && client.risk_reasons.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 p-2 rounded bg-amber-50 border border-amber-100">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">{client.risk_reasons.join(" · ")}</p>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-5 gap-3 text-center text-xs mb-3">
        <div>
          <p className="text-muted-foreground mb-0.5">마케팅점수</p>
          <div className="flex items-center justify-center gap-1">
            <span className="font-bold text-sm">
              {client.marketing_score ?? "--"}
            </span>
            {client.score_change != null && client.score_change !== 0 && (
              <span className={`flex items-center ${client.score_change > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {client.score_change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="text-[10px]">{Math.abs(client.score_change)}</span>
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">TOP10</p>
          <span className="font-bold text-sm">{client.keyword_top10}개</span>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">콘텐츠/월</p>
          <span className="font-bold text-sm">{client.content_this_month}건</span>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">MRR</p>
          <span className="font-bold text-sm">
            {client.mrr > 0 ? `₩${(client.mrr / 10000).toFixed(0)}만` : "--"}
          </span>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">계약만료</p>
          <span className="font-bold text-sm">
            {client.expires_at
              ? new Date(client.expires_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
              : "--"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-3">
          {client.sales_agent_name && <span>담당: {client.sales_agent_name}</span>}
          {daysSinceLogin != null && (
            <span className={daysSinceLogin >= 30 ? "text-red-500" : ""}>
              최근접속: {daysSinceLogin === 0 ? "오늘" : `${daysSinceLogin}일 전`}
            </span>
          )}
          <span>가입: {monthsSinceJoin > 0 ? `${monthsSinceJoin}개월 전` : "최근"}</span>
        </div>
        <Link
          href={`/ops/clients/${client.id}`}
          className="text-primary font-medium hover:underline"
        >
          상세보기 →
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [data, setData] = useState<ClientPortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "mrr" | "name" | "expires_at">("score");
  const [isPending, startTransition] = useTransition();

  const fetchData = (status?: string, search?: string, sort?: string) => {
    startTransition(async () => {
      const result = await getClientPortfolio({
        status,
        search: search || undefined,
        sortBy: sort as "score" | "mrr" | "name" | "expires_at",
      });
      setData(result);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData(statusFilter, searchQuery, sortBy);
  }, [statusFilter, sortBy]);

  const handleSearch = () => {
    fetchData(statusFilter, searchQuery, sortBy);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const counts = data?.counts || { all: 0, active: 0, onboarding: 0, atRisk: 0, churned: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">고객 포트폴리오</h1>
        <p className="text-sm text-muted-foreground mt-1">
          전체 고객 현황과 건강 상태를 한눈에 확인합니다
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusTab label="전체" count={counts.all} active={!statusFilter} onClick={() => setStatusFilter(undefined)} />
        <StatusTab label="Active" count={counts.active} active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
        <StatusTab label="Onboarding" count={counts.onboarding} active={statusFilter === "onboarding"} onClick={() => setStatusFilter("onboarding")} />
        <StatusTab label="At Risk" count={counts.atRisk} active={statusFilter === "atRisk"} onClick={() => setStatusFilter("atRisk")} />
        <StatusTab label="Churned" count={counts.churned} active={statusFilter === "churned"} onClick={() => setStatusFilter("churned")} />

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="브랜드 검색..."
              className="h-9 pl-9 pr-3 rounded-lg border bg-background text-sm w-48"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-9 px-3 rounded-lg border bg-background text-sm"
          >
            <option value="score">마케팅점수순</option>
            <option value="mrr">MRR순</option>
            <option value="name">이름순</option>
            <option value="expires_at">만료임박순</option>
          </select>
        </div>
      </div>

      {/* Cards */}
      {data && data.clients.length > 0 ? (
        <div className="space-y-3">
          {data.clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">등록된 고객이 없습니다</p>
        </div>
      )}

      {isPending && (
        <div className="text-center py-4">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
        </div>
      )}
    </div>
  );
}
