"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { BrandBadge } from "@/components/ui/brand-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink, FileText, Radio, ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

const FILTER_OPTIONS = [
  { label: "미발행 우선", value: "unpublished_first" },
  { label: "전체", value: "all" },
  { label: "추적중", value: "tracking" },
  { label: "발행됨", value: "published" },
  { label: "반려", value: "rejected" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  tracking: "bg-sky-100 text-sky-700 border-sky-200",
  published: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  review: "검토",
  approved: "승인",
  tracking: "추적중",
  published: "발행됨",
  rejected: "반려",
  archived: "보관",
};

interface ContentItem {
  id: string;
  title: string | null;
  publish_status: string;
  generated_by: string | null;
  word_count: number | null;
  tags: string[] | null;
  published_url: string | null;
  is_tracking: boolean | null;
  created_at: string;
  client_name?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any> | null;
}

interface ContentListClientProps {
  contents: ContentItem[];
  isAllMode: boolean;
}

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours < 12 ? "오전" : "오후";
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const mm = minutes.toString().padStart(2, "0");
  return `${month}월 ${day}일 ${ampm} ${h12}:${mm}`;
}

export function ContentListClient({ contents, isAllMode }: ContentListClientProps) {
  const [filter, setFilter] = useState("unpublished_first");
  const [showCount, setShowCount] = useState(5);

  const filtered = useMemo(() => {
    let result = [...contents];
    switch (filter) {
      case "unpublished_first":
        result.sort((a, b) => {
          const unpublished = ["draft", "review", "approved"];
          const aUnpub = unpublished.includes(a.publish_status) ? 0 : 1;
          const bUnpub = unpublished.includes(b.publish_status) ? 0 : 1;
          if (aUnpub !== bUnpub) return aUnpub - bUnpub;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        break;
      case "tracking":
        result = result.filter((c) => c.publish_status === "tracking");
        break;
      case "published":
        result = result.filter((c) => c.publish_status === "published");
        break;
      case "rejected":
        result = result.filter((c) => c.publish_status === "rejected");
        break;
      default:
        break;
    }
    return result;
  }, [contents, filter]);

  const displayed = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

  return (
    <div className="space-y-4">
      {/* Dropdown Filter */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setShowCount(5);
            }}
            className="appearance-none flex h-9 rounded-md border border-input bg-transparent pl-3 pr-8 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length}건
        </span>
      </div>

      {/* Content table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="콘텐츠가 없습니다"
          description="조건에 맞는 콘텐츠가 없습니다."
          actionLabel="블로그 발행"
          actionHref="/contents?tab=publish"
        />
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <div className={`grid ${isAllMode ? "grid-cols-[auto_1fr_auto_auto_auto_auto_auto]" : "grid-cols-[1fr_auto_auto_auto_auto_auto]"} gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b`}>
              {isAllMode && <span>브랜드</span>}
              <span>제목</span>
              <span>구분</span>
              <span>글자수</span>
              <span>QC</span>
              <span>상태</span>
              <span>생성일</span>
            </div>

            <div className="divide-y">
              {displayed.map((content) => (
                <Link
                  key={content.id}
                  href={`/contents/${content.id}`}
                  className={`grid ${isAllMode ? "grid-cols-[auto_1fr_auto_auto_auto_auto_auto]" : "grid-cols-[1fr_auto_auto_auto_auto_auto]"} gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors`}
                >
                  {isAllMode && (
                    <div>
                      {content.client_name ? (
                        <BrandBadge name={content.client_name} />
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">
                        {content.title ?? "(제목 없음)"}
                      </p>
                      {content.published_url && (
                        <span title="발행됨">
                          <ExternalLink className="h-3 w-3 text-emerald-500 shrink-0" />
                        </span>
                      )}
                      {content.is_tracking && (
                        <span title="순위 추적 중">
                          <Radio className="h-3 w-3 text-blue-500 shrink-0" />
                        </span>
                      )}
                    </div>
                    {content.tags && content.tags.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {content.tags.slice(0, 3).join(", ")}
                      </p>
                    )}
                  </div>

                  <span className="text-base" title={content.generated_by ?? ""}>
                    {content.generated_by === "human" ? "✍️" : "🤖"}
                  </span>

                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {content.word_count?.toLocaleString() ?? "—"}자
                  </span>

                  <span className="text-xs whitespace-nowrap">
                    {content.metadata?.qc_score != null ? (
                      <span className={content.metadata.qc_pass ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                        {String(content.metadata.qc_score)}점
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </span>

                  <Badge
                    variant="outline"
                    className={`text-xs ${STATUS_COLORS[content.publish_status] ?? ""}`}
                  >
                    {STATUS_LABELS[content.publish_status] ?? content.publish_status}
                  </Badge>

                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatKoreanDate(content.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* 더보기 */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCount((prev) => prev + 5)}
                className="gap-1"
              >
                더보기 ({filtered.length - showCount}건 남음)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
