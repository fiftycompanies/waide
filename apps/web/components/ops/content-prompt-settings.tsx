"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Plus } from "lucide-react";
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
import type { ContentPrompt } from "@/lib/actions/content-prompt-actions";
import {
  updateContentPrompt,
  toggleContentPrompt,
  createContentPrompt,
} from "@/lib/actions/content-prompt-actions";

const TYPE_TABS = [
  { value: "list", label: "추천형", icon: "📋" },
  { value: "review", label: "리뷰형", icon: "✍️" },
  { value: "info", label: "정보형", icon: "📖" },
] as const;

const PROMPT_TYPE_COLORS: Record<string, string> = {
  system: "bg-violet-100 text-violet-700 border-violet-200",
  user: "bg-blue-100 text-blue-700 border-blue-200",
  common_rules: "bg-amber-100 text-amber-700 border-amber-200",
};

const PROMPT_TYPE_LABELS: Record<string, string> = {
  system: "시스템 프롬프트",
  user: "유저 프롬프트",
  common_rules: "공통 규칙",
};

// ── 프롬프트 카드 ─────────────────────────────────────────────────────────────
function PromptCard({ prompt }: { prompt: ContentPrompt }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editContent, setEditContent] = useState(prompt.prompt_text);
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty = editContent !== prompt.prompt_text;

  function handleSave() {
    startTransition(async () => {
      const result = await updateContentPrompt(prompt.id, editContent);
      if (result.success) {
        toast.success("저장되었습니다.");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      } else {
        toast.error(result.error ?? "저장 실패");
      }
    });
  }

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleContentPrompt(prompt.id, !prompt.is_active);
      if (result.success) {
        toast.success(prompt.is_active ? "비활성화되었습니다." : "활성화되었습니다.");
        router.refresh();
      } else {
        toast.error(result.error ?? "변경 실패");
      }
    });
  }

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 transition-colors ${
        prompt.is_active ? "border-border/60" : "border-border/30 opacity-60 bg-muted/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 ${PROMPT_TYPE_COLORS[prompt.prompt_type] ?? ""}`}
          >
            {PROMPT_TYPE_LABELS[prompt.prompt_type] ?? prompt.prompt_type}
          </Badge>
          <span className="text-sm font-semibold">{prompt.name}</span>
          <span className="text-xs text-muted-foreground">v{prompt.version}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleToggle}
            disabled={isPending}
            title={prompt.is_active ? "비활성화" : "활성화"}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {prompt.is_active ? (
              <ToggleRight className="h-4 w-4 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {prompt.description && (
        <p className="text-xs text-muted-foreground">{prompt.description}</p>
      )}

      {!expanded ? (
        <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap line-clamp-3 leading-relaxed">
          {prompt.prompt_text}
        </pre>
      ) : (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="flex w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[200px] resize-y"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || !isDirty}
              className="h-7 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700"
            >
              <Save className="h-3 w-3" />
              {isPending ? "저장 중..." : "저장"}
            </Button>
            {saved && <span className="text-xs text-emerald-600">저장됨</span>}
            {isDirty && !saved && <span className="text-xs text-amber-600">수정됨</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 추가 다이얼로그 ──────────────────────────────────────────────────────────
function AddPromptDialog({
  open,
  onClose,
  activeType,
}: {
  open: boolean;
  onClose: () => void;
  activeType: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    contentType: activeType,
    promptType: "system",
    name: "",
    promptText: "",
    description: "",
  });

  const selectCls =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  function handleSubmit() {
    if (!form.name.trim() || !form.promptText.trim()) {
      toast.error("이름과 내용을 모두 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const result = await createContentPrompt({
        contentType: form.contentType,
        promptType: form.promptType,
        name: form.name,
        promptText: form.promptText,
        description: form.description || undefined,
      });
      if (result.success) {
        toast.success("프롬프트가 추가되었습니다.");
        setForm({ ...form, name: "", promptText: "", description: "" });
        onClose();
        router.refresh();
      } else {
        toast.error(result.error ?? "추가 실패");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>콘텐츠 프롬프트 추가</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>콘텐츠 타입</Label>
              <select
                value={form.contentType}
                onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value }))}
                className={selectCls}
              >
                <option value="list">추천형 (리스트)</option>
                <option value="review">리뷰형 (후기)</option>
                <option value="info">정보형 (가이드)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>프롬프트 종류</Label>
              <select
                value={form.promptType}
                onChange={(e) => setForm((f) => ({ ...f, promptType: e.target.value }))}
                className={selectCls}
              >
                <option value="system">시스템 프롬프트</option>
                <option value="user">유저 프롬프트</option>
                <option value="common_rules">공통 규칙</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>이름</Label>
            <Input
              placeholder="예: 추천형 시스템 프롬프트 v2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>설명 (선택)</Label>
            <Input
              placeholder="이 프롬프트의 목적/변경 사항"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>프롬프트 내용</Label>
            <textarea
              value={form.promptText}
              onChange={(e) => setForm((f) => ({ ...f, promptText: e.target.value }))}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[240px] resize-y"
              placeholder="프롬프트 내용을 입력하세요..."
              spellCheck={false}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isPending ? "추가 중..." : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
interface ContentPromptSettingsProps {
  prompts: ContentPrompt[];
}

export function ContentPromptSettings({ prompts }: ContentPromptSettingsProps) {
  const [activeType, setActiveType] = useState<string>("list");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = prompts.filter((p) => p.content_type === activeType);
  const activePrompts = filtered.filter((p) => p.is_active);
  const inactivePrompts = filtered.filter((p) => !p.is_active);

  return (
    <div className="space-y-6">
      {/* 타입 탭 */}
      <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 w-fit">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveType(tab.value)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              activeType === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 상단 액션 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {activePrompts.length}개 활성 · {inactivePrompts.length}개 비활성
        </p>
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          className="gap-1.5 h-8 bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" />
          프롬프트 추가
        </Button>
      </div>

      {/* 프롬프트 카드 목록 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {TYPE_TABS.find((t) => t.value === activeType)?.label} 프롬프트가 없습니다
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            [+ 프롬프트 추가] 버튼으로 등록하세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activePrompts.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </div>
      )}

      {/* 비활성 프롬프트 */}
      {inactivePrompts.length > 0 && (
        <div className="space-y-3 border-t border-border/40 pt-4">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <span>비활성 프롬프트</span>
            <span className="text-xs font-normal">({inactivePrompts.length}개)</span>
          </h3>
          <div className="space-y-2">
            {inactivePrompts.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
        </div>
      )}

      <AddPromptDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        activeType={activeType}
      />
    </div>
  );
}
