"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Check, Copy, ExternalLink, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Content } from "@/lib/actions/ops-actions";
import { updatePublishedUrl } from "@/lib/actions/ops-actions";

interface PublishWizardProps {
  content: Content;
}

export function PublishWizard({ content }: PublishWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [publishUrl, setPublishUrl] = useState(content.published_url ?? content.url ?? "");
  const [isPending, startTransition] = useTransition();

  const body = content.body ?? "";
  const qcScore = content.metadata?.qc_score as number | undefined;
  const qcPass = content.metadata?.qc_pass as boolean | undefined;

  function handleCopy() {
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      toast.success("원고가 클립보드에 복사되었습니다.");
      setTimeout(() => setCopied(false), 3000);
    });
  }

  function handlePublishComplete() {
    if (!publishUrl.trim()) {
      toast.error("발행된 URL을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const result = await updatePublishedUrl(content.id, publishUrl.trim());
      if (result.success) {
        toast.success("발행 완료! SERP 순위 추적이 시작됩니다.");
        router.push(`/ops/contents/${content.id}`);
        router.refresh();
      } else {
        toast.error(result.error ?? "발행 완료 처리 실패");
      }
    });
  }

  const steps = [
    { num: 1, label: "원고 확인" },
    { num: 2, label: "발행 방법" },
    { num: 3, label: "발행 완료" },
  ];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0 justify-center">
        {steps.map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  step > s.num
                    ? "bg-emerald-500 text-white"
                    : step === s.num
                    ? "bg-violet-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  step === s.num
                    ? "text-violet-600 font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-px w-16 mb-5 mx-2 ${
                  step > s.num ? "bg-emerald-400" : "bg-border/60"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">원고 미리보기</CardTitle>
                <div className="flex items-center gap-2">
                  {qcScore != null && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        qcPass
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      QC {qcScore}/100 {qcPass ? "PASS" : "FAIL"}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {content.word_count?.toLocaleString() ?? "\u2014"}자
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-background p-6 max-h-[400px] overflow-auto text-sm leading-relaxed">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleCopy} variant="outline" className="gap-1.5">
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  원고 복사
                </>
              )}
            </Button>
            <Button
              onClick={() => setStep(2)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              다음 단계
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className="border-2 border-violet-200 cursor-pointer hover:border-violet-400 transition-colors"
              onClick={() => setStep(3)}
            >
              <CardContent className="p-6 text-center space-y-3">
                <Globe className="h-10 w-10 mx-auto text-violet-500" />
                <div>
                  <p className="font-semibold">수동 발행</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    원고를 복사하여 블로그에 직접 발행한 후,
                    발행 URL을 등록합니다.
                  </p>
                </div>
                <Badge className="bg-violet-100 text-violet-700">사용 가능</Badge>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed border-border/60 opacity-60">
              <CardContent className="p-6 text-center space-y-3">
                <ExternalLink className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <div>
                  <p className="font-semibold text-muted-foreground">자동 발행</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    연결된 블로그 계정으로 자동 발행합니다.
                    API 연동이 필요합니다.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">준비 중</Badge>
              </CardContent>
            </Card>
          </div>

          <Button
            variant="outline"
            onClick={() => setStep(1)}
          >
            이전 단계
          </Button>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">발행 URL 등록</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                블로그에 발행한 글의 URL을 입력하면 SERP 순위 추적이 자동으로 시작됩니다.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://blog.naver.com/..."
                  value={publishUrl}
                  onChange={(e) => setPublishUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePublishComplete()}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>
              이전 단계
            </Button>
            <Button
              onClick={handlePublishComplete}
              disabled={isPending || !publishUrl.trim()}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isPending ? "처리 중..." : "발행 완료"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
