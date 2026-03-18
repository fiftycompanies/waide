"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Loader2,

  Plus,
  RefreshCw,
  Save,
  Store,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  updatePersona,
  addManualStrength,
  removeManualStrength,
  regeneratePersona,
  activateAnalysisKeyword,
  deactivateAnalysisKeyword,
  type BrandAnalysisPageData,
  type EnhancedBrandPersona,
  type BrandPersona,
} from "@/lib/actions/persona-actions";

// ── 점수 breakdown 소비자 친화적 레이블 ───────────────────────────────────────

const SCORE_AREAS = [
  { key: "review_reputation", label: "고객 평판 & 리뷰", max: 20, color: "bg-violet-500" },
  { key: "naver_keyword", label: "네이버 검색 노출", max: 25, color: "bg-blue-500" },
  { key: "google_keyword", label: "구글 검색 노출", max: 15, color: "bg-red-400" },
  { key: "image_quality", label: "대표 이미지 품질", max: 10, color: "bg-amber-500" },
  { key: "online_channels", label: "온라인 채널 완성도", max: 15, color: "bg-emerald-500" },
  { key: "seo_aeo_readiness", label: "AI 검색 대응력", max: 15, color: "bg-pink-500" },
];

const TOTAL_MAX = SCORE_AREAS.reduce((s, a) => s + a.max, 0);

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  data: BrandAnalysisPageData;
}

