"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getConsultationList,
  getConsultationStats,
  getConsultationAgentsList,
  updateConsultationStatus,
  assignConsultationAgent,
} from "@/lib/actions/consultation-crm-actions";
import type {
  ConsultationListItem,
  ConsultationStats,
  ConsultationFilters,
} from "@/lib/actions/consultation-crm-actions";

// ── 상태 뱃지 ──

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "대기", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  contacted: { label: "연락완료", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  consulting: { label: "상담중", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  contracted: { label: "계약", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  converted: { label: "전환", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  closed: { label: "종료", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

function StatusBadge({
  status,
  onSelect,
}: {
  status: string;
  onSelect?: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

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
          {Object.entries(STATUS_CONFIG)
            .filter(([k]) => k !== "converted") // 레거시 상태 숨김
            .map(([key, c]) => (
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

function InlineAgentDropdown({
  value,
  displayText,
  options,
  onChange,
}: {
  value: string | null;
  displayText: string | null;
  options: Array<{ value: string; label: string }>;
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
        {displayText ?? <span className="text-muted-foreground">미배정</span>}
        <span className="ml-0.5 text-[10px] text-muted-foreground">&#9662;</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border rounded-lg shadow-lg py-1 min-w-[150px] max-h-60 overflow-y-auto">
          <button
            onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
            className="block w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-gray-50"
          >
            미배정
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

export default function ConsultationsPage() {
  const router = useRouter();

  const [items, setItems] = useState<ConsultationListItem[]>([]);
  const [stats, setStats] = useState<ConsultationStats | null>(null);
  const [agents, setAgents] = useState<Array<{ ref_code: string; name: string }>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ConsultationFilters = { page, pageSize: 20 };
      if (statusFilter) filters.status = statusFilter;
      if (agentFilter) filters.assignedTo = agentFilter;
      if (search) filters.search = search;
      if (period === "7d") filters.dateFrom = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      if (period === "30d") filters.dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      // 각 서버 액션을 개별적으로 호출하여 에러 지점 파악
      let listResult: Awaited<ReturnType<typeof getConsultationList>> = { data: [], total: 0, page: 1, pageSize: 20 };
      let statsResult: ConsultationStats | null = null;
      let agentsList: Array<{ ref_code: string; name: string }> = [];

      try {
        listResult = await getConsultationList(filters);
      } catch (e) {
        console.error("getConsultationList failed:", e);
        throw new Error("상담 목록 조회 실패: " + (e instanceof Error ? e.message : String(e)));
      }

      try {
        statsResult = await getConsultationStats();
      } catch (e) {
        console.error("getConsultationStats failed:", e);
        // 통계는 실패해도 목록은 표시
      }

      try {
        agentsList = await getConsultationAgentsList();
      } catch (e) {
        console.error("getConsultationAgentsList failed:", e);
        // 담당자 목록은 실패해도 목록은 표시
      }

      setItems(listResult.data);
      setTotal(listResult.total);
      setStats(statsResult);
      setAgents(agentsList);
    } catch (err) {
      console.error("fetchData error:", err);
      setError(err instanceof Error ? err.message : "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, agentFilter, search, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    await updateConsultationStatus(id, newStatus);
  };

  const handleAssignAgent = async (id: string, ref: string | null) => {
    const agentName = ref ? (agents.find(a => a.ref_code === ref)?.name ?? ref) : null;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, assigned_to: ref, assigned_agent_name: agentName } : item)));
    await assignConsultationAgent(id, ref);
  };

  const pageCount = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">마케팅 상담</h1>
        <p className="text-sm text-muted-foreground mt-1">상담 신청 관리 및 영업 파이프라인</p>
      </div>

      {/* ── 통계 카드 ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">전체 상담</p>
            <p className="text-2xl font-bold mt-1">{stats.total}건</p>
            <p className="text-xs text-muted-foreground mt-1">+{stats.recentCount} (7일)</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">대기중</p>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {stats.byStatus.pending ?? 0}건
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">상담 진행</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">
              {(stats.byStatus.consulting ?? 0) + (stats.byStatus.contacted ?? 0)}건
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">계약 전환</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {(stats.byStatus.contracted ?? 0) + (stats.byStatus.converted ?? 0)}건
            </p>
          </div>
        </div>
      )}

      {/* ── 필터 바 ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={agentFilter}
          onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border bg-card px-3 text-sm"
        >
          <option value="">전체 담당자</option>
          {agents.map((a) => (
            <option key={a.ref_code} value={a.ref_code}>{a.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border bg-card px-3 text-sm"
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_CONFIG)
            .filter(([k]) => k !== "converted")
            .map(([k, v]) => (
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
          placeholder="이름/전화/브랜드 검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border bg-card px-3 text-sm w-52"
        />
      </div>

      {/* ── 테이블 ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">브랜드</th>
                <th className="text-center py-3 px-2 font-medium">점수</th>
                <th className="text-left py-3 px-2 font-medium">연락처</th>
                <th className="text-left py-3 px-2 font-medium">관심 항목</th>
                <th className="text-left py-3 px-2 font-medium">담당자</th>
                <th className="text-center py-3 px-2 font-medium">상태</th>
                <th className="text-center py-3 px-2 font-medium">메모</th>
                <th className="text-right py-3 px-4 font-medium">신청일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">로딩 중...</td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="py-12 text-center">
                  <p className="text-red-500 mb-2">{error}</p>
                  <button onClick={fetchData} className="text-sm text-blue-600 hover:underline">다시 시도</button>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">상담 신청이 없습니다</td></tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/ops/consultations/${item.id}`)}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium">{item.brand_name ?? "알 수 없음"}</div>
                      <div className="text-xs text-muted-foreground">{item.contact_name}</div>
                    </td>
                    <td className="py-3 px-2 text-center"><ScoreBadge score={item.marketing_score} /></td>
                    <td className="py-3 px-2 text-xs">
                      <div>{item.contact_phone}</div>
                      {item.contact_email && <div className="text-muted-foreground">{item.contact_email}</div>}
                    </td>
                    <td className="py-3 px-2">
                      {item.interested_items.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.interested_items.slice(0, 2).map((it, i) => (
                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                              {it}
                            </span>
                          ))}
                          {item.interested_items.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{item.interested_items.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <InlineAgentDropdown
                        value={item.assigned_to}
                        displayText={item.assigned_agent_name}
                        options={agents.map(a => ({ value: a.ref_code, label: a.name }))}
                        onChange={(val) => handleAssignAgent(item.id, val)}
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <StatusBadge
                        status={item.status}
                        onSelect={(s) => handleStatusChange(item.id, s)}
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      {item.notes_count > 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">{item.notes_count}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                      {timeAgo(item.created_at)}
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
