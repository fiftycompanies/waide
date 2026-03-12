"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateKnowledgeVerdict, type EvolvingKnowledge } from "@/lib/actions/analytics-actions";

interface Props {
  records: EvolvingKnowledge[];
}

const VERDICT_STYLES: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-700 border-green-200",
  pending:   "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  rejected:  "bg-red-500/10 text-red-700 border-red-200",
};

const VERDICT_LABELS: Record<string, string> = {
  confirmed: "✅ 확정",
  pending:   "🔄 검토중",
  rejected:  "❌ 기각",
};

const AGENT_LABELS: Record<string, string> = {
  CMO:           "전략총괄",
  COPYWRITER:    "콘텐츠팀",
  RND:           "데이터분석",
  OPS_QUALITY:   "QC봇",
  OPS_PUBLISHER: "발행팀",
  ANALYST_SERP:  "순위분석",
  SYSTEM:        "시스템",
};

export function EvolvingKnowledgeTable({ records }: Props) {
  const [list, setList] = useState<EvolvingKnowledge[]>(records);
  const [, startTransition] = useTransition();

  const handleVerdict = (id: string, verdict: "confirmed" | "pending" | "rejected") => {
    startTransition(async () => {
      const result = await updateKnowledgeVerdict(id, verdict);
      if (result.success) {
        setList((prev) =>
          prev.map((r) => (r.id === id ? { ...r, verdict } : r))
        );
      }
    });
  };

  if (list.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        아직 축적된 지식이 없습니다. SERP 수집 후 자동으로 생성됩니다.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* 헤더 */}
      <div className="grid grid-cols-[80px_1fr_160px_90px_110px] gap-2 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>에이전트</span>
        <span>가설 / 액션</span>
        <span>결과</span>
        <span>상태</span>
        <span className="text-right">판정</span>
      </div>

      {/* 목록 */}
      <div className="divide-y">
        {list.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[80px_1fr_160px_90px_110px] gap-2 px-4 py-3 items-start text-sm hover:bg-muted/20 transition-colors"
          >
            {/* 에이전트 */}
            <div className="pt-0.5">
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {AGENT_LABELS[r.agent_type] ?? r.agent_type}
              </Badge>
            </div>

            {/* 가설 + 태그 */}
            <div className="min-w-0">
              <p className="font-medium leading-snug break-words">{r.hypothesis}</p>
              {r.action && (
                <p className="text-xs text-muted-foreground mt-0.5 break-words">{r.action}</p>
              )}
              {r.tags && r.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 결과 */}
            <div className="text-xs text-muted-foreground leading-snug break-words">
              {r.outcome ?? "—"}
            </div>

            {/* 상태 배지 */}
            <div className="pt-0.5">
              <Badge
                variant="outline"
                className={`text-xs ${VERDICT_STYLES[r.verdict] ?? ""}`}
              >
                {VERDICT_LABELS[r.verdict] ?? r.verdict}
              </Badge>
            </div>

            {/* 판정 버튼 */}
            <div className="flex justify-end gap-1 flex-wrap">
              {r.verdict !== "confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50"
                  onClick={() => handleVerdict(r.id, "confirmed")}
                >
                  확정
                </Button>
              )}
              {r.verdict !== "rejected" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs text-red-700 border-red-200 hover:bg-red-50"
                  onClick={() => handleVerdict(r.id, "rejected")}
                >
                  기각
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
