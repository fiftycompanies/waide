"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronRight, ExternalLink, FileText, Loader2 as Spinner, Plus, Sparkles, Trash2, PauseCircle, PlayCircle, TrendingUp, TrendingDown, Upload, X } from "lucide-react";
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
import type { Keyword, KeywordLinkedContent } from "@/lib/actions/keyword-actions";
import type { PublishRecommendedKeyword } from "@/lib/actions/keyword-actions";
import { createKeyword, archiveKeyword, updateKeywordStatus, getKeywordLinkedContents } from "@/lib/actions/keyword-actions";
import { approveSuggestedKeyword, rejectSuggestedKeyword, bulkApproveSuggestedKeywords, expandNicheKeywords } from "@/lib/actions/keyword-expansion-actions";
import { KeywordAddModal } from "@/components/keywords/keyword-add-modal";
import { KeywordCsvDialog } from "@/components/keywords/keyword-csv-dialog";
import { BrandBadge } from "@/components/ui/brand-badge";
import { BrandFilter } from "@/components/ui/brand-filter";

// ── 상태/색상 상수 ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  active: "활성",
  paused: "일시정지",
  archived: "보관",
  queued: "대기",
  refresh: "리프레시",
  suggested: "AI 추천",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  paused: "bg-slate-500/10 text-slate-600 border-slate-200",
  archived: "bg-gray-500/10 text-gray-500 border-gray-200",
  queued: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  refresh: "bg-red-500/10 text-red-700 border-red-200",
  suggested: "bg-violet-500/10 text-violet-700 border-violet-200",
};

// ── 정렬 타입 ────────────────────────────────────────────────────────────────
type SortCol =
  | "keyword"
  | "monthly_search_pc"
  | "monthly_search_mo"
  | "competition_level"
  | "rank_pc"
  | "rank_mo"
  | "rank_change_pc"
  | "rank_change_mo"
  | "last_tracked_at"
  | "status";

type SortDir = "asc" | "desc";
interface SortConfig { col: SortCol; dir: SortDir }

const COMPETITION_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3 };

function sortKeywords(keywords: Keyword[], cfg: SortConfig): Keyword[] {
  const mult = cfg.dir === "asc" ? 1 : -1;
  return [...keywords].sort((a, b) => {
    let va: string | number | null = null;
    let vb: string | number | null = null;

    switch (cfg.col) {
      case "keyword":          va = a.keyword;           vb = b.keyword;           break;
      case "monthly_search_pc": va = a.monthly_search_pc; vb = b.monthly_search_pc; break;
      case "monthly_search_mo": va = a.monthly_search_mo; vb = b.monthly_search_mo; break;
      case "competition_level":
        va = a.competition_level ? (COMPETITION_ORDER[a.competition_level] ?? 0) : null;
        vb = b.competition_level ? (COMPETITION_ORDER[b.competition_level] ?? 0) : null;
        break;
      case "rank_pc":
        va = a.current_rank_naver_pc ?? a.current_rank_naver ?? null;
        vb = b.current_rank_naver_pc ?? b.current_rank_naver ?? null;
        break;
      case "rank_mo":       va = a.current_rank_naver_mo; vb = b.current_rank_naver_mo; break;
      case "rank_change_pc": va = a.rank_change_pc;       vb = b.rank_change_pc;       break;
      case "rank_change_mo": va = a.rank_change_mo;       vb = b.rank_change_mo;       break;
      case "last_tracked_at": va = a.last_tracked_at;    vb = b.last_tracked_at;      break;
      case "status":          va = a.status;             vb = b.status;             break;
    }

    // nulls last (방향 무관)
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;

    if (typeof va === "string" && typeof vb === "string") {
      return va.localeCompare(vb, "ko") * mult;
    }
    return ((va as number) - (vb as number)) * mult;
  });
}

