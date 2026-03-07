"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  queryKeywordVolume,
  registerKeywordsFromVolume,
  type VolumeResult,
} from "@/lib/actions/keyword-volume-actions";

interface Props {
  clientId: string | null;
  apiAvailable: boolean;
}

export function KeywordVolumeTab({ clientId, apiAvailable }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<VolumeResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [queried, setQueried] = useState(false);

  if (!apiAvailable) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          네이버 광고 API 키 설정이 필요합니다
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-md">
          .env.local에 NAVER_AD_API_KEY, NAVER_AD_SECRET_KEY, NAVER_AD_CUSTOMER_ID를 추가하세요.
          <br />
          발급: https://searchad.naver.com → 설정 → API 관리
        </p>
      </div>
    );
  }

  function handleQuery() {
    const keywords = inputValue
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywords.length === 0) {
      toast.error("키워드를 입력하세요");
      return;
    }

    startTransition(async () => {
      const res = await queryKeywordVolume(keywords);
      if (res.success) {
        setResults(res.results);
        setSelected(new Set());
        setQueried(true);
        if (res.results.length === 0) {
          toast.info("검색 결과가 없습니다");
        }
      } else {
        toast.error(res.error || "조회 실패");
      }
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

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.keyword)));
    }
  }

  function handleRegister() {
    if (!clientId) {
      toast.error("브랜드를 선택하세요");
      return;
    }

    const selectedItems = results.filter((r) => selected.has(r.keyword));
    if (selectedItems.length === 0) {
      toast.error("등록할 키워드를 선택하세요");
      return;
    }

    startTransition(async () => {
      const res = await registerKeywordsFromVolume(
        clientId,
        selectedItems.map((r) => ({
          keyword: r.keyword,
          monthlyTotal: r.monthlyTotal,
          monthlyPc: r.monthlyPc,
          monthlyMo: r.monthlyMo,
        })),
      );
      if (res.success) {
        toast.success(`${res.inserted}개 키워드가 등록되었습니다`);
        router.refresh();
      } else {
        toast.error(res.error || "등록 실패");
      }
    });
  }

  function competitionColor(comp?: string) {
    if (comp === "높음") return "text-red-600";
    if (comp === "중간") return "text-amber-600";
    return "text-emerald-600";
  }

  return (
    <div className="space-y-6">
      {/* 검색 입력 */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">키워드 검색량 조회</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="가평 글램핑, 커플 펜션, 가평 풀빌라 (쉼표로 구분)"
            className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") handleQuery(); }}
          />
          <Button onClick={handleQuery} disabled={isPending} className="gap-1.5 shrink-0">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            조회
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          최대 20개 키워드를 쉼표(,) 또는 줄바꿈으로 구분하여 입력하세요
        </p>
      </div>

      {/* 결과 */}
      {queried && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{results.length}개 결과</p>
            {clientId && selected.size > 0 && (
              <Button
                size="sm"
                onClick={handleRegister}
                disabled={isPending}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                선택한 키워드 등록 ({selected.size}개)
              </Button>
            )}
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="py-2 px-3 w-8">
                    <Checkbox
                      checked={selected.size === results.length && results.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">키워드</th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground">총 검색량</th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">PC</th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">모바일</th>
                  <th className="py-2 px-3 text-center text-xs font-medium text-muted-foreground">경쟁</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r) => (
                  <tr
                    key={r.keyword}
                    className="hover:bg-muted/20 cursor-pointer"
                    onClick={() => toggleSelect(r.keyword)}
                  >
                    <td className="py-2 px-3">
                      <Checkbox
                        checked={selected.has(r.keyword)}
                        onCheckedChange={() => toggleSelect(r.keyword)}
                      />
                    </td>
                    <td className="py-2 px-3 font-medium">{r.keyword}</td>
                    <td className="py-2 px-3 text-right font-mono text-sm">
                      {r.monthlyTotal.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-muted-foreground hidden sm:table-cell">
                      {r.monthlyPc.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-muted-foreground hidden sm:table-cell">
                      {r.monthlyMo.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {r.competition ? (
                        <Badge variant="outline" className={`text-xs ${competitionColor(r.competition)}`}>
                          {r.competition}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {queried && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">검색 결과가 없습니다</p>
          <p className="text-xs text-muted-foreground/70 mt-1">다른 키워드로 시도해보세요</p>
        </div>
      )}
    </div>
  );
}
