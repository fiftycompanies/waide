"use client";

import { useState } from "react";
import { BarChart2, Loader2 } from "lucide-react";
import { runBrandAnalysis } from "@/lib/actions/analysis-brand-actions";

interface AnalysisRequiredBannerProps {
  clientId?: string;
}

export default function AnalysisRequiredBanner({ clientId }: AnalysisRequiredBannerProps) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!url.trim() || !clientId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await runBrandAnalysis(clientId, url.trim());
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error || "분석 시작에 실패했습니다");
      }
    } catch {
      setError("분석 시작에 실패했습니다");
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-6">
          <BarChart2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          분석을 시작했습니다
        </h2>
        <p className="text-sm text-gray-500 max-w-md">
          완료까지 수 분이 소요됩니다. 완료되면 대시보드에서 결과를 확인할 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 mb-6">
        <BarChart2 className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        네이버 플레이스 분석을 시작하세요
      </h2>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        업체의 네이버 플레이스 URL 또는 홈페이지 URL을 입력하면 AI가 분석을 시작합니다
      </p>
      <div className="w-full max-w-md space-y-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://map.naver.com/... 또는 https://your-website.com"
          className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={submitting}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting || !url.trim() || !clientId}
          className="w-full px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              분석 중...
            </>
          ) : (
            "분석 시작하기"
          )}
        </button>
      </div>
    </div>
  );
}
