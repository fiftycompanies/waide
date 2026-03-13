"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart2, Loader2, CheckCircle2, AlertTriangle, Globe } from "lucide-react";
import { runBrandAnalysis, getAnalysisStatus, getBrandAnalysis, type BrandAnalysisRow } from "@/lib/actions/analysis-brand-actions";
import { AnalysisResultView } from "@/components/analysis/AnalysisResultView";

type AnalysisState = "idle" | "analyzing" | "completed" | "failed";

interface AnalysisRequiredBannerProps {
  clientId?: string;
}

const STATUS_MESSAGES = [
  "AI가 웹사이트를 분석하고 있어요...",
  "SEO 기술 진단을 수행하고 있어요...",
  "키워드 전략을 수립하고 있어요...",
  "브랜드 톤을 분석하고 있어요...",
  "마케팅 점수를 계산하고 있어요...",
  "개선 포인트를 발굴하고 있어요...",
  "거의 완료되었어요...",
];

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isNaverUrl(url: string): boolean {
  return url.includes("naver.com") || url.includes("naver.me");
}

export default function AnalysisRequiredBanner({ clientId }: AnalysisRequiredBannerProps) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AnalysisState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [analysisData, setAnalysisData] = useState<BrandAnalysisRow | null>(null);

  const trimmedUrl = url.trim();
  const isNaver = isNaverUrl(trimmedUrl);
  const isValid = trimmedUrl.length > 0 && isValidUrl(trimmedUrl);
  const showWebsiteInfo = isValid && !isNaver;

  // Rotating status messages every 3 seconds
  useEffect(() => {
    if (state !== "analyzing") return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [state]);

  // Polling for analysis status every 2 seconds
  useEffect(() => {
    if (state !== "analyzing" || !analysisId) return;
    const interval = setInterval(async () => {
      setElapsed((prev) => prev + 2);
      try {
        const result = await getAnalysisStatus(analysisId);
        if (result.status === "completed") {
          setState("completed");
          // Fetch full analysis data for inline display
          if (clientId) {
            getBrandAnalysis(clientId).then((data) => {
              if (data) setAnalysisData(data);
            });
          }
        } else if (result.status === "failed") {
          setState("failed");
          setError("분석에 실패했습니다. 다시 시도해주세요.");
        }
      } catch {
        // Polling error — continue
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [state, analysisId, clientId]);

  // 120-second timeout
  useEffect(() => {
    if (elapsed >= 120 && state === "analyzing") {
      setState("failed");
      setError("분석 시간이 초과되었습니다. 다시 시도해주세요.");
    }
  }, [elapsed, state]);

  const handleSubmit = async () => {
    if (!trimmedUrl || !clientId) return;

    if (!isValidUrl(trimmedUrl)) {
      setError("올바른 URL을 입력해주세요 (https://...)");
      return;
    }

    setState("analyzing");
    setError(null);
    setElapsed(0);
    setMessageIndex(0);

    try {
      const result = await runBrandAnalysis(clientId, trimmedUrl);
      if (result.success && result.analysisId) {
        setAnalysisId(result.analysisId);
      } else {
        setState("failed");
        setError(result.error || "분석 시작에 실패했습니다");
      }
    } catch {
      setState("failed");
      setError("분석 시작에 실패했습니다");
    }
  };

  const handleRetry = () => {
    setState("idle");
    setError(null);
    setAnalysisId(null);
    setElapsed(0);
  };

  // ── ANALYZING STATE ──
  if (state === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">분석 진행 중</h2>
        <p className="text-sm text-gray-500 max-w-md mb-3 min-h-[20px] transition-all">
          {STATUS_MESSAGES[messageIndex]}
        </p>
        <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 mb-2">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min((elapsed / 120) * 100, 95)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400">{elapsed}초 경과</p>
      </div>
    );
  }

  // ── COMPLETED STATE ──
  if (state === "completed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-gray-900">분석 완료</h2>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            전체 화면으로 보기
          </Link>
        </div>
        {analysisData ? (
          <AnalysisResultView data={analysisData as unknown as Record<string, unknown>} variant="portal" compact />
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // ── FAILED STATE ──
  if (state === "failed") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">분석 실패</h2>
        <p className="text-sm text-red-500 max-w-md mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  // ── IDLE STATE ──
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 mb-6">
        <BarChart2 className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        마케팅 분석을 시작하세요
      </h2>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        업체의 네이버 플레이스 URL 또는 홈페이지 URL을 입력하면 AI가 분석을 시작합니다
      </p>
      <div className="w-full max-w-md space-y-3">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          placeholder="https://map.naver.com/... 또는 https://your-website.com"
          className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        />
        {showWebsiteInfo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
            <Globe className="h-4 w-4 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700">홈페이지 URL로 웹사이트 마케팅 진단을 진행합니다</p>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!trimmedUrl || !clientId}
          className="w-full px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          분석 시작하기
        </button>
      </div>
    </div>
  );
}
