"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Key,
  Keyboard,
  Loader2,
  PenLine,
  Search,
  Sparkles,
} from "lucide-react";
import { getPortalKeywordsV2 } from "@/lib/actions/portal-actions";
import { searchKeywordVolumes } from "@/lib/actions/keyword-actions";
import { createPortalContentJob } from "@/lib/actions/portal-write-actions";

interface KeywordItem {
  id: string;
  keyword: string;
  monthly_search_volume?: number | null;
  current_rank_naver_pc?: number | null;
  current_rank_naver_mo?: number | null;
}

type Step = 1 | 2 | 3;
type KeywordSource = "existing" | "custom";
type ContentType = "info" | "review" | "compare";

const contentTypeLabels: Record<ContentType, { label: string; desc: string }> = {
  info: { label: "정보성", desc: "유용한 정보를 전달하는 가이드형 콘텐츠" },
  review: { label: "후기형", desc: "경험 기반 리뷰/후기 콘텐츠" },
  compare: { label: "비교형", desc: "항목별 비교 분석 콘텐츠" },
};

export default function PortalWriteClient() {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [keywordSource, setKeywordSource] = useState<KeywordSource>("existing");
  const [activeKeywords, setActiveKeywords] = useState<KeywordItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1 state
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordItem | null>(null);
  const [customKeyword, setCustomKeyword] = useState("");
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [volumeResult, setVolumeResult] = useState<{ pc: number; mo: number } | null>(null);

  // Keyword display
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  // Step 2 state
  const [contentCount, setContentCount] = useState(1);
  const [contentType, setContentType] = useState<ContentType>("info");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([""]);

  // Step 3 state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const cid = el?.getAttribute("content") || "";
    setClientId(cid);
    if (cid) {
      getPortalKeywordsV2(cid).then((d) => {
        setActiveKeywords(d.activeKeywords as KeywordItem[]);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleSearchVolume = async () => {
    if (!customKeyword.trim()) return;
    setVolumeLoading(true);
    setVolumeResult(null);
    try {
      const result = await searchKeywordVolumes([customKeyword.trim()]);
      if (result && result.length > 0) {
        setVolumeResult({ pc: result[0].monthlyPc || 0, mo: result[0].monthlyMo || 0 });
      }
    } catch {
      // ignore
    }
    setVolumeLoading(false);
  };

  const handleSubmit = async () => {
    const kw = keywordSource === "existing" ? selectedKeyword?.keyword : customKeyword.trim();
    if (!kw || !clientId) return;

    setSubmitting(true);
    setSubmitError(null);
    const validUrls = referenceUrls.filter((u) => u.trim().length > 0);

    const result = await createPortalContentJob({
      clientId,
      keyword: kw,
      keywordId: keywordSource === "existing" ? selectedKeyword?.id : undefined,
      count: contentCount,
      contentType,
      referenceUrls: validUrls,
    });

    if (result.success) {
      router.push("/portal/contents");
    } else {
      setSubmitError(result.error || "콘텐츠 생성에 실패했습니다");
      setSubmitting(false);
    }
  };

  const finalKeyword = keywordSource === "existing" ? selectedKeyword?.keyword : customKeyword.trim();
  const canNext1 = Boolean(finalKeyword);
  const canNext2 = contentCount > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">블로그 작성</h1>
        <p className="text-sm text-gray-500 mt-1">키워드를 선택하고 AI 콘텐츠를 생성하세요</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold ${
              step === s ? "bg-emerald-600 text-white" : step > s ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
            }`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            <span className={`text-sm hidden sm:block ${step === s ? "text-gray-900 font-medium" : "text-gray-400"}`}>
              {s === 1 ? "키워드 선택" : s === 2 ? "생성 설정" : "확인 및 생성"}
            </span>
            {s < 3 && <ChevronRight className="h-4 w-4 text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: 키워드 선택 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setKeywordSource("existing")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                keywordSource === "existing" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Key className="h-4 w-4" />
              활성 키워드에서 선택
            </button>
            <button
              onClick={() => setKeywordSource("custom")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                keywordSource === "custom" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Keyboard className="h-4 w-4" />
              직접 입력
            </button>
          </div>

          {keywordSource === "existing" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeKeywords.length === 0 ? (
                <div className="col-span-full rounded-xl border bg-white p-8 text-center">
                  <Key className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">활성 키워드가 없습니다</p>
                  <p className="text-xs text-gray-400 mt-1">직접 입력 탭을 사용하세요</p>
                </div>
              ) : (
                <>
                  {(showAllKeywords ? activeKeywords : activeKeywords.slice(0, 10)).map((kw) => (
                    <button
                      key={kw.id}
                      onClick={() => setSelectedKeyword(kw)}
                      className={`text-left p-4 rounded-xl border transition-colors ${
                        selectedKeyword?.id === kw.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <p className="font-medium text-gray-900">{kw.keyword}</p>
                      <div className="flex gap-3 mt-1">
                        {kw.current_rank_naver_pc != null && (
                          <span className="text-xs text-gray-500">순위 {kw.current_rank_naver_pc}위</span>
                        )}
                        {kw.monthly_search_volume != null && (
                          <span className="text-xs text-gray-500">월 {kw.monthly_search_volume.toLocaleString()}</span>
                        )}
                      </div>
                    </button>
                  ))}
                  {!showAllKeywords && activeKeywords.length > 10 && (
                    <button
                      onClick={() => setShowAllKeywords(true)}
                      className="col-span-full text-sm text-emerald-600 hover:text-emerald-700 font-medium py-2"
                    >
                      더보기 (+{activeKeywords.length - 10}개)
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {keywordSource === "custom" && (
            <div className="rounded-xl border bg-white p-5 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  placeholder="키워드를 입력하세요"
                  className="flex-1 px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleSearchVolume}
                  disabled={volumeLoading || !customKeyword.trim()}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {volumeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  검색량 조회
                </button>
              </div>
              {volumeResult && (
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-600">PC: <span className="font-medium">{volumeResult.pc.toLocaleString()}</span></span>
                  <span className="text-gray-600">MO: <span className="font-medium">{volumeResult.mo.toLocaleString()}</span></span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!canNext1}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              다음 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 생성 설정 */}
      {step === 2 && (
        <div className="space-y-5">
          {/* 생성 개수 */}
          <div className="rounded-xl border bg-white p-5">
            <label className="text-sm font-medium text-gray-900 block mb-3">생성 개수</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setContentCount(n)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    contentCount === n ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {n}건
                </button>
              ))}
            </div>
          </div>

          {/* 콘텐츠 유형 */}
          <div className="rounded-xl border bg-white p-5">
            <label className="text-sm font-medium text-gray-900 block mb-3">콘텐츠 유형</label>
            <div className="space-y-2">
              {(Object.entries(contentTypeLabels) as [ContentType, { label: string; desc: string }][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setContentType(key)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    contentType === key ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <p className={`text-sm font-medium ${contentType === key ? "text-emerald-700" : "text-gray-900"}`}>{val.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{val.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 참고 URL */}
          <div className="rounded-xl border bg-white p-5">
            <label className="text-sm font-medium text-gray-900 block mb-1">참고 블로그 URL (N블로그 우선)</label>
            <p className="text-xs text-gray-400 mb-3">상위 노출된 블로그 URL을 입력하면 AI가 구조와 스타일을 참고합니다</p>
            <div className="space-y-2">
              {referenceUrls.map((url, i) => (
                <input
                  key={i}
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const updated = [...referenceUrls];
                    updated[i] = e.target.value;
                    setReferenceUrls(updated);
                  }}
                  placeholder="https://blog.naver.com/..."
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ))}
              {referenceUrls.length < 3 && (
                <button
                  onClick={() => setReferenceUrls([...referenceUrls, ""])}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  + URL 추가
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2.5 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> 이전
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canNext2}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              다음 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 확인 및 생성 */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-white p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">생성 요약</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">키워드</span>
                <span className="font-medium text-gray-900">{finalKeyword}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">생성 개수</span>
                <span className="font-medium text-gray-900">{contentCount}건</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">콘텐츠 유형</span>
                <span className="font-medium text-gray-900">{contentTypeLabels[contentType].label}</span>
              </div>
              {referenceUrls.filter((u) => u.trim()).length > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">참고 URL</span>
                  <span className="font-medium text-gray-900">{referenceUrls.filter((u) => u.trim()).length}개</span>
                </div>
              )}
            </div>
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {submitError}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> 이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> 콘텐츠 생성 시작
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
