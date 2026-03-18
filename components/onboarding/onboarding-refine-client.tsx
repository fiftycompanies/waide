"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Bot,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { applyAnalysisToProject } from "@/lib/actions/refinement-actions";

// ── Types ────────────────────────────────────────────────────

interface AiInferredPrefill {
  target_customer: {
    primary: string;
    secondary: string;
    pain_points: string[];
    search_intent: string;
  };
  tone: {
    style: string;
    personality: string;
    example_phrases: string[];
  };
  usp: {
    points: string[];
    from_reviews: string[];
  };
  content_direction: {
    angles: string[];
    types: string[];
    frequency: string;
  };
  price_position: {
    position: string;
    comparison: string;
  };
}

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
  aiInferredPrefill?: AiInferredPrefill;
}

// ── Component ────────────────────────────────────────────────

export function OnboardingRefineClient({
  analysisId,
  userId,
  summary,
  prefill,
  aiInferredPrefill,
}: OnboardingRefineClientProps) {
  const router = useRouter();

  // 키워드 폼
  const [keywords, setKeywords] = useState(prefill.keywords);
  const [newKeyword, setNewKeyword] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  // 섹션 A: AI 추론 확인
  const [targetCustomer, setTargetCustomer] = useState(
    aiInferredPrefill?.target_customer.primary || prefill.target || ""
  );
  const [targetConfirmed, setTargetConfirmed] = useState(false);

  const [toneStyle, setToneStyle] = useState(
    aiInferredPrefill?.tone.style || ""
  );
  const [toneConfirmed, setToneConfirmed] = useState(false);

  const [uspPoints, setUspPoints] = useState<string[]>(
    aiInferredPrefill?.usp.points || []
  );
  const [newUsp, setNewUsp] = useState("");
  const [uspConfirmed, setUspConfirmed] = useState(false);

  const [contentAngles, setContentAngles] = useState<string[]>(
    aiInferredPrefill?.content_direction.angles || []
  );
  const [newAngle, setNewAngle] = useState("");
  const [angleConfirmed, setAngleConfirmed] = useState(false);

  const [pricePosition, setPricePosition] = useState(
    aiInferredPrefill?.price_position.position || ""
  );
  const [priceConfirmed, setPriceConfirmed] = useState(false);

  // 섹션 B: 업주 직접 입력 (선택)
  const [brandStory, setBrandStory] = useState("");
  const [forbiddenContent, setForbiddenContent] = useState("");
  const [awards, setAwards] = useState<string[]>([]);
  const [newAward, setNewAward] = useState("");
  const [officialPriceInfo, setOfficialPriceInfo] = useState("");

  // 섹션 토글
  const [showOwnerSection, setShowOwnerSection] = useState(false);

  // 상태
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // ── 키워드 핸들러 ──

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw || keywords.length >= 5) return;
    if (keywords.includes(kw)) {
      setNewKeyword("");
      return;
    }
    setKeywords([...keywords, kw]);
    setNewKeyword("");
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  // ── 태그 핸들러 ──

  const addTag = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
    setValue: (v: string) => void
  ) => {
    const v = value.trim();
    if (!v || list.includes(v)) {
      setValue("");
      return;
    }
    setList([...list, v]);
    setValue("");
  };

  const removeTag = (
    list: string[],
    setList: (v: string[]) => void,
    index: number
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  // ── 제출 ──

  const handleApply = async () => {
    if (keywords.length === 0) {
      setError("키워드를 1개 이상 입력해주세요.");
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const result = await applyAnalysisToProject(analysisId, userId, {
        keywords,
        strengths: uspPoints.join(", ") || prefill.strengths,
        appeal: prefill.appeal,
        target: targetCustomer || prefill.target,
        // v2 확장 데이터
        aiInferred: {
          target_customer: {
            primary: targetCustomer,
            secondary: aiInferredPrefill?.target_customer.secondary || "",
            pain_points: aiInferredPrefill?.target_customer.pain_points || [],
            search_intent: aiInferredPrefill?.target_customer.search_intent || "",
            confirmed: targetConfirmed,
          },
          tone: {
            style: toneStyle,
            personality: aiInferredPrefill?.tone.personality || toneStyle,
            example_phrases: aiInferredPrefill?.tone.example_phrases || [],
            confirmed: toneConfirmed,
          },
          usp: {
            points: uspPoints,
            from_reviews: aiInferredPrefill?.usp.from_reviews || [],
            confirmed: uspConfirmed,
          },
          content_direction: {
            angles: contentAngles,
            types: aiInferredPrefill?.content_direction.types || [],
            frequency: aiInferredPrefill?.content_direction.frequency || "",
            confirmed: angleConfirmed,
          },
          price_position: {
            position: pricePosition,
            comparison: aiInferredPrefill?.price_position.comparison || "",
            confirmed: priceConfirmed,
          },
        },
        ownerInput: {
          brand_story: brandStory || undefined,
          forbidden_content: forbiddenContent || undefined,
          awards_certifications: awards.length > 0 ? awards : undefined,
          official_price_info: officialPriceInfo || undefined,
        },
      });
      if (!result.success) {
        setError(result.error || "프로젝트 생성에 실패했습니다.");
        return;
      }
      setDone(true);
      if (typeof window !== "undefined") {
        localStorage.removeItem("waide_analysis_id");
      }
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setApplying(false);
    }
  };

  // ── 완료 화면 ──

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

  const hasAiData = !!(
    aiInferredPrefill?.target_customer.primary ||
    aiInferredPrefill?.tone.style ||
    (aiInferredPrefill?.usp.points && aiInferredPrefill.usp.points.length > 0)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            AI 분석 결과를 확인해주세요
          </h1>
          <p className="text-gray-500 text-sm">
            AI가 분석한 정보를 확인하고, 우리 매장만의 특별한 이야기를 추가해주세요
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

        {/* 섹션 A: AI 추론 확인 */}
        {hasAiData && (
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              AI 분석 결과 확인
            </h3>
            <p className="text-xs text-gray-500">
              AI가 분석한 내용을 확인하고 수정할 수 있습니다. 수정하지 않으면 AI 추론값이 그대로 사용됩니다.
            </p>

            {/* 타겟 고객 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                타겟 고객
              </label>
              <textarea
                value={targetCustomer}
                onChange={(e) => {
                  setTargetCustomer(e.target.value);
                  setTargetConfirmed(true);
                }}
                placeholder="예: 30대 직장인 커플, 반려견 동반 가족"
                className="w-full px-3 py-2 rounded-lg border text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <ConfirmCheckbox
                checked={targetConfirmed}
                onChange={setTargetConfirmed}
              />
            </div>

            {/* 톤앤매너 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                톤앤매너
              </label>
              <textarea
                value={toneStyle}
                onChange={(e) => {
                  setToneStyle(e.target.value);
                  setToneConfirmed(true);
                }}
                placeholder="예: 친근하고 감성적인, 전문적이면서 따뜻한"
                className="w-full px-3 py-2 rounded-lg border text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              {aiInferredPrefill?.tone.example_phrases && aiInferredPrefill.tone.example_phrases.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {aiInferredPrefill.tone.example_phrases.map((phrase, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600"
                    >
                      &quot;{phrase}&quot;
                    </span>
                  ))}
                </div>
              )}
              <ConfirmCheckbox
                checked={toneConfirmed}
                onChange={setToneConfirmed}
              />
            </div>

            {/* USP (차별화 포인트) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                차별화 포인트 (USP)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {uspPoints.map((point, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {point}
                    <button
                      onClick={() => {
                        removeTag(uspPoints, setUspPoints, i);
                        setUspConfirmed(true);
                      }}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newUsp}
                  onChange={(e) => setNewUsp(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !isComposing && (e.preventDefault(), addTag(uspPoints, setUspPoints, newUsp, setNewUsp), setUspConfirmed(true))
                  }
                  placeholder="추가할 강점 입력 후 Enter"
                  className="flex-1 h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => { addTag(uspPoints, setUspPoints, newUsp, setNewUsp); setUspConfirmed(true); }}
                  className="px-3 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm"
                >
                  추가
                </button>
              </div>
              <ConfirmCheckbox
                checked={uspConfirmed}
                onChange={setUspConfirmed}
              />
            </div>

            {/* 콘텐츠 방향 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                콘텐츠 방향
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {contentAngles.map((angle, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {angle}
                    <button
                      onClick={() => {
                        removeTag(contentAngles, setContentAngles, i);
                        setAngleConfirmed(true);
                      }}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newAngle}
                  onChange={(e) => setNewAngle(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !isComposing && (e.preventDefault(), addTag(contentAngles, setContentAngles, newAngle, setNewAngle), setAngleConfirmed(true))
                  }
                  placeholder="추가할 콘텐츠 주제 입력 후 Enter"
                  className="flex-1 h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => { addTag(contentAngles, setContentAngles, newAngle, setNewAngle); setAngleConfirmed(true); }}
                  className="px-3 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm"
                >
                  추가
                </button>
              </div>
              <ConfirmCheckbox
                checked={angleConfirmed}
                onChange={setAngleConfirmed}
              />
            </div>

            {/* 가격 포지션 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                가격 포지션
              </label>
              <input
                value={pricePosition}
                onChange={(e) => {
                  setPricePosition(e.target.value);
                  setPriceConfirmed(true);
                }}
                placeholder="예: 중상위 가격대, 가성비 좋은 합리적 가격"
                className="w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <ConfirmCheckbox
                checked={priceConfirmed}
                onChange={setPriceConfirmed}
              />
            </div>
          </div>
        )}

        {/* 섹션 B: 업주 추가 질문 (선택) */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <button
            onClick={() => setShowOwnerSection(!showOwnerSection)}
            className="w-full p-6 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-600" />
              <span className="font-semibold text-gray-900">
                추가 정보 입력
              </span>
              <span className="text-xs text-gray-400">(선택)</span>
            </div>
            {showOwnerSection ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {showOwnerSection && (
            <div className="px-6 pb-6 space-y-5 border-t pt-5">
              <p className="text-xs text-gray-500">
                콘텐츠 품질을 높이기 위한 추가 정보입니다. 나중에 입력해도 됩니다.
              </p>

              {/* 브랜드 스토리 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  이 사업을 시작하게 된 계기나 스토리가 있나요?
                </label>
                <textarea
                  value={brandStory}
                  onChange={(e) => setBrandStory(e.target.value)}
                  placeholder="예: 10년간 호텔에서 근무하다 직접 게스트하우스를 열었습니다..."
                  className="w-full px-3 py-2 rounded-lg border text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                />
              </div>

              {/* 금지 콘텐츠 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  콘텐츠에서 절대 언급하지 말아야 할 내용이 있나요?
                </label>
                <textarea
                  value={forbiddenContent}
                  onChange={(e) => setForbiddenContent(e.target.value)}
                  placeholder="예: 가격 할인 언급 금지, 경쟁사 비교 금지, 특정 메뉴 언급 금지..."
                  className="w-full px-3 py-2 rounded-lg border text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                />
              </div>

              {/* 수상/인증 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  수상, 인증, 언론 소개 이력이 있나요?
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {awards.map((award, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      {award}
                      <button
                        onClick={() => removeTag(awards, setAwards, i)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newAward}
                    onChange={(e) => setNewAward(e.target.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !isComposing && (e.preventDefault(), addTag(awards, setAwards, newAward, setNewAward))
                    }
                    placeholder="수상/인증 입력 후 Enter"
                    className="flex-1 h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => addTag(awards, setAwards, newAward, setNewAward)}
                    className="px-3 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 공식 가격표 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  공개 가격표가 있나요? (숙박/입장료 등)
                </label>
                <textarea
                  value={officialPriceInfo}
                  onChange={(e) => setOfficialPriceInfo(e.target.value)}
                  placeholder="예: 스탠다드룸 12만원, 디럭스 18만원, 스위트 25만원 (비수기 기준)..."
                  className="w-full px-3 py-2 rounded-lg border text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 키워드 섹션 */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            공략 키워드
            <span className="text-gray-400 font-normal text-sm">(최대 5개)</span>
          </h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {keywords.map((kw) => (
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
          {keywords.length < 5 && (
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
          프로젝트가 생성되면 키워드 관리, 콘텐츠 생성, 성과 추적을 시작할 수 있습니다
        </p>
      </div>
    </div>
  );
}

// ── 확인 체크박스 컴포넌트 ──

function ConfirmCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 mt-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
      />
      AI 분석이 맞습니다
    </label>
  );
}
