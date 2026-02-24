"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Plus,
  Trash2,
  Globe,
  FileText,
  Trophy,
  Newspaper,
  PenTool,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Edit3,
  X,
  Loader2,
  Package,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createContentSource,
  archiveContentSource,
  updateContentSource,
  crawlSourceUrl,
} from "@/lib/actions/content-source-actions";
import type { ContentSource } from "@/lib/actions/content-source-actions";
import { BrandBadge } from "@/components/ui/brand-badge";
import { BrandFilter } from "@/components/ui/brand-filter";

// ── 소스 유형 ───────────────────────────────────────────────
const SOURCE_TYPE_OPTIONS = [
  { value: "competitor", label: "경쟁사 콘텐츠", icon: Globe },
  { value: "own_best", label: "자사 베스트글", icon: Trophy },
  { value: "industry_article", label: "업계 아티클", icon: Newspaper },
  { value: "manual", label: "직접 입력", icon: PenTool },
] as const;

const SOURCE_TYPE_LABELS: Record<string, string> = {
  competitor: "경쟁사",
  own_best: "베스트글",
  industry_article: "업계",
  manual: "직접입력",
  url: "URL",
  blog: "블로그",
  text: "텍스트",
  image: "이미지",
  pdf: "PDF",
  video: "영상",
  api: "API",
  review: "리뷰",
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  competitor: "bg-red-50 text-red-700 border-red-200",
  own_best: "bg-amber-50 text-amber-700 border-amber-200",
  industry_article: "bg-blue-50 text-blue-700 border-blue-200",
  manual: "bg-gray-50 text-gray-700 border-gray-200",
};

const USAGE_MODE_LABELS: Record<string, string> = {
  reference: "레퍼런스",
  style: "스타일",
  fact: "팩트",
  cta: "CTA",
};

// ── 필터 탭 ─────────────────────────────────────────────────
type FilterTab = "all" | "competitor" | "own_best" | "industry_article" | "manual" | "legacy";

const TABS: { key: FilterTab; label: string; types: string[] }[] = [
  { key: "all", label: "전체", types: [] },
  { key: "competitor", label: "경쟁사", types: ["competitor"] },
  { key: "own_best", label: "베스트글", types: ["own_best"] },
  { key: "industry_article", label: "업계", types: ["industry_article"] },
  { key: "manual", label: "직접입력", types: ["manual"] },
  { key: "legacy", label: "기타", types: ["url", "blog", "text", "image", "pdf", "video", "api", "review"] },
];

function SourceTypeIcon({ type }: { type: string }) {
  const cls = "h-4 w-4";
  switch (type) {
    case "competitor": return <Globe className={cls} />;
    case "own_best": return <Trophy className={cls} />;
    case "industry_article": return <Newspaper className={cls} />;
    case "manual": return <PenTool className={cls} />;
    default: return <FileText className={cls} />;
  }
}

// ── 등록 모드 ───────────────────────────────────────────────
type RegisterMode = "url" | "manual";

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// ── 메인 컴포넌트 ───────────────────────────────────────────
interface SourcesClientProps {
  sources: ContentSource[];
  clientId: string | null;
}

