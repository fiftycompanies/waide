"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Rocket, CheckSquare, Square, Trophy, AlertCircle, Database, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { StyleRefContent } from "@/lib/actions/campaign-actions";
import { createCampaignWithJob } from "@/lib/actions/campaign-actions";
import type { ContentSource } from "@/lib/actions/content-source-actions";
import { getRecommendationsForKeyword } from "@/lib/actions/recommendation-actions";
import type { PublishRecommendation } from "@/lib/actions/recommendation-actions";

interface ActiveKeyword {
  id: string;
  keyword: string;
  platform: string | null;
}

interface NewCampaignFormProps {
  clientId: string;
  activeKeywords: ActiveKeyword[];
  bestContents: StyleRefContent[];
  contentSources: ContentSource[];
  childClients: { id: string; name: string }[];
}

const PLATFORM_LABELS: Record<string, string> = {
  naver: "N",
  google: "G",
  both: "N+G",
};

const GRADE_COLORS: Record<string, string> = {
  S: "bg-violet-100 text-violet-700 border-violet-300",
  A: "bg-blue-100 text-blue-700 border-blue-200",
  B: "bg-amber-100 text-amber-700 border-amber-200",
  C: "bg-gray-100 text-gray-600 border-gray-200",
};

function GradeBadge({ grade }: { grade: "S"|"A"|"B"|"C" }) {
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-bold ${GRADE_COLORS[grade] ?? ""}`}>
      {grade}급
    </span>
  );
}

const CONTENT_TYPE_OPTIONS = [
  { value: "list", label: "추천형", description: "BEST/TOP N 리스트 (비교 표 필수)", disabled: false },
  { value: "review", label: "리뷰형", description: "솔직 후기 · 체험/방문 1인칭 콘텐츠", disabled: false },
  { value: "info", label: "정보형", description: "가이드/방법 · 단계별 설명형 콘텐츠", disabled: false },
  { value: "promo", label: "홍보형", description: "준비 중", disabled: true },
  { value: "intro", label: "소개형", description: "준비 중", disabled: true },
  { value: "compare", label: "비교형", description: "준비 중", disabled: true },
];

const SOURCE_TYPE_LABELS: Record<string, string> = {
  competitor: "경쟁사",
  own_best: "베스트글",
  industry_article: "업계",
  manual: "직접입력",
  blog: "블로그",
  url: "URL",
  text: "텍스트",
  pdf: "PDF",
  video: "영상",
  image: "이미지",
};

const USAGE_MODE_LABELS: Record<string, string> = {
  reference: "참고",
  style: "스타일",
  fact: "사실",
  cta: "CTA",
};

export function NewCampaignForm({
  clientId,
  activeKeywords,
  bestContents,
  contentSources,
  childClients,
}: NewCampaignFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);

  // AI 추천
  const [recommendations, setRecommendations] = useState<PublishRecommendation[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  // Step 1
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("");
  const [contentType, setContentType] = useState<string>("list");
  const [publishCount, setPublishCount] = useState<number>(1);

  // Step 2
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [selectedTargetClientIds, setSelectedTargetClientIds] = useState<Set<string>>(new Set());

  // Step 3 (스타일 레퍼런스)
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(new Set());

  const selectedKeyword = activeKeywords.find((k) => k.id === selectedKeywordId);
  const needsTable = contentType === "list";

  // 키워드 선택 시 AI 추천 로드
  useEffect(() => {
    if (!selectedKeywordId) {
      setRecommendations([]);
      return;
    }
    setRecLoading(true);
    getRecommendationsForKeyword(selectedKeywordId, clientId, 3)
      .then(setRecommendations)
      .catch(() => setRecommendations([]))
      .finally(() => setRecLoading(false));
  }, [selectedKeywordId, clientId]);

  function toggleSource(id: string) {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTargetClient(id: string) {
    setSelectedTargetClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRef(id: string) {
    setSelectedRefIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (!selectedKeywordId || !selectedKeyword) {
      toast.error("타겟 키워드를 선택해주세요.");
      return;
    }
    startTransition(async () => {
      const result = await createCampaignWithJob({
        clientId,
        keywordId: selectedKeywordId,
        keywordText: selectedKeyword.keyword,
        referenceContentIds: [...selectedRefIds],
        contentType,
        publishCount,
        sourceIds: [...selectedSourceIds],
        targetClientIds: [...selectedTargetClientIds],
      });
      if (result.success) {
        toast.success("캠페인이 생성되었습니다. 에이전트 팀이 작업을 시작합니다.", {
          description: `Job ID: ${result.jobId?.slice(0, 8)}... | CMO 에이전트가 캠페인 전략을 수립합니다.`,
          duration: 6000,
        });
        router.push("/campaigns");
        router.refresh();
      } else {
        toast.error(result.error ?? "캠페인 생성 실패");
      }
    });
  }

  const selectCls =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  const stepLabel = (n: number, label: string) => (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
          step === n
            ? "bg-violet-600 text-white"
            : step > n
            ? "bg-violet-100 text-violet-700"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {n}
      </span>
      <Label className="text-sm font-semibold">{label}</Label>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-8">
      {/* ── Step 1: 키워드 + 콘텐츠 타입 + 발행 갯수 ── */}
      <div className="space-y-4">
        {stepLabel(1, "키워드 · 콘텐츠 타입 · 발행 갯수")}

        {step >= 1 && (
          <div className="space-y-4 pl-8">
            {/* 키워드 선택 */}
            {activeKeywords.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                등록된 활성 키워드가 없습니다. 키워드 관리 화면에서 먼저 키워드를 추가해주세요.
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">타겟 키워드</Label>
                <select
                  value={selectedKeywordId}
                  onChange={(e) => setSelectedKeywordId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">— 키워드를 선택하세요 —</option>
                  {activeKeywords.map((kw) => (
                    <option key={kw.id} value={kw.id}>
                      {kw.keyword}
                      {kw.platform ? ` (${PLATFORM_LABELS[kw.platform] ?? kw.platform})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* AI 추천 발행 계정 */}
            {selectedKeywordId && (
              <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI 추천 발행 계정
                </div>
                {recLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    추천 로딩 중...
                  </div>
                ) : recommendations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    아직 추천 데이터가 없습니다. ANALYST_MATCH 에이전트 실행 후 표시됩니다.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-start gap-2 rounded-md bg-white border border-violet-100 px-2.5 py-2"
                      >
                        <span className="text-xs font-bold text-violet-500 w-4 shrink-0">
                          {rec.rank}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold">{rec.account_name}</span>
                            <GradeBadge grade={rec.account_grade as "S"|"A"|"B"|"C"} />
                            <span className="text-xs text-violet-600 font-bold">{rec.match_score.toFixed(0)}점</span>
                          </div>
                          {rec.reason && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{rec.reason}</p>
                          )}
                          {rec.penalties?.overposting && (
                            <p className="text-[11px] text-amber-600 mt-0.5">⚠️ 이번달 과다 발행 주의</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 콘텐츠 타입 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">콘텐츠 타입</Label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className={selectCls}
              >
                {CONTENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label} — {opt.description}
                  </option>
                ))}
              </select>
              {needsTable && (
                <p className="text-xs text-amber-600">
                  ⚠ 추천형 타입은 마크다운 비교 표가 필수입니다.
                </p>
              )}
            </div>

            {/* 발행 갯수 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">발행 갯수</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={publishCount}
                onChange={(e) => setPublishCount(Math.max(1, Number(e.target.value)))}
                className="w-32"
              />
            </div>

            {step === 1 && (
              <Button
                size="sm"
                onClick={() => setStep(2)}
                disabled={!selectedKeywordId}
                className="bg-violet-600 hover:bg-violet-700"
              >
                다음 단계 →
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Step 2: 소스 선택 + 대상 업체 ── */}
      {step >= 2 && (
        <div className="space-y-4">
          {stepLabel(2, "소스 선택 · 대상 업체")}

          <div className="space-y-4 pl-8">
            {/* 소스 선택 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Database className="h-3 w-3" />
                콘텐츠 소스 (선택)
              </Label>
              {contentSources.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  등록된 콘텐츠 소스가 없습니다.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-border/60 p-2">
                  {contentSources.map((src) => {
                    const checked = selectedSourceIds.has(src.id);
                    return (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => toggleSource(src.id)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                          checked
                            ? "bg-violet-50 border border-violet-200 text-violet-900"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-violet-600" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                        )}
                        <span className="flex-1 text-xs line-clamp-1">
                          {src.title ?? src.url ?? "소스 없음"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-[10px] px-1">
                            {SOURCE_TYPE_LABELS[src.source_type] ?? src.source_type}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1 bg-muted/40">
                            {USAGE_MODE_LABELS[src.usage_mode] ?? src.usage_mode}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 대상 업체 선택 (list/special + childClients 있을 때만) */}
            {needsTable && childClients.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">대상 업체 (선택)</Label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-lg border border-border/60 p-2">
                  {childClients.map((c) => {
                    const checked = selectedTargetClientIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleTargetClient(c.id)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                          checked
                            ? "bg-violet-50 border border-violet-200 text-violet-900"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-violet-600" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                        )}
                        <span className="text-xs">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              size="sm"
              onClick={() => setStep(3)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              다음 단계 →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: 스타일 레퍼런스 ── */}
      {step >= 3 && (
        <div className="space-y-4">
          {stepLabel(3, "Style Transfer 레퍼런스 (선택)")}

          <div className="pl-8 space-y-2">
            <p className="text-xs text-muted-foreground">상위노출된 베스트 글을 참고해 작성합니다</p>

            {bestContents.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/40 p-4 text-sm text-amber-700">
                <Trophy className="h-4 w-4 shrink-0" />
                아직 상위노출 베스트 글이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {bestContents.map((c) => {
                  const checked = selectedRefIds.has(c.id);
                  const bestRank = Math.min(
                    c.peak_rank_naver ?? 999,
                    c.peak_rank_google ?? 999,
                    c.peak_rank ?? 999
                  );
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleRef(c.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                        checked
                          ? "border-violet-300 bg-violet-50 text-violet-900"
                          : "border-border/60 bg-background hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="h-4 w-4 shrink-0 text-violet-600" />
                      ) : (
                        <Square className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className="flex-1 text-sm line-clamp-1">
                        {c.title ?? "제목 없음"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.peak_rank_naver != null && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            N {c.peak_rank_naver}위
                          </Badge>
                        )}
                        {c.peak_rank_google != null && (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                            G {c.peak_rank_google}위
                          </Badge>
                        )}
                        {c.peak_rank_naver == null && c.peak_rank_google == null && c.peak_rank != null && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            {c.peak_rank}위
                          </Badge>
                        )}
                        {bestRank < 999 && (
                          <span className="text-xs font-semibold text-emerald-600">🏆 TOP{bestRank}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <Button
              size="sm"
              onClick={() => setStep(4)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              다음 단계 →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: 실행 요약 + 지시 버튼 ── */}
      {step >= 4 && (
        <div className="space-y-4">
          {stepLabel(4, "콘텐츠 생성 지시")}

          <div className="pl-8 space-y-3">
            {selectedKeyword && (
              <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm text-violet-800 space-y-1">
                <p>
                  <span className="font-semibold">"{selectedKeyword.keyword}"</span> 키워드 /
                  {" "}<span className="font-medium">
                    {CONTENT_TYPE_OPTIONS.find((o) => o.value === contentType)?.label ?? contentType}
                  </span> 타입 /
                  {" "}발행 {publishCount}개
                </p>
                {selectedSourceIds.size > 0 && (
                  <p className="text-violet-600 text-xs">소스 {selectedSourceIds.size}개 선택됨</p>
                )}
                {selectedTargetClientIds.size > 0 && (
                  <p className="text-violet-600 text-xs">대상 업체 {selectedTargetClientIds.size}개 선택됨</p>
                )}
                {selectedRefIds.size > 0 && (
                  <p className="text-violet-600 text-xs">스타일 레퍼런스 {selectedRefIds.size}개 선택됨</p>
                )}
                <p className="text-xs text-violet-600 mt-1 block">
                  CMO → COPYWRITER → QC → PUBLISHER 순서로 에이전트가 순차 실행됩니다.
                </p>
              </div>
            )}

            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isPending || !selectedKeywordId}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              <Rocket className="h-4 w-4" />
              {isPending ? "캠페인 생성 중..." : "🚀 콘텐츠 생성 지시"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
