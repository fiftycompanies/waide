"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Loader2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { searchKeywordVolumes } from "@/lib/actions/keyword-actions";
import { createKeyword } from "@/lib/actions/keyword-actions";

interface VolumeResult {
  keyword: string;
  monthlyPc: number;
  monthlyMo: number;
  monthlyTotal: number;
  competitionLevel?: string;
  selected: boolean;
}

interface KeywordAddModalProps {
  clientId: string;
  open: boolean;
  onClose: () => void;
}

export function KeywordAddModal({ clientId, open, onClose }: KeywordAddModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState<VolumeResult[]>([]);
  const [searched, setSearched] = useState(false);

  function handleSearch() {
    const keywords = inputText
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywords.length === 0) {
      toast.error("키워드를 입력해주세요.");
      return;
    }
    startTransition(async () => {
      try {
        const volumes = await searchKeywordVolumes(keywords);
        setResults(
          volumes.map((v) => ({
            keyword: v.keyword,
            monthlyPc: v.monthlyPc,
            monthlyMo: v.monthlyMo,
            monthlyTotal: v.monthlyTotal,
            competitionLevel: undefined,
            selected: true,
          }))
        );
        setSearched(true);
      } catch {
        // API 키 없거나 실패 시 검색량 없이 등록만 가능하게
        setResults(
          keywords.map((kw) => ({
            keyword: kw,
            monthlyPc: 0,
            monthlyMo: 0,
            monthlyTotal: 0,
            competitionLevel: undefined,
            selected: true,
          }))
        );
        setSearched(true);
        toast.info("검색량 조회에 실패했습니다. 수동 등록은 가능합니다.");
      }
    });
  }

  function toggleSelect(idx: number) {
    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r))
    );
  }

  function handleRegister() {
    const selected = results.filter((r) => r.selected);
    if (selected.length === 0) {
      toast.error("등록할 키워드를 선택해주세요.");
      return;
    }
    startTransition(async () => {
      let successCount = 0;
      for (const kw of selected) {
        const result = await createKeyword({
          clientId,
          keyword: kw.keyword,
          subKeyword: null,
          platform: "both",
          monthlySearchPc: kw.monthlyPc || null,
          monthlySearchMo: kw.monthlyMo || null,
          monthlySearchTotal: kw.monthlyTotal || null,
          competitionLevel: kw.competitionLevel ?? "medium",
        });
        if (result.success) successCount++;
      }
      if (successCount > 0) {
        toast.success(`${successCount}개 키워드가 등록되었습니다.`);
        setInputText("");
        setResults([]);
        setSearched(false);
        onClose();
        router.refresh();
      } else {
        toast.error("키워드 등록에 실패했습니다.");
      }
    });
  }

  function handleClose() {
    setInputText("");
    setResults([]);
    setSearched(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>키워드 추가 + 검색량 조회</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              쉼표(,) 또는 줄바꿈으로 구분하여 여러 키워드를 입력할 수 있습니다.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="예: 가평 글램핑, 가평 펜션 추천, 가평 숙소"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={isPending || !inputText.trim()}
                variant="outline"
                className="gap-1.5 shrink-0"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                검색량 조회
              </Button>
            </div>
          </div>

          {searched && results.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-center w-10">선택</th>
                    <th className="px-3 py-2 text-left">키워드</th>
                    <th className="px-3 py-2 text-right">월간 검색량</th>
                    <th className="px-3 py-2 text-right">PC</th>
                    <th className="px-3 py-2 text-right">MO</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.map((r, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-muted/20 cursor-pointer ${r.selected ? "" : "opacity-50"}`}
                      onClick={() => toggleSelect(i)}
                    >
                      <td className="px-3 py-2 text-center">
                        <div className={`h-4 w-4 rounded border mx-auto flex items-center justify-center ${
                          r.selected ? "bg-violet-600 border-violet-600" : "border-border"
                        }`}>
                          {r.selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium">{r.keyword}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {r.monthlyTotal > 0 ? r.monthlyTotal.toLocaleString() : "\u2014"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                        {r.monthlyPc > 0 ? r.monthlyPc.toLocaleString() : "\u2014"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                        {r.monthlyMo > 0 ? r.monthlyMo.toLocaleString() : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {searched && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              검색 결과가 없습니다.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            취소
          </Button>
          {searched && results.some((r) => r.selected) && (
            <Button
              onClick={handleRegister}
              disabled={isPending}
              className="gap-1.5 bg-violet-600 hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {isPending ? "등록 중..." : `선택 키워드 등록 (${results.filter((r) => r.selected).length}개)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
