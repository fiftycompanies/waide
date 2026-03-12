"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Check, Copy, ExternalLink, Globe, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Content } from "@/lib/actions/ops-actions";
import { updatePublishedUrl } from "@/lib/actions/ops-actions";
import { executePublish, getClientBlogAccounts } from "@/lib/actions/publish-actions";
import type { BlogAccountForPublish } from "@/lib/publishers";

const PLATFORM_ICONS: Record<string, string> = {
  tistory: "🟠",
  wordpress: "🔵",
  medium: "⚫",
};

const PLATFORM_LABELS: Record<string, string> = {
  tistory: "Tistory",
  wordpress: "WordPress",
  medium: "Medium",
};

interface PublishWizardProps {
  content: Content;
}

export function PublishWizard({ content }: PublishWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [publishUrl, setPublishUrl] = useState(content.published_url ?? content.url ?? "");
  const [isPending, startTransition] = useTransition();

  // 자동 발행 관련
  const [publishMode, setPublishMode] = useState<"manual" | "auto">("manual");
  const [selectedPlatform, setSelectedPlatform] = useState<"tistory" | "wordpress" | "medium">("tistory");
  const [accounts, setAccounts] = useState<BlogAccountForPublish[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [publishAsDraft, setPublishAsDraft] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    url?: string;
    error?: string;
  } | null>(null);

  const body = content.body ?? "";
  const qcScore = content.metadata?.qc_score as number | undefined;
  const qcPass = content.metadata?.qc_pass as boolean | undefined;

  // 계정 목록 로드
  useEffect(() => {
    if (content.client_id) {
      getClientBlogAccounts(content.client_id).then((accs) => {
        setAccounts(accs);
        // 기본 계정 자동 선택
        const defaultAcc = accs.find((a) => a.is_default);
        if (defaultAcc) {
          setSelectedAccountId(defaultAcc.id);
          setSelectedPlatform(defaultAcc.platform as "tistory" | "wordpress" | "medium");
        } else if (accs.length > 0) {
          setSelectedAccountId(accs[0].id);
          setSelectedPlatform(accs[0].platform as "tistory" | "wordpress" | "medium");
        }
      });
    }
  }, [content.client_id]);

  // 플랫폼별 계정 필터
  const platformAccounts = accounts.filter((a) => a.platform === selectedPlatform);
  const hasAutoAccounts = accounts.filter((a) =>
    ["tistory", "wordpress", "medium"].includes(a.platform)
  ).length > 0;

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
        router.push(`/contents/${content.id}`);
        router.refresh();
      } else {
        toast.error(result.error ?? "발행 완료 처리 실패");
      }
    });
  }

  function handleAutoPublish() {
    if (!selectedAccountId || !content.client_id) {
      toast.error("발행 계정을 선택해주세요.");
      return;
    }
    startTransition(async () => {
      setPublishResult(null);
      const result = await executePublish({
        contentId: content.id,
        clientId: content.client_id!,
        blogAccountId: selectedAccountId,
        platform: selectedPlatform,
        publishAsDraft,
        publishType: "manual",
      });

      if (result.success && result.publication?.external_url) {
        setPublishResult({
          success: true,
          url: result.publication.external_url,
        });
        toast.success("발행 완료!");
      } else {
        setPublishResult({
          success: false,
          error: result.error || "발행 실패",
        });
        toast.error(result.error || "발행 실패");
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

      {/* Step 1: 원고 확인 */}
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
                <><Check className="h-3.5 w-3.5 text-emerald-600" />복사됨</>
              ) : (
                <><Copy className="h-3.5 w-3.5" />원고 복사</>
              )}
            </Button>
            <Button onClick={() => setStep(2)} className="bg-violet-600 hover:bg-violet-700">
              다음 단계
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: 발행 방법 선택 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 수동 발행 */}
            <Card
              className={`border-2 cursor-pointer transition-colors ${
                publishMode === "manual"
                  ? "border-violet-400 bg-violet-50/30"
                  : "border-border/60 hover:border-violet-200"
              }`}
              onClick={() => setPublishMode("manual")}
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
              </CardContent>
            </Card>

            {/* 자동 발행 */}
            <Card
              className={`border-2 cursor-pointer transition-colors ${
                !hasAutoAccounts
                  ? "border-dashed border-border/60 opacity-60 cursor-not-allowed"
                  : publishMode === "auto"
                  ? "border-violet-400 bg-violet-50/30"
                  : "border-border/60 hover:border-violet-200"
              }`}
              onClick={() => {
                if (hasAutoAccounts) setPublishMode("auto");
              }}
            >
              <CardContent className="p-6 text-center space-y-3">
                <Send className="h-10 w-10 mx-auto text-violet-500" />
                <div>
                  <p className="font-semibold">자동 발행</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    연결된 블로그 계정으로 API를 통해 자동 발행합니다.
                  </p>
                </div>
                {hasAutoAccounts ? (
                  <Badge className="bg-emerald-100 text-emerald-700">사용 가능</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <a href="/blog-accounts" className="hover:underline">계정 연동 필요</a>
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 자동 발행 선택 시 채널/계정 선택 UI */}
          {publishMode === "auto" && hasAutoAccounts && (
            <Card>
              <CardContent className="p-6 space-y-4">
                {/* 플랫폼 선택 */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">발행 채널</Label>
                  <div className="flex gap-2">
                    {(["tistory", "wordpress", "medium"] as const).map((p) => {
                      const count = accounts.filter((a) => a.platform === p).length;
                      return (
                        <button
                          key={p}
                          onClick={() => {
                            setSelectedPlatform(p);
                            const accs = accounts.filter((a) => a.platform === p);
                            if (accs.length > 0) setSelectedAccountId(accs[0].id);
                          }}
                          disabled={count === 0}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            selectedPlatform === p && count > 0
                              ? "border-violet-400 bg-violet-50 text-violet-700"
                              : "border-border text-muted-foreground hover:border-violet-200"
                          }`}
                        >
                          <span>{PLATFORM_ICONS[p]}</span>
                          {PLATFORM_LABELS[p]}
                          {count === 0 && <span className="text-[10px]">(미연동)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 계정 선택 */}
                {platformAccounts.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">계정</Label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {platformAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_name} {acc.is_default ? "(기본)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 공개 설정 */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">공개 설정</Label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={!publishAsDraft}
                        onChange={() => setPublishAsDraft(false)}
                        className="accent-violet-600"
                      />
                      공개
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={publishAsDraft}
                        onChange={() => setPublishAsDraft(true)}
                        className="accent-violet-600"
                      />
                      비공개 (초안)
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              이전 단계
            </Button>
            <Button
              onClick={() => {
                if (publishMode === "auto") {
                  handleAutoPublish();
                } else {
                  setStep(3);
                }
              }}
              disabled={isPending || (publishMode === "auto" && !selectedAccountId)}
              className="gap-1.5 bg-violet-600 hover:bg-violet-700"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : publishMode === "auto" ? (
                <Send className="h-3.5 w-3.5" />
              ) : null}
              {isPending ? "발행 중..." : publishMode === "auto" ? "발행하기" : "다음 단계"}
            </Button>
          </div>

          {/* 자동 발행 결과 */}
          {publishResult && (
            <Card className={publishResult.success ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}>
              <CardContent className="p-6 space-y-3">
                {publishResult.success ? (
                  <>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Check className="h-5 w-5" />
                      <span className="font-semibold">발행 완료!</span>
                    </div>
                    {publishResult.url && (
                      <div className="space-y-2">
                        <p className="text-sm">발행 URL: <a href={publishResult.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{publishResult.url}</a></p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(publishResult.url!);
                              toast.success("URL이 복사되었습니다.");
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            URL 복사
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(publishResult.url, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            블로그에서 확인
                          </Button>
                          <Button
                            size="sm"
                            className="bg-violet-600 hover:bg-violet-700"
                            onClick={() => {
                              router.push(`/contents/${content.id}`);
                              router.refresh();
                            }}
                          >
                            콘텐츠로 돌아가기
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-red-700">
                      <span className="font-semibold">발행 실패</span>
                    </div>
                    <p className="text-sm text-red-600">{publishResult.error}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAutoPublish}
                        disabled={isPending}
                      >
                        재시도
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPublishMode("manual");
                          setPublishResult(null);
                          setStep(3);
                        }}
                      >
                        수동 발행으로 전환
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: 수동 발행 URL 등록 */}
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

// Label component inline (avoid import issues)
function Label({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { children: React.ReactNode }) {
  return (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className ?? ""}`} {...props}>
      {children}
    </label>
  );
}
