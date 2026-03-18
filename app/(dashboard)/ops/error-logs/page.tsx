"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Filter,
  Loader2,
  Monitor,
  RefreshCw,
  Server,
  Timer,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getErrorLogs,
  getErrorStats,
  updateErrorStatus,
  type ErrorLogEntry,
  type ErrorStats,
} from "@/lib/actions/error-log-actions";

// ── 상수 ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  new: { label: "신규", variant: "destructive" },
  acknowledged: { label: "확인", variant: "default" },
  resolved: { label: "해결", variant: "secondary" },
  ignored: { label: "무시", variant: "outline" },
};

const TYPE_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  client: { label: "클라이언트", icon: Monitor, color: "text-blue-500" },
  server: { label: "서버", icon: Server, color: "text-red-500" },
  api: { label: "API", icon: Bug, color: "text-orange-500" },
  cron: { label: "크론", icon: Timer, color: "text-purple-500" },
};

// ── 컴포넌트 ──────────────────────────────────────────────────────────────

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [stats, setStats] = useState<ErrorStats>({ today: 0, thisWeek: 0, unresolved: 0, serverErrors: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [daysFilter, setDaysFilter] = useState<number>(7);
  const [selectedLog, setSelectedLog] = useState<ErrorLogEntry | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        getErrorLogs({
          status: statusFilter,
          errorType: typeFilter,
          days: daysFilter,
        }),
        getErrorStats(),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (err) {
      console.error("에러 로그 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, daysFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (id: string, status: "acknowledged" | "resolved" | "ignored") => {
    setUpdating(id);
    try {
      const result = await updateErrorStatus(id, status);
      if (result.success) {
        // 리스트 + 모달 둘 다 갱신
        setLogs((prev) =>
          prev.map((log) =>
            log.id === id
              ? { ...log, status, ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}) }
              : log
          )
        );
        if (selectedLog?.id === id) {
          setSelectedLog((prev) =>
            prev ? { ...prev, status, ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}) } : prev
          );
        }
        // 통계 새로고침
        getErrorStats().then(setStats).catch(() => {});
      }
    } catch {
      // 무시
    } finally {
      setUpdating(null);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">에러 로그</h1>
          <p className="text-sm text-muted-foreground">시스템 에러 모니터링 및 관리</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">이번 주</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              미해결
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.unresolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Server className="h-3.5 w-3.5" />
              서버 에러
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.serverErrors}</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="new">신규</SelectItem>
            <SelectItem value="acknowledged">확인됨</SelectItem>
            <SelectItem value="resolved">해결됨</SelectItem>
            <SelectItem value="ignored">무시됨</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="client">클라이언트</SelectItem>
            <SelectItem value="server">서버</SelectItem>
            <SelectItem value="api">API</SelectItem>
            <SelectItem value="cron">크론</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(daysFilter)} onValueChange={(v: string) => setDaysFilter(Number(v))}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="기간" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">오늘</SelectItem>
            <SelectItem value="7">최근 7일</SelectItem>
            <SelectItem value="30">최근 30일</SelectItem>
            <SelectItem value="90">최근 90일</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 에러 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <p className="text-muted-foreground">에러가 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">시간</th>
                <th className="text-left px-4 py-3 font-medium">유형</th>
                <th className="text-left px-4 py-3 font-medium">메시지</th>
                <th className="text-left px-4 py-3 font-medium">페이지</th>
                <th className="text-left px-4 py-3 font-medium">상태</th>
                <th className="text-right px-4 py-3 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const typeInfo = TYPE_MAP[log.error_type] || TYPE_MAP.server;
                const statusInfo = STATUS_MAP[log.status] || STATUS_MAP.new;
                const TypeIcon = typeInfo.icon;
                return (
                  <tr
                    key={log.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(log.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 ${typeInfo.color}`}>
                        <TypeIcon className="h-3.5 w-3.5" />
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[300px] truncate">
                      {log.error_message}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">
                      {log.page_url || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세 모달 */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const typeInfo = TYPE_MAP[selectedLog.error_type] || TYPE_MAP.server;
                    const TypeIcon = typeInfo.icon;
                    return <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />;
                  })()}
                  에러 상세
                  <Badge variant={STATUS_MAP[selectedLog.status]?.variant || "default"}>
                    {STATUS_MAP[selectedLog.status]?.label || selectedLog.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* 에러 메시지 */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">에러 메시지</p>
                  <p className="text-sm font-medium break-all">{selectedLog.error_message}</p>
                </div>

                {/* 스택 트레이스 */}
                {selectedLog.error_stack && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">스택 트레이스</p>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-[200px] whitespace-pre-wrap break-all">
                      {selectedLog.error_stack}
                    </pre>
                  </div>
                )}

                {/* 컨텍스트 정보 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">유형</p>
                    <p className="text-sm">{TYPE_MAP[selectedLog.error_type]?.label || selectedLog.error_type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">발생 시각</p>
                    <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString("ko-KR")}</p>
                  </div>
                  {selectedLog.page_url && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">페이지 URL</p>
                      <p className="text-sm break-all">{selectedLog.page_url}</p>
                    </div>
                  )}
                  {selectedLog.user_email && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">사용자</p>
                      <p className="text-sm">{selectedLog.user_email} ({selectedLog.user_role || "-"})</p>
                    </div>
                  )}
                  {selectedLog.browser_info && (
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">브라우저</p>
                      <p className="text-sm break-all">{selectedLog.browser_info}</p>
                    </div>
                  )}
                </div>

                {/* 메타데이터 */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">메타데이터</p>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-[150px] whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* 해결 정보 */}
                {selectedLog.resolved_at && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">해결 시각</p>
                    <p className="text-sm">{new Date(selectedLog.resolved_at).toLocaleString("ko-KR")}</p>
                  </div>
                )}

                {/* 상태 변경 버튼 */}
                <div className="flex gap-2 pt-2 border-t">
                  {selectedLog.status !== "acknowledged" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(selectedLog.id, "acknowledged")}
                      disabled={updating === selectedLog.id}
                    >
                      {updating === selectedLog.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4 mr-1" />
                      )}
                      확인
                    </Button>
                  )}
                  {selectedLog.status !== "resolved" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(selectedLog.id, "resolved")}
                      disabled={updating === selectedLog.id}
                    >
                      {updating === selectedLog.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      해결
                    </Button>
                  )}
                  {selectedLog.status !== "ignored" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(selectedLog.id, "ignored")}
                      disabled={updating === selectedLog.id}
                    >
                      {updating === selectedLog.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <EyeOff className="h-4 w-4 mr-1" />
                      )}
                      무시
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => setSelectedLog(null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    닫기
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