export default function BrandAnalysisClient({ data }: Props) {
  const router = useRouter();
  const { client, persona: initialPersona, analysis, activeKeywords: initialActiveKeywords } = data;

  // ── State ──
  const [persona, setPersona] = useState<EnhancedBrandPersona | null>(initialPersona);
  const [activeKeywords, setActiveKeywords] = useState<string[]>(initialActiveKeywords);

  // Persona editing
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<BrandPersona>>({});
  const [isSaving, startSave] = useTransition();
  const [isRegenerating, startRegenerate] = useTransition();

  // Owner input editing
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [ownerEdits, setOwnerEdits] = useState<Record<string, unknown>>({});
  const [isSavingOwner, startSaveOwner] = useTransition();

  // Strengths
  const [newStrength, setNewStrength] = useState("");
  const [isAddingStrength, startAddStrength] = useTransition();

  // Keyword activation
  const [togglingKeywords, setTogglingKeywords] = useState<Set<string>>(new Set());

  // Section collapse
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Handlers ──

  const handleRefresh = () => router.refresh();

  const handleSavePersona = () => {
    startSave(async () => {
      const result = await updatePersona(client.id, editValues);
      if (result.success) {
        toast.success("페르소나가 수정되었습니다.");
        setIsEditing(false);
        setEditValues({});
        router.refresh();
      } else {
        toast.error(result.error || "저장 실패");
      }
    });
  };

  const handleRegenerate = () => {
    startRegenerate(async () => {
      const result = await regeneratePersona(client.id);
      if (result.success) {
        toast.success("페르소나가 재생성되었습니다.");
        router.refresh();
      } else {
        toast.error(result.error || "재생성 실패");
      }
    });
  };

  const handleAddStrength = () => {
    if (!newStrength.trim()) return;
    startAddStrength(async () => {
      const result = await addManualStrength(client.id, newStrength.trim());
      if (result.success) {
        toast.success("강점이 추가되었습니다.");
        setNewStrength("");
        router.refresh();
      } else {
        toast.error(result.error || "추가 실패");
      }
    });
  };

  const handleRemoveStrength = (index: number) => {
    startAddStrength(async () => {
      const result = await removeManualStrength(client.id, index);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error || "삭제 실패");
      }
    });
  };

  const handleSaveOwnerInput = () => {
    startSaveOwner(async () => {
      const existingOwner = persona?.owner_input || {};
      const merged = { ...existingOwner, ...ownerEdits };
      const result = await updatePersona(client.id, { owner_input: merged } as Partial<BrandPersona>);
      if (result.success) {
        toast.success("업주 입력 정보가 수정되었습니다.");
        setIsEditingOwner(false);
        setOwnerEdits({});
        router.refresh();
      } else {
        toast.error(result.error || "저장 실패");
      }
    });
  };

  const handleToggleKeyword = async (keyword: string, currentlyActive: boolean) => {
    setTogglingKeywords((prev) => new Set(prev).add(keyword));
    try {
      if (currentlyActive) {
        const result = await deactivateAnalysisKeyword(client.id, keyword);
        if (result.success) {
          setActiveKeywords((prev) => prev.filter((k) => k !== keyword));
          toast.success(`"${keyword}" 키워드가 비활성화되었습니다.`);
        } else {
          toast.error(result.error || "비활성화 실패");
        }
      } else {
        const result = await activateAnalysisKeyword(client.id, keyword);
        if (result.success) {
          setActiveKeywords((prev) => [...prev, keyword]);
          toast.success(`"${keyword}" 키워드가 활성화되었습니다.`);
        } else {
          toast.error(result.error || "활성화 실패");
        }
      }
    } finally {
      setTogglingKeywords((prev) => {
        const next = new Set(prev);
        next.delete(keyword);
        return next;
      });
    }
  };

  // ── AI 추론 인라인 수정 핸들러 ──
  const handleSaveAiInferred = (sectionKey: string, updates: Record<string, unknown>) => {
    startSave(async () => {
      const existingAi = persona?.ai_inferred || {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingSection = (existingAi as any)[sectionKey] || {};
      const merged = {
        ...existingAi,
        [sectionKey]: { ...existingSection, ...updates, confirmed: true },
      };
      const result = await updatePersona(client.id, { ai_inferred: merged } as Partial<BrandPersona>);
      if (result.success) {
        toast.success("수정되었습니다.");
        router.refresh();
      } else {
        toast.error(result.error || "저장 실패");
      }
    });
  };

  // ── Helpers ──

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bi = (analysis?.basic_info ?? {}) as Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ka = (analysis?.keyword_analysis ?? {}) as Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbRaw = (analysis?.score_breakdown ?? {}) as Record<string, any>;

  // 기존 DB 데이터의 영문 변수명을 한글로 변환
  const ITEM_LABEL_MAP: Record<string, string> = {
    visitor_review_count: "방문자 리뷰",
    blog_review_count: "블로그 리뷰",
    review_volume_bonus: "리뷰 보정",
    place_exposure: "플레이스 노출",
    blog_exposure: "블로그 노출",
    google_exposure: "구글 노출",
    image_count: "이미지 수",
    image_quality: "이미지 품질",
    image_usability: "이미지 활용도",
    image_count_basic: "이미지 수",
    homepage: "홈페이지",
    sns: "SNS",
    naver_reservation: "네이버 예약",
    naver_talktalk: "네이버 톡톡",
    business_hours: "영업시간",
    brand_blog: "브랜드 블로그",
    keyword_blog: "키워드 블로그",
    google_seo: "구글 SEO",
  };
  const translateDetails = (text: string) =>
    text.replace(/(\w[\w_]*?):\s/g, (_, key) => `${ITEM_LABEL_MAP[key] ?? key}: `);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: Record<string, any> = {};
  for (const [k, v] of Object.entries(sbRaw)) {
    if (v && typeof v === "object") {
      sb[k] = {
        ...v,
        details: v.details ? translateDetails(String(v.details)) : v.details,
        detail: v.detail ? translateDetails(String(v.detail)) : v.detail,
      };
    } else {
      sb[k] = v;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ar = (analysis?.analysis_result ?? {}) as Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywords = (ka.keywords ?? []) as any[];
  const marketingScore = analysis?.marketing_score;

  const scorePct = marketingScore != null ? Math.round((marketingScore / TOTAL_MAX) * 100) : 0;
  const scoreColor = scorePct >= 70 ? "text-emerald-600" : scorePct >= 40 ? "text-amber-600" : "text-red-500";

  // improvement_plan extraction
  const improvementPlan = ar.improvement_plan;
  const hasImprovements = improvementPlan &&
    ((Array.isArray(improvementPlan) && improvementPlan.length > 0) ||
    (typeof improvementPlan === "object" && !Array.isArray(improvementPlan) && Object.keys(improvementPlan).length > 0));

  const ai = persona?.ai_inferred;
  const oi = persona?.owner_input;

  // Section header helper
  const SectionHeader = ({ id, title, icon }: { id: string; title: string; icon?: React.ReactNode }) => {
    const collapsed = collapsedSections.has(id);
    return (
      <button
        onClick={() => toggleSection(id)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>
    );
  };

  // renderField/renderList helpers (from PersonaTab pattern)
  const renderField = (label: string, key: keyof BrandPersona, value: string | undefined) => {
    if (isEditing) {
      return (
        <div>
          <label className="text-xs text-muted-foreground">{label}</label>
          <textarea
            className="w-full mt-1 p-2 border rounded-lg text-sm bg-background resize-none"
            rows={2}
            defaultValue={value || ""}
            onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
          />
        </div>
      );
    }
    return (
      <div>
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="text-sm mt-0.5">{value || "-"}</p>
      </div>
    );
  };

  const renderList = (label: string, items: string[] | undefined) => (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {items.map((item, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-xs">{item}</span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mt-0.5">-</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ═══ 섹션 A: 매장 기본 정보 ═══ */}
      {analysis && Object.keys(bi).length > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <SectionHeader id="basic" title="매장 기본 정보" icon={<Store className="h-4 w-4 text-primary" />} />
          {!collapsedSections.has("basic") && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {bi.name && <InfoItem label="매장명" value={String(bi.name)} />}
              {(bi.category || bi.businessType) && <InfoItem label="업종" value={String(bi.category || bi.businessType)} />}
              {bi.region && <InfoItem label="지역" value={String(bi.region)} />}
              {bi.address && <InfoItem label="주소" value={String(bi.address)} />}
              {(bi.reviewCount != null || bi.visitorReviewCount != null) && (
                <InfoItem label="리뷰수" value={String(bi.reviewCount ?? bi.visitorReviewCount ?? "-")} />
              )}
              {bi.rating && <InfoItem label="평점" value={String(bi.rating)} />}
              {bi.businessHours && <InfoItem label="영업시간" value={String(bi.businessHours)} />}
              {bi.facilities && Array.isArray(bi.facilities) && bi.facilities.length > 0 && (
                <InfoItem label="편의시설" value={bi.facilities.join(", ")} />
              )}
              {bi.parking && <InfoItem label="주차" value={String(bi.parking)} />}
            </div>
          )}
        </div>
      )}

      {/* ═══ 섹션 B: 마케팅 종합점수 ═══ */}
      {marketingScore != null && (
        <div className="border rounded-lg p-5">
          <SectionHeader id="score" title="마케팅 종합 점수" />
          {!collapsedSections.has("score") && (
            <>
              <div className="flex items-center gap-6 mb-4 pt-3">
                <div className="relative flex items-center justify-center">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#e5e7eb" strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${scorePct}, 100`}
                      className={scoreColor}
                    />
                  </svg>
                  <span className={`absolute text-lg font-bold ${scoreColor}`}>
                    {marketingScore}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold">종합 {marketingScore}점</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{TOTAL_MAX}점 만점 기준</p>
                </div>
              </div>
              <div className="space-y-2">
                {SCORE_AREAS.map(({ key, label, max, color }) => {
                  const area = sb[key] as { score?: number; max?: number; details?: string; detail?: string } | undefined;
                  const score = area?.score ?? 0;
                  const areaMax = area?.max ?? max;
                  const pct = areaMax > 0 ? (score / areaMax) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium w-12 text-right">{score}/{areaMax}</span>
                      </div>
                      {(area?.details || area?.detail) && (
                        <p className="text-xs text-muted-foreground ml-[9.5rem] mt-0.5">{area?.details || area?.detail}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ 섹션 C: 개선 포인트 (조건부) ═══ */}
      {hasImprovements && (
        <div className="border rounded-lg p-4 space-y-3">
          <SectionHeader
            id="improvements"
            title="개선 포인트"
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          />
          {!collapsedSections.has("improvements") && (
            <div className="space-y-3 pt-2">
              {renderImprovements(improvementPlan)}
            </div>
          )}
        </div>
      )}

      {/* ═══ 섹션 D: 키워드 분석 ═══ */}
      <div className="border rounded-lg p-4 space-y-3">
        <SectionHeader id="keywords" title="키워드 분석" />
        {!collapsedSections.has("keywords") && (
          <div className="pt-2">
            {keywords.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">키워드</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">검색의도</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground hidden md:table-cell">월간검색량</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground hidden md:table-cell">경쟁도</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">활성화</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw, i) => {
                      const kwName = String(kw.keyword ?? kw);
                      const isActive = activeKeywords.includes(kwName);
                      const isToggling = togglingKeywords.has(kwName);
                      return (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium">{kwName}</td>
                          <td className="py-2 px-3 text-muted-foreground text-xs hidden sm:table-cell">{kw.intent ?? kw.search_intent ?? "-"}</td>
                          <td className="py-2 px-3 text-center text-xs hidden md:table-cell">{kw.monthlySearch ?? kw.monthly_search ?? "-"}</td>
                          <td className="py-2 px-3 text-center hidden md:table-cell">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              kw.competition === "high" ? "bg-red-100 text-red-700" :
                              kw.competition === "medium" ? "bg-amber-100 text-amber-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {kw.competition ?? "-"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => handleToggleKeyword(kwName, isActive)}
                              disabled={isToggling}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 ${
                                isActive ? "bg-primary" : "bg-muted"
                              }`}
                            >
                              {isToggling ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin m-auto text-muted-foreground" />
                              ) : (
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    isActive ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">분석된 키워드가 없습니다</p>
            )}
            {keywords.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                활성화된 키워드는 키워드 관리 페이지에서 추적됩니다.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══ 섹션 E: AI 추론 페르소나 ═══ */}
      {ai && (
        <div className="border rounded-lg p-4 space-y-4">
          <SectionHeader id="ai_inferred" title="AI 추론 페르소나" icon={<Target className="h-4 w-4 text-primary" />} />
          {!collapsedSections.has("ai_inferred") && (
            <div className="grid gap-4 lg:grid-cols-2 pt-2">
              {/* 타겟 고객 */}
              <AiInferredCard
                title="타겟 고객"
                confirmed={ai.target_customer?.confirmed}
                onSave={(updates) => handleSaveAiInferred("target_customer", updates)}
                isSaving={isSaving}
                fields={[
                  { label: "주요 타겟", key: "primary", value: ai.target_customer?.primary },
                  { label: "보조 타겟", key: "secondary", value: ai.target_customer?.secondary },
                  { label: "검색 의도", key: "search_intent", value: ai.target_customer?.search_intent },
                ]}
                listFields={[
                  { label: "고객 페인포인트", key: "pain_points", value: ai.target_customer?.pain_points },
                ]}
              />

              {/* 톤앤매너 */}
              <AiInferredCard
                title="톤 & 매너"
                confirmed={ai.tone?.confirmed}
                onSave={(updates) => handleSaveAiInferred("tone", updates)}
                isSaving={isSaving}
                fields={[
                  { label: "스타일", key: "style", value: ai.tone?.style },
                  { label: "퍼스널리티", key: "personality", value: ai.tone?.personality },
                ]}
                listFields={[
                  { label: "예시 표현", key: "example_phrases", value: ai.tone?.example_phrases },
                ]}
              />

              {/* USP */}
              <AiInferredCard
                title="USP (차별화 포인트)"
                confirmed={ai.usp?.confirmed}
                onSave={(updates) => handleSaveAiInferred("usp", updates)}
                isSaving={isSaving}
                fields={[]}
                listFields={[
                  { label: "핵심 차별화 포인트", key: "points", value: ai.usp?.points },
                  { label: "리뷰 기반 USP", key: "from_reviews", value: ai.usp?.from_reviews },
                ]}
              />

              {/* 콘텐츠 방향 */}
              <AiInferredCard
                title="콘텐츠 방향"
                confirmed={ai.content_direction?.confirmed}
                onSave={(updates) => handleSaveAiInferred("content_direction", updates)}
                isSaving={isSaving}
                fields={[
                  { label: "발행 빈도", key: "frequency", value: ai.content_direction?.frequency },
                ]}
                listFields={[
                  { label: "콘텐츠 앵글", key: "angles", value: ai.content_direction?.angles },
                  { label: "콘텐츠 유형", key: "types", value: ai.content_direction?.types },
                ]}
              />

              {/* 가격 포지션 */}
              {(ai.price_position?.position || ai.price_position?.comparison) && (
                <AiInferredCard
                  title="가격 포지션"
                  confirmed={ai.price_position?.confirmed}
                  onSave={(updates) => handleSaveAiInferred("price_position", updates)}
                  isSaving={isSaving}
                  fields={[
                    { label: "포지션", key: "position", value: ai.price_position?.position },
                    { label: "비교", key: "comparison", value: ai.price_position?.comparison },
                  ]}
                  listFields={[]}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ 섹션 F: 업주 입력 정보 ═══ */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader id="owner_input" title="업주 입력 정보" />
          {!collapsedSections.has("owner_input") && (
            <div className="flex gap-2 shrink-0">
              {isEditingOwner ? (
                <>
                  <button
                    onClick={() => { setIsEditingOwner(false); setOwnerEdits({}); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                    취소
                  </button>
                  <button
                    onClick={handleSaveOwnerInput}
                    disabled={isSavingOwner}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                  >
                    {isSavingOwner ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    저장
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingOwner(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                >
                  <Edit3 className="h-3 w-3" />
                  수정
                </button>
              )}
            </div>
          )}
        </div>
        {!collapsedSections.has("owner_input") && (
          <div className="grid gap-4 lg:grid-cols-2 pt-2">
            <OwnerField
              label="브랜드 스토리"
              value={oi?.brand_story}
              isEditing={isEditingOwner}
              onChange={(v) => setOwnerEdits((p) => ({ ...p, brand_story: v }))}
            />
            <OwnerField
              label="금지 콘텐츠"
              value={oi?.forbidden_content}
              isEditing={isEditingOwner}
              onChange={(v) => setOwnerEdits((p) => ({ ...p, forbidden_content: v }))}
            />
            <div>
              <span className="text-xs text-muted-foreground">수상/인증 내역</span>
              {isEditingOwner ? (
                <textarea
                  className="w-full mt-1 p-2 border rounded-lg text-sm bg-background resize-none"
                  rows={2}
                  defaultValue={(oi?.awards_certifications ?? []).join(", ")}
                  placeholder="쉼표로 구분하여 입력"
                  onChange={(e) =>
                    setOwnerEdits((p) => ({
                      ...p,
                      awards_certifications: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                />
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(oi?.awards_certifications ?? []).length > 0
                    ? oi!.awards_certifications!.map((a, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs border border-amber-100">
                          {a}
                        </span>
                      ))
                    : <p className="text-xs text-muted-foreground">-</p>}
                </div>
              )}
            </div>
            <OwnerField
              label="공식 가격표"
              value={oi?.official_price_info}
              isEditing={isEditingOwner}
              onChange={(v) => setOwnerEdits((p) => ({ ...p, official_price_info: v }))}
            />
          </div>
        )}
      </div>

      {/* ═══ 섹션 G: 브랜드 포지셔닝 요약 ═══ */}
      {persona && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader id="positioning" title="브랜드 포지셔닝 요약" />
            {!collapsedSections.has("positioning") && (
              <div className="flex gap-2 shrink-0">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => { setIsEditing(false); setEditValues({}); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                      취소
                    </button>
                    <button
                      onClick={handleSavePersona}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      저장
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                    >
                      <Edit3 className="h-3 w-3" />
                      수정
                    </button>
                    <button
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      {isRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      {isRegenerating ? "생성 중..." : "재생성"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {!collapsedSections.has("positioning") && (
            <div className="space-y-4 pt-2">
              {/* One-liner */}
              {persona.one_liner && (
                <div className="border rounded-lg p-4 bg-gradient-to-r from-primary/5 to-transparent">
                  <p className="text-sm font-medium">&ldquo;{persona.one_liner}&rdquo;</p>
                </div>
              )}

              {/* 업데이트 날짜 */}
              {client.persona_updated_at && (
                <p className="text-xs text-muted-foreground">
                  최종 업데이트: {new Date(client.persona_updated_at).toLocaleDateString("ko-KR")}
                  {persona.manually_edited && " (수동 수정됨)"}
                </p>
              )}

              {/* Core Fields */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  {renderField("한줄 소개", "one_liner", persona.one_liner)}
                  {renderField("포지셔닝", "positioning", persona.positioning)}
                  {renderField("타겟 고객", "target_audience", persona.target_audience)}
                  {renderField("톤 앤 매너", "tone", persona.tone)}
                </div>
                <div className="space-y-3">
                  {renderList("콘텐츠 앵글", persona.content_angles)}
                  {renderList("피해야 할 앵글", persona.avoid_angles)}
                  {renderList("약점/개선 영역", persona.weaknesses)}
                </div>
              </div>

              {/* Strengths with add/remove */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">강점</h4>
                {persona.strengths && persona.strengths.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {persona.strengths.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs border border-emerald-100">
                        {s}
                        <button
                          onClick={() => handleRemoveStrength(i)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">아직 강점이 등록되지 않았습니다</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="강점 추가..."
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddStrength()}
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-background"
                  />
                  <button
                    onClick={handleAddStrength}
                    disabled={!newStrength.trim() || isAddingStrength}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted disabled:opacity-50"
                  >
                    {isAddingStrength ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    추가
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  );
}

function OwnerField({
  label,
  value,
  isEditing,
  onChange,
}: {
  label: string;
  value?: string;
  isEditing: boolean;
  onChange: (v: string) => void;
}) {
  if (isEditing) {
    return (
      <div>
        <label className="text-xs text-muted-foreground">{label}</label>
        <textarea
          className="w-full mt-1 p-2 border rounded-lg text-sm bg-background resize-none"
          rows={3}
          defaultValue={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm mt-0.5 whitespace-pre-wrap">{value || "-"}</p>
    </div>
  );
}

// ── AI Inferred Card (with inline edit) ──

interface AiInferredCardProps {
  title: string;
  confirmed?: boolean;
  onSave: (updates: Record<string, unknown>) => void;
  isSaving: boolean;
  fields: Array<{ label: string; key: string; value?: string }>;
  listFields: Array<{ label: string; key: string; value?: string[] }>;
}

function AiInferredCard({ title, confirmed, onSave, isSaving, fields, listFields }: AiInferredCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [edits, setEdits] = useState<Record<string, unknown>>({});

  const handleSave = () => {
    onSave(edits);
    setIsEditing(false);
    setEdits({});
  };

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          {title}
          {confirmed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
        </h4>
        {isEditing ? (
          <div className="flex gap-1">
            <button
              onClick={() => { setIsEditing(false); setEdits({}); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            수정
          </button>
        )}
      </div>

      {fields.map(({ label, key, value }) => (
        <div key={key}>
          <span className="text-xs text-muted-foreground">{label}</span>
          {isEditing ? (
            <input
              className="w-full mt-0.5 p-1.5 border rounded text-sm bg-background"
              defaultValue={value || ""}
              onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
            />
          ) : (
            <p className="text-sm mt-0.5">{value || "-"}</p>
          )}
        </div>
      ))}

      {listFields.map(({ label, key, value }) => (
        <div key={key}>
          <span className="text-xs text-muted-foreground">{label}</span>
          {isEditing ? (
            <textarea
              className="w-full mt-0.5 p-1.5 border rounded text-sm bg-background resize-none"
              rows={2}
              defaultValue={(value ?? []).join(", ")}
              placeholder="쉼표로 구분하여 입력"
              onChange={(e) =>
                setEdits((p) => ({
                  ...p,
                  [key]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                }))
              }
            />
          ) : value && value.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {value.map((item, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-xs">{item}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">-</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Improvement Plan Renderer ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderImprovements(plan: any) {
  // Array format (improvements list)
  if (Array.isArray(plan)) {
    return plan.map((item, i) => (
      <div key={i} className="p-3 rounded-lg bg-muted/30 border">
        <div className="flex items-center gap-2 mb-1">
          {!!item.priority && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              item.priority === "high" ? "bg-red-100 text-red-700" :
              item.priority === "medium" ? "bg-amber-100 text-amber-700" :
              "bg-gray-100 text-gray-600"
            }`}>
              {String(item.priority)}
            </span>
          )}
          <span className="text-sm font-medium">
            {String(item.title ?? item.area ?? item.category ?? `개선사항 ${i + 1}`)}
          </span>
        </div>
        {!!item.description && (
          <p className="text-xs text-muted-foreground">{String(item.description)}</p>
        )}
        {!!item.action && (
          <p className="text-xs text-primary mt-1">&rarr; {String(item.action)}</p>
        )}
      </div>
    ));
  }

  // Object format (short_term/mid_term/long_term)
  if (typeof plan === "object" && plan !== null) {
    const timeframes = [
      { key: "short_term", label: "단기 (1주)", color: "border-emerald-200 bg-emerald-50/50" },
      { key: "mid_term", label: "중기 (1개월)", color: "border-blue-200 bg-blue-50/50" },
      { key: "long_term", label: "장기 (3개월)", color: "border-violet-200 bg-violet-50/50" },
    ];

    const hasTimeframes = timeframes.some((tf) => plan[tf.key]);
    if (hasTimeframes) {
      return (
        <div className="grid gap-3 md:grid-cols-3">
          {timeframes.map(({ key, label, color }) => {
            const items = plan[key];
            if (!items) return null;
            const itemList = Array.isArray(items) ? items : [items];
            return (
              <div key={key} className={`border rounded-lg p-3 ${color}`}>
                <h5 className="text-xs font-semibold mb-2">{label}</h5>
                <ul className="space-y-1">
                  {itemList.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                      {typeof item === "string" ? item : String(item.action ?? item.title ?? item.description ?? JSON.stringify(item))}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      );
    }

    // Fallback: render improvements array in object
    if (plan.improvements && Array.isArray(plan.improvements)) {
      return renderImprovements(plan.improvements);
    }
  }

  return null;
}
