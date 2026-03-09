"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Star,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { applyAnalysisToProject } from "@/lib/actions/refinement-actions";

interface OnboardingRefineClientProps {
  analysisId: string;
  userId: string;
  summary: {
    name: string;
    category: string;
    region: string;
    score: number;
    address: string;
  };
  prefill: {
    keywords: string[];
    strengths: string;
    appeal: string;
    target: string;
  };
}

export function OnboardingRefineClient({
  analysisId,
  userId,
  summary,
  prefill,
}: OnboardingRefineClientProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(prefill);
  const [newKeyword, setNewKeyword] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw || formData.keywords.length >= 5) return;
    if (formData.keywords.includes(kw)) {
      setNewKeyword("");
      return;
    }
    setFormData({ ...formData, keywords: [...formData.keywords, kw] });
    setNewKeyword("");
  };

  const removeKeyword = (kw: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((k) => k !== kw),
    });
  };

  const handleApply = async () => {
    if (formData.keywords.length === 0) {
      setError("키워드를 1개 이상 입력해주세요.");
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const result = await applyAnalysisToProject(analysisId, userId, {
        keywords: formData.keywords,
        strengths: formData.strengths,
        appeal: formData.appeal,
        target: formData.target,
      });
      if (!result.success) {
        setError(result.error || "프로젝트 생성에 실패했습니다.");
        return;
      }
      setDone(true);
      // localStorage 정리
      if (typeof window !== "undefined") {
        localStorage.removeItem("waide_analysis_id");
      }
      setTimeout(() => {
        router.push("/portal");
      }, 1500);
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setApplying(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            프로젝트가 생성되었습니다!
          </h2>
          <p className="text-gray-500 mb-4">
            {summary.name}의 마케팅 프로젝트가 준비되었습니다.
            <br />
            대시보드로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  const scoreColor =
    summary.score >= 70
      ? "text-emerald-600"
      : summary.score >= 40
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            프로젝트 시작하기
          </h1>
          <p className="text-gray-500 text-sm">
            분석 결과를 확인하고 키워드와 정보를 보완한 후 프로젝트를
            시작하세요
          </p>
        </div>

        {/* 분석 요약 카드 */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {summary.name}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">
                  {summary.category}
                </span>
                {summary.region && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {summary.region}
                  </span>
                )}
              </div>
              {summary.address && (
                <p className="text-xs text-gray-400 mt-1">{summary.address}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">마케팅 점수</p>
              <p className={`text-2xl font-bold ${scoreColor}`}>
                {summary.score}
              </p>
              <p className="text-[10px] text-gray-400">/100</p>
            </div>
          </div>
        </div>

        {/* 보완 폼 */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            프로젝트 정보 확인
          </h3>

          {/* 키워드 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              공략 키워드{" "}
              <span className="text-gray-400 font-normal">(최대 5개)</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  {kw}
                  <button
                    onClick={() => removeKeyword(kw)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {formData.keywords.length < 5 && (
              <div className="flex gap-2">
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !isComposing && (e.preventDefault(), addKeyword())
                  }
                  placeholder="키워드 입력 후 Enter"
                  className="flex-1 h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  onClick={addKeyword}
                  className="px-3 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm transition-colors"
                >
                  추가
                </button>
              </div>
            )}
          </div>

          {/* 강점 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              우리 매장의 강점
            </label>
            <textarea
              value={formData.strengths}
              onChange={(e) =>
                setFormData({ ...formData, strengths: e.target.value })
              }
              placeholder="예: 직접 로스팅한 스페셜티 원두, 매일 만드는 수제 디저트"
              className="w-full px-3 py-2 rounded-lg border text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* 어필 포인트 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              어필 포인트
            </label>
            <textarea
              value={formData.appeal}
              onChange={(e) =>
                setFormData({ ...formData, appeal: e.target.value })
              }
              placeholder="예: 인스타 감성 인테리어, 넓은 주차장, 반려동물 동반 가능"
              className="w-full px-3 py-2 rounded-lg border text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* 타겟 고객 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              타겟 고객
            </label>
            <textarea
              value={formData.target}
              onChange={(e) =>
                setFormData({ ...formData, target: e.target.value })
              }
              placeholder="예: 20~30대 직장인, 데이트 커플, 반려견 동반 가족"
              className="w-full px-3 py-2 rounded-lg border text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 반영하기 버튼 */}
        <button
          onClick={handleApply}
          disabled={applying}
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {applying ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              프로젝트 생성 중...
            </>
          ) : (
            <>
              반영하기
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          프로젝트가 생성되면 키워드 관리, 콘텐츠 생성, 성과 추적을 시작할 수
          있습니다
        </p>
      </div>
    </div>
  );
}
