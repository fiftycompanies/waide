"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, RotateCcw, ChevronDown, ChevronUp, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  savePromptAction,
  restoreDefaultAction,
} from "@/lib/actions/prompt-registry-actions";

export interface PromptRegistryItem {
  id: string;
  agent_key: string;
  agent_name: string;
  prompt_template: string;
  default_template: string;
  variables: string[];
  updated_at: string;
}

// ── 프롬프트 카드 ─────────────────────────────────────────────────

function PromptCard({ item }: { item: PromptRegistryItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editContent, setEditContent] = useState(item.prompt_template);
  const [expanded, setExpanded] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty = editContent !== item.prompt_template;
  const isCustomized = item.prompt_template !== item.default_template;

  function handleSave() {
    startTransition(async () => {
      const result = await savePromptAction(item.agent_key, editContent);
      if (result.success) {
        toast.success("프롬프트가 저장되었습니다.");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      } else {
        toast.error(result.error ?? "저장 실패");
      }
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreDefaultAction(item.agent_key);
      if (result.success) {
        toast.success("기본값으로 복원되었습니다.");
        setEditContent(item.default_template);
        setConfirmRestore(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "복원 실패");
      }
    });
  }

  return (
    <div className="rounded-lg border p-4 space-y-3 border-border/60">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{item.agent_name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 bg-blue-50 text-blue-700 border-blue-200">
            {item.agent_key}
          </Badge>
          {isCustomized && (
            <Badge variant="outline" className="text-[10px] px-1.5 bg-amber-50 text-amber-700 border-amber-200">
              커스텀
            </Badge>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* 미리보기 / 편집 */}
      {!expanded ? (
        <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap line-clamp-3 leading-relaxed">
          {item.prompt_template}
        </pre>
      ) : (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="flex w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[300px] resize-y"
            spellCheck={false}
          />

          {/* 사용 가능한 변수 */}
          {item.variables.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Variable className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">사용 가능한 변수:</span>
              {item.variables.map((v) => (
                <code
                  key={v}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 cursor-pointer hover:bg-violet-100"
                  onClick={() => {
                    setEditContent((prev) => prev + `{${v}}`);
                  }}
                >
                  {`{${v}}`}
                </code>
              ))}
            </div>
          )}

          {/* 액션 바 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || !isDirty}
              className="h-7 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700"
            >
              <Save className="h-3 w-3" />
              {isPending ? "저장 중..." : "저장"}
            </Button>
            {isCustomized && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmRestore(true)}
                disabled={isPending}
                className="h-7 gap-1.5 text-xs"
              >
                <RotateCcw className="h-3 w-3" />
                기본값 복원
              </Button>
            )}
            {saved && <span className="text-xs text-emerald-600">저장됨</span>}
            {isDirty && !saved && <span className="text-xs text-amber-600">수정됨</span>}
          </div>
        </div>
      )}

      {/* 기본값 복원 확인 */}
      <Dialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>기본값으로 복원</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {item.agent_name} 프롬프트를 기본값으로 복원하시겠습니까?
            현재 커스텀 내용은 히스토리에 보관됩니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(false)} disabled={isPending}>
              취소
            </Button>
            <Button onClick={handleRestore} disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
              {isPending ? "복원 중..." : "복원"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────

interface Props {
  items: PromptRegistryItem[];
}

export function PromptRegistryClient({ items }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {items.length}개 프롬프트 — AI 콘텐츠 생성, 질문 엔진, 멘션 감지 등에서 사용
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <PromptCard key={item.agent_key} item={item} />
        ))}
      </div>
    </div>
  );
}
