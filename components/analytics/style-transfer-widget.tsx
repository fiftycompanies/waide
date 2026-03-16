"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { saveStyleRef } from "@/lib/actions/analytics-actions";
import type { BestContent } from "@/lib/actions/analytics-actions";

interface StyleTransferWidgetProps {
  contents: BestContent[];
  clientId?: string;
}

const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const INITIAL_DISPLAY = 5;

export function StyleTransferWidget({ contents, clientId }: StyleTransferWidgetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  function toggle(id: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleApply() {
    if (clientId === null || clientId === undefined || selected.size === 0) return;
    startTransition(async () => {
      const result = await saveStyleRef(clientId, Array.from(selected));
      if (result?.id) {
        setSaved(true);
        // 블로그 발행 플로우로 이동 (선택된 콘텐츠 ID를 쿼리 파라미터로 전달)
        router.push(`/contents?tab=create&styleContentIds=${Array.from(selected).join(",")}`);
      }
    });
  }

  // peak_rank ASC → 동일 순위 시 peak_rank_at DESC (최신 우선)
  const sorted = [...contents].sort((a, b) => {
    if (a.peak_rank !== b.peak_rank) return a.peak_rank - b.peak_rank;
    const dateA = a.peak_rank_at ?? "";
    const dateB = b.peak_rank_at ?? "";
    return dateB.localeCompare(dateA);
  });

  const isEmpty = sorted.length === 0;
  const hasMore = sorted.length > INITIAL_DISPLAY;
  const displayList = expanded ? sorted : sorted.slice(0, INITIAL_DISPLAY);

  return (
    <Card className="border-violet-100 bg-gradient-to-br from-violet-50/50 to-purple-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            📚 Style Transfer — 상위노출 베스트 글 학습
          </CardTitle>
          <Badge variant="outline" className="border-violet-200 text-violet-700 text-xs">
            {sorted.length}건 · peak_rank ≤ 5
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          과거 1~5위를 달성한 베스트 글의 구조를 학습하여 새 콘텐츠에 복제합니다.
          참조할 글을 선택하고 적용하면 김연구원이 분석 후 박작가에게 전달합니다.
        </p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-violet-200">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">베스트 글 없음</p>
              <p className="mt-1 text-xs text-muted-foreground">
                1~5위를 달성하고 peak_rank가 기록되면 여기에 표시됩니다
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {displayList.map((content) => {
                const isChecked = selected.has(content.id);
                const medal = RANK_MEDAL[content.peak_rank] ?? `${content.peak_rank}위`;
                const hs = content.heading_structure ?? {};

                return (
                  <label
                    key={content.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      isChecked
                        ? "border-violet-300 bg-violet-50"
                        : "border-border bg-background hover:border-violet-200 hover:bg-violet-50/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(content.id)}
                      className="mt-0.5 h-4 w-4 accent-violet-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">{medal}</span>
                        <span className="font-medium text-sm truncate">
                          {content.title ?? content.keyword}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {content.keyword}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {content.word_count && (
                          <span>✍️ {content.word_count.toLocaleString()}자</span>
                        )}
                        {content.image_count != null && content.image_count > 0 && (
                          <span>🖼️ 이미지 {content.image_count}장</span>
                        )}
                        {hs.h2_count != null && (
                          <span>
                            H2×{hs.h2_count}
                            {hs.h3_count != null ? ` H3×${hs.h3_count}` : ""}
                          </span>
                        )}
                        {hs.faq_count != null && hs.faq_count > 0 && (
                          <span>FAQ {hs.faq_count}개</span>
                        )}
                        {content.peak_rank_at && (
                          <span>📅 {content.peak_rank_at}</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
                className="w-full mt-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50"
              >
                {expanded ? (
                  <>접기 <ChevronUp className="ml-1 h-3.5 w-3.5" /></>
                ) : (
                  <>더보기 ({sorted.length - INITIAL_DISPLAY}건) <ChevronDown className="ml-1 h-3.5 w-3.5" /></>
                )}
              </Button>
            )}

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {selected.size > 0
                  ? `${selected.size}개 선택됨 — 김연구원이 구조 분석 후 박작가에게 전달`
                  : "참조할 글을 1개 이상 선택하세요"}
              </p>
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="text-xs text-emerald-600 font-medium">
                    ✅ 저장 완료 — 에이전트 대기 중
                  </span>
                )}
                <Button
                  size="sm"
                  disabled={selected.size === 0 || isPending || clientId === null || clientId === undefined}
                  onClick={handleApply}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isPending ? "처리 중..." : "캠페인에 적용"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
