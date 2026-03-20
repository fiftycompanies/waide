"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, CheckCircle2, Send, AlertCircle, Clock, Globe } from "lucide-react";
import {
  getHomepageRequestList,
  getHomepageRequestStats,
  updateHomepageRequestStatus,
  linkHomepageRequestToProject,
} from "@/lib/actions/homepage-request-actions";
import type {
  HomepageRequest,
  HomepageRequestStats,
  HomepageRequestStatus,
} from "@/lib/actions/homepage-request-actions";
import { generateHomepage } from "@/lib/actions/homepage-generate-actions";
import {
  TEMPLATE_LABELS,
} from "@/lib/homepage/generate/template-types";
import type { TemplateName } from "@/lib/homepage/generate/template-types";

// ── 상태 뱃지 ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending:    { label: "대기",   color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: Clock },
  generating: { label: "생성중", color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     icon: Loader2 },
  completed:  { label: "완료",   color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  delivered:  { label: "전달",   color: "text-gray-600",   bg: "bg-gray-50 border-gray-200",     icon: Send },
  failed:     { label: "실패",   color: "text-red-700",    bg: "bg-red-50 border-red-200",       icon: AlertCircle },
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

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // 생성 중인 항목 ID
  const [generatingId, setGeneratingId] = useState<string | null>(null);

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

  // ── 생성 시작 ────────────────────────────────────────────────────

  const handleGenerate = async (req: HomepageRequest) => {
    if (generatingId) return; // 이미 생성 중
    setGeneratingId(req.id);

    // 상태를 generating으로 업데이트
    await updateHomepageRequestStatus(req.id, "generating");
    setItems((prev) => prev.map((item) =>
      item.id === req.id ? { ...item, status: "generating" } : item
    ));

    try {
      const result = await generateHomepage({
        clientId: req.client_id,
        referenceUrls: [],
        templateName: req.template_name as TemplateName,
      });

      if (result.success && result.data) {
        // 프로젝트 연결
        if (result.data.projectId) {
          await linkHomepageRequestToProject(req.id, result.data.projectId);
        } else {
          await updateHomepageRequestStatus(req.id, "completed");
        }
        setItems((prev) => prev.map((item) =>
          item.id === req.id ? { ...item, status: "completed", project_id: result.data?.projectId ?? null } : item
        ));
      } else {
        await updateHomepageRequestStatus(req.id, "failed", result.error ?? "생성 실패");
        setItems((prev) => prev.map((item) =>
          item.id === req.id ? { ...item, status: "failed", admin_note: result.error ?? null } : item
        ));
      }
    } catch (err) {
      console.error("generateHomepage error:", err);
      await updateHomepageRequestStatus(req.id, "failed", String(err));
      setItems((prev) => prev.map((item) =>
        item.id === req.id ? { ...item, status: "failed" } : item
      ));
    } finally {
      setGeneratingId(null);
      // 통계 새로고침
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">전체</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">대기</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.pending}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">생성중</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.generating}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">완료</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.completed}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">전달</p>
            <p className="text-2xl font-bold mt-1 text-gray-600">{stats.delivered}</p>
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
                    </td>
                    <td className="py-3 px-2 text-center">
                      <StatusBadge status={item.status} />
                      {item.status === "failed" && item.admin_note && (
                        <p className="text-[10px] text-red-500 mt-0.5 max-w-[120px] truncate" title={item.admin_note}>
                          {item.admin_note}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-xs text-muted-foreground">
                      {timeAgo(item.created_at)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 대기/실패 → 생성 시작 */}
                        {(item.status === "pending" || item.status === "failed") && (
                          <button
                            onClick={() => handleGenerate(item)}
                            disabled={generatingId !== null}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {generatingId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            생성
                          </button>
                        )}

                        {/* 생성중 → 로딩 표시 */}
                        {item.status === "generating" && generatingId === item.id && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            생성 중...
                          </span>
                        )}

                        {/* 완료 → 전달완료 + 미리보기 */}
                        {item.status === "completed" && (
                          <>
                            <button
                              onClick={() => handleDeliver(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                            >
                              <Send className="h-3 w-3" />
                              전달
                            </button>
                            {item.project_id && (
                              <button
                                onClick={() => router.push(`/homepage/${item.project_id}`)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                              >
                                <Globe className="h-3 w-3" />
                                보기
                              </button>
                            )}
                          </>
                        )}

                        {/* 전달완료 → 프로젝트 보기 */}
                        {item.status === "delivered" && item.project_id && (
                          <button
                            onClick={() => router.push(`/homepage/${item.project_id}`)}
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
    </div>
  );
}
