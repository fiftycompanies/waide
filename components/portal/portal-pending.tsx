"use client";

import { useRouter } from "next/navigation";
import { useTransition, useEffect, useState } from "react";
import { Loader2, Clock, LogOut, MessageCircle, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { portalSignOut } from "@/lib/actions/auth-actions";

export function PortalPendingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem("waide_analysis_id");
    if (savedId) setAnalysisId(savedId);
  }, []);

  const handleSignOut = () => {
    startTransition(async () => {
      await portalSignOut();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm w-full text-center">
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex justify-center mb-6">
            <Logo variant="dark" size="lg" />
          </div>

          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-500" />
            </div>
          </div>

          <h1 className="text-lg font-bold text-gray-900 mb-2">
            계정 설정 대기 중
          </h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            관리자가 회원님의 계정에 업체를 연결하면
            <br />
            포털을 이용하실 수 있습니다.
          </p>

          {analysisId && (
            <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-sm font-medium text-emerald-800 mb-3">
                이전 분석 결과가 있습니다
              </p>
              <button
                onClick={() => router.push(`/onboarding/refine?analysis_id=${analysisId}`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                프로젝트 시작하기
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 mb-4">
            문의사항이 있으시면 카카오톡으로 연락주세요
          </p>

          <div className="flex flex-col items-center gap-3">
            <a
              href="https://pf.kakao.com/_placeholder"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              카카오톡 문의하기
            </a>

            <button
              onClick={handleSignOut}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
