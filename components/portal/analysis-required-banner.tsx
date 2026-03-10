"use client";

import { BarChart2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AnalysisRequiredBanner() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 mb-6">
        <BarChart2 className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        아직 분석이 완료되지 않았어요
      </h2>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        매장 분석을 완료하면 맞춤 키워드 추천, 콘텐츠 생성, 순위 추적 등
        AI 마케팅 기능을 이용할 수 있어요.
      </p>
      <button
        onClick={() => router.push("/analysis")}
        className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
      >
        분석 시작하기
      </button>
    </div>
  );
}
