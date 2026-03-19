"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import type { AiMarketBrand } from "@/lib/actions/brand-actions";
import { getBrandAnalysis, type BrandAnalysisRow } from "@/lib/actions/analysis-brand-actions";
import { generateHomepage } from "@/lib/actions/homepage-generate-actions";

// ── Types ───────────────────────────────────────────────────────────────────

type PipelineStep =
  | "idle"
  | "reference_crawl"
  | "brand_data_load"
  | "brand_homepage_crawl"
  | "content_generate"
  | "blog_inject"
  | "deploy"
  | "db_save"
  | "done"
  | "error";

const STEP_LABELS: Record<string, string> = {
  idle: "대기",
  reference_crawl: "레퍼런스 크롤링",
  brand_data_load: "브랜드 데이터 로딩",
  brand_homepage_crawl: "브랜드 홈페이지 크롤링",
  content_generate: "AI 콘텐츠 생성",
  blog_inject: "블로그 메뉴 설정",
  deploy: "Vercel 배포",
  db_save: "데이터 저장",
  done: "완료",
  error: "오류",
};

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// ── Brand Analysis Card ─────────────────────────────────────────────────────

function BrandAnalysisCard({ analysis }: { analysis: BrandAnalysisRow }) {
  const bi = (analysis.basic_info ?? {}) as Record<string, unknown>;
  const cs = (analysis.content_strategy ?? {}) as Record<string, unknown>;
  const ba = (cs.brand_analysis ?? {}) as Record<string, unknown>;
  const usp = (ba.usp ?? []) as string[];

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">브랜드 분석 자료</p>
        {analysis.marketing_score && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
            마케팅 점수: {analysis.marketing_score}점
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-muted-foreground">업체명:</span>{" "}
          <span className="font-medium">{(bi.name as string) || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">카테고리:</span>{" "}
          <span className="font-medium">{(bi.category as string) || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">홈페이지:</span>{" "}
          {(bi.homepage_url as string) ? (
            <a
              href={bi.homepage_url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:underline"
            >
              {bi.homepage_url as string}
            </a>
          ) : (
            <span className="font-medium">—</span>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">상태:</span>{" "}
          <span className="font-medium">{analysis.status}</span>
        </div>
      </div>
      {usp.length > 0 && (
        <div className="text-xs">
          <span className="text-muted-foreground">USP:</span>{" "}
          <span className="font-medium">{usp.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

// ── Progress Steps ──────────────────────────────────────────────────────────

function ProgressSteps({ currentStep }: { currentStep: PipelineStep }) {
  const steps: PipelineStep[] = [
    "reference_crawl",
    "brand_data_load",
    "content_generate",
    "blog_inject",
    "deploy",
    "done",
  ];

  const currentIdx = steps.indexOf(currentStep);

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const isActive = step === currentStep;
        const isDone = currentIdx > idx || currentStep === "done";
        const isPending = currentIdx < idx && currentStep !== "error";

        return (
          <div
            key={step}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-violet-50 text-violet-700 border border-violet-200"
                : isDone
                ? "bg-emerald-50 text-emerald-700"
                : "text-muted-foreground"
            }`}
          >
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : isActive ? (
              <Loader2 className="h-4 w-4 animate-spin text-violet-500 shrink-0" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            )}
            <span className={isActive ? "font-medium" : ""}>
              {STEP_LABELS[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Form ───────────────────────────────────────────────────────────────

interface GeneratePipelineFormProps {
  brands: AiMarketBrand[];
}

export function GeneratePipelineForm({ brands }: GeneratePipelineFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [brandHomepageUrl, setBrandHomepageUrl] = useState("");
  const [analysis, setAnalysis] = useState<BrandAnalysisRow | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("idle");
  const [resultData, setResultData] = useState<{
    projectId: string;
    deploymentUrl: string;
    subdomain: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // 브랜드 선택 시 분석 자료 자동 로딩
  useEffect(() => {
    if (!selectedClientId) {
      setAnalysis(null);
      setBrandHomepageUrl("");
      return;
    }

    setAnalysisLoading(true);
    getBrandAnalysis(selectedClientId)
      .then((result) => {
        setAnalysis(result);
        // 분석 데이터에 홈페이지 URL이 있으면 자동 채움
        const homepageUrl = (result?.basic_info as Record<string, unknown>)?.homepage_url as string;
        if (homepageUrl) {
          setBrandHomepageUrl(homepageUrl);
        } else {
          setBrandHomepageUrl("");
        }
      })
      .catch(() => {
        setAnalysis(null);
        setBrandHomepageUrl("");
      })
      .finally(() => {
        setAnalysisLoading(false);
      });
  }, [selectedClientId]);

  const canStart =
    selectedClientId && referenceUrl.trim() && pipelineStep === "idle";

  function handleStart() {
    if (!canStart) return;

    setPipelineStep("reference_crawl");
    setErrorMessage("");

    startTransition(async () => {
      const result = await generateHomepage({
        clientId: selectedClientId,
        referenceUrl: referenceUrl.trim(),
        brandHomepageUrl: brandHomepageUrl.trim() || undefined,
      });

      if (result.success && result.data) {
        setPipelineStep("done");
        setResultData({
          projectId: result.data.projectId,
          deploymentUrl: result.data.deploymentUrl,
          subdomain: result.data.subdomain,
        });
        toast.success("홈페이지가 성공적으로 생성되었습니다!");
      } else {
        setPipelineStep("error");
        setErrorMessage(result.error || "알 수 없는 오류가 발생했습니다.");
        toast.error(result.error || "홈페이지 생성 실패");
      }
    });
  }

  function handleReset() {
    setPipelineStep("idle");
    setResultData(null);
    setErrorMessage("");
  }

  const isRunning = pipelineStep !== "idle" && pipelineStep !== "done" && pipelineStep !== "error";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 좌측: 입력 폼 */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-lg border border-border/60 bg-card p-6 space-y-5">
          {/* 브랜드 선택 */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-select">브랜드 선택 *</Label>
            <select
              id="brand-select"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              disabled={isRunning}
              className={selectCls}
            >
              <option value="">브랜드를 선택해주세요</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* 브랜드 분석 자료 */}
          {analysisLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              분석 자료를 불러오는 중...
            </div>
          )}
          {analysis && <BrandAnalysisCard analysis={analysis} />}
          {selectedClientId && !analysisLoading && !analysis && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              이 브랜드에 대한 분석 자료가 없습니다. 생성은 가능하지만, 분석 자료가 있으면 더 좋은 결과를 얻을 수 있습니다.
            </div>
          )}

          {/* 브랜드 홈페이지 URL (선택) — 분석 데이터에 없을 때만 표시 */}
          {!((analysis?.basic_info as Record<string, unknown>)?.homepage_url) && (
            <div className="space-y-1.5">
              <Label htmlFor="brand-url">브랜드 기존 홈페이지 URL (선택)</Label>
              <Input
                id="brand-url"
                placeholder="https://example.com (없으면 비워두세요)"
                value={brandHomepageUrl}
                onChange={(e) => setBrandHomepageUrl(e.target.value)}
                disabled={isRunning}
              />
              <p className="text-[11px] text-muted-foreground">
                기존 홈페이지가 있으면 입력해주세요. 콘텐츠 생성 시 참고합니다.
              </p>
            </div>
          )}

          {/* 레퍼런스 URL */}
          <div className="space-y-1.5">
            <Label htmlFor="reference-url">레퍼런스 홈페이지 URL *</Label>
            <Input
              id="reference-url"
              placeholder="https://reference-site.com"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              disabled={isRunning}
            />
            <p className="text-[11px] text-muted-foreground">
              참고할 인테리어 홈페이지 URL을 입력하세요. 구조와 디자인 패턴을 분석합니다.
            </p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3 pt-2">
            <Link href="/homepage">
              <Button variant="outline" disabled={isRunning}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                목록으로
              </Button>
            </Link>

            {pipelineStep === "idle" && (
              <Button
                onClick={handleStart}
                disabled={!canStart || isPending}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                생성 시작
              </Button>
            )}

            {pipelineStep === "error" && (
              <Button onClick={handleReset} variant="outline">
                다시 시도
              </Button>
            )}
          </div>
        </div>

        {/* 에러 메시지 */}
        {pipelineStep === "error" && errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 inline mr-1.5" />
            {errorMessage}
          </div>
        )}

        {/* 완료 결과 */}
        {pipelineStep === "done" && resultData && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="font-semibold text-emerald-800">홈페이지 생성 완료!</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600" />
                <span className="font-mono">{resultData.deploymentUrl}</span>
                <a
                  href={resultData.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="text-emerald-700">
                서브도메인: <span className="font-mono font-medium">{resultData.subdomain}.waide.kr</span>
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Link href={`/homepage/${resultData.projectId}`}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  프로젝트 상세보기
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={handleReset}>
                새로 생성
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 우측: 프로그레스 */}
      <div className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-card p-4 space-y-4 sticky top-6">
          <p className="text-sm font-medium">생성 진행 상황</p>
          {isRunning || pipelineStep === "done" ? (
            <ProgressSteps currentStep={pipelineStep} />
          ) : pipelineStep === "error" ? (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              오류가 발생했습니다
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              생성 시작 버튼을 누르면 단계별로 진행됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
