"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, Lightbulb, Loader2, Sparkles, Target, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { expandNicheKeywords, getClientMainKeywords } from "@/lib/actions/keyword-expansion-actions";
import { generateKeywordStrategy, getKeywordStrategy } from "@/lib/actions/keyword-strategy-actions";

interface KeywordStrategySectionProps {
  clientId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialStrategy: any;
}

export function KeywordStrategySection({ clientId, initialStrategy }: KeywordStrategySectionProps) {
  const router = useRouter();
  const [isExpanding, startExpand] = useTransition();
  const [isGenerating, startGenerate] = useTransition();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [strategy, setStrategy] = useState<any>(initialStrategy);

  const handleExpand = () => {
    startExpand(async () => {
      const mainKeywords = await getClientMainKeywords(clientId);
      if (mainKeywords.length === 0) {
        toast.error("활성 키워드가 없습니다. 먼저 키워드를 등록해주세요.");
        return;
      }
      const result = await expandNicheKeywords({
        clientId,
        mainKeywords,
      });
      if (result.success) {
        toast.success(`니치 키워드 ${result.inserted}개 발굴, ${result.skipped}개 스킵`);
        router.refresh();
      } else {
        toast.error(result.error || "니치 키워드 발굴 실패");
      }
    });
  };

  const handleStrategy = () => {
    startGenerate(async () => {
      const result = await generateKeywordStrategy(clientId);
      if (result.success) {
        toast.success("키워드 전략이 생성되었습니다.");
        setStrategy(result.strategy);
        router.refresh();
      } else {
        toast.error(result.error || "전략 생성 실패");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* AI Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExpand}
          disabled={isExpanding}
          className="gap-1.5 h-8 border-violet-200 text-violet-700 hover:bg-violet-50"
        >
          {isExpanding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {isExpanding ? "발굴 중..." : "니치 키워드 발굴"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleStrategy}
          disabled={isGenerating}
          className="gap-1.5 h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
          {isGenerating ? "전략 생성 중..." : "전략 생성"}
        </Button>
      </div>

      {/* Strategy View (only when data exists) */}
      {strategy && (
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold">키워드 전략 요약 (CMO 생성)</h3>
            {strategy.generated_at && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(strategy.generated_at || strategy.keyword_strategy_generated_at).toLocaleDateString("ko-KR")}
              </span>
            )}
          </div>

          {/* Strategy Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Quick Win */}
            {strategy.quick_win_keywords && strategy.quick_win_keywords.length > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Quick Win ({strategy.quick_win_keywords.length})
                </div>
                <div className="space-y-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {strategy.quick_win_keywords.slice(0, 5).map((k: any, i: number) => (
                    <div key={i} className="text-xs flex items-center justify-between">
                      <span className="font-medium truncate">{k.keyword}</span>
                      {k.current_rank && k.target_rank && (
                        <span className="text-muted-foreground shrink-0 ml-1">{k.current_rank}→{k.target_rank}위</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Niche */}
            {strategy.niche_keywords && strategy.niche_keywords.length > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-violet-700 text-xs font-semibold">
                  <Lightbulb className="h-3.5 w-3.5" />
                  니치 선점 ({strategy.niche_keywords.length})
                </div>
                <div className="space-y-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {strategy.niche_keywords.slice(0, 5).map((k: any, i: number) => (
                    <div key={i} className="text-xs flex items-center justify-between">
                      <span className="font-medium truncate">{k.keyword}</span>
                      <span className="text-muted-foreground shrink-0 ml-1">미공략→TOP5</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Defense */}
            {strategy.defense_keywords && strategy.defense_keywords.length > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold">
                  <Shield className="h-3.5 w-3.5" />
                  방어 ({strategy.defense_keywords.length})
                </div>
                <div className="space-y-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {strategy.defense_keywords.slice(0, 5).map((k: any, i: number) => (
                    <div key={i} className="text-xs flex items-center justify-between">
                      <span className="font-medium truncate">{k.keyword}</span>
                      <span className="text-muted-foreground shrink-0 ml-1">현재 유지</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Monthly Roadmap (if available) */}
          {strategy.monthly_roadmap && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">이번달 콘텐츠 로드맵</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {Object.entries(strategy.monthly_roadmap).slice(0, 4).map(([week, data]: [string, any]) => (
                  <div key={week} className="text-xs border rounded p-2">
                    <p className="font-semibold text-muted-foreground mb-1">{week}</p>
                    {data.keyword && <p className="font-medium">{data.keyword}</p>}
                    {data.content_type && <p className="text-muted-foreground">{data.content_type}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
