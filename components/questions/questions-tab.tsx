"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bot,
  Check,
  CheckSquare,
  Eye,
  FileText,
  Globe,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  Square,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Question } from "@/lib/actions/question-actions";
import {
  addManualQuestion,
  deleteQuestion,
  updateQuestion,
  regenerateQuestions,
  generateAEOContents,
  generateQuestions,
} from "@/lib/actions/question-actions";
import { checkPointBalance } from "@/lib/actions/point-actions";
import type { Keyword } from "@/lib/actions/keyword-actions";

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_BADGES: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  llm: { icon: Bot, label: "AI", color: "bg-violet-100 text-violet-700 border-violet-200" },
  paa: { icon: SearchIcon, label: "PAA", color: "bg-blue-100 text-blue-700 border-blue-200" },
  naver: { icon: Globe, label: "네이버", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  manual: { icon: Pencil, label: "직접", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

const INTENT_LABELS: Record<string, string> = {
  recommendation: "추천",
  comparison: "비교",
  price: "가격",
  review: "후기",
  timing: "시기",
  feature: "특징",
  general: "일반",
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface QuestionsTabProps {
  clientId: string;
  questions: Question[];
  keywords: Keyword[];
  adminRole?: string;
}

export function QuestionsTab({ clientId, questions, keywords, adminRole = "admin" }: QuestionsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [displayCount, setDisplayCount] = useState(20);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addKeywordId, setAddKeywordId] = useState("");
  const [addQuestionText, setAddQuestionText] = useState("");
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pointCheckModalOpen, setPointCheckModalOpen] = useState(false);
  const [pointInfo, setPointInfo] = useState<{ balance: number; needed: number; maxAllowed: number }>({ balance: 0, needed: 0, maxAllowed: 0 });

  // 필터링
  const filtered = useMemo(() => {
    let result = questions;
    if (selectedKeyword) {
      result = result.filter((q) => q.keyword_id === selectedKeyword);
    }
    if (sourceFilter) {
      result = result.filter((q) => q.source === sourceFilter);
    }
    return result;
  }, [questions, selectedKeyword, sourceFilter]);

  const displayed = filtered.slice(0, displayCount);

  // 소스 통계
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { llm: 0, paa: 0, naver: 0, manual: 0 };
    for (const q of questions) {
      counts[q.source] = (counts[q.source] || 0) + 1;
    }
    return counts;
  }, [questions]);

  const selectedArray = [...selectedIds].filter((id) =>
    filtered.some((q) => q.id === id && !q.content_id)
  );

  // 체크박스 토글
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      else toast.error("최대 5개까지 선택할 수 있습니다");
      return next;
    });
  }

  // 질문 추가
  function handleAddQuestion() {
    if (!addKeywordId) { toast.error("키워드를 선택해주세요"); return; }
    if (!addQuestionText.trim()) { toast.error("질문을 입력해주세요"); return; }
    startTransition(async () => {
      const result = await addManualQuestion(addKeywordId, clientId, addQuestionText.trim());
      if (result.success) {
        toast.success("질문이 추가되었습니다");
        setAddModalOpen(false);
        setAddQuestionText("");
        router.refresh();
      } else {
        toast.error(result.error ?? "추가 실패");
      }
    });
  }

  // 질문 삭제
  function handleDelete(questionId: string) {
    startTransition(async () => {
      const result = await deleteQuestion(questionId);
      if (result.success) {
        toast.success("질문이 삭제되었습니다");
        router.refresh();
      } else {
        toast.error(result.error ?? "삭제 실패");
      }
    });
  }

  // 인라인 편집 저장
  function handleEditSave(questionId: string) {
    if (!editText.trim()) return;
    startTransition(async () => {
      const result = await updateQuestion(questionId, { question: editText.trim() });
      if (result.success) {
        setEditingId(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "수정 실패");
      }
    });
  }

  // 재생성
  function handleRegenerate(mode: "append" | "replace") {
    if (!selectedKeyword) {
      toast.error("키워드를 선택해주세요");
      return;
    }
    setRegenerateModalOpen(false);
    startTransition(async () => {
      const result = await regenerateQuestions(selectedKeyword, clientId, mode);
      if (result.success) {
        toast.success(`${result.count}개 질문이 ${mode === "append" ? "추가" : "재"}생성되었습니다`);
        router.refresh();
      } else {
        toast.error(result.error ?? "재생성 실패");
      }
    });
  }

  // 선택한 키워드에서 질문 생성
  function handleGenerateForKeyword() {
    if (!selectedKeyword) {
      toast.error("키워드를 선택해주세요");
      return;
    }
    startTransition(async () => {
      const result = await generateQuestions(selectedKeyword, clientId);
      if (result.success) {
        if (result.count > 0) {
          toast.success(`${result.count}개 질문이 생성되었습니다`);
        } else {
          toast.info("이미 질문이 생성되어 있습니다. 재생성하려면 🔄 버튼을 누르세요.");
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "생성 실패");
      }
    });
  }

  // 콘텐츠 생성 시작
  async function handleGenerateContents() {
    if (selectedArray.length === 0) {
      toast.error("질문을 선택해주세요");
      return;
    }

    // 포인트 체크
    if (adminRole !== "super_admin" && adminRole !== "admin") {
      const balance = await checkPointBalance(clientId);
      if (balance.balance < selectedArray.length) {
        if (balance.balance <= 0) {
          toast.error("포인트가 부족합니다. 관리자에게 문의하세요.");
          return;
        }
        // 부분 생성 제안
        setPointInfo({
          balance: balance.balance,
          needed: selectedArray.length,
          maxAllowed: balance.balance,
        });
        setPointCheckModalOpen(true);
        return;
      }
    }

    setGenerateModalOpen(true);
  }

  // 실제 생성 실행
  function executeGenerate(count?: number) {
    setGenerateModalOpen(false);
    setPointCheckModalOpen(false);
    const ids = count ? selectedArray.slice(0, count) : selectedArray;
    startTransition(async () => {
      const result = await generateAEOContents(ids, clientId, adminRole);
      if (result.success) {
        toast.success(`${result.generated}개 AEO 콘텐츠가 생성되었습니다`);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(result.error ?? "생성 실패");
      }
    });
  }

  // 활성 키워드 목록 (드롭다운용)
  const activeKeywords = keywords.filter((k) => k.status === "active");

  return (
    <>
      {/* 상단 필터 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 키워드 선택 */}
          <select
            value={selectedKeyword}
            onChange={(e) => { setSelectedKeyword(e.target.value); setDisplayCount(20); }}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">전체 키워드</option>
            {activeKeywords.map((k) => (
              <option key={k.id} value={k.id}>{k.keyword}</option>
            ))}
          </select>

          {/* 소스 필터 */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
            <button
              onClick={() => setSourceFilter("")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                !sourceFilter ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              전체
            </button>
            {Object.entries(SOURCE_BADGES).map(([key, badge]) => {
              const Icon = badge.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSourceFilter(key)}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sourceFilter === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {badge.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAddKeywordId(selectedKeyword || (activeKeywords[0]?.id ?? ""));
              setAddModalOpen(true);
            }}
            className="h-8 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            질문 추가
          </Button>

          {selectedKeyword && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const kw = filtered.length > 0;
                if (kw) setRegenerateModalOpen(true);
                else handleGenerateForKeyword();
              }}
              disabled={isPending}
              className="h-8 gap-1.5"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {filtered.length > 0 ? "재생성" : "질문 생성"}
            </Button>
          )}

          {selectedArray.length > 0 && (
            <Button
              size="sm"
              onClick={handleGenerateContents}
              disabled={isPending}
              className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isPending ? "생성 중..." : `선택한 질문으로 콘텐츠 생성 (${selectedArray.length}개)`}
            </Button>
          )}
        </div>
      </div>

      {/* 질문 테이블 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
          <MessageCircle className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {selectedKeyword ? "이 키워드에 생성된 질문이 없습니다" : "질문이 없습니다"}
          </p>
          {selectedKeyword && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateForKeyword}
              disabled={isPending}
              className="mt-3 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              질문 자동 생성
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border/60 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-3 py-3 w-8"></th>
                  <th className="px-3 py-3 text-left font-medium">질문</th>
                  <th className="px-3 py-3 text-left font-medium w-20">키워드</th>
                  <th className="px-3 py-3 text-center font-medium w-16">소스</th>
                  <th className="px-3 py-3 text-center font-medium w-16">의도</th>
                  <th className="px-3 py-3 text-center font-medium w-20">콘텐츠</th>
                  <th className="px-3 py-3 text-center font-medium w-16">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {displayed.map((q) => {
                  const sourceBadge = SOURCE_BADGES[q.source];
                  const SourceIcon = sourceBadge?.icon || FileText;
                  const isEditing = editingId === q.id;

                  return (
                    <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {!q.content_id && (
                          <button onClick={() => toggleSelect(q.id)}>
                            {selectedIds.has(q.id) ? (
                              <CheckSquare className="h-4 w-4 text-violet-600" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave(q.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="h-8 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="text-sm cursor-pointer hover:text-violet-600"
                            onDoubleClick={() => { setEditingId(q.id); setEditText(q.question); }}
                          >
                            {q.question}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground truncate max-w-[120px]">
                        {q.keyword_text || "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${sourceBadge?.color || ""}`}>
                          <SourceIcon className="h-2.5 w-2.5 mr-0.5" />
                          {sourceBadge?.label || q.source}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {INTENT_LABELS[q.intent || "general"] || q.intent}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {q.content_id ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 bg-emerald-100 text-emerald-700 border-emerald-200">
                            {q.content_status || "생성됨"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {q.content_id ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => router.push(`/contents/${q.content_id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingId(q.id); setEditText(q.question); }}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                편집
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(q.id)}
                                className="text-red-500 focus:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 더보기 + 통계 */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground">
              총 {filtered.length}개 (AI {sourceCounts.llm} / PAA {sourceCounts.paa} / 네이버 {sourceCounts.naver} / 직접 {sourceCounts.manual})
            </span>
            {filtered.length > displayCount && (
              <button
                onClick={() => setDisplayCount((c) => c + 20)}
                className="text-xs font-medium text-violet-600 hover:underline"
              >
                더보기 (+20)
              </button>
            )}
          </div>
        </>
      )}

      {/* ═══ 질문 추가 모달 ═══ */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>질문 추가</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>키워드</Label>
              <select
                value={addKeywordId}
                onChange={(e) => setAddKeywordId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">키워드 선택</option>
                {activeKeywords.map((k) => (
                  <option key={k.id} value={k.id}>{k.keyword}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>질문</Label>
              <Input
                placeholder="가평 글램핑 당일치기 가능한 곳 있어?"
                value={addQuestionText}
                onChange={(e) => setAddQuestionText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)} disabled={isPending}>취소</Button>
            <Button onClick={handleAddQuestion} disabled={isPending} className="bg-violet-600 hover:bg-violet-700">
              {isPending ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ 재생성 확인 모달 ═══ */}
      <Dialog open={regenerateModalOpen} onOpenChange={setRegenerateModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>질문 재생성</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            기존 질문 {filtered.length}개를 유지하고 새로 생성할까요? 또는 전체 교체?
          </p>
          <p className="text-xs text-muted-foreground">
            콘텐츠가 연결된 질문은 교체해도 유지됩니다.
          </p>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRegenerateModalOpen(false)}>취소</Button>
            <Button variant="outline" onClick={() => handleRegenerate("append")} disabled={isPending}>
              추가 생성
            </Button>
            <Button onClick={() => handleRegenerate("replace")} disabled={isPending} className="bg-violet-600 hover:bg-violet-700">
              전체 교체
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ 콘텐츠 생성 확인 모달 ═══ */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>AEO 콘텐츠 생성</DialogTitle></DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm">
              선택한 <span className="font-semibold">{selectedArray.length}개</span> 질문으로 AEO 콘텐츠를 생성합니다.
            </p>
            <p className="text-xs text-muted-foreground">
              AI가 각 질문에 적합한 콘텐츠 유형(Q&A/리스트)을 자동 판단합니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateModalOpen(false)}>취소</Button>
            <Button onClick={() => executeGenerate()} disabled={isPending} className="bg-violet-600 hover:bg-violet-700">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              생성 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ 포인트 부족 모달 ═══ */}
      <Dialog open={pointCheckModalOpen} onOpenChange={setPointCheckModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>포인트가 부족합니다</DialogTitle></DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm">
              현재 잔액: <span className="font-semibold">{pointInfo.balance}</span> 포인트
            </p>
            <p className="text-sm">
              요청: <span className="font-semibold">{pointInfo.needed}건</span> ({pointInfo.needed} 포인트 필요)
            </p>
            {pointInfo.maxAllowed > 0 && (
              <p className="text-sm text-muted-foreground">
                잔액 내에서 {pointInfo.maxAllowed}건만 생성할까요?
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointCheckModalOpen(false)}>취소</Button>
            {pointInfo.maxAllowed > 0 && (
              <Button
                onClick={() => executeGenerate(pointInfo.maxAllowed)}
                disabled={isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {pointInfo.maxAllowed}건만 생성
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
