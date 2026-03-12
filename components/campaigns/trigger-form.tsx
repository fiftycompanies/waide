"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { triggerCampaign } from "@/lib/actions/brand-actions";
import { Rocket, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import type { BestContent } from "@/lib/actions/analytics-actions";

interface TriggerFormProps {
  clientId: string | null;
  clientName?: string;
  bestContents: BestContent[];
}

export function TriggerForm({ clientId, clientName, bestContents }: TriggerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [keyword, setKeyword] = useState("");
  const [subKeyword, setSubKeyword] = useState("");
  const [styleRefId, setStyleRefId] = useState<string>("none");
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const noBrand = !clientId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !keyword.trim()) return;
    setResult(null);

    startTransition(async () => {
      const res = await triggerCampaign({
        clientId,
        keyword: keyword.trim(),
        subKeyword: subKeyword.trim() || undefined,
        styleRefIds: styleRefId !== "none" ? [styleRefId] : [],
      });

      if (res.success) {
        setResult({
          type: "success",
          message: `✅ CMO 에이전트 Job 생성 완료 (ID: ${res.jobId?.slice(0, 8)}...)`,
        });
        setKeyword("");
        setSubKeyword("");
        setStyleRefId("none");
        router.refresh();
      } else {
        setResult({ type: "error", message: `❌ 실패: ${res.error}` });
      }
    });
  }

  return (
    <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-purple-50/30">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
            <Sparkles className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <CardTitle className="text-base">콘텐츠 생성 지시</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              키워드를 입력하면 CMO → Copywriter → QC 파이프라인이 자동으로 시작됩니다
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {noBrand ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            사이드바에서 브랜드를 먼저 선택해주세요.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {clientName && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">대상 브랜드:</span>
                <Badge variant="outline" className="text-xs border-violet-200 text-violet-700">
                  {clientName}
                </Badge>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="keyword" className="text-xs font-medium">
                  메인 키워드 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="keyword"
                  placeholder="예: 글램핑 추천"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subKeyword" className="text-xs font-medium">
                  서브 키워드 <span className="text-muted-foreground">(선택)</span>
                </Label>
                <Input
                  id="subKeyword"
                  placeholder="예: 가평 글램핑 추천"
                  value={subKeyword}
                  onChange={(e) => setSubKeyword(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {bestContents.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="styleRef" className="text-xs font-medium">
                  Style Transfer 레퍼런스{" "}
                  <span className="text-muted-foreground">(선택)</span>
                </Label>
                <select
                  id="styleRef"
                  value={styleRefId}
                  onChange={(e) => setStyleRefId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="none">레퍼런스 없음 (기본)</option>
                  {bestContents.map((c) => {
                    const medal =
                      c.peak_rank <= 3
                        ? ["🥇", "🥈", "🥉"][c.peak_rank - 1]
                        : `${c.peak_rank}위`;
                    const label = c.title ?? c.keyword;
                    const wc = c.word_count ? ` (${c.word_count.toLocaleString()}자)` : "";
                    return (
                      <option key={c.id} value={c.id}>
                        {medal} {label}{wc}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {result && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                  result.type === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {result.type === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                {result.message}
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending || !keyword.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {isPending ? (
                <>⏳ 파이프라인 시작 중...</>
              ) : (
                <><Rocket className="h-4 w-4" /> 🚀 콘텐츠 생성 지시</>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