// ── 정렬 가능 헤더 ────────────────────────────────────────────────────────────
function SortableHeader({
  label, col, sortConfig, onSort, className,
}: {
  label: string;
  col: SortCol;
  sortConfig: SortConfig;
  onSort: (col: SortCol) => void;
  className?: string;
}) {
  const active = sortConfig.col === col;
  return (
    <th
      className={`px-3 py-3 font-medium cursor-pointer select-none hover:text-foreground group ${className ?? ""}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        <span
          className={`text-[9px] leading-none ml-0.5 ${
            active ? "text-foreground" : "opacity-0 group-hover:opacity-40"
          }`}
        >
          {active ? (sortConfig.dir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </span>
    </th>
  );
}

// ── 순위 셀 ─────────────────────────────────────────────────────────────────
function RankCell({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="text-muted-foreground/40">—</span>;
  const color =
    rank <= 3 ? "text-emerald-600 font-semibold" :
    rank <= 10 ? "text-amber-600" :
    "text-muted-foreground";
  return <span className={color}>{rank}위</span>;
}

// ── 변동 셀 ──────────────────────────────────────────────────────────────────
function ChangeCell({ change }: { change: number | null }) {
  if (change === null || change === 0)
    return <span className="text-muted-foreground/40">—</span>;
  if (change > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
        <TrendingUp className="h-3 w-3" />{change}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-red-500 font-medium">
      <TrendingDown className="h-3 w-3" />{Math.abs(change)}
    </span>
  );
}

// ── 순위 배지 (발행 추천/AI 추천 섹션용) ────────────────────────────────────
function RankBadge({ rank }: { rank: number | null }) {
  if (!rank || rank > 20) return (
    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px",
      background: "#FCEBEB", color: "#A32D2D", fontWeight: 500 }}>미노출</span>
  );
  if (rank <= 10) return (
    <span style={{ fontSize: "12px", color: "#3B6D11", fontWeight: 500 }}>{rank}위</span>
  );
  return <span style={{ fontSize: "12px", color: "#854F0B", fontWeight: 500 }}>{rank}위</span>;
}

function CompetitionBadge({ level }: { level: string | null }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    low:    { bg: "#EAF3DE", color: "#3B6D11", label: "낮음" },
    medium: { bg: "#FAEEDA", color: "#854F0B", label: "중간" },
    high:   { bg: "#FCEBEB", color: "#A32D2D", label: "높음" },
  };
  const s = map[level ?? ""] ?? { bg: "#F1EFE8", color: "#5F5E5A", label: "알 수 없음" };
  return (
    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px",
      background: s.bg, color: s.color, fontWeight: 500 }}>{s.label}</span>
  );
}

// ── 출처 라벨 ────────────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  niche_expansion: "니치 확장",
  brand_analysis:  "브랜드 분석",
  manual:          "수동 입력",
  gsc_discovery:   "GSC",
};

// ── 상대 시간 ────────────────────────────────────────────────────────────────
function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return minutes <= 0 ? "방금" : `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

// ── 키워드 추가 다이얼로그 ────────────────────────────────────────────────────
interface AddKeywordDialogProps {
  clientId: string;
  open: boolean;
  onClose: () => void;
}

function AddKeywordDialog({ clientId, open, onClose }: AddKeywordDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    keyword: "",
    subKeyword: "",
    platform: "both",
    monthlySearchPc: "",
    monthlySearchMo: "",
    competitionLevel: "medium",
  });

  function handleSubmit() {
    if (!form.keyword.trim()) { toast.error("키워드를 입력해주세요."); return; }
    startTransition(async () => {
      const result = await createKeyword({
        clientId,
        keyword: form.keyword,
        subKeyword: form.subKeyword || null,
        platform: form.platform,
        monthlySearchPc: form.monthlySearchPc ? Number(form.monthlySearchPc) : null,
        monthlySearchMo: form.monthlySearchMo ? Number(form.monthlySearchMo) : null,
        monthlySearchTotal: form.monthlySearchPc || form.monthlySearchMo
          ? (Number(form.monthlySearchPc || 0) + Number(form.monthlySearchMo || 0))
          : null,
        competitionLevel: form.competitionLevel,
      });
      if (result.success) {
        toast.success("키워드가 등록되었습니다.");
        setForm({ keyword: "", subKeyword: "", platform: "both", monthlySearchPc: "", monthlySearchMo: "", competitionLevel: "medium" });
        onClose();
        router.refresh();
      } else {
        toast.error(result.error ?? "등록 실패");
      }
    });
  }

  const selectCls =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>키워드 추가</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="kw-keyword">메인 키워드 *</Label>
            <Input id="kw-keyword" placeholder="예: 가평 글램핑 추천" value={form.keyword}
              onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kw-sub">서브 키워드 (선택)</Label>
            <Input id="kw-sub" placeholder="예: 가평 글램핑 가족" value={form.subKeyword}
              onChange={(e) => setForm((f) => ({ ...f, subKeyword: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kw-platform">플랫폼</Label>
            <select id="kw-platform" value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} className={selectCls}>
              <option value="both">네이버 + 구글</option>
              <option value="naver">네이버</option>
              <option value="google">구글</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kw-pc">검색량 PC (선택)</Label>
              <Input id="kw-pc" type="number" placeholder="예: 8000" value={form.monthlySearchPc}
                onChange={(e) => setForm((f) => ({ ...f, monthlySearchPc: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kw-mo">검색량 MO (선택)</Label>
              <Input id="kw-mo" type="number" placeholder="예: 15000" value={form.monthlySearchMo}
                onChange={(e) => setForm((f) => ({ ...f, monthlySearchMo: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kw-competition">경쟁강도</Label>
            <select id="kw-competition" value={form.competitionLevel} onChange={(e) => setForm((f) => ({ ...f, competitionLevel: e.target.value }))} className={selectCls}>
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>취소</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-violet-600 hover:bg-violet-700">
            {isPending ? "등록 중..." : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 보관 확인 다이얼로그 ──────────────────────────────────────────────────────
function DeleteConfirmDialog({ keyword, onClose }: { keyword: Keyword | null; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!keyword) return;
    startTransition(async () => {
      const result = await archiveKeyword(keyword.id);
      if (result.success) {
        toast.success(`"${keyword.keyword}" 키워드가 보관처리되었습니다.`);
        onClose();
        router.refresh();
      } else {
        toast.error(result.error ?? "삭제 실패");
      }
    });
  }

  return (
    <Dialog open={!!keyword} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>키워드 보관 확인</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          <span className="font-semibold text-foreground">"{keyword?.keyword}"</span> 키워드를 보관처리합니다.
          <br />보관된 키워드는 목록에서 숨겨지며 순위 추적이 중단됩니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>취소</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "처리 중..." : "보관 처리"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 메인 KeywordsClient ───────────────────────────────────────────────────────
interface KeywordsClientProps {
  keywords: Keyword[];
  clientId: string | null;
  publishRecommended?: PublishRecommendedKeyword[];
}

type FilterTab = "active" | "suggested" | "paused" | "archived" | "queued" | "refresh";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "active",    label: "활성" },
  { key: "suggested", label: "AI 추천" },
  { key: "paused",    label: "일시정지" },
  { key: "queued",    label: "대기" },
  { key: "refresh",   label: "리프레시" },
  { key: "archived",  label: "보관" },
];

export function KeywordsClient({ keywords, clientId, publishRecommended = [] }: KeywordsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Keyword | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("active");
  const [displayCount, setDisplayCount] = useState(5);
  const [nicheLoading, setNicheLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // ── 키워드 accordion (연결 콘텐츠) ──────────────────────────────────────
  const [expandedKw, setExpandedKw] = useState<string | null>(null);
  const [kwContents, setKwContents] = useState<Record<string, KeywordLinkedContent[]>>({});
  const [kwContentsLoading, setKwContentsLoading] = useState<string | null>(null);

  async function handleToggleExpand(kwId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (expandedKw === kwId) {
      setExpandedKw(null);
      return;
    }
    setExpandedKw(kwId);
    if (!kwContents[kwId]) {
      setKwContentsLoading(kwId);
      const data = await getKeywordLinkedContents(kwId);
      setKwContents((prev) => ({ ...prev, [kwId]: data }));
      setKwContentsLoading(null);
    }
  }

  // ── 발행 추천 / AI 추천 섹션 상태 ────────────────────────────────────────
  const [publishVisibleCount, setPublishVisibleCount] = useState(5);
  const [suggestedVisibleCount, setSuggestedVisibleCount] = useState(5);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // ── 정렬 상태 (기본: 최신화일 내림차순) ───────────────────────────────────
  const [sortConfig, setSortConfig] = useState<SortConfig>({ col: "last_tracked_at", dir: "desc" });

  // ── 브랜드 필터 상태 (전체 모드에서만 사용) ───────────────────────────────
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const isAllMode = !clientId;

  // 브랜드 목록 추출
  const brandList = useMemo(() => {
    const seen = new Map<string, string>();
    keywords.forEach((k) => {
      if (k.client_id && k.client_name && !seen.has(k.client_id)) {
        seen.set(k.client_id, k.client_name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [keywords]);

  // ── 필터링 파이프라인 ─────────────────────────────────────────────────────
  const brandFiltered = useMemo(() =>
    isAllMode && selectedBrands.length > 0
      ? keywords.filter((k) => k.client_id && selectedBrands.includes(k.client_id))
      : keywords,
    [keywords, isAllMode, selectedBrands]
  );

  // ── AI 추천 미등록 리스트 ──────────────────────────────────────────────
  const suggestedList = useMemo(() =>
    keywords
      .filter(k => k.status === "suggested" && !dismissed.has(k.id))
      .sort((a, b) => (b.monthly_search_total ?? 0) - (a.monthly_search_total ?? 0)),
    [keywords, dismissed]
  );

  const tabFiltered = brandFiltered.filter((k) => k.status === activeTab);
  const sorted = sortKeywords(tabFiltered, sortConfig);
  const displayed = sorted.slice(0, displayCount);

  function handleSort(col: SortCol) {
    setSortConfig((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "last_tracked_at" ? "desc" : "asc" }
    );
  }

  const tabCounts: Record<FilterTab, number> = {
    active:    brandFiltered.filter((k) => k.status === "active").length,
    suggested: brandFiltered.filter((k) => k.status === "suggested").length,
    paused:    brandFiltered.filter((k) => k.status === "paused").length,
    archived:  brandFiltered.filter((k) => k.status === "archived").length,
    queued:    brandFiltered.filter((k) => k.status === "queued").length,
    refresh:   brandFiltered.filter((k) => k.status === "refresh").length,
  };

  function handleTogglePause(kw: Keyword) {
    const nextStatus = kw.status === "active" ? "paused" : "active";
    startTransition(async () => {
      const result = await updateKeywordStatus(kw.id, nextStatus as "active" | "paused");
      if (result.success) {
        toast.success(nextStatus === "paused" ? "추적이 일시정지되었습니다." : "추적이 재개되었습니다.");
        router.refresh();
      } else {
        toast.error(result.error ?? "변경 실패");
      }
    });
  }

  function handleApprove(keywordId: string) {
    startTransition(async () => {
      const result = await approveSuggestedKeyword(keywordId);
      if (result.success) {
        toast.success("키워드가 승인되었습니다.");
        router.refresh();
      } else {
        toast.error(result.error ?? "승인 실패");
      }
    });
  }

  function handleReject(keywordId: string) {
    startTransition(async () => {
      const result = await rejectSuggestedKeyword(keywordId);
      if (result.success) {
        toast.success("키워드가 제외되었습니다.");
        router.refresh();
      } else {
        toast.error(result.error ?? "제외 실패");
      }
    });
  }

  function handleBulkApprove() {
    const suggestedIds = tabFiltered.map((k) => k.id);
    if (suggestedIds.length === 0) return;
    startTransition(async () => {
      const result = await bulkApproveSuggestedKeywords(suggestedIds);
      if (result.success) {
        toast.success(`${result.approved}개 키워드가 승인되었습니다.`);
        router.refresh();
      } else {
        toast.error(result.error ?? "일괄 승인 실패");
      }
    });
  }

  // ── AI 추천 낙관적 승인 ────────────────────────────────────────────────
  async function handleSuggestedApprove(id: string) {
    setDismissed(prev => new Set(prev).add(id));
    await approveSuggestedKeyword(id);
  }

  function handleNicheExpand() {
    if (!clientId) return;
    const mainKeywords = keywords
      .filter((k) => k.status === "active")
      .slice(0, 5)
      .map((k) => k.keyword);
    if (mainKeywords.length === 0) {
      toast.error("활성 키워드가 없습니다. 먼저 키워드를 등록해주세요.");
      return;
    }
    setNicheLoading(true);
    startTransition(async () => {
      const result = await expandNicheKeywords({
        clientId,
        mainKeywords,
      });
      setNicheLoading(false);
      if (result.success) {
        toast.success(`${result.inserted}개 니치 키워드가 발굴되었습니다.`);
        setActiveTab("suggested");
        router.refresh();
      } else {
        toast.error(result.error ?? "니치 키워드 발굴 실패");
      }
    });
  }

  return (
    <>
      {/* ═══ 발행 우선 추천 ═══ */}
      {publishRecommended.length > 0 && (() => {
        const pubVisible = publishRecommended.slice(0, publishVisibleCount);
        const pubRemaining = publishRecommended.length - publishVisibleCount;
        return (
          <div style={{
            background: "var(--card)", border: "1px solid hsl(var(--border))",
            borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 500 }}>발행 우선 추천</span>
                <span style={{
                  fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500,
                  background: "#FCEBEB", color: "#A32D2D",
                }}>미노출 · 검색량 순</span>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["키워드", "검색량 (PC/MO)", "경쟁도", "네이버 순위", "구글 순위", ""].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "6px 8px", fontSize: "11px", fontWeight: 500,
                      color: "hsl(var(--muted-foreground))",
                      borderBottom: "1px solid hsl(var(--border))",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pubVisible.map(kw => (
                  <tr key={kw.id}>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))", fontWeight: 500 }}>{kw.keyword}</td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))", fontSize: "13px", color: "hsl(var(--muted-foreground))" }}>
                      {kw.monthly_search_pc ?? "--"} / {kw.monthly_search_mo ?? "--"}
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))" }}>
                      <CompetitionBadge level={kw.competition_level} />
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))" }}>
                      <RankBadge rank={kw.rank_pc} />
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))" }}>
                      <RankBadge rank={kw.rank_mo} />
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))", textAlign: "right" }}>
                      <button
                        onClick={() => router.push(`/contents?keyword=${kw.id}`)}
                        style={{
                          fontSize: "12px", padding: "4px 10px",
                          background: "#185FA5", color: "#E6F1FB",
                          border: "none", borderRadius: "6px", cursor: "pointer",
                        }}
                      >발행 시작</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pubRemaining > 0 && (
              <button onClick={() => setPublishVisibleCount(v => v + 5)} style={{
                width: "100%", fontSize: "12px", color: "#185FA5", padding: "8px 0",
                borderTop: "1px solid hsl(var(--border))",
                background: "transparent", border: "none", cursor: "pointer", marginTop: "4px",
                display: "block", textAlign: "center",
              }}>
                더보기 ({Math.min(pubRemaining, 5)}개 더) ↓
              </button>
            )}
          </div>
        );
      })()}

      {/* ═══ AI 추천 미등록 ═══ */}
      {suggestedList.length > 0 && (() => {
        const sugVisible = suggestedList.slice(0, suggestedVisibleCount);
        const sugRemaining = suggestedList.length - suggestedVisibleCount;
        return (
          <div style={{
            background: "var(--card)", border: "1px solid hsl(var(--border))",
            borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>AI 추천 키워드</span>
              <span style={{
                fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500,
                background: "#E6F1FB", color: "#0C447C",
              }}>미등록 · 검색량 순</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["키워드", "검색량 (PC/MO)", "경쟁도", "출처", ""].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "6px 8px", fontSize: "11px", fontWeight: 500,
                      color: "hsl(var(--muted-foreground))",
                      borderBottom: "1px solid hsl(var(--border))",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sugVisible.map(kw => (
                  <tr key={kw.id}>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))", fontWeight: 500 }}>
                      {kw.keyword}
                      {kw.metadata?.content_angle && (
                        <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: "2px" }}>{kw.metadata.content_angle}</p>
                      )}
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))", fontSize: "13px", color: "hsl(var(--muted-foreground))" }}>
                      {kw.monthly_search_pc ?? "--"} / {kw.monthly_search_mo ?? "--"}
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))" }}>
                      <CompetitionBadge level={kw.competition_level} />
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
                      {SOURCE_LABELS[kw.source ?? ""] ?? kw.source ?? "--"}
                    </td>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid hsl(var(--border))", textAlign: "right" }}>
                      <button onClick={() => handleSuggestedApprove(kw.id)} style={{
                        fontSize: "11px", padding: "3px 10px",
                        background: "#E6F1FB", color: "#0C447C",
                        border: "1px solid #B5D4F4", borderRadius: "4px", cursor: "pointer", fontWeight: 500,
                      }}>+ 관심 등록</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sugRemaining > 0 && (
              <button onClick={() => setSuggestedVisibleCount(v => v + 5)} style={{
                width: "100%", fontSize: "12px", color: "#185FA5", padding: "8px 0",
                borderTop: "1px solid hsl(var(--border))",
                background: "transparent", border: "none", cursor: "pointer", marginTop: "4px",
                display: "block", textAlign: "center",
              }}>
                더보기 ({Math.min(sugRemaining, 5)}개 더) ↓
              </button>
            )}
          </div>
        );
      })()}

      {/* 브랜드 필터 (전체 모드) */}
      {isAllMode && brandList.length > 1 && (
        <div className="rounded-lg border border-border/50 bg-muted/20 px-3">
          <BrandFilter brands={brandList} selected={selectedBrands} onChange={setSelectedBrands} />
        </div>
      )}

      {/* 상단 액션바 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
          {TABS.map(({ key: tab }) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setDisplayCount(5); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {STATUS_LABELS[tab]}
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activeTab === tab ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>

        {!isAllMode && (
          <div className="flex items-center gap-2">
            {activeTab === "suggested" && tabCounts.suggested > 0 && (
              <Button size="sm" variant="outline" onClick={handleBulkApprove} disabled={isPending} className="gap-1.5 h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Check className="h-3.5 w-3.5" />
                {isPending ? "처리 중..." : "선택 일괄 승인"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleNicheExpand} disabled={isPending || nicheLoading} className="gap-1.5 h-8 border-violet-200 text-violet-700 hover:bg-violet-50">
              <Sparkles className="h-3.5 w-3.5" />
              {nicheLoading ? "발굴 중..." : "니치 키워드 발굴"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)} className="gap-1.5 h-8">
              <Upload className="h-3.5 w-3.5" />
              CSV 대량 등록
            </Button>
            <Button size="sm" onClick={() => setAddModalOpen(true)} className="gap-1.5 h-8 bg-violet-600 hover:bg-violet-700">
              <Plus className="h-3.5 w-3.5" />
              키워드 추가
            </Button>
          </div>
        )}
      </div>

      {/* 테이블 */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {activeTab === "active" ? "등록된 키워드가 없습니다"
              : activeTab === "suggested" ? "AI 추천 키워드가 없습니다"
              : `${STATUS_LABELS[activeTab]} 키워드가 없습니다`}
          </p>
          {activeTab === "active" && !isAllMode && (
            <p className="text-xs text-muted-foreground mt-1">[+ 키워드 추가] 버튼으로 첫 키워드를 등록해보세요.</p>
          )}
          {activeTab === "suggested" && !isAllMode && (
            <p className="text-xs text-muted-foreground mt-1">니치 키워드 발굴을 실행하면 AI가 추천 키워드를 생성합니다.</p>
          )}
        </div>
      ) : (
        <>
        <div className="rounded-lg border border-border/60 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
                <th className="w-8 px-1 py-3" />
                {isAllMode && <th className="px-3 py-3 text-left font-medium">브랜드</th>}
                <SortableHeader label="키워드"   col="keyword"           sortConfig={sortConfig} onSort={handleSort} className="text-left" />
                <th className="px-3 py-3 text-left font-medium">서브키워드</th>
                <SortableHeader label="검색량PC"  col="monthly_search_pc" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortableHeader label="검색량MO"  col="monthly_search_mo" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortableHeader label="경쟁도"    col="competition_level" sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <SortableHeader label="순위PC"    col="rank_pc"           sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <SortableHeader label="순위MO"    col="rank_mo"           sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <SortableHeader label="변동PC"    col="rank_change_pc"    sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <SortableHeader label="변동MO"    col="rank_change_mo"    sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <SortableHeader label="최신화일"  col="last_tracked_at"   sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <SortableHeader label="상태"      col="status"            sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <th className="px-3 py-3 text-center font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {displayed.map((kw) => (
                <React.Fragment key={kw.id}>
                <tr
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/keywords/${kw.id}`)}
                >
                  <td className="px-1 py-3 text-center" onClick={(e) => handleToggleExpand(kw.id, e)}>
                    {expandedKw === kw.id ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                    )}
                  </td>
                  {isAllMode && (
                    <td className="px-3 py-3">
                      {kw.client_name ? <BrandBadge name={kw.client_name} /> : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <span className="font-medium text-sm">{kw.keyword}</span>
                    {kw.status === "suggested" && kw.metadata?.content_angle && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{kw.metadata.content_angle}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {kw.sub_keyword ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                    {kw.monthly_search_pc != null
                      ? kw.monthly_search_pc.toLocaleString()
                      : kw.monthly_search_total != null
                      ? kw.monthly_search_total.toLocaleString()
                      : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                    {kw.monthly_search_mo != null ? kw.monthly_search_mo.toLocaleString() : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {kw.competition_index != null ? (
                      <span className="text-xs font-mono">{Number(kw.competition_index).toFixed(0)}</span>
                    ) : kw.competition_level ? (
                      <Badge variant="outline" className={`text-[10px] px-1.5 ${
                        kw.competition_level === "low"  ? "bg-emerald-500/10 text-emerald-700 border-emerald-200" :
                        kw.competition_level === "high" ? "bg-red-500/10 text-red-700 border-red-200" :
                        "bg-amber-500/10 text-amber-700 border-amber-200"
                      }`}>
                        {kw.competition_level === "low" ? "낮음" : kw.competition_level === "high" ? "높음" : "보통"}
                      </Badge>
                    ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    <RankCell rank={kw.current_rank_naver_pc ?? kw.current_rank_naver} />
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    <RankCell rank={kw.current_rank_naver_mo} />
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    <ChangeCell change={kw.rank_change_pc} />
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    <ChangeCell change={kw.rank_change_mo} />
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                    {relativeTime(kw.last_tracked_at)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Badge variant="outline" className={`text-[10px] px-1.5 ${STATUS_COLORS[kw.status] ?? ""}`}>
                      {STATUS_LABELS[kw.status] ?? kw.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {kw.status === "suggested" ? (
                        <>
                          <button
                            onClick={() => handleApprove(kw.id)}
                            disabled={isPending}
                            title="승인 (Active로 변경)"
                            className="rounded p-1 text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleReject(kw.id)}
                            disabled={isPending}
                            title="제외 (보관 처리)"
                            className="rounded p-1 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {kw.status !== "archived" && (
                            <button
                              onClick={() => handleTogglePause(kw)}
                              disabled={isPending}
                              title={kw.status === "active" ? "일시정지" : "재개"}
                              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                            >
                              {kw.status === "active" ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(kw)}
                            title="보관 처리"
                            className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {/* Accordion: 연결 콘텐츠 */}
                {expandedKw === kw.id && (
                  <tr>
                    <td colSpan={isAllMode ? 15 : 14} className="p-0 bg-muted/10">
                      {kwContentsLoading === kw.id ? (
                        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                          <Spinner className="h-3.5 w-3.5 animate-spin" />
                          콘텐츠 로딩 중...
                        </div>
                      ) : (kwContents[kw.id] ?? []).length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground/60">
                          연결된 콘텐츠가 없습니다
                        </div>
                      ) : (
                        <div className="divide-y divide-border/20">
                          {(kwContents[kw.id] ?? []).map((c) => (
                            <div
                              key={c.id}
                              className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2 pl-10 items-center"
                            >
                              <FileText className="h-3 w-3 text-muted-foreground/40" />
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span className="text-xs truncate">{c.title ?? "(제목 없음)"}</span>
                                {c.published_url && (
                                  <a href={c.published_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="h-3 w-3 text-blue-500 shrink-0" />
                                  </a>
                                )}
                              </div>
                              <Badge variant="outline" className={`text-[10px] px-1.5 ${
                                c.publish_status === "published" ? "bg-green-100 text-green-700 border-green-200" :
                                c.publish_status === "tracking" ? "bg-sky-100 text-sky-700 border-sky-200" :
                                c.publish_status === "draft" ? "bg-gray-100 text-gray-600 border-gray-200" :
                                ""
                              }`}>
                                {c.publish_status === "published" ? "발행됨" :
                                 c.publish_status === "tracking" ? "추적중" :
                                 c.publish_status === "draft" ? "초안" :
                                 c.publish_status}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{c.word_count?.toLocaleString() ?? "—"}자</span>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {new Date(c.created_at).toLocaleDateString("ko-KR")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length > displayCount && (
          <button
            onClick={() => setDisplayCount((c) => c + 5)}
            className="w-full text-xs text-muted-foreground py-2 border-t border-border/40 bg-transparent hover:text-foreground transition-colors text-center"
          >
            더보기 ({Math.min(sorted.length - displayCount, 5)}개 더) ↓
          </button>
        )}
        </>
      )}

      {clientId && <AddKeywordDialog clientId={clientId} open={addOpen} onClose={() => setAddOpen(false)} />}
      <DeleteConfirmDialog keyword={deleteTarget} onClose={() => setDeleteTarget(null)} />
      {clientId && <KeywordCsvDialog clientId={clientId} open={csvOpen} onClose={() => setCsvOpen(false)} />}
      {clientId && <KeywordAddModal clientId={clientId} open={addModalOpen} onClose={() => setAddModalOpen(false)} />}
    </>
  );
}
