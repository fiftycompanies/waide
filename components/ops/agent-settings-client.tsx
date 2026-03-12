"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Save, History, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
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
import type { AgentPrompt } from "@/lib/actions/agent-prompt-actions";
import {
  updateAgentPrompt,
  createAgentPrompt,
  toggleAgentPrompt,
  getPromptHistory,
} from "@/lib/actions/agent-prompt-actions";
import { useRouter, useSearchParams } from "next/navigation";

// ── 색상 상수 ──────────────────────────────────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
  system_role:   "시스템 역할",
  skills:        "스킬",
  rules:         "규칙",
  output_format: "출력 형식",
};

const SECTION_COLORS: Record<string, string> = {
  system_role:   "bg-violet-100 text-violet-700 border-violet-200",
  skills:        "bg-blue-100 text-blue-700 border-blue-200",
  rules:         "bg-amber-100 text-amber-700 border-amber-200",
  output_format: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// ── 새 규칙 추가 다이얼로그 ────────────────────────────────────────────────────
interface AddPromptDialogProps {
  agentType: string;
  open: boolean;
  onClose: () => void;
}

function AddPromptDialog({ agentType, open, onClose }: AddPromptDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    promptSection: "rules",
    title: "",
    content: "",
  });

  const selectCls =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  function handleSubmit() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const result = await createAgentPrompt({
        agentType,
        promptSection: form.promptSection,
        title:         form.title,
        content:       form.content,
      });
      if (result.success) {
        toast.success("프롬프트가 추가되었습니다.");
        setForm({ promptSection: "rules", title: "", content: "" });
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
          <DialogTitle>프롬프트 추가 — {agentType}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>섹션</Label>
              <select
                value={form.promptSection}
                onChange={(e) => setForm((f) => ({ ...f, promptSection: e.target.value }))}
                className={selectCls}
              >
                <option value="system_role">시스템 역할</option>
                <option value="skills">스킬</option>
                <option value="rules">규칙</option>
                <option value="output_format">출력 형식</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>제목 *</Label>
              <Input
                placeholder="예: AEO 7대 원칙"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>내용 *</Label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[240px] resize-y"
              placeholder="프롬프트 내용을 입력하세요..."
              spellCheck={false}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>취소</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-violet-600 hover:bg-violet-700">
            {isPending ? "추가 중..." : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 버전 히스토리 다이얼로그 ──────────────────────────────────────────────────
interface HistoryDialogProps {
  agentType: string;
  promptSection: string;
  title: string;
  open: boolean;
  onClose: () => void;
}

function HistoryDialog({ agentType, promptSection, title, open, onClose }: HistoryDialogProps) {
  const [history, setHistory] = useState<AgentPrompt[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    setLoading(true);
    const data = await getPromptHistory(agentType, promptSection, title);
    setHistory(data);
    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) loadHistory();
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>버전 히스토리 — {title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">불러오는 중...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">히스토리가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div
                key={h.id}
                className={`rounded-lg border p-3 text-xs font-mono whitespace-pre-wrap ${
                  h.is_active ? "border-violet-200 bg-violet-50/40" : "border-border/40 bg-muted/20 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 mb-2 font-sans text-xs text-muted-foreground">
                  <span className="font-semibold">v{h.version}</span>
                  <span>·</span>
                  <span>{new Date(h.updated_at).toLocaleString("ko-KR")}</span>
                  <span>·</span>
                  <span>{h.updated_by}</span>
                  {h.is_active && (
                    <Badge variant="outline" className="text-[10px] px-1.5 bg-violet-100 text-violet-700 border-violet-200 ml-1">
                      현재
                    </Badge>
                  )}
                </div>
                {h.content}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── 프롬프트 카드 ─────────────────────────────────────────────────────────────
interface PromptCardProps {
  prompt: AgentPrompt;
}

function PromptCard({ prompt }: PromptCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editContent, setEditContent] = useState(prompt.content);
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty = editContent !== prompt.content;

  function handleSave() {
    startTransition(async () => {
      const result = await updateAgentPrompt(prompt.id, editContent);
      if (result.success) {
        toast.success("저장되었습니다. (새 버전으로 기록됨)");
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
      const result = await toggleAgentPrompt(prompt.id, !prompt.is_active);
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
      {/* 카드 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 ${SECTION_COLORS[prompt.prompt_section] ?? ""}`}
          >
            {SECTION_LABELS[prompt.prompt_section] ?? prompt.prompt_section}
          </Badge>
          <span className="text-sm font-semibold">{prompt.title}</span>
          <span className="text-xs text-muted-foreground">v{prompt.version}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setHistoryOpen(true)}
            title="버전 히스토리"
            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs flex items-center gap-1"
          >
            <History className="h-3.5 w-3.5" />
          </button>
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

      {/* 내용 (접힌 상태: 미리보기, 펼친 상태: 편집) */}
      {!expanded ? (
        <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap line-clamp-3 leading-relaxed">
          {prompt.content}
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
              {isPending ? "저장 중..." : "저장 (새 버전)"}
            </Button>
            {saved && <span className="text-xs text-emerald-600">✓ 저장됨</span>}
            {isDirty && !saved && (
              <span className="text-xs text-amber-600">수정됨</span>
            )}
          </div>
        </div>
      )}

      {/* 히스토리 다이얼로그 */}
      <HistoryDialog
        agentType={prompt.agent_type}
        promptSection={prompt.prompt_section}
        title={prompt.title}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
}

// ── 메인 클라이언트 컴포넌트 ──────────────────────────────────────────────────
interface AgentSettingsClientProps {
  agentTypes: string[];
  activeAgent: string;
  prompts: AgentPrompt[];
}

export function AgentSettingsClient({
  agentTypes,
  activeAgent,
  prompts,
}: AgentSettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);

  function switchAgent(agent: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("agent", agent);
    router.push(`/ops/agent-settings?${params.toString()}`);
  }

  const activePrompts   = prompts.filter((p) => p.is_active);
  const inactivePrompts = prompts.filter((p) => !p.is_active);

  // 섹션별 그룹화 (활성만)
  const grouped = activePrompts.reduce<Record<string, AgentPrompt[]>>((acc, p) => {
    const key = p.prompt_section;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const sectionOrder = ["system_role", "skills", "rules", "output_format"];

  return (
    <div className="space-y-6">
      {/* 에이전트 탭 */}
      <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 w-fit">
        {agentTypes.map((agent) => (
          <button
            key={agent}
            onClick={() => switchAgent(agent)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              activeAgent === agent
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {agent === "OPS_QUALITY" ? "QC" : agent === "OPS_PUBLISHER" ? "PUBLISHER" : agent}
          </button>
        ))}
      </div>

      {/* 상단 액션 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {activePrompts.length}개 활성 · {inactivePrompts.length}개 비활성 · {activeAgent}
        </p>
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          className="gap-1.5 h-8 bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" />
          규칙 추가
        </Button>
      </div>

      {/* 빈 상태 */}
      {prompts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {activeAgent} 에이전트의 프롬프트가 없습니다
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            [+ 규칙 추가] 버튼으로 프롬프트를 등록하거나,
            마이그레이션 스크립트를 실행하세요.
          </p>
        </div>
      )}

      {/* 활성 프롬프트 — 섹션별 카드 목록 */}
      {sectionOrder.map((section) => {
        const items = grouped[section];
        if (!items || items.length === 0) return null;
        return (
          <div key={section} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 ${SECTION_COLORS[section] ?? ""}`}
              >
                {SECTION_LABELS[section] ?? section}
              </Badge>
              <span className="text-xs text-muted-foreground font-normal">{items.length}개</span>
            </h3>
            <div className="space-y-2">
              {items.map((p) => (
                <PromptCard key={p.id} prompt={p} />
              ))}
            </div>
          </div>
        );
      })}

      {/* 비활성 프롬프트 섹션 */}
      {inactivePrompts.length > 0 && (
        <div className="space-y-3 border-t border-border/40 pt-4">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <span>비활성 프롬프트</span>
            <span className="text-xs font-normal">({inactivePrompts.length}개) — 토글로 재활성화 가능</span>
          </h3>
          <div className="space-y-2">
            {inactivePrompts.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
        </div>
      )}

      <AddPromptDialog
        agentType={activeAgent}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}
