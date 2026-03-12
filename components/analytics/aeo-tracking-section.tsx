"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  runAEOTracking,
  getAEOTrackingPreview,
  type AEOAnalyticsData,
} from "@/lib/actions/aeo-tracking-actions";

interface AEOTrackingSectionProps {
  clientId: string;
  data: AEOAnalyticsData;
  daysFilter: number;
}

export function AEOTrackingSection({ clientId, data, daysFilter }: AEOTrackingSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [preview, setPreview] = useState<{
    questionCount: number;
    modelCount: number;
    repeatCount: number;
    models: string[];
  } | null>(null);

  const handleTrackingClick = async () => {
    const p = await getAEOTrackingPreview(clientId);
    setPreview(p);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    startTransition(async () => {
      const result = await runAEOTracking(clientId);
      if (result.success) {
        toast.success(
          `추적 완료! ${result.tracked}개 질문 중 ${result.mentioned}개에서 브랜드가 언급되었습니다. Score: ${result.score ?? "-"}`
        );
      } else {
        toast.error(result.error || "추적 실행 중 오류가 발생했습니다");
      }
    });
  };

  const MODEL_LABELS: Record<string, string> = {
    perplexity: "Perplexity",
    claude: "Claude",
    chatgpt: "ChatGPT",
    gemini: "Gemini",
  };

  const hasData = data.questionTable.length > 0;

  return (
    <div className="space-y-6">
      {/* 상단 액션 바 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AEO 노출 분석</h2>
          <p className="text-sm text-muted-foreground">AI 엔진별 브랜드 언급 추적 및 분석</p>
        </div>
        <Button onClick={handleTrackingClick} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          {isPending ? "추적 중..." : "AEO 추적 실행"}
        </Button>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">아직 AEO 추적 데이터가 없습니다</h3>
            <p className="text-sm text-muted-foreground mb-4">
              [AEO 추적 실행] 버튼으로 AI 엔진별 브랜드 언급 추적을 시작하세요.
            </p>
            <Button onClick={handleTrackingClick} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              추적 시작
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 요약 KPI */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">추적 질문</p>
                <p className="text-2xl font-bold">{data.totalTracked}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">언급 감지</p>
                <p className="text-2xl font-bold text-emerald-600">{data.totalMentioned}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">언급률</p>
                <p className="text-2xl font-bold">
                  {data.totalTracked > 0
                    ? `${Math.round((data.totalMentioned / data.totalTracked) * 100)}%`
                    : "-"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">기간</p>
                <p className="text-2xl font-bold">{daysFilter}일</p>
              </CardContent>
            </Card>
          </div>

          {/* Score 추이 */}
          {data.scoreTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AEO Score 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {data.scoreTrend.slice(-14).map((point, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500/80 rounded-t transition-all"
                      style={{ height: `${Math.max(4, point.score)}%` }}
                      title={`${point.date}: ${point.score}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{data.scoreTrend[0]?.date}</span>
                  <span>{data.scoreTrend[data.scoreTrend.length - 1]?.date}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 질문별 노출 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">질문별 노출 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">질문</th>
                      <th className="text-center py-2 px-2 font-medium">Perplexity</th>
                      <th className="text-center py-2 px-2 font-medium">Claude</th>
                      <th className="text-center py-2 px-2 font-medium">ChatGPT</th>
                      <th className="text-center py-2 px-2 font-medium">Gemini</th>
                      <th className="text-center py-2 px-2 font-medium">평균 위치</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.questionTable.slice(0, 20).map((row) => (
                      <tr key={row.question_id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 max-w-xs truncate" title={row.question}>
                          <span className="text-xs text-muted-foreground mr-1">[{row.keyword}]</span>
                          {row.question}
                        </td>
                        <td className="text-center py-2 px-2">
                          <MentionCell data={row.perplexity} />
                        </td>
                        <td className="text-center py-2 px-2">
                          <MentionCell data={row.claude} />
                        </td>
                        <td className="text-center py-2 px-2">
                          <MentionCell data={row.chatgpt} />
                        </td>
                        <td className="text-center py-2 px-2">
                          <MentionCell data={row.gemini} />
                        </td>
                        <td className="text-center py-2 px-2">
                          {row.avg_position ? (
                            <Badge variant="outline">{row.avg_position}위</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 추적 확인 모달 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AEO 추적 실행</DialogTitle>
            <DialogDescription>
              선택된 브랜드의 활성 키워드 질문에 대해 AEO 추적을 실행합니다.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">추적 대상</span>
                <span>{preview.questionCount}개 질문 × {preview.modelCount}개 AI 모델 × {preview.repeatCount}회 반복</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">예상 소요</span>
                <span>약 2~5분</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">활성 AI 모델</span>
                <span>{preview.models.map((m) => MODEL_LABELS[m] || m).join(", ")}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>취소</Button>
            <Button onClick={handleConfirm}>실행 시작</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MentionCell({ data }: { data: { mentioned: boolean; position: number | null } | null }) {
  if (data === null) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }
  if (data.mentioned) {
    return (
      <span className="text-emerald-600 font-medium text-xs">
        {data.position ? `${data.position}위` : "언급"}
      </span>
    );
  }
  return <span className="text-red-400 text-xs">미노출</span>;
}
