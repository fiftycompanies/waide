"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAnalysisLogs,
  getAnalysisStats,
  getSalesAgentsList,
  getClientsList,
  updateLeadStatus,
  assignSalesAgent,
  assignToClient,
} from "@/lib/actions/analysis-log-actions";
import type { AnalysisLogItem, AnalysisStats, AnalysisLogFilters } from "@/lib/actions/analysis-log-actions";

// ── 상태 뱃지 ──

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "신규", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  contacted: { label: "연락완료", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  consulting: { label: "상담중", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  contracted: { label: "계약완료", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  active: { label: "관리중", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  churned: { label: "이탈", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

function StatusBadge({
  status,
  onSelect,
}: {
  status: string;
  onSelect?: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;

  if (!onSelect) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:shadow-sm ${cfg.bg} ${cfg.color}`}
      >
        {cfg.label} <span className="ml-1 text-[10px]">&#9662;</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border rounded-lg shadow-lg py-1 min-w-[110px]">
          {Object.entries(STATUS_CONFIG).map(([key, c]) => (
            <button
              key={key}
              onClick={(e) => { e.stopPropagation(); onSelect(key); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${c.color} ${key === status ? "font-bold" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 인라인 드롭다운 (영업사원 / 브랜드 계정) ──

function InlineDropdown({
  value,
  displayText,
  options,
  placeholder,
  onChange,
}: {
  value: string | null;
  displayText: string | null;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  onChange: (val: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-xs hover:bg-muted/50 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
        title="클릭하여 변경"
      >
        {displayText ?? <span className="text-muted-foreground">-</span>}
        <span className="ml-0.5 text-[10px] text-muted-foreground">&#9662;</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border rounded-lg shadow-lg py-1 min-w-[150px] max-h-60 overflow-y-auto">
          <button
            onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
            className="block w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-gray-50"
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${opt.value === value ? "font-bold text-primary" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">-</span>;
  const color = score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  return <span className={`text-sm font-semibold ${color}`}>{score}</span>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

// ═══════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════

export default function AnalysisLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<AnalysisLogItem[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [agents, setAgents] = useState<Array<{ ref_code: string; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; brand_name: string; status: string }>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [salesRef, setSalesRef] = useState(searchParams.get("salesRef") ?? "");
  const [leadStatus, setLeadStatus] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const filters: AnalysisLogFilters = { page, pageSize: 20 };
    if (salesRef) filters.salesRef = salesRef;
    if (leadStatus) filters.leadStatus = leadStatus;
    if (search) filters.search = search;
    if (period === "7d") filters.dateFrom = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    if (period === "30d") filters.dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [logsResult, statsResult, agentsList, clientsList] = await Promise.all([
      getAnalysisLogs(filters),
      getAnalysisStats(),
      getSalesAgentsList(),
      getClientsList(),
    ]);

    setLogs(logsResult.data);
    setTotal(logsResult.total);
    setStats(statsResult);
    setAgents(agentsList);
    setClients(clientsList);
    setLoading(false);
  }, [page, salesRef, leadStatus, search, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, lead_status: newStatus } : l)));
    await updateLeadStatus(id, newStatus);
  };

  const handleAssignSalesAgent = async (id: string, ref: string | null) => {
    const agentName = ref ? (agents.find(a => a.ref_code === ref)?.name ?? ref) : null;
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, sales_ref: ref, sales_agent_name: agentName } : l)));
    await assignSalesAgent(id, ref);
  };

  const handleAssignClient = async (id: string, clientId: string | null) => {
    const clientName = clientId ? (clients.find(c => c.id === clientId)?.brand_name ?? null) : null;
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, client_id: clientId, client_name: clientName } : l)));
    await assignToClient(id, clientId);
  };

  const pageCount = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">분석 로그</h1>
        <p className="text-sm text-muted-foreground mt-1">브랜드 분석 이력 및 영업 파이프라인 관리</p>
      </div>

      {/* ── 통계 카드 ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">전체 분석</p>
            <p className="text-2xl font-bold mt-1">{stats.total}건</p>
            <p className="text-xs text-muted-foreground mt-1">+{stats.recentCount} (7일)</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">상담 진행</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">
              {(stats.byStatus.consulting ?? 0) + (stats.byStatus.contacted ?? 0)}건
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">계약 완료</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {(stats.byStatus.contracted ?? 0) + (stats.byStatus.active ?? 0)}건
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">상담 전환율</p>
            <p className="text-2xl font-bold mt-1">{stats.consultationRate}%</p>
          </div>
        </div>
      )}

      {/* ── 필터 바 ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={salesRef}
          onChange={(e) => { setSalesRef(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border bg-card px-3 text-sm"
        >
          <option value="">전체 영업사원</option>
          {agents.map((a) => (
            <option key={a.ref_code} value={a.ref_code}>{a.name} ({a.ref_code})</option>
          ))}
        </select>

        <select
          value={leadStatus}
          onChange={(e) => { setLeadStatus(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border bg-card px-3 text-sm"
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={period}
          onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border bg-card px-3 text-sm"
        >
          <option value="all">전체 기간</option>
          <option value="7d">최근 7일</option>
          <option value="30d">최근 30일</option>
        </select>

        <input
          type="text"
          placeholder="매장명 검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border bg-card px-3 text-sm w-48"
        />
      </div>

      {/* ── 테이블 ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">매장명</th>
                <th className="text-left py-3 px-2 font-medium">업종</th>
                <th className="text-center py-3 px-2 font-medium">점수</th>
                <th className="text-left py-3 px-2 font-medium">영업사원</th>
                <th className="text-left py-3 px-2 font-medium">브랜드 계정</th>
                <th className="text-center py-3 px-2 font-medium">상태</th>
                <th className="text-left py-3 px-2 font-medium">연락처</th>
                <th className="text-center py-3 px-2 font-medium">메모</th>
                <th className="text-right py-3 px-4 font-medium">최근활동</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">로딩 중...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">분석 로그가 없습니다</td></tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => router.push(`/ops/analysis-logs/${log.id}`)}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-medium">{log.place_name}</td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">{log.category}</td>
                    <td className="py-3 px-2 text-center"><ScoreBadge score={log.marketing_score} /></td>
                    <td className="py-3 px-2">
                      <InlineDropdown
                        value={log.sales_ref}
                        displayText={log.sales_agent_name}
                        options={agents.map(a => ({ value: a.ref_code, label: `${a.name} (${a.ref_code})` }))}
                        placeholder="미배정"
                        onChange={(val) => handleAssignSalesAgent(log.id, val)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <InlineDropdown
                        value={log.client_id}
                        displayText={log.client_name}
                        options={clients.map(c => ({ value: c.id, label: `${c.brand_name} (${c.status})` }))}
                        placeholder="미할당"
                        onChange={(val) => handleAssignClient(log.id, val)}
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <StatusBadge
                        status={log.lead_status}
                        onSelect={(s) => handleStatusChange(log.id, s)}
                      />
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">
                      {log.contact_phone ?? log.contact_name ?? "-"}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {log.notes_count > 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">{log.notes_count}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                      {timeAgo(log.last_activity_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">총 {total}건</p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(pageCount, 10) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-xs ${page === p ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
