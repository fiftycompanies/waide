"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ExternalLink, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { KeywordPublishHistoryItem } from "@/lib/actions/keyword-actions";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  tracking: "bg-sky-100 text-sky-700 border-sky-200",
  published: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  review: "검토",
  approved: "승인",
  tracking: "추적중",
  published: "발행됨",
  rejected: "반려",
};

interface KeywordHistoryClientProps {
  items: KeywordPublishHistoryItem[];
}

export function KeywordHistoryClient({ items }: KeywordHistoryClientProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCount, setShowCount] = useState(10);

  function toggleExpand(keywordId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(keywordId)) next.delete(keywordId);
      else next.add(keywordId);
      return next;
    });
  }

  const displayed = items.slice(0, showCount);
  const hasMore = items.length > showCount;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="키워드 이력이 없습니다"
        description="키워드를 등록하고 콘텐츠를 생성하면 이력이 표시됩니다."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border overflow-hidden">
        {/* 헤더 */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span className="w-6" />
          <span>키워드</span>
          <span>콘텐츠 수</span>
          <span>순위 PC</span>
          <span>순위 MO</span>
        </div>

        {/* 행 */}
        <div className="divide-y">
          {displayed.map((item) => {
            const isOpen = expanded.has(item.keyword_id);
            return (
              <div key={item.keyword_id}>
                {/* 키워드 행 */}
                <div
                  onClick={() => toggleExpand(item.keyword_id)}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <span className="w-6 flex items-center justify-center">
                    {item.content_count > 0 ? (
                      isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )
                    ) : (
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    )}
                  </span>
                  <div>
                    <span className="text-sm font-medium">{item.keyword}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.content_count}건
                  </span>
                  <span className="text-xs">
                    {item.rank_pc != null ? (
                      <span className={item.rank_pc <= 3 ? "text-emerald-600 font-semibold" : item.rank_pc <= 10 ? "text-amber-600" : "text-muted-foreground"}>
                        {item.rank_pc}위
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </span>
                  <span className="text-xs">
                    {item.rank_mo != null ? (
                      <span className={item.rank_mo <= 3 ? "text-emerald-600 font-semibold" : item.rank_mo <= 10 ? "text-amber-600" : "text-muted-foreground"}>
                        {item.rank_mo}위
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </span>
                </div>

                {/* 하위 콘텐츠 (accordion) */}
                {isOpen && item.contents.length > 0 && (
                  <div className="bg-muted/10 border-t">
                    {item.contents.map((c) => (
                      <div
                        key={c.id}
                        className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2.5 pl-12 items-center border-b border-border/30 last:border-b-0"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
                        <div className="min-w-0 flex items-center gap-1.5">
                          <p className="text-xs truncate">
                            {c.title ?? "(제목 없음)"}
                          </p>
                          {c.published_url && (
                            <a
                              href={c.published_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0"
                            >
                              <ExternalLink className="h-3 w-3 text-blue-500" />
                            </a>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${STATUS_COLORS[c.publish_status] ?? ""}`}
                        >
                          {STATUS_LABELS[c.publish_status] ?? c.publish_status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 더보기 */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCount((prev) => prev + 10)}
            className="gap-1"
          >
            더보기 ({items.length - showCount}건 남음)
          </Button>
        </div>
      )}
    </div>
  );
}
