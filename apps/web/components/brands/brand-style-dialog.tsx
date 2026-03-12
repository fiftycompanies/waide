"use client";

import { useState, useEffect, useTransition } from "react";
import { Settings2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getBrandPersonaSettings,
  updateBrandPersonaSettings,
  type BrandStyleGuide,
} from "@/lib/actions/brand-actions";
import { getContentSources } from "@/lib/actions/content-source-actions";
import type { ContentSource } from "@/lib/actions/content-source-actions";
import { toast } from "sonner";

interface BrandStyleDialogProps {
  clientId: string;
  clientName: string;
}

export function BrandStyleDialog({ clientId, clientName }: BrandStyleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  // 스타일 가이드
  const [tone, setTone] = useState("");
  const [closingText, setClosingText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [rulesText, setRulesText] = useState("");

  // 기본 소스
  const [allSources, setAllSources] = useState<ContentSource[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      getBrandPersonaSettings(clientId),
      getContentSources(clientId),
    ]).then(([settings, sources]) => {
      setAllSources(sources);
      if (settings) {
        setSelectedSourceIds(new Set(settings.default_source_ids));
        const guide = settings.content_style_guide;
        setTone(guide.tone ?? "");
        setClosingText(guide.closing_text ?? "");
        setCtaText(guide.cta_text ?? "");
        setRulesText((guide.writing_rules ?? []).join("\n"));
      }
      setLoading(false);
    });
  }, [open, clientId]);

  function toggleSource(id: string) {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    const guide: BrandStyleGuide = {
      tone: tone || undefined,
      closing_text: closingText || undefined,
      cta_text: ctaText || undefined,
      writing_rules: rulesText.trim() ? rulesText.trim().split("\n").filter(Boolean) : undefined,
    };

    startTransition(async () => {
      const result = await updateBrandPersonaSettings(clientId, {
        default_source_ids: [...selectedSourceIds],
        content_style_guide: guide,
      });
      if (result.success) {
        toast.success("스타일 가이드가 저장되었습니다.");
        setOpen(false);
      } else {
        toast.error(result.error ?? "저장 실패");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="작성 스타일 가이드"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clientName} — 작성 스타일 가이드</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">로딩 중...</div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* 톤앤매너 */}
            <div className="space-y-1.5">
              <Label>톤앤매너</Label>
              <Input
                placeholder="예: 친근한 해요체, 감성적이고 부드러운 톤"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
            </div>

            {/* 마무리 멘트 */}
            <div className="space-y-1.5">
              <Label>마무리 멘트</Label>
              <Input
                placeholder='예: "캠핑의 모든 것, 캠핏에서 만나보세요!"'
                value={closingText}
                onChange={(e) => setClosingText(e.target.value)}
              />
            </div>

            {/* CTA 문구 */}
            <div className="space-y-1.5">
              <Label>CTA 문구</Label>
              <Input
                placeholder='예: "지금 바로 예약하기 → camfit.co.kr"'
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
              />
            </div>

            {/* 작성 규칙 */}
            <div className="space-y-1.5">
              <Label>작성 규칙 <span className="text-xs text-muted-foreground">(한 줄에 하나씩)</span></Label>
              <textarea
                placeholder={"해요체 사용\nBold(**) 사용 금지\n이모지 적극 활용"}
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>

            {/* 기본 소스 설정 */}
            <div className="space-y-2">
              <Label>기본 참조 소스 <span className="text-xs text-muted-foreground">(캠페인 생성 시 자동 선택)</span></Label>
              {allSources.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">등록된 소스가 없습니다. 소스 라이브러리에서 먼저 등록해주세요.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border/60 p-2">
                  {allSources.map((src) => {
                    const checked = selectedSourceIds.has(src.id);
                    return (
                      <label
                        key={src.id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                          checked ? "bg-violet-50 text-violet-900" : "hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSource(src.id)}
                          className="h-3.5 w-3.5 accent-violet-600"
                        />
                        <span className="text-xs flex-1 truncate">{src.title ?? src.url ?? "(제목 없음)"}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{src.source_type}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedSourceIds.size > 0 && (
                <p className="text-xs text-violet-600">{selectedSourceIds.size}개 소스 선택됨</p>
              )}
            </div>

            <Button className="w-full gap-2" onClick={handleSave} disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
