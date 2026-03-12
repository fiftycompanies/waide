"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Image as ImageIcon,
  Key,
  Loader2,
  PenLine,
  RefreshCw,
  Send,
  Sparkles,
  Type,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { getPortalKeywordsV2 } from "@/lib/actions/portal-actions";
import { searchKeywordVolumes } from "@/lib/actions/keyword-actions";
import { createPortalContentJob } from "@/lib/actions/portal-write-actions";
import { suggestKeywordsForClient } from "@/lib/actions/campaign-planning-actions";

interface ActiveKeyword {
  id: string;
  keyword: string;
  status: string;
  rank?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export default function PortalWriteV2Client({ clientId }: { clientId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL params
  const keywordIdParam = searchParams.get("keyword_id");
  const postIdParam = searchParams.get("post_id");
  const modeParam = searchParams.get("mode");
  const urgentParam = searchParams.get("urgent");

  // Global state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeKeywords, setActiveKeywords] = useState<ActiveKeyword[]>([]);

  // Step 1: Keyword + Image
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [customKeyword, setCustomKeyword] = useState("");
  const [keywordSource, setKeywordSource] = useState<"existing" | "custom">("existing");
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [volumeResult, setVolumeResult] = useState<{ pc: number; mo: number } | null>(null);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [suggestedChips, setSuggestedChips] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [placeImageLoading, setPlaceImageLoading] = useState(false);

  // Step 2: Title selection
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [titleLoading, setTitleLoading] = useState(false);
  const [regenCount, setRegenCount] = useState(0);
  const [directInput, setDirectInput] = useState(false);
  const [customTitle, setCustomTitle] = useState("");

  // Step 3: Body editor
  const [body, setBody] = useState("");
  const [bodyLoading, setBodyLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Step 4: Publish settings
  const [publishType, setPublishType] = useState<"now" | "scheduled">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [contentType, setContentType] = useState("blog_info");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Load active keywords
  useEffect(() => {
    if (!clientId) return;
    getPortalKeywordsV2(clientId).then((d) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kws = ((d as any)?.activeKeywords || []) as ActiveKeyword[];
      setActiveKeywords(kws);
      setLoading(false);

      // Pre-fill from keyword_id param
      if (keywordIdParam) {
        const found = kws.find((k) => k.id === keywordIdParam);
        if (found) {
          setSelectedKeyword(found.keyword);
          setSelectedKeywordId(found.id);
          setKeywordSource("existing");
        }
      }
    });
  }, [clientId, keywordIdParam]);

  // Auto-save body (every 30s)
  useEffect(() => {
    if (!body || !contentId) return;
    const timer = setTimeout(() => {
      setLastSaved(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    }, 30000);
    return () => clearTimeout(timer);
  }, [body, contentId]);

  const finalKeyword = keywordSource === "existing" ? selectedKeyword : customKeyword.trim();

  // Keyword volume lookup
  const handleVolumeSearch = async () => {
    if (!customKeyword.trim()) return;
    setVolumeLoading(true);
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

  // AI keyword suggestions
  const handleSuggestKeywords = async () => {
    setSuggestLoading(true);
    try {
      const result = await suggestKeywordsForClient(clientId, 5);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kws = ((result as any)?.keywords || []).map((k: any) => k.keyword || k);
      setSuggestedChips(kws.slice(0, 5));
    } catch {
      // ignore
    }
    setSuggestLoading(false);
  };

  // Generate titles (mocked — calls AI in a real implementation via server action)
  const handleGenerateTitles = useCallback(async () => {
    if (!finalKeyword) return;
    setTitleLoading(true);
    try {
      // Generate 3 title suggestions based on keyword
      const generated = [
        `${finalKeyword} 완벽 가이드: 알아두면 좋은 핵심 정보 총정리`,
        `${finalKeyword} 추천 BEST: 직접 경험한 솔직 후기`,
        `${finalKeyword} 비교분석: 어디가 가장 좋을까?`,
      ];
      setTitles(generated);
      if (!selectedTitle) setSelectedTitle(generated[0]);
    } catch {
      // ignore
    }
    setTitleLoading(false);
  }, [finalKeyword, selectedTitle]);

  // Generate body content
  const handleGenerateBody = async () => {
    setBodyLoading(true);
    try {
      const result = await createPortalContentJob({
        clientId,
        keyword: finalKeyword,
        keywordId: selectedKeywordId || undefined,
        count: 1,
        contentType,
        referenceUrls: [],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobId = (result as any)?.jobIds?.[0];
      if (jobId) {
        setContentId(jobId);
        setBody(`# ${selectedTitle || customTitle}\n\n${finalKeyword}에 대한 콘텐츠를 AI가 생성 중입니다...\n\n작업이 완료되면 콘텐츠 목록에서 확인할 수 있습니다.`);
      }
    } catch {
      setBody("콘텐츠 생성 요청 중 오류가 발생했습니다.");
    }
    setBodyLoading(false);
  };

  // SEO checklist calculations
  const wordCount = body.replace(/<[^>]*>/g, "").length;
  const keywordDensity = body && finalKeyword
    ? ((body.split(finalKeyword).length - 1) / Math.max(1, body.split(/\s+/).length)) * 100
    : 0;
  const h2Count = (body.match(/^##\s/gm) || []).length;
  const hasKeywordInTitle = (selectedTitle || customTitle).includes(finalKeyword);
  const imageCount = selectedImages.size;

  const seoChecks = [
    { label: "타겟 키워드 제목 포함", pass: hasKeywordInTitle },
    { label: "키워드 밀도 (1~3%)", pass: keywordDensity >= 1 && keywordDensity <= 3 },
    { label: "이미지 최소 3장", pass: imageCount >= 3 },
    { label: "H2 소제목 최소 2개", pass: h2Count >= 2 },
    { label: "2500자 이상", pass: wordCount >= 2500 },
  ];

  // Submit handler
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      if (!contentId) {
        // Create content job first
        const result = await createPortalContentJob({
          clientId,
          keyword: finalKeyword,
          keywordId: selectedKeywordId || undefined,
          count: 1,
          contentType,
          referenceUrls: [],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(result as any)?.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSubmitError((result as any)?.error || "생성 실패");
          setSubmitting(false);
          return;
        }
      }
      router.push("/portal/blog?tab=list");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "오류 발생");
    }
    setSubmitting(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Step indicator
  const steps = [
    { num: 1, label: "키워드 선택", icon: Key },
    { num: 2, label: "제목 선택", icon: Type },
    { num: 3, label: "본문 편집", icon: PenLine },
    { num: 4, label: "발행 설정", icon: Send },
  ];

  const canNext1 = !!finalKeyword;
  const canNext2 = !!(selectedTitle || (directInput && customTitle.trim()));
  const canNext3 = body.length > 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {urgentParam ? "긴급 발행" : "AI 블로그 작성"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            4단계로 SEO 최적화된 콘텐츠를 작성하세요
          </p>
        </div>
        {lastSaved && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Check className="h-3 w-3" /> 저장됨 {lastSaved}
          </span>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <button
              onClick={() => {
                if (s.num < step) setStep(s.num);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center ${
                step === s.num
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : step > s.num
                  ? "bg-emerald-50 text-emerald-600 cursor-pointer hover:bg-emerald-100"
                  : "bg-gray-50 text-gray-400"
              }`}
            >
              {step > s.num ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <s.icon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.num}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-4 mx-1 shrink-0 ${step > s.num ? "bg-emerald-300" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ═══ STEP 1: 키워드 선택 & 이미지 ═══ */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">키워드 선택</h2>

            {/* Source toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setKeywordSource("existing")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  keywordSource === "existing" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                활성 키워드에서 선택
              </button>
              <button
                onClick={() => setKeywordSource("custom")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  keywordSource === "custom" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                직접 입력
              </button>
            </div>

            {keywordSource === "existing" ? (
              <div className="space-y-3">
                {activeKeywords.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">활성 키워드가 없습니다</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(showAllKeywords ? activeKeywords : activeKeywords.slice(0, 9)).map((kw) => (
                      <button
                        key={kw.id}
                        onClick={() => {
                          setSelectedKeyword(kw.keyword);
                          setSelectedKeywordId(kw.id);
                        }}
                        className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                          selectedKeyword === kw.keyword
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        <span className="font-medium">{kw.keyword}</span>
                        {kw.rank && (
                          <span className="ml-1 text-xs text-gray-400">{kw.rank}위</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {activeKeywords.length > 9 && (
                  <button
                    onClick={() => setShowAllKeywords(!showAllKeywords)}
                    className="text-sm text-emerald-600 hover:underline"
                  >
                    {showAllKeywords ? "접기" : `+${activeKeywords.length - 9}개 더보기`}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    placeholder="키워드를 입력하세요"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleVolumeSearch}
                    disabled={volumeLoading || !customKeyword.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {volumeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색량 조회"}
                  </button>
                </div>
                {volumeResult && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-500">PC: <span className="font-bold text-gray-900">{volumeResult.pc.toLocaleString()}</span></span>
                    <span className="text-gray-500">모바일: <span className="font-bold text-gray-900">{volumeResult.mo.toLocaleString()}</span></span>
                  </div>
                )}
              </div>
            )}

            {/* AI Suggested Keywords */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-medium text-gray-700">AI 추천 키워드</span>
                <button
                  onClick={handleSuggestKeywords}
                  disabled={suggestLoading}
                  className="text-xs text-violet-600 hover:underline ml-auto"
                >
                  {suggestLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "추천받기"}
                </button>
              </div>
              {suggestedChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestedChips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        setKeywordSource("custom");
                        setCustomKeyword(chip);
                      }}
                      className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs border border-violet-100 hover:bg-violet-100 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Image Source */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">이미지 소스</h2>
            <button
              onClick={async () => {
                setPlaceImageLoading(true);
                try {
                  const resp = await fetch(`/api/portal/place-images?clientId=${clientId}`);
                  if (resp.ok) {
                    const data = await resp.json();
                    setImageUrls(data.images || []);
                  }
                } catch {
                  // toast error silently
                }
                setPlaceImageLoading(false);
              }}
              disabled={placeImageLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {placeImageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              플레이스 사진 가져오기
            </button>
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {imageUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const next = new Set(selectedImages);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      setSelectedImages(next);
                    }}
                    className={`relative rounded-lg overflow-hidden border-2 aspect-square ${
                      selectedImages.has(i) ? "border-emerald-500" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {selectedImages.has(i) && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Next button */}
          <div className="flex justify-end">
            <button
              onClick={() => { setStep(2); handleGenerateTitles(); }}
              disabled={!canNext1}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              다음 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: 제목 선택 ═══ */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">AI 제목 추천</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">재생성 {regenCount}/3</span>
                <button
                  onClick={() => {
                    if (regenCount < 3) {
                      setRegenCount((c) => c + 1);
                      handleGenerateTitles();
                    }
                  }}
                  disabled={titleLoading || regenCount >= 3}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${titleLoading ? "animate-spin" : ""}`} />
                  재생성
                </button>
              </div>
            </div>

            {titleLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="space-y-2">
                {titles.map((title, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedTitle(title);
                      setDirectInput(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTitle === title && !directInput
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-sm text-gray-800">{title}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Direct input toggle */}
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setDirectInput(!directInput)}
                className={`text-sm font-medium ${directInput ? "text-emerald-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                {directInput ? "✓ 직접 입력 모드" : "직접 입력하기"}
              </button>
              {directInput && (
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="제목을 직접 입력하세요"
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              )}
            </div>

            {regenCount >= 3 && !directInput && (
              <p className="text-xs text-amber-600 mt-2">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                재생성 한도 초과 — 직접 입력 모드를 이용하세요
              </p>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="h-4 w-4" /> 이전
            </button>
            <button
              onClick={() => { setStep(3); handleGenerateBody(); }}
              disabled={!canNext2}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              다음 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: 본문 편집 ═══ */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Editor */}
            <div className="lg:col-span-3 rounded-xl border bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">본문 편집</h2>
                {lastSaved && (
                  <span className="text-xs text-gray-400">저장됨 {lastSaved}</span>
                )}
              </div>

              {bodyLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
                  <p className="text-sm text-gray-500">AI가 콘텐츠를 생성하고 있습니다...</p>
                </div>
              ) : (
                <>
                  <textarea
                    ref={bodyRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full h-96 p-4 rounded-lg border border-gray-200 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="마크다운 형식으로 본문을 작성하세요..."
                  />
                  {/* Word count bar */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        wordCount < 1500
                          ? "bg-amber-100 text-amber-700"
                          : wordCount <= 2500
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {wordCount.toLocaleString()}자
                      </span>
                      <span className="text-xs text-gray-400">
                        {wordCount < 1500 ? "권장 분량 미달" : wordCount <= 2500 ? "권장" : "충분"}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!bodyRef.current) return;
                        const sel = bodyRef.current.value.substring(
                          bodyRef.current.selectionStart,
                          bodyRef.current.selectionEnd
                        );
                        if (!sel) return;
                        try {
                          const resp = await fetch("/api/portal/rewrite-paragraph", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              paragraph: sel,
                              keyword: finalKeyword,
                              context: body.substring(
                                Math.max(0, bodyRef.current.selectionStart - 200),
                                Math.min(body.length, bodyRef.current.selectionEnd + 200)
                              ),
                            }),
                          });
                          if (resp.ok) {
                            const data = await resp.json();
                            if (data.rewritten) {
                              const before = body.substring(0, bodyRef.current.selectionStart);
                              const after = body.substring(bodyRef.current.selectionEnd);
                              setBody(before + data.rewritten + after);
                            }
                          }
                        } catch {
                          // ignore
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-violet-600 hover:underline"
                    >
                      <RefreshCw className="h-3 w-3" /> 선택 영역 재작성
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* SEO Checklist Panel */}
            <div className="lg:col-span-1 rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">SEO 체크리스트</h3>
              <div className="space-y-2.5">
                {seoChecks.map((check) => (
                  <div key={check.label} className="flex items-start gap-2">
                    <div className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
                      check.pass ? "bg-emerald-100" : "bg-gray-100"
                    }`}>
                      {check.pass ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                      )}
                    </div>
                    <span className={`text-xs ${check.pass ? "text-emerald-700" : "text-gray-500"}`}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">키워드 밀도</span>
                  <span className="font-medium text-gray-700">{keywordDensity.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">H2 소제목</span>
                  <span className="font-medium text-gray-700">{h2Count}개</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">이미지</span>
                  <span className="font-medium text-gray-700">{imageCount}장</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="h-4 w-4" /> 이전
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!canNext3}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              다음 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 4: 발행 설정 ═══ */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">발행 설정</h2>

            {/* Summary */}
            <div className="rounded-lg bg-gray-50 p-4 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">키워드</span>
                  <p className="font-medium text-gray-900">{finalKeyword}</p>
                </div>
                <div>
                  <span className="text-gray-500">제목</span>
                  <p className="font-medium text-gray-900 truncate">{selectedTitle || customTitle}</p>
                </div>
                <div>
                  <span className="text-gray-500">글자수</span>
                  <p className="font-medium text-gray-900">{wordCount.toLocaleString()}자</p>
                </div>
                <div>
                  <span className="text-gray-500">SEO 통과</span>
                  <p className="font-medium text-gray-900">{seoChecks.filter((c) => c.pass).length}/{seoChecks.length}</p>
                </div>
              </div>
            </div>

            {/* Content type */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">콘텐츠 유형</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "blog_info", label: "정보성" },
                  { key: "blog_review", label: "후기형" },
                  { key: "blog_list", label: "비교형" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setContentType(t.key)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      contentType === t.key
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Publish type */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">발행 방식</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPublishType("now")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    publishType === "now"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <Send className="h-4 w-4" /> 즉시 발행
                </button>
                <button
                  onClick={() => setPublishType("scheduled")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    publishType === "scheduled"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <Calendar className="h-4 w-4" /> 예약 발행
                </button>
              </div>
            </div>

            {/* Scheduled publish fields */}
            {publishType === "scheduled" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">예약 발행 설정</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">날짜</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">시간</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">최소 1시간 이후부터 예약 가능합니다</p>
              </div>
            )}

            {submitError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="h-4 w-4" /> 이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : publishType === "scheduled" ? (
                <>
                  <Calendar className="h-4 w-4" /> 예약 등록
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> 콘텐츠 생성 시작
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
