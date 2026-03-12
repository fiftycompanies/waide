"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { loadPromptTemplate, fillPromptTemplate } from "@/lib/prompt-loader";

interface NicheKeyword {
  keyword: string;
  difficulty: string;
  opportunity: string;
  reason: string;
}

interface Props {
  clientId: string;
  brandName: string;
  category: string;
  location: string;
  existingKeywords: string[];
  strengths: string;
  target: string;
}

export function NicheKeywordPanel({
  clientId,
  brandName,
  category,
  location,
  existingKeywords,
  strengths,
  target,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<NicheKeyword[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analyzed, setAnalyzed] = useState(false);

  function handleAnalyze() {
    startTransition(async () => {
      try {
        const template = await loadPromptTemplate("niche_keyword");
        const prompt = fillPromptTemplate(template, {
          brand_name: brandName,
          category,
          location,
          existing_keywords: existingKeywords.join(", "),
          strengths,
          target,
        });

        const response = await fetch("/api/ai/niche-keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, clientId }),
        });

        if (!response.ok) {
          // Fallback: 기존 expandNicheKeywords 사용
          const { expandNicheKeywords } = await import("@/lib/actions/keyword-expansion-actions");
          const result = await expandNicheKeywords({
            clientId,
            mainKeywords: existingKeywords.slice(0, 5),
          });
          if (result.success) {
            toast.success(`${result.inserted}개 니치 키워드가 AI 추천 탭에 추가되었습니다`);
            router.refresh();
          } else {
            toast.error(result.error || "발굴 실패");
          }
          return;
        }

        const data = await response.json();
        setResults(data.keywords || []);
        setSelected(new Set());
        setAnalyzed(true);
      } catch {
        // Fallback to existing function
        const { expandNicheKeywords } = await import("@/lib/actions/keyword-expansion-actions");
        const result = await expandNicheKeywords({
          clientId,
          mainKeywords: existingKeywords.slice(0, 5),
        });
        if (result.success) {
          toast.success(`${result.inserted}개 니치 키워드가 AI 추천 탭에 추가되었습니다`);
          router.refresh();
        } else {
          toast.error(result.error || "발굴 실패");
        }
      }
    });
  }

  function handleRegister() {
    const selectedItems = results.filter((r) => selected.has(r.keyword));
    if (selectedItems.length === 0) return;

    startTransition(async () => {
      const { createAdminClient } = await import("@/lib/supabase/service");
      const db = createAdminClient();
      let inserted = 0;

      for (const kw of selectedItems) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (db as any)
          .from("keywords")
          .select("id")
          .eq("client_id", clientId)
          .eq("keyword", kw.keyword)
          .maybeSingle();

        if (existing) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (db as any)
          .from("keywords")
          .insert({
            client_id: clientId,
            keyword: kw.keyword,
            status: "active",
            source: "ai_niche",
            metadata: {
              difficulty: kw.difficulty,
              opportunity: kw.opportunity,
              reason: kw.reason,
              generated_by: "niche_panel_v1",
              generated_at: new Date().toISOString(),
            },
          });

        if (!error) inserted++;
      }

      toast.success(`${inserted}개 키워드가 등록되었습니다`);
      router.refresh();
    });
  }

  function toggleSelect(keyword: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  }

  const difficultyColor = (d: string) => {
    if (d === "low") return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (d === "medium") return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const opportunityColor = (o: string) => {
    if (o === "high") return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (o === "medium") return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const difficultyLabel = (d: string) => d === "low" ? "낮음" : d === "medium" ? "중간" : "높음";
  const opportunityLabel = (o: string) => o === "high" ? "높음" : o === "medium" ? "중간" : "낮음";

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/30">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <span className="text-sm font-semibold text-violet-900">니치 키워드 발굴</span>
          {brandName && (
            <span className="text-xs text-muted-foreground">· {brandName}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="border-t border-violet-200 p-4 space-y-4">
          {/* 브랜드 정보 요약 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
            <div><span className="font-medium">업종:</span> {category || "-"}</div>
            <div><span className="font-medium">지역:</span> {location || "-"}</div>
            <div><span className="font-medium">활성 키워드:</span> {existingKeywords.length}개</div>
            <div><span className="font-medium">타겟:</span> {target || "-"}</div>
          </div>

          {/* AI 분석 시작 버튼 */}
          {!analyzed && (
            <Button
              onClick={handleAnalyze}
              disabled={isPending}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isPending ? "분석 중..." : "AI 분석 시작"}
            </Button>
          )}

          {/* 결과 테이블 */}
          {analyzed && results.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">발굴된 니치 키워드 ({results.length}개)</p>
              <div className="rounded-lg border border-violet-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-violet-50/50 border-b border-violet-100">
                      <th className="py-2 px-3 w-8" />
                      <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">키워드</th>
                      <th className="py-2 px-3 text-center text-xs font-medium text-muted-foreground">난이도</th>
                      <th className="py-2 px-3 text-center text-xs font-medium text-muted-foreground">기회</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">추천 사유</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-100">
                    {results.map((r) => (
                      <tr
                        key={r.keyword}
                        className="hover:bg-violet-50/30 cursor-pointer"
                        onClick={() => toggleSelect(r.keyword)}
                      >
                        <td className="py-2 px-3">
                          <Checkbox
                            checked={selected.has(r.keyword)}
                            onCheckedChange={() => toggleSelect(r.keyword)}
                          />
                        </td>
                        <td className="py-2 px-3 font-medium">{r.keyword}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="outline" className={`text-[10px] ${difficultyColor(r.difficulty)}`}>
                            {difficultyLabel(r.difficulty)}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="outline" className={`text-[10px] ${opportunityColor(r.opportunity)}`}>
                            {opportunityLabel(r.opportunity)}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {r.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.size > 0 && (
                <Button
                  onClick={handleRegister}
                  disabled={isPending}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  선택한 키워드 등록 ({selected.size}개)
                </Button>
              )}
            </div>
          )}

          {analyzed && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              니치 키워드 발굴 결과가 없습니다. 기존 방식으로 발굴을 실행합니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
