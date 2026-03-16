"use client";

import { useState, useEffect, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  FileText,
  Radio,
  Save,
  TrendingUp,
  X,
} from "lucide-react";
import { getContentDetail, updatePublishedUrl } from "@/lib/actions/ops-actions";
import type { ContentDetail } from "@/lib/actions/ops-actions";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  tracking: "bg-sky-100 text-sky-700 border-sky-200",
  published: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  review: "검토",
  approved: "승인",
  tracking: "추적중",
  published: "발행됨",
  rejected: "반려",
  archived: "보관",
};

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

interface ContentDetailModalProps {
  contentId: string | null;
  onClose: () => void;
}

export function ContentDetailModal({ contentId, onClose }: ContentDetailModalProps) {
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!contentId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    getContentDetail(contentId).then((d) => {
      setDetail(d);
      setUrlInput(d?.published_url ?? "");
      setLoading(false);
    });
  }, [contentId]);

  function handleCopyBody() {
    if (!detail?.body) return;
    navigator.clipboard.writeText(detail.body);
    toast.success("본문이 클립보드에 복사되었습니다.");
  }

  function handleSaveUrl() {
    if (!detail || !urlInput.trim()) return;
    startTransition(async () => {
      const res = await updatePublishedUrl(detail.id, urlInput.trim());
      if (res.success) {
        toast.success("발행 URL이 저장되었습니다.");
        setDetail((prev) =>
          prev ? { ...prev, published_url: urlInput.trim(), publish_status: "published", is_tracking: true } : prev
        );
      } else {
        toast.error(res.error ?? "저장 실패");
      }
    });
  }

  return (
    <Dialog open={!!contentId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            콘텐츠 상세
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-600 border-t-transparent" />
          </div>
        ) : !detail ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            콘텐츠를 찾을 수 없습니다.
          </div>
        ) : (
          <div className="space-y-5">
            {/* 제목 + 상태 */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold leading-tight">
                {detail.title ?? "(제목 없음)"}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  variant="outline"
                  className={`text-xs ${STATUS_COLORS[detail.publish_status] ?? ""}`}
                >
                  {STATUS_LABELS[detail.publish_status] ?? detail.publish_status}
                </Badge>
                <span>{formatKoreanDate(detail.created_at)}</span>
                {detail.word_count && (
                  <span>{detail.word_count.toLocaleString()}자</span>
                )}
                <span>{detail.generated_by === "human" ? "✍️ 사람 작성" : "🤖 AI 생성"}</span>
              </div>
            </div>

            {/* 메타 정보 그리드 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* 키워드 */}
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">연결 키워드</p>
                <p className="font-medium">
                  {detail.keyword_name ?? <span className="text-muted-foreground/50">없음</span>}
                </p>
              </div>

              {/* 발행 채널 */}
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">발행 채널</p>
                <p className="font-medium">
                  {detail.publishing_account_name ?? <span className="text-muted-foreground/50">없음</span>}
                </p>
              </div>

              {/* SERP 순위 */}
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">현재 SERP 순위</p>
                <div className="flex items-center gap-3">
                  {detail.current_rank_pc != null || detail.current_rank_mo != null ? (
                    <>
                      {detail.current_rank_pc != null && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          PC {detail.current_rank_pc}위
                        </span>
                      )}
                      {detail.current_rank_mo != null && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          MO {detail.current_rank_mo}위
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground/50">미추적</span>
                  )}
                </div>
              </div>

              {/* QC 점수 */}
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">QC 점수</p>
                <p className="font-medium">
                  {detail.metadata?.qc_score != null ? (
                    <span className={detail.metadata.qc_pass ? "text-emerald-600" : "text-amber-600"}>
                      {String(detail.metadata.qc_score)}점
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </p>
              </div>
            </div>

            {/* 발행 URL */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">발행 URL</p>
                {detail.published_url && (
                  <a
                    href={detail.published_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    열기
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://blog.example.com/post/..."
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSaveUrl}
                  disabled={isPending || !urlInput.trim()}
                  className="h-8 gap-1 bg-violet-600 hover:bg-violet-700"
                >
                  <Save className="h-3 w-3" />
                  {isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
              {detail.is_tracking && (
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <Radio className="h-3 w-3" />
                  순위 추적 중
                </div>
              )}
            </div>

            {/* 본문 미리보기 */}
            {detail.body && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">본문 (마크다운)</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyBody}
                    className="h-7 gap-1 text-xs"
                  >
                    <Copy className="h-3 w-3" />
                    복사
                  </Button>
                </div>
                <textarea
                  readOnly
                  value={detail.body}
                  className="w-full h-48 rounded-md border border-input bg-muted/30 px-3 py-2 text-xs font-mono resize-y focus-visible:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
