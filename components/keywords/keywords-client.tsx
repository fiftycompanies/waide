"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, PauseCircle, PlayCircle, TrendingUp, TrendingDown, Upload } from "lucide-react";
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
import type { Keyword } from "@/lib/actions/keyword-actions";
import { createKeyword, archiveKeyword, updateKeywordStatus } from "@/lib/actions/keyword-actions";
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
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  paused: "bg-slate-500/10 text-slate-600 border-slate-200",
  archived: "bg-gray-500/10 text-gray-500 border-gray-200",
  queued: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  refresh: "bg-red-500/10 text-red-700 border-red-200",
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
}

type FilterTab = "active" | "paused" | "archived" | "queued" | "refresh";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "active",   label: "활성" },
  { key: "paused",   label: "일시정지" },
  { key: "queued",   label: "대기" },
  { key: "refresh",  label: "리프레시" },
  { key: "archived", label: "보관" },
];

export function KeywordsClient({ keywords, clientId }: KeywordsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Keyword | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("active");

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

  const tabFiltered = brandFiltered.filter((k) => k.status === activeTab);
  const sorted = sortKeywords(tabFiltered, sortConfig);

  function handleSort(col: SortCol) {
    setSortConfig((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "last_tracked_at" ? "desc" : "asc" }
    );
  }

  const tabCounts: Record<FilterTab, number> = {
    active:   brandFiltered.filter((k) => k.status === "active").length,
    paused:   brandFiltered.filter((k) => k.status === "paused").length,
    archived: brandFiltered.filter((k) => k.status === "archived").length,
    queued:   brandFiltered.filter((k) => k.status === "queued").length,
    refresh:  brandFiltered.filter((k) => k.status === "refresh").length,
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

  return (
    <>
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
              onClick={() => setActiveTab(tab)}
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
            <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)} className="gap-1.5 h-8">
              <Upload className="h-3.5 w-3.5" />
              CSV 대량 등록
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 h-8 bg-violet-600 hover:bg-violet-700">
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
            {activeTab === "active" ? "등록된 키워드가 없습니다" : `${STATUS_LABELS[activeTab]} 키워드가 없습니다`}
          </p>
          {activeTab === "active" && !isAllMode && (
            <p className="text-xs text-muted-foreground mt-1">[+ 키워드 추가] 버튼으로 첫 키워드를 등록해보세요.</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
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
              {sorted.map((kw) => (
                <tr
                  key={kw.id}
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/keywords/${kw.id}`)}
                >
                  {isAllMode && (
                    <td className="px-3 py-3">
                      {kw.client_name ? <BrandBadge name={kw.client_name} /> : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-3 font-medium text-sm">{kw.keyword}</td>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {clientId && <AddKeywordDialog clientId={clientId} open={addOpen} onClose={() => setAddOpen(false)} />}
      <DeleteConfirmDialog keyword={deleteTarget} onClose={() => setDeleteTarget(null)} />
      {clientId && <KeywordCsvDialog clientId={clientId} open={csvOpen} onClose={() => setCsvOpen(false)} />}
    </>
  );
}
