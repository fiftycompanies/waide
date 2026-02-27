"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Copy,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  listSalesAgents,
  createSalesAgent,
  updateSalesAgent,
  deleteSalesAgent,
  type SalesAgentWithStats,
} from "@/lib/actions/sales-actions";
import {
  getBusinessDashboardData,
  type SalesPerformance,
} from "@/lib/actions/dashboard-actions";

// ── Base URL ────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // 클라이언트: 환경변수 > window.location.origin
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return envUrl;
    const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;
    return window.location.origin;
  }
  return "https://web-five-gold-12.vercel.app";
}

// ── Modal ────────────────────────────────────────────────────────────────────

function AgentModal({
  agent,
  onClose,
  onSaved,
}: {
  agent: Partial<SalesAgentWithStats> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!agent?.id;
  const [form, setForm] = useState({
    name: agent?.name ?? "",
    ref_code: agent?.ref_code ?? "",
    phone: agent?.phone ?? "",
    email: agent?.email ?? "",
    slack_user_id: agent?.slack_user_id ?? "",
  });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.ref_code.trim()) return;

    startTransition(async () => {
      if (isEdit) {
        const res = await updateSalesAgent(agent!.id!, {
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          slack_user_id: form.slack_user_id || undefined,
        });
        if (res.success) {
          toast.success("수정되었습니다.");
          onSaved();
          onClose();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await createSalesAgent({
          name: form.name,
          ref_code: form.ref_code,
          phone: form.phone || undefined,
          email: form.email || undefined,
          slack_user_id: form.slack_user_id || undefined,
        });
        if (res.success) {
          toast.success("영업사원이 등록되었습니다.");
          onSaved();
          onClose();
        } else {
          toast.error(res.error);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{isEdit ? "영업사원 수정" : "영업사원 등록"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">이름 *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Ref Code * <span className="text-xs">(영문+숫자, 변경 불가)</span>
            </label>
            <input
              value={form.ref_code}
              onChange={(e) => setForm({ ...form, ref_code: e.target.value.toUpperCase() })}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm font-mono"
              pattern="[A-Za-z0-9_-]{2,20}"
              disabled={isEdit}
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">전화번호</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
              placeholder="010-0000-0000"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Slack User ID</label>
            <input
              value={form.slack_user_id}
              onChange={(e) => setForm({ ...form, slack_user_id: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm font-mono"
              placeholder="U01ABCDEF"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isEdit ? "수정 저장" : "등록"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SalesAgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<SalesAgentWithStats[]>([]);
  const [salesPerf, setSalesPerf] = useState<SalesPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<SalesAgentWithStats> | null | "new">(null);
  const [isPending, startTransition] = useTransition();
  const baseUrl = getBaseUrl();

  const fetchAgents = () => {
    startTransition(async () => {
      const [data, bizData] = await Promise.all([
        listSalesAgents(),
        getBusinessDashboardData(),
      ]);
      setAgents(data);
      setSalesPerf(bizData.salesPerformance);
      setLoading(false);
    });
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleCopyLink = (refCode: string) => {
    const url = `${baseUrl}/?ref=${refCode}`;
    navigator.clipboard.writeText(url);
    toast.success("링크가 복사되었습니다.");
  };

  const handleToggleActive = (agent: SalesAgentWithStats) => {
    startTransition(async () => {
      const res = await updateSalesAgent(agent.id, { is_active: !agent.is_active });
      if (res.success) {
        toast.success(agent.is_active ? "비활성화됨" : "활성화됨");
        fetchAgents();
      }
    });
  };

  const handleDelete = (agent: SalesAgentWithStats) => {
    if (!confirm(`"${agent.name}" 영업사원을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const res = await deleteSalesAgent(agent.id);
      if (res.success) {
        toast.success("삭제되었습니다.");
        fetchAgents();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">영업사원 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            영업사원별 추적 링크 생성 및 성과 모니터링
          </p>
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          <UserPlus className="h-4 w-4" />
          영업사원 추가
        </button>
      </div>

      {/* Stats Summary */}
      {agents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">총 영업사원</p>
            <p className="text-2xl font-bold">{agents.filter((a) => a.is_active).length}</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">총 분석 유도</p>
            <p className="text-2xl font-bold">{agents.reduce((s, a) => s + a.live_analyses, 0)}</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">총 상담 전환</p>
            <p className="text-2xl font-bold">{agents.reduce((s, a) => s + a.live_consultations, 0)}</p>
          </div>
        </div>
      )}

      {/* 영업사원 성과 요약 */}
      {salesPerf.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 border-b">
            <h2 className="text-sm font-semibold">영업사원 성과 요약</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-2.5 px-4 font-medium text-xs">영업사원</th>
                <th className="text-center py-2.5 px-4 font-medium text-xs">담당고객</th>
                <th className="text-center py-2.5 px-4 font-medium text-xs">Active</th>
                <th className="text-center py-2.5 px-4 font-medium text-xs">신규계약</th>
                <th className="text-right py-2.5 px-4 font-medium text-xs">MRR기여</th>
                <th className="text-center py-2.5 px-4 font-medium text-xs">At Risk</th>
              </tr>
            </thead>
            <tbody>
              {salesPerf.map((sp) => (
                <tr key={sp.id} className="border-t hover:bg-muted/20">
                  <td className="py-2.5 px-4 font-medium">{sp.name}</td>
                  <td className="py-2.5 px-4 text-center">{sp.total_clients}</td>
                  <td className="py-2.5 px-4 text-center">{sp.active_clients}</td>
                  <td className="py-2.5 px-4 text-center">
                    {sp.new_contracts > 0 ? (
                      <span className="font-semibold text-emerald-600">{sp.new_contracts}</span>
                    ) : "0"}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    ₩{(sp.mrr_contribution / 10000).toFixed(0)}만
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {sp.at_risk > 0 ? (
                      <span className="font-semibold text-red-500">{sp.at_risk}</span>
                    ) : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-3 px-4 font-medium">이름</th>
              <th className="text-left py-3 px-4 font-medium">Ref Code</th>
              <th className="text-left py-3 px-4 font-medium">추적 링크</th>
              <th className="text-left py-3 px-4 font-medium">전화</th>
              <th className="text-center py-3 px-4 font-medium">분석 수</th>
              <th className="text-center py-3 px-4 font-medium">상담 전환</th>
              <th className="text-center py-3 px-4 font-medium">전환율</th>
              <th className="text-center py-3 px-4 font-medium">상태</th>
              <th className="text-center py-3 px-4 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  불러오는 중...
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground">
                  등록된 영업사원이 없습니다.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium">{agent.name}</td>
                  <td className="py-3 px-4">
                    <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono">{agent.ref_code}</code>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate max-w-[250px]">
                        {baseUrl}/?ref={agent.ref_code}
                      </code>
                      <button
                        onClick={() => handleCopyLink(agent.ref_code)}
                        className="shrink-0 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        복사
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{agent.phone || "-"}</td>
                  <td className="py-3 px-4 text-center font-medium">{agent.live_analyses}</td>
                  <td className="py-3 px-4 text-center font-medium">{agent.live_consultations}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-medium ${agent.conversion_rate >= 10 ? "text-emerald-600" : ""}`}>
                      {agent.conversion_rate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(agent)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        agent.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {agent.is_active ? "활성" : "비활성"}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => router.push(`/ops/analysis-logs?salesRef=${agent.ref_code}`)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="분석 로그 보기"
                      >
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setModal(agent)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="수정"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal !== null && (
        <AgentModal
          agent={modal === "new" ? {} : modal}
          onClose={() => setModal(null)}
          onSaved={fetchAgents}
        />
      )}
    </div>
  );
}
