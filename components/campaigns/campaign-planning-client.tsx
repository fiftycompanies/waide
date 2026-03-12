"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Check,
  X,
  Loader2,
  Rocket,
  Trophy,
  CheckSquare,
  Square,
  Pause,
  Key,
  FileText,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  SuggestedKeyword,
  ActiveKeywordPoolItem,
} from "@/lib/actions/campaign-planning-actions";
import {
  suggestKeywordsForClient,
  addManualKeyword,
  triggerContentGeneration,
  getActiveKeywordPool,
  getSuggestedKeywords,
} from "@/lib/actions/campaign-planning-actions";
import {
  approveSuggestedKeyword,
  rejectSuggestedKeyword,
} from "@/lib/actions/keyword-expansion-actions";
import type { StyleRefContent } from "@/lib/actions/campaign-actions";

// ── Props ──────────────────────────────────────────────────────────────────────

interface CampaignPlanningClientProps {
  clientId: string;
  initialActivePool: ActiveKeywordPoolItem[];
  initialSuggestedKeywords: SuggestedKeyword[];
  bestContents: StyleRefContent[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CONTENT_TYPE_OPTIONS = [
  { value: "list", label: "추천형", desc: "BEST/TOP N 리스트 비교표" },
  { value: "review", label: "리뷰형", desc: "솔직 후기 체험/방문기" },
  { value: "info", label: "정보형", desc: "가이드/방법 단계별 설명" },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function CampaignPlanningClient({
  clientId,
  initialActivePool,
  initialSuggestedKeywords,
  bestContents,
}: CampaignPlanningClientProps) {
  const router = useRouter();

  // ── State: 키워드 풀 ──
  const [activePool, setActivePool] = useState(initialActivePool);
  const [suggestedKeywords, setSuggestedKeywords] = useState(initialSuggestedKeywords);

  // ── State: 수동 키워드 입력 ──
  const [manualInput, setManualInput] = useState("");
  const [addingManual, startManualTransition] = useTransition();

  // ── State: AI 추천 ──
  const [suggesting, startSuggestTransition] = useTransition();

  // ── State: 키워드 승인/거절 ──
  const [processingKwId, setProcessingKwId] = useState<string | null>(null);

  // ── State: 생성 지시 ──
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("");
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(new Set());
  const [contentType, setContentType] = useState("list");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [generating, startGenerateTransition] = useTransition();

  const selectedKeyword = activePool.find((k) => k.id === selectedKeywordId);

  // ── Handlers: AI 추천 ──

  function handleSuggest() {
    startSuggestTransition(async () => {
      const result = await suggestKeywordsForClient(clientId, 3);
      if (result.success) {
        // 새로 추천된 키워드 추가
        setSuggestedKeywords((prev) => [...result.keywords, ...prev]);
        toast.success(`${result.keywords.length}개 키워드가 추천되었습니다`);
      } else {
        toast.error(result.error || "AI 추천 실패");
      }
    });
  }

  // ── Handlers: 키워드 승인/거절 ──

  async function handleApprove(kwId: string) {
    setProcessingKwId(kwId);
    try {
      const result = await approveSuggestedKeyword(kwId);
      if (result.success) {
        // suggested → active로 이동
        const approved = suggestedKeywords.find((k) => k.id === kwId);
        setSuggestedKeywords((prev) => prev.filter((k) => k.id !== kwId));
        if (approved) {
          setActivePool((prev) => [
            {
              id: approved.id,
              keyword: approved.keyword,
              status: "active",
              monthlySearchTotal: approved.searchVolume,
              contentCount: 0,
              currentRankNaver: null,
              currentRankGoogle: null,
              source: "ai_suggestion",
            },
            ...prev,
          ]);
        }
        toast.success(`"${approved?.keyword}" 승인됨`);
      } else {
        toast.error(result.error || "승인 실패");
      }
    } catch {
      toast.error("승인 처리 중 오류");
    }
    setProcessingKwId(null);
  }

  async function handleReject(kwId: string) {
    setProcessingKwId(kwId);
    try {
      const result = await rejectSuggestedKeyword(kwId);
      if (result.success) {
        const rejected = suggestedKeywords.find((k) => k.id === kwId);
        setSuggestedKeywords((prev) => prev.filter((k) => k.id !== kwId));
        toast.success(`"${rejected?.keyword}" 보류됨`);
      } else {
        toast.error(result.error || "보류 실패");
      }
    } catch {
      toast.error("보류 처리 중 오류");
    }
    setProcessingKwId(null);
  }

  // ── Handlers: 수동 키워드 추가 ──

  function handleManualAdd() {
    if (!manualInput.trim()) return;
    startManualTransition(async () => {
      const result = await addManualKeyword(clientId, manualInput);
      if (result.success) {
        setActivePool((prev) => [
          {
            id: result.id!,
            keyword: manualInput.trim(),
            status: "active",
            monthlySearchTotal: null,
            contentCount: 0,
            currentRankNaver: null,
            currentRankGoogle: null,
            source: "manual",
          },
          ...prev,
        ]);
        setManualInput("");
        toast.success(`"${manualInput.trim()}" 추가됨`);
      } else {
        toast.error(result.error || "추가 실패");
      }
    });
  }

  // ── Handlers: Style Transfer 참조 ──

  function toggleRef(id: string) {
    setSelectedRefIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      else toast.error("최대 3개까지 선택 가능합니다");
      return next;
    });
  }

  // ── Handlers: 콘텐츠 생성 지시 ──

  function handleGenerate() {
    if (!selectedKeywordId || !selectedKeyword) {
      toast.error("생성할 키워드를 선택해주세요");
      return;
    }
    startGenerateTransition(async () => {
      const result = await triggerContentGeneration({
        clientId,
        keywordId: selectedKeywordId,
        keywordText: selectedKeyword.keyword,
        referenceContentIds: [...selectedRefIds],
        contentType,
        additionalNotes: additionalNotes.trim() || undefined,
      });
      if (result.success) {
        toast.success("콘텐츠 생성이 시작되었습니다!", {
          description: `Job ID: ${result.jobId?.slice(0, 8)}... — COPYWRITER 에이전트가 작업을 시작합니다.`,
          duration: 6000,
        });
        // 데이터 새로고침
        const [newPool, newSuggested] = await Promise.all([
          getActiveKeywordPool(clientId),
          getSuggestedKeywords(clientId),
        ]);
        setActivePool(newPool);
        setSuggestedKeywords(newSuggested);
        setSelectedKeywordId("");
        setSelectedRefIds(new Set());
        setAdditionalNotes("");
        router.refresh();
      } else if (result.pointError) {
        toast.error("포인트가 부족합니다", {
          description: "관리자에게 포인트 충전을 요청하세요.",
          duration: 5000,
        });
      } else {
        toast.error(result.error || "생성 실패");
      }
    });
  }

  // ── Render ──

  const selectCls =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ═══════════ 섹션 1: 타겟 키워드 ═══════════ */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-violet-600" />
          <h2 className="text-lg font-semibold">타겟 키워드</h2>
        </div>

        {/* ── A) AI 추천 키워드 ── */}
        <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-700">
              <Sparkles className="h-4 w-4" />
              AI 추천 키워드
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuggest}
              disabled={suggesting}
              className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-100"
            >
              {suggesting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  추천 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  AI 추천 요청
                </>
              )}
            </Button>
          </div>

          {suggestedKeywords.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              아직 AI 추천 키워드가 없습니다. [AI 추천 요청] 버튼을 눌러 키워드를 추천받으세요.
            </p>
          ) : (
            <div className="space-y-2">
              {suggestedKeywords.map((kw) => (
                <div
                  key={kw.id}
                  className="flex items-center gap-3 rounded-md border border-violet-100 bg-white px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{kw.keyword}</span>
                      {kw.searchVolume && (
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          ~{kw.searchVolume.toLocaleString()}/월
                        </Badge>
                      )}
                    </div>
                    {kw.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {kw.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(kw.id)}
                      disabled={processingKwId === kw.id}
                      className="h-7 px-2 gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                      {processingKwId === kw.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(kw.id)}
                      disabled={processingKwId === kw.id}
                      className="h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Pause className="h-3 w-3" />
                      보류
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── B) 수동 키워드 입력 ── */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">직접 키워드 추가</Label>
          <div className="flex gap-2">
            <Input
              placeholder="키워드를 입력하세요..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleManualAdd();
                }
              }}
              className="flex-1"
              disabled={addingManual}
            />
            <Button
              onClick={handleManualAdd}
              disabled={addingManual || !manualInput.trim()}
              className="gap-1.5 shrink-0"
            >
              {addingManual ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              추가
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            수동 추가된 키워드는 바로 활성(active) 상태로 등록됩니다
          </p>
        </div>

        {/* ── C) 활성 키워드 풀 ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              활성 키워드 풀 ({activePool.length}개)
            </Label>
            {selectedKeywordId && selectedKeyword && (
              <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                선택됨: {selectedKeyword.keyword}
              </Badge>
            )}
          </div>

          {activePool.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                활성 키워드가 없습니다. AI 추천을 받거나 직접 추가해주세요.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                <span>키워드</span>
                <span className="text-center">콘텐츠</span>
                <span className="text-center">네이버</span>
                <span className="text-center">구글</span>
                <span className="text-center">검색량</span>
              </div>
              <div className="divide-y divide-border/40 max-h-[300px] overflow-y-auto">
                {activePool.map((kw) => {
                  const isSelected = selectedKeywordId === kw.id;
                  return (
                    <button
                      key={kw.id}
                      type="button"
                      onClick={() =>
                        setSelectedKeywordId(isSelected ? "" : kw.id)
                      }
                      className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 w-full text-left transition-colors ${
                        isSelected
                          ? "bg-violet-50 border-l-2 border-l-violet-500"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-violet-600 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">
                          {kw.keyword}
                        </span>
                        {kw.source === "ai_suggestion" && (
                          <Sparkles className="h-3 w-3 text-violet-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground text-center w-12">
                        {kw.contentCount > 0 ? (
                          <span className="flex items-center gap-0.5 justify-center">
                            <FileText className="h-3 w-3" />
                            {kw.contentCount}
                          </span>
                        ) : (
                          "—"
                        )}
                      </span>
                      <span className="text-xs text-center w-12">
                        {kw.currentRankNaver ? (
                          <span className={kw.currentRankNaver <= 3 ? "text-emerald-600 font-semibold" : "text-foreground"}>
                            {kw.currentRankNaver}위
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </span>
                      <span className="text-xs text-center w-12">
                        {kw.currentRankGoogle ? (
                          <span className={kw.currentRankGoogle <= 3 ? "text-blue-600 font-semibold" : "text-foreground"}>
                            {kw.currentRankGoogle}위
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground text-center w-16">
                        {kw.monthlySearchTotal
                          ? kw.monthlySearchTotal.toLocaleString()
                          : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ 섹션 2: Style Transfer 참조 ═══════════ */}
      {bestContents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Style Transfer 참조</h2>
            <span className="text-xs text-muted-foreground">(선택, 최대 3개)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            상위노출된 베스트 글의 스타일을 참고하여 작성합니다
          </p>
          <div className="space-y-2">
            {bestContents.map((c) => {
              const checked = selectedRefIds.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleRef(c.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    checked
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-border/60 bg-background hover:border-border hover:bg-muted/30"
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="h-4 w-4 shrink-0 text-amber-600" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className="flex-1 text-sm line-clamp-1">
                    {c.title ?? "제목 없음"}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.peak_rank_naver != null && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        N {c.peak_rank_naver}위
                      </Badge>
                    )}
                    {c.peak_rank_google != null && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                      >
                        G {c.peak_rank_google}위
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════ 섹션 3: 생성 옵션 ═══════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">생성 옵션</h2>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">콘텐츠 유형</Label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className={selectCls}
          >
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">
            추가 지시사항 (선택)
          </Label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="에이전트에게 전달할 추가 메모를 작성하세요..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* ═══════════ 하단: 생성 요약 + 버튼 ═══════════ */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        {selectedKeyword && (
          <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm text-violet-800 space-y-1">
            <p>
              <span className="font-semibold">
                &ldquo;{selectedKeyword.keyword}&rdquo;
              </span>{" "}
              키워드 /{" "}
              <span className="font-medium">
                {CONTENT_TYPE_OPTIONS.find((o) => o.value === contentType)?.label ??
                  contentType}
              </span>{" "}
              타입
            </p>
            {selectedRefIds.size > 0 && (
              <p className="text-violet-600 text-xs">
                스타일 레퍼런스 {selectedRefIds.size}개 선택됨
              </p>
            )}
            {additionalNotes.trim() && (
              <p className="text-violet-600 text-xs">
                추가 지시사항 포함
              </p>
            )}
            <p className="text-xs text-violet-600 mt-1">
              COPYWRITER → QC → 재작성(필요 시) 순서로 에이전트가 실행됩니다
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={generating || !selectedKeywordId}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                콘텐츠 생성 지시
              </>
            )}
          </Button>

          {!selectedKeywordId && (
            <span className="text-xs text-muted-foreground">
              활성 키워드 풀에서 키워드를 선택해주세요
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
