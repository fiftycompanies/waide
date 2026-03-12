"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Brain, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runKnowledgeLearning } from "@/lib/actions/knowledge-actions";

interface Props {
  clientId?: string;
  recordCount: number;
  lastLearned: string | null;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  content_pattern: { label: "콘텐츠 패턴", emoji: "📊" },
  keyword_insight: { label: "키워드 인사이트", emoji: "🔑" },
  aeo_pattern: { label: "AEO 패턴", emoji: "📡" },
  style_transfer: { label: "Style Transfer", emoji: "🎨" },
  general: { label: "종합", emoji: "💡" },
};

export function KnowledgeLearningSection({ clientId, recordCount, lastLearned }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ patternsFound: number } | null>(null);

  function handleLearn() {
    startTransition(async () => {
      const res = await runKnowledgeLearning(clientId);
      if (res.success) {
        setResult({ patternsFound: res.patternsFound });
        if (res.patternsFound > 0) {
          toast.success(`${res.patternsFound}개 패턴이 학습되었습니다`);
        } else {
          toast.info(res.error || "새로운 패턴이 발견되지 않았습니다");
        }
        router.refresh();
      } else {
        toast.error(res.error || "학습 실패");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">총 학습 패턴</p>
          <p className="text-2xl font-bold mt-1">{recordCount}개</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">마지막 학습</p>
          <p className="text-sm font-medium mt-1">
            {lastLearned
              ? new Date(lastLearned).toLocaleString("ko-KR")
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">학습 범위</p>
          <p className="text-sm font-medium mt-1">
            {clientId ? "선택된 브랜드" : "전체 브랜드"}
          </p>
        </div>
      </div>

      {/* 학습 실행 버튼 */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleLearn}
          disabled={isPending}
          className="gap-2 bg-violet-600 hover:bg-violet-700"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {isPending ? "학습 실행 중..." : "학습 실행"}
        </Button>

        {result && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            {result.patternsFound}개 패턴 발견
          </span>
        )}
      </div>

      {/* 유형 범례 */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
        {Object.values(TYPE_LABELS).map((t) => (
          <span key={t.label} className="flex items-center gap-1">
            {t.emoji} {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