export function SourcesClient({ sources: initialSources, clientId }: SourcesClientProps) {
  const isAllMode = !clientId;
  const [sources, setSources] = useState<ContentSource[]>(initialSources);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // 브랜드 필터 (전체 모드)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const brandList = useMemo(() => {
    const seen = new Map<string, string>();
    sources.forEach((s) => {
      if (s.client_id && s.client_name && !seen.has(s.client_id)) {
        seen.set(s.client_id, s.client_name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [sources]);

  // 다이얼로그 상태
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailSource, setDetailSource] = useState<ContentSource | null>(null);
  const [editSource, setEditSource] = useState<ContentSource | null>(null);

  // 필터링: 브랜드 → 탭 → 검색
  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const filtered = useMemo(() => {
    let list = sources;

    // 브랜드 필터
    if (isAllMode && selectedBrands.length > 0) {
      list = list.filter((s) => selectedBrands.includes(s.client_id));
    }

    // 탭 필터
    if (currentTab.types.length > 0) {
      list = list.filter((s) => currentTab.types.includes(s.source_type));
    }

    // 검색 (제목, URL, 태그)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.url?.toLowerCase().includes(q) ||
          (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [sources, isAllMode, selectedBrands, currentTab.types, searchQuery]);

  // 아카이브
  const handleArchive = (id: string) => {
    startTransition(async () => {
      const result = await archiveContentSource(id);
      if (result.success) {
        setSources((prev) => prev.filter((s) => s.id !== id));
        if (detailSource?.id === id) setDetailSource(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 브랜드 필터 */}
      {isAllMode && brandList.length > 1 && (
        <div className="rounded-lg border border-border/50 bg-muted/20 px-3">
          <BrandFilter brands={brandList} selected={selectedBrands} onChange={setSelectedBrands} />
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">소스 라이브러리</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI가 원고 작성 시 참조할 레퍼런스 자료를 관리합니다.
          </p>
        </div>
        {!isAllMode && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                소스 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>소스 등록</DialogTitle>
              </DialogHeader>
              <AddSourceForm
                clientId={clientId!}
                onSuccess={(newSource) => {
                  setSources((prev) => [newSource, ...prev]);
                  setAddDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 검색 + 필터 탭 */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="제목, URL, 키워드 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-0 border-b border-border/60">
          {TABS.map((tab) => {
            const count =
              tab.types.length === 0
                ? sources.length
                : sources.filter((s) => tab.types.includes(s.source_type)).length;
            if (tab.key === "legacy" && count === 0) return null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 소스 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">등록된 소스가 없습니다.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            소스를 등록하면 캠페인 생성 시 AI가 참조합니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((src) => (
            <SourceCard
              key={src.id}
              source={src}
              isAllMode={isAllMode}
              onView={() => setDetailSource(src)}
              onEdit={() => setEditSource(src)}
              onArchive={() => handleArchive(src.id)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={!!detailSource} onOpenChange={(o) => !o && setDetailSource(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {detailSource && <SourceDetailView source={detailSource} />}
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editSource} onOpenChange={(o) => !o && setEditSource(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>소스 수정</DialogTitle>
          </DialogHeader>
          {editSource && (
            <EditSourceForm
              source={editSource}
              onSuccess={(updated) => {
                setSources((prev) =>
                  prev.map((s) => (s.id === updated.id ? updated : s)),
                );
                setEditSource(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 소스 카드 ───────────────────────────────────────────────
function SourceCard({
  source: src,
  isAllMode,
  onView,
  onEdit,
  onArchive,
  isPending,
}: {
  source: ContentSource;
  isAllMode: boolean;
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
  isPending: boolean;
}) {
  const structure = src.content_structure as {
    word_count?: number;
    h2_count?: number;
    h3_count?: number;
    image_count?: number;
    peak_rank?: number;
  } | null;

  return (
    <div className="group relative flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 hover:border-border transition-colors">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <button onClick={onView} className="flex items-center gap-2 min-w-0 text-left">
          <span className="shrink-0 rounded-md bg-muted p-1.5 text-muted-foreground">
            <SourceTypeIcon type={src.source_type} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {src.title ?? src.url ?? "(제목 없음)"}
            </p>
            {src.url && src.title && (
              <p className="text-xs text-muted-foreground truncate">{src.url}</p>
            )}
          </div>
        </button>
        <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={onEdit}
            className="rounded p-1 hover:bg-muted text-muted-foreground"
            title="수정"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onArchive}
            disabled={isPending}
            className="rounded p-1 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
            title="아카이브"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 구조 요약 */}
      {structure && (structure.word_count ?? 0) > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {structure.word_count != null && (
            <span>{structure.word_count.toLocaleString()}자</span>
          )}
          {structure.h2_count != null && structure.h2_count > 0 && (
            <span>H2 x{structure.h2_count}</span>
          )}
          {structure.h3_count != null && structure.h3_count > 0 && (
            <span>H3 x{structure.h3_count}</span>
          )}
          {structure.image_count != null && structure.image_count > 0 && (
            <span>img x{structure.image_count}</span>
          )}
          {structure.peak_rank != null && (
            <span className="text-amber-600 font-medium">{structure.peak_rank}위</span>
          )}
        </div>
      )}

      {/* 메타 배지 */}
      <div className="flex flex-wrap gap-1.5">
        {isAllMode && src.client_name && <BrandBadge name={src.client_name} />}
        <Badge
          variant="outline"
          className={`text-xs h-5 ${SOURCE_TYPE_COLORS[src.source_type] ?? ""}`}
        >
          {SOURCE_TYPE_LABELS[src.source_type] ?? src.source_type}
        </Badge>
        <Badge variant="secondary" className="text-xs h-5">
          {USAGE_MODE_LABELS[src.usage_mode] ?? src.usage_mode}
        </Badge>
        {(src.tags ?? []).slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs h-5 text-muted-foreground gap-0.5">
            <Tag className="h-2.5 w-2.5" />{tag}
          </Badge>
        ))}
        {(src.tags ?? []).length > 3 && (
          <Badge variant="outline" className="text-xs h-5 text-muted-foreground">
            +{(src.tags ?? []).length - 3}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── 상세 보기 ───────────────────────────────────────────────
function SourceDetailView({ source: src }: { source: ContentSource }) {
  const [expanded, setExpanded] = useState(false);
  const structure = src.content_structure as {
    word_count?: number;
    h2_count?: number;
    h3_count?: number;
    image_count?: number;
    peak_rank?: number;
  } | null;
  const text = src.content_text ?? "";
  const preview = text.slice(0, 500);
  const hasMore = text.length > 500;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-md bg-muted p-2 text-muted-foreground">
          <SourceTypeIcon type={src.source_type} />
        </span>
        <div>
          <h3 className="text-lg font-semibold">{src.title ?? "(제목 없음)"}</h3>
          {src.url && (
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              {src.url} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={SOURCE_TYPE_COLORS[src.source_type] ?? ""}>
          {SOURCE_TYPE_LABELS[src.source_type] ?? src.source_type}
        </Badge>
        <Badge variant="secondary">
          {USAGE_MODE_LABELS[src.usage_mode] ?? src.usage_mode}
        </Badge>
        {(src.tags ?? []).map((tag) => (
          <Badge key={tag} variant="outline" className="gap-0.5">
            <Tag className="h-2.5 w-2.5" />{tag}
          </Badge>
        ))}
      </div>

      {/* 구조 분석 */}
      {structure && (structure.word_count ?? 0) > 0 && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">구조 분석</p>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{(structure.word_count ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">글자수</p>
            </div>
            <div>
              <p className="text-lg font-bold">{structure.h2_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">H2</p>
            </div>
            <div>
              <p className="text-lg font-bold">{structure.h3_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">H3</p>
            </div>
            <div>
              <p className="text-lg font-bold">{structure.image_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">이미지</p>
            </div>
          </div>
        </div>
      )}

      {/* 본문 미리보기 */}
      {text && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">본문 내용</p>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
            {expanded ? text : preview}
            {hasMore && !expanded && "..."}
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs"
            >
              {expanded ? (
                <>접기 <ChevronUp className="ml-1 h-3 w-3" /></>
              ) : (
                <>전체 보기 ({text.length.toLocaleString()}자) <ChevronDown className="ml-1 h-3 w-3" /></>
              )}
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        등록일: {new Date(src.created_at).toLocaleDateString("ko-KR")}
        {src.used_count > 0 && ` · 사용 ${src.used_count}회`}
      </p>
    </div>
  );
}

// ── 소스 등록 폼 ────────────────────────────────────────────
function AddSourceForm({
  clientId,
  onSuccess,
}: {
  clientId: string;
  onSuccess: (s: ContentSource) => void;
}) {
  const [mode, setMode] = useState<RegisterMode>("url");
  const [isPending, startTransition] = useTransition();
  const [crawling, setCrawling] = useState(false);

  // 공통
  const [sourceType, setSourceType] = useState("competitor");
  const [usageMode, setUsageMode] = useState("reference");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // URL 모드
  const [url, setUrl] = useState("");
  const [crawledTitle, setCrawledTitle] = useState("");
  const [crawledText, setCrawledText] = useState("");
  const [crawledStructure, setCrawledStructure] = useState<Record<string, number>>({});
  const [crawlError, setCrawlError] = useState("");
  const [crawled, setCrawled] = useState(false);

  // 수동 모드
  const [manualTitle, setManualTitle] = useState("");
  const [manualText, setManualText] = useState("");

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleCrawl() {
    if (!url) return;
    setCrawling(true);
    setCrawlError("");
    setCrawled(false);

    const result = await crawlSourceUrl(url);
    setCrawling(false);

    if (result.error) {
      setCrawlError(result.error);
      return;
    }

    setCrawledTitle(result.title ?? "");
    setCrawledText(result.contentText ?? "");
    setCrawledStructure(result.contentStructure as Record<string, number>);
    setCrawled(true);
  }

  function handleSave() {
    const isUrl = mode === "url";
    const title = isUrl ? crawledTitle : manualTitle;
    const text = isUrl ? crawledText : manualText;

    if (!title && !url) return;

    // 수동 입력 시 구조 자동 계산
    let structure = isUrl
      ? crawledStructure
      : {
          word_count: text.length,
          h2_count: 0,
          h3_count: 0,
          image_count: 0,
        };

    startTransition(async () => {
      const result = await createContentSource({
        clientId,
        sourceType,
        title: title || null,
        url: isUrl ? url : null,
        contentText: text || null,
        contentStructure: structure,
        usageMode,
        tags,
      });

      if (result.success && result.id) {
        onSuccess({
          id: result.id,
          client_id: clientId,
          source_type: sourceType,
          title: title || null,
          url: isUrl ? url : null,
          content_data: {},
          content_text: text || null,
          content_structure: structure as ContentSource["content_structure"],
          content_id: null,
          usage_mode: usageMode,
          tags,
          used_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
    });
  }

  return (
    <div className="space-y-4 pt-2">
      {/* 등록 모드 토글 */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "url" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("url")}
          className="flex-1"
        >
          <Globe className="h-4 w-4 mr-1" />
          URL 크롤링
        </Button>
        <Button
          type="button"
          variant={mode === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("manual")}
          className="flex-1"
        >
          <PenTool className="h-4 w-4 mr-1" />
          직접 입력
        </Button>
      </div>

      {/* 소스 유형 */}
      <div className="space-y-1.5">
        <Label>소스 유형</Label>
        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          className={selectCls}
        >
          {SOURCE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* URL 모드 */}
      {mode === "url" && (
        <>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://blog.naver.com/..."
                value={url}
                onChange={(e) => { setUrl(e.target.value); setCrawled(false); }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCrawl}
                disabled={!url || crawling}
                className="shrink-0"
              >
                {crawling ? <Loader2 className="h-4 w-4 animate-spin" /> : "분석"}
              </Button>
            </div>
            {crawlError && <p className="text-xs text-red-500">{crawlError}</p>}
          </div>

          {crawled && (
            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="text-xs font-semibold text-emerald-700">크롤링 결과</p>
              <div className="space-y-1.5">
                <Label className="text-xs">제목</Label>
                <Input
                  value={crawledTitle}
                  onChange={(e) => setCrawledTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{crawledStructure.word_count?.toLocaleString() ?? 0}자</span>
                <span>H2 x{crawledStructure.h2_count ?? 0}</span>
                <span>H3 x{crawledStructure.h3_count ?? 0}</span>
                <span>img x{crawledStructure.image_count ?? 0}</span>
              </div>
              {crawledText && (
                <div className="rounded border bg-white p-2 text-xs text-muted-foreground max-h-32 overflow-y-auto">
                  {crawledText.slice(0, 300)}...
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 수동 입력 모드 */}
      {mode === "manual" && (
        <>
          <div className="space-y-1.5">
            <Label>제목</Label>
            <Input
              placeholder="레퍼런스 자료 제목"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>본문 텍스트</Label>
            <textarea
              placeholder="참조할 콘텐츠 내용을 입력하세요..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
            {manualText && (
              <p className="text-xs text-muted-foreground">{manualText.length.toLocaleString()}자</p>
            )}
          </div>
        </>
      )}

      {/* 활용 방식 */}
      <div className="space-y-1.5">
        <Label>활용 방식</Label>
        <select
          value={usageMode}
          onChange={(e) => setUsageMode(e.target.value)}
          className={selectCls}
        >
          <option value="reference">레퍼런스 (참고용)</option>
          <option value="style">스타일 (문체 참고)</option>
          <option value="fact">팩트 (사실 데이터)</option>
          <option value="cta">CTA (행동 유도)</option>
        </select>
      </div>

      {/* 키워드 태그 */}
      <div className="space-y-1.5">
        <Label>연관 키워드 태그</Label>
        <div className="flex gap-2">
          <Input
            placeholder="키워드 입력 후 Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag} className="shrink-0">
            추가
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      <Button
        className="w-full"
        onClick={handleSave}
        disabled={
          isPending ||
          (mode === "url" ? !crawled && !url : !manualTitle)
        }
      >
        {isPending ? "저장 중..." : "소스 등록"}
      </Button>
    </div>
  );
}

// ── 소스 수정 폼 ────────────────────────────────────────────
function EditSourceForm({
  source,
  onSuccess,
}: {
  source: ContentSource;
  onSuccess: (s: ContentSource) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(source.title ?? "");
  const [url, setUrl] = useState(source.url ?? "");
  const [sourceType, setSourceType] = useState(source.source_type);
  const [usageMode, setUsageMode] = useState(source.usage_mode);
  const [contentText, setContentText] = useState(source.content_text ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(source.tags ?? []);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function handleSave() {
    const structure = {
      word_count: contentText.length,
      h2_count: (source.content_structure as Record<string, number> | null)?.h2_count ?? 0,
      h3_count: (source.content_structure as Record<string, number> | null)?.h3_count ?? 0,
      image_count: (source.content_structure as Record<string, number> | null)?.image_count ?? 0,
    };

    startTransition(async () => {
      const result = await updateContentSource(source.id, {
        title: title || null,
        url: url || null,
        sourceType,
        contentText: contentText || null,
        contentStructure: structure,
        usageMode,
        tags,
      });

      if (result.success) {
        onSuccess({
          ...source,
          title: title || null,
          url: url || null,
          source_type: sourceType,
          content_text: contentText || null,
          content_structure: structure,
          usage_mode: usageMode,
          tags,
        });
      }
    });
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>소스 유형</Label>
        <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={selectCls}>
          {SOURCE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          {/* 레거시 타입 유지 */}
          {!SOURCE_TYPE_OPTIONS.some((o) => o.value === sourceType) && (
            <option value={sourceType}>{SOURCE_TYPE_LABELS[sourceType] ?? sourceType}</option>
          )}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>제목</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>URL <span className="text-muted-foreground text-xs">(선택)</span></Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div className="space-y-1.5">
        <Label>본문 텍스트</Label>
        <textarea
          value={contentText}
          onChange={(e) => setContentText(e.target.value)}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
        />
        {contentText && <p className="text-xs text-muted-foreground">{contentText.length.toLocaleString()}자</p>}
      </div>

      <div className="space-y-1.5">
        <Label>활용 방식</Label>
        <select value={usageMode} onChange={(e) => setUsageMode(e.target.value)} className={selectCls}>
          <option value="reference">레퍼런스</option>
          <option value="style">스타일</option>
          <option value="fact">팩트</option>
          <option value="cta">CTA</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>연관 키워드 태그</Label>
        <div className="flex gap-2">
          <Input
            placeholder="키워드 입력 후 Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag} className="shrink-0">추가</Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button className="w-full" onClick={handleSave} disabled={isPending || !title}>
        {isPending ? "저장 중..." : "수정 완료"}
      </Button>
    </div>
  );
}
