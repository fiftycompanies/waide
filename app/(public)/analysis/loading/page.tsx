"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Store, MessageSquare, Search, BarChart3, Brain, Sparkles } from "lucide-react";

const STEPS = [
  { label: "매장 정보를 수집하고 있어요", icon: Store, range: [0, 20] },
  { label: "메뉴와 리뷰를 분석하고 있어요", icon: MessageSquare, range: [20, 40] },
  { label: "공략 키워드를 찾고 있어요", icon: Search, range: [40, 60] },
  { label: "검색량과 경쟁도를 계산하고 있어요", icon: BarChart3, range: [60, 80] },
  { label: "AI가 마케팅 전략을 수립하고 있어요", icon: Brain, range: [80, 100] },
];

function LoadingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? "";
  // ref 우선순위: 쿼리 파라미터 > 쿠키
  const paramRef = searchParams.get("ref") ?? "";
  const cookieRef = typeof document !== "undefined"
    ? (document.cookie.split("; ").find((c) => c.startsWith("waide_sales_ref="))?.split("=")[1] ?? "")
    : "";
  const ref = paramRef || cookieRef;

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!url || startedRef.current) return;
    startedRef.current = true;

    const startAnalysis = async () => {
      try {
        const resp = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, salesRef: ref || undefined }),
        });
        const data = await resp.json();
        if (data.error) { setError(data.error); return; }
        if (data.existing && data.id) { router.replace(`/analysis/${data.id}`); return; }
        setAnalysisId(data.id);
      } catch {
        setError("분석 요청 중 오류가 발생했어요. 다시 시도해주세요.");
      }
    };
    startAnalysis();
  }, [url, ref, router]);

  useEffect(() => {
    if (!analysisId) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const increment = prev < 40 ? 2 : prev < 70 ? 1.5 : 0.5;
        return Math.min(prev + increment, 95);
      });
    }, 500);

    const stepInterval = setInterval(() => {
      setProgress((p) => {
        const idx = STEPS.findIndex((s) => p >= s.range[0] && p < s.range[1]);
        if (idx >= 0) setCurrentStep(idx);
        return p;
      });
    }, 1000);

    const pollInterval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/analyze/${analysisId}`);
        const data = await resp.json();
        if (data.status === "completed") {
          setProgress(100);
          setCurrentStep(STEPS.length - 1);
          clearInterval(progressInterval);
          clearInterval(stepInterval);
          clearInterval(pollInterval);
          setTimeout(() => router.replace(`/analysis/${analysisId}`), 800);
        } else if (data.status === "failed") {
          clearInterval(progressInterval);
          clearInterval(stepInterval);
          clearInterval(pollInterval);
          setError(data.basic_info?.error ?? "분석 중 오류가 발생했어요.");
        }
      } catch { /* retry */ }
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearInterval(pollInterval);
    };
  }, [analysisId, router]);

  if (!url) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#666666]">URL이 필요합니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <span className="text-3xl">!</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">분석 실패</h2>
        <p className="text-[#a0a0a0] max-w-md mb-8">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-[#10b981] hover:bg-[#34d399] text-white font-semibold rounded-xl transition-colors"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  const StepIcon = STEPS[currentStep]?.icon ?? Sparkles;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 waide-grid-bg opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-lg text-center">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center">
            <StepIcon className="h-10 w-10 text-[#10b981] animate-pulse" />
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 border-[#10b981]/20 animate-ping" />
        </div>

        {/* Step Text */}
        <h2 className="text-2xl font-bold text-white mb-2 animate-fade-in-up">
          {STEPS[currentStep]?.label ?? "분석 중..."}
        </h2>
        <p className="text-[#666666] text-sm mb-8 truncate max-w-md mx-auto">
          {url.length > 60 ? url.slice(0, 60) + "..." : url}
        </p>

        {/* Progress Bar */}
        <div className="mb-4 h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#10b981] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[#10b981] text-sm font-mono mb-10">
          {Math.round(progress)}%
        </p>

        {/* Steps List */}
        <div className="space-y-3 text-left max-w-sm mx-auto">
          {STEPS.map((step, i) => {
            const isDone = progress >= step.range[1];
            const isCurrent = i === currentStep;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                  isDone ? "text-[#10b981]" : isCurrent ? "text-white" : "text-[#666666]"
                }`}
                style={{ opacity: isDone || isCurrent ? 1 : 0.4 }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  isDone ? "bg-[#10b981]/20 text-[#10b981]" : isCurrent ? "bg-[#10b981]/10 text-[#10b981] animate-pulse" : "bg-[#2a2a2a] text-[#666666]"
                }`}>
                  {isDone ? "✓" : i + 1}
                </div>
                <span className="font-medium">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AnalysisLoadingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
        </div>
      }
    >
      <LoadingContent />
    </Suspense>
  );
}
