/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
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
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import type { AiMarketBrand } from "@/lib/actions/brand-actions";
import { getBrandAnalysis, type BrandAnalysisRow } from "@/lib/actions/analysis-brand-actions";
// generateHomepage 삭제됨 — 수동 제작 플로우 전환 (2026-03)
import {
  TEMPLATE_NAMES,
  TEMPLATE_LABELS,
  type TemplateName,
} from "@/lib/homepage/generate/template-types";

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

const MAX_REFERENCE_URLS = 3;

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
  initialClientId?: string | null;
}

export function GeneratePipelineForm({ brands, initialClientId }: GeneratePipelineFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || "");
  const [generationMode, setGenerationMode] = useState<"clone" | "template">("clone");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateName>("dark-luxury");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([""]);
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

  // 레퍼런스 URL 관리
  function addReferenceUrl() {
    if (referenceUrls.length < MAX_REFERENCE_URLS) {
      setReferenceUrls([...referenceUrls, ""]);
    }
  }

  function removeReferenceUrl(index: number) {
    if (referenceUrls.length > 1) {
      setReferenceUrls(referenceUrls.filter((_, i) => i !== index));
    }
  }

  function updateReferenceUrl(index: number, value: string) {
    const updated = [...referenceUrls];
    updated[index] = value;
    setReferenceUrls(updated);
  }

  const validUrls = referenceUrls.filter((u) => u.trim().length > 0);
  const canStart = selectedClientId
    && (generationMode === "template" || validUrls.length > 0)
    && pipelineStep === "idle";

  // 진행 단계 시뮬레이션 타이머 (서버 액션은 스트리밍 불가)
  const progressTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearProgressTimers = useCallback(() => {
    progressTimersRef.current.forEach(clearTimeout);
    progressTimersRef.current = [];
  }, []);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => clearProgressTimers();
  }, [clearProgressTimers]);

  function handleStart() {
    if (!canStart) return;

    setPipelineStep("reference_crawl");
    setErrorMessage("");
    clearProgressTimers();

    // 예상 시간 기반 진행 단계 시뮬레이션
    // 실제 서버 작업: 크롤링(5-10s) → 브랜드(2s) → AI(10-20s) → 블로그(2s) → 배포(10-20s)
    const stepSchedule: Array<{ step: PipelineStep; delayMs: number }> = [
      { step: "brand_data_load", delayMs: 6000 },
      { step: "content_generate", delayMs: 10000 },
      { step: "blog_inject", delayMs: 25000 },
      { step: "deploy", delayMs: 30000 },
    ];

    stepSchedule.forEach(({ step, delayMs }) => {
      const timer = setTimeout(() => {
        // 이미 완료/에러면 시뮬레이션 중단
        setPipelineStep((prev) => {
          if (prev === "done" || prev === "error") return prev;
          return step;
        });
      }, delayMs);
      progressTimersRef.current.push(timer);
    });

    // 자동 생성 기능 제거됨 — 수동 제작 플로우로 전환 (2026-03)
    clearProgressTimers();
    setPipelineStep("error");
    setErrorMessage("자동 생성 기능은 더 이상 지원되지 않습니다. 홈페이지 제작 신청을 이용해주세요.");
    toast.error("자동 생성 기능이 제거되었습니다.");
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

          {/* 생성 방식 선택 */}
          <div className="space-y-1.5">
            <Label>생성 방식 *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGenerationMode("clone")}
                disabled={isRunning}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                  generationMode === "clone"
                    ? "border-violet-400 bg-violet-50 ring-1 ring-violet-400"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <span className="text-sm font-medium">레퍼런스 복제</span>
                <span className="text-[11px] text-muted-foreground">
                  레퍼런스 URL의 디자인을 복제합니다
                </span>
              </button>
              <button
                type="button"
                onClick={() => setGenerationMode("template")}
                disabled={isRunning}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                  generationMode === "template"
                    ? "border-violet-400 bg-violet-50 ring-1 ring-violet-400"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <span className="text-sm font-medium">템플릿 선택</span>
                <span className="text-[11px] text-muted-foreground">
                  고품질 사전 제작 템플릿을 사용합니다
                </span>
              </button>
            </div>
          </div>

          {/* 템플릿 선택 (템플릿 모드) */}
          {generationMode === "template" && (
            <div className="space-y-1.5">
              <Label htmlFor="template-select">템플릿 선택 *</Label>
              <select
                id="template-select"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as TemplateName)}
                disabled={isRunning}
                className={selectCls}
              >
                {TEMPLATE_NAMES.map((t) => (
                  <option key={t} value={t}>
                    {TEMPLATE_LABELS[t]}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                업종에 맞는 템플릿을 선택하세요. AI가 브랜드 정보를 자동 주입합니다.
              </p>
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

          {/* 레퍼런스 URL (1-3개) — 복제 모드에서만 표시 */}
          {generationMode === "clone" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>레퍼런스 홈페이지 URL * (최대 {MAX_REFERENCE_URLS}개)</Label>
              {referenceUrls.length < MAX_REFERENCE_URLS && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addReferenceUrl}
                  disabled={isRunning}
                  className="h-7 text-xs text-violet-600 hover:text-violet-700"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  URL 추가
                </Button>
              )}
            </div>
            {referenceUrls.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`https://reference-site${index + 1}.com`}
                  value={url}
                  onChange={(e) => updateReferenceUrl(index, e.target.value)}
                  disabled={isRunning}
                />
                {referenceUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReferenceUrl(index)}
                    disabled={isRunning}
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              참고할 인테리어 홈페이지 URL을 입력하세요. 구조, 디자인, 색상 등을 분석합니다.
              여러 사이트를 입력하면 디자인 패턴을 비교 분석합니다.
            </p>
          </div>
          )}

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
                {generationMode === "template"
                  ? `템플릿 생성 (${TEMPLATE_LABELS[selectedTemplate].split(" (")[0]})`
                  : `생성 시작 ${validUrls.length > 1 ? `(${validUrls.length}개 레퍼런스)` : ""}`}
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
