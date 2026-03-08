"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { AEODashboardData } from "@/lib/actions/aeo-tracking-actions";

interface AEODashboardSectionProps {
  data: AEODashboardData;
}

const MODEL_LABELS: Record<string, string> = {
  perplexity: "Perplexity",
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "긍정",
  neutral: "중립",
  negative: "부정",
};

export function AEODashboardSection({ data }: AEODashboardSectionProps) {
  const hasData = data.score !== null;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AEO 성과</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            아직 AEO 추적 데이터가 없습니다.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/analytics?tab=aeo">
              추적 시작 <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* AEO Visibility Score */}
      <Card className="bg-gradient-to-br from-violet-50 to-blue-50 border">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted-foreground">AEO Visibility Score</p>
            <span className="text-xl">🤖</span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-bold tracking-tight">{data.score?.toFixed(1) ?? "-"}</p>
            {data.trend !== 0 && (
              <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${
                data.trend > 0 ? "text-emerald-600" : "text-red-500"
              }`}>
                {data.trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {data.trend > 0 ? "+" : ""}{data.trend.toFixed(1)}
              </span>
            )}
            {data.trend === 0 && (
              <span className="inline-flex items-center gap-0.5 text-sm text-muted-foreground">
                <Minus className="h-4 w-4" /> 유지
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">전주 대비</p>
        </CardContent>
      </Card>

      {/* AI 엔진별 언급 횟수 */}
      {Object.keys(data.byModel).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI 엔진별 추적</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {["perplexity", "claude", "chatgpt", "gemini"].map((model) => {
                const count = data.byModel[model] || 0;
                const maxCount = Math.max(...Object.values(data.byModel), 1);
                return (
                  <div key={model} className="flex items-center gap-2">
                    <span className="text-xs w-20 text-muted-foreground">{MODEL_LABELS[model]}</span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs w-8 text-right">{count > 0 ? `${count}회` : "-"}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 최근 언급 TOP 5 */}
      {data.recentMentions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">최근 언급된 질문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentMentions.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {MODEL_LABELS[m.ai_model] || m.ai_model}
                  </Badge>
                  <span className="truncate flex-1">{m.question}</span>
                  {m.position && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {m.position}위
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 미노출 질문 (콘텐츠 생성 기회) */}
      {data.unmatchedQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">미노출 질문 (콘텐츠 기회)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.unmatchedQuestions.slice(0, 5).map((q) => (
                <div key={q.id} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1 text-muted-foreground">{q.question}</span>
                  <Button asChild variant="ghost" size="sm" className="h-6 text-xs shrink-0">
                    <Link href={`/contents?tab=create`}>생성</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href="/analytics?tab=aeo">
          AEO 상세 분석 <ArrowRight className="h-3 w-3 ml-1" />
        </Link>
      </Button>
    </div>
  );
}
