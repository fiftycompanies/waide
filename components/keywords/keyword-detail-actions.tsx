"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarChart3, Search, Loader2 } from "lucide-react";
import { triggerSerpCheck, refreshKeywordSearchVolume } from "@/lib/actions/keyword-actions";

interface KeywordDetailActionsProps {
  keywordId: string;
}

export function KeywordDetailActions({ keywordId }: KeywordDetailActionsProps) {
  const router = useRouter();
  const [isSerpPending, startSerpTransition] = useTransition();
  const [isVolumePending, startVolumeTransition] = useTransition();

  function handleSerpTrigger() {
    startSerpTransition(async () => {
      const result = await triggerSerpCheck(keywordId);
      if (result.success) {
        const pc = result.pcRank != null ? `PC ${result.pcRank}위` : "PC 미노출";
        const mo = result.moRank != null ? `MO ${result.moRank}위` : "MO 미노출";
        toast.success(`순위 수집 완료 — ${pc} / ${mo}`);
        router.refresh();
      } else {
        toast.error(result.error ?? "SERP 트리거 실패");
      }
    });
  }

  function handleVolumeRefresh() {
    startVolumeTransition(async () => {
      const result = await refreshKeywordSearchVolume(keywordId);
      if (result.success) {
        const src = result.source === "datalab" ? " (DataLab 추정)" : "";
        toast.success(
          `검색량 업데이트 완료${src} — PC: ${result.pc?.toLocaleString()}, MO: ${result.mo?.toLocaleString()}, 합계: ${result.total?.toLocaleString()}`
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "검색량 조회 실패");
      }
    });
  }

  const isPending = isSerpPending || isVolumePending;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleVolumeRefresh}
        disabled={isPending}
        title="검색량 갱신 (광고API 또는 DataLab)"
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isVolumePending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        {isVolumePending ? "조회 중..." : "검색량 조회"}
      </button>

      <button
        onClick={handleSerpTrigger}
        disabled={isPending}
        title="네이버 SERP 순위 수집"
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSerpPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <BarChart3 className="h-4 w-4" />
        )}
        {isSerpPending ? "수집 중..." : "순위 즉시 수집"}
      </button>
    </div>
  );
}
