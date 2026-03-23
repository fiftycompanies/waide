"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Send, Clock, Globe, ClipboardCheck, FileCheck } from "lucide-react";
import {
  getHomepageRequestList,
  getHomepageRequestStats,
  updateHomepageRequestStatus,
} from "@/lib/actions/homepage-request-actions";
import type {
  HomepageRequest,
  HomepageRequestStats,
} from "@/lib/actions/homepage-request-actions";
import {
  confirmHomepageRequest,
  registerHomepageResult,
} from "@/lib/actions/homepage-generate-actions";
import {
  TEMPLATE_LABELS,
} from "@/lib/homepage/generate/template-types";
import type { TemplateName } from "@/lib/homepage/generate/template-types";

// ── 상태 뱃지 ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "대기",   color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  reviewing:  { label: "제작중", color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  completed:  { label: "완료",   color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  delivered:  { label: "전달",   color: "text-gray-600",   bg: "bg-gray-50 border-gray-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
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
// 어드민 홈페이지 제작 신청 관리
// ═══════════════════════════════════════════

export default function OpsHomepageRequestsPage() {
  const router = useRouter();

  const [items, setItems] = useState<HomepageRequest[]>([]);
  const [stats, setStats] = useState<HomepageRequestStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // 결과물 등록 모달 상태
  const [registerModal, setRegisterModal] = useState<HomepageRequest | null>(null);
  const [resultUrlInput, setResultUrlInput] = useState("");
  const [adminMemoInput, setAdminMemoInput] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listResult, statsResult] = await Promise.all([
        getHomepageRequestList({
          page,
          pageSize: 20,
          status: statusFilter || undefined,
        }),
        getHomepageRequestStats(),
      ]);

      setItems(listResult.data);
      setTotal(listResult.total);
      setStats(statsResult);
    } catch (err) {
      console.error("fetchData error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── 접수 확인 (pending → reviewing) ────────────────────────────

  const handleConfirm = async (req: HomepageRequest) => {
    if (actionLoading) return;
    setActionLoading(req.id);

    try {
      const result = await confirmHomepageRequest(req.id);
      if (result.success) {
        setItems((prev) => prev.map((item) =>
          item.id === req.id ? { ...item, status: "reviewing" } : item
        ));
      } else {
        alert(result.error ?? "접수 확인 실패");
      }
    } catch (err) {
      console.error("confirmHomepageRequest error:", err);
    } finally {
      setActionLoading(null);
      getHomepageRequestStats().then(setStats);
    }
  };

  // ── 결과물 등록 (reviewing → completed) ────────────────────────

  const handleRegisterSubmit = async () => {
    if (!registerModal || actionLoading || !resultUrlInput.trim()) return;
    const req = registerModal;
    setRegisterModal(null);
    setActionLoading(req.id);

    try {
      const result = await registerHomepageResult(
        req.id,
        resultUrlInput.trim(),
        adminMemoInput.trim() || undefined
      );
      if (result.success) {
        setItems((prev) => prev.map((item) =>
          item.id === req.id
            ? { ...item, status: "completed", result_url: resultUrlInput.trim(), admin_memo: adminMemoInput.trim() || null }
            : item
        ));
      } else {
        alert(result.error ?? "결과물 등록 실패");
      }
    } catch (err) {
      console.error("registerHomepageResult error:", err);
    } finally {
      setActionLoading(null);
      setResultUrlInput("");
      setAdminMemoInput("");
      getHomepageRequestStats().then(setStats);
    }
  };

  // ── 전달완료 처리 ────────────────────────────────────────────────

  const handleDeliver = async (req: HomepageRequest) => {
    await updateHomepageRequestStatus(req.id, "delivered");
    setItems((prev) => prev.map((item) =>
      item.id === req.id ? { ...item, status: "delivered" } : item
    ));
    getHomepageRequestStats().then(setStats);
  };

  const pageCount = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">홈페이지 제작 신청 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          고객이 포털에서 신청한 홈페이지 제작 요청을 관리합니다
        </p>
      </div>

      {/* ── 통계 카드 ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">전체</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">대기</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.pending}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">제작중</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.reviewing}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">완료/전달</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.completed + stats.delivered}</p>
          </div>
        </div>
      )}

      {/* ── 필터 바 ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border bg-card px-3 text-sm"
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* ── 테이블 ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">고객</th>
                <th className="text-left py-3 px-2 font-medium">템플릿</th>
                <th className="text-left py-3 px-2 font-medium">요청사항</th>
                <th className="text-center py-3 px-2 font-medium">상태</th>
                <th className="text-right py-3 px-2 font-medium">신청일</th>
                <th className="text-center py-3 px-4 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  로딩 중...
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">
                  신청 내역이 없습니다
                </td></tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium">{item.client_name ?? "알 수 없음"}</div>
                      {item.requester_name && (
                        <div className="text-xs text-muted-foreground">{item.requester_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm">
                        {TEMPLATE_LABELS[item.template_name as TemplateName] ?? item.template_name}
                      </span>
                    </td>
                    <td className="py-3 px-2 max-w-[200px]">
                      {item.note ? (
                        <p className="text-xs text-muted-foreground truncate" title={item.note}>
                          {item.note}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                      {item.admin_memo && (
                        <p className="text-[10px] text-blue-500 mt-0.5 truncate" title={item.admin_memo}>
                          메모: {item.admin_memo}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-2 text-right text-xs text-muted-foreground">
                      {timeAgo(item.created_at)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 대기 → 접수확인 */}
                        {item.status === "pending" && (
                          <button
                            onClick={() => handleConfirm(item)}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ClipboardCheck className="h-3 w-3" />
                            )}
                            접수확인
                          </button>
                        )}

                        {/* 제작중 → 결과물 등록 */}
                        {item.status === "reviewing" && (
                          <button
                            onClick={() => {
                              setRegisterModal(item);
                              setResultUrlInput(item.result_url ?? "");
                              setAdminMemoInput(item.admin_memo ?? "");
                            }}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                          >
                            <FileCheck className="h-3 w-3" />
                            결과물 등록
                          </button>
                        )}

                        {/* 완료 → 전달완료 + 보기 */}
                        {item.status === "completed" && (
                          <>
                            <button
                              onClick={() => handleDeliver(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                            >
                              <Send className="h-3 w-3" />
                              전달
                            </button>
                            {(item.project_id || item.result_url) && (
                              <button
                                onClick={() => {
                                  if (item.project_id) {
                                    router.push(`/homepage/${item.project_id}`);
                                  } else if (item.result_url) {
                                    window.open(item.result_url, "_blank");
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                              >
                                <Globe className="h-3 w-3" />
                                보기
                              </button>
                            )}
                          </>
                        )}

                        {/* 전달완료 → 보기 */}
                        {item.status === "delivered" && (item.project_id || item.result_url) && (
                          <button
                            onClick={() => {
                              if (item.project_id) {
                                router.push(`/homepage/${item.project_id}`);
                              } else if (item.result_url) {
                                window.open(item.result_url, "_blank");
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                          >
                            <Globe className="h-3 w-3" />
                            보기
                          </button>
                        )}
                      </div>
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

      {/* ── 결과물 등록 모달 ── */}
      {registerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">결과물 등록</h3>
            <p className="text-sm text-muted-foreground">
              <strong>{registerModal.client_name}</strong>의 홈페이지 제작 결과물을 등록합니다.
            </p>
            <div>
              <label className="text-sm font-medium">완성된 홈페이지 URL <span className="text-red-500">*</span></label>
              <input
                type="url"
                value={resultUrlInput}
                onChange={(e) => setResultUrlInput(e.target.value)}
                placeholder="https://everyou.vercel.app"
                className="mt-1 flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">작업 메모 <span className="text-muted-foreground font-normal">(선택)</span></label>
              <textarea
                value={adminMemoInput}
                onChange={(e) => setAdminMemoInput(e.target.value)}
                placeholder="제작 관련 내부 메모..."
                rows={3}
                className="mt-1 flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRegisterModal(null)}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRegisterSubmit}
                disabled={!resultUrlInput.trim()}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                등록 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
