"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContent } from "@/lib/actions/ops-actions";
import { crawlPublishedUrl } from "@/lib/actions/url-crawl-action";
import type { Keyword } from "@/lib/actions/keyword-actions";
import type { BlogAccount } from "@/lib/actions/blog-account-actions";
import { Loader2, Wand2 } from "lucide-react";

const CONTENT_TYPES = [
  { value: "single", label: "Single (일반 정보글)" },
  { value: "list", label: "List (목록형)" },
  { value: "review", label: "Review (후기형)" },
  { value: "info", label: "Info (정보형)" },
  { value: "special", label: "Special (기획형)" },
];

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface NewContentFormProps {
  clientId: string;
  keywords: Keyword[];
  blogAccounts: BlogAccount[];
  defaultKeywordId?: string | null;
}

export function NewContentForm({ clientId, keywords, blogAccounts, defaultKeywordId }: NewContentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 폼 상태
  const [keywordId, setKeywordId] = useState(defaultKeywordId ?? "");
  const [contentType, setContentType] = useState("single");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [blogAccountId, setBlogAccountId] = useState("");

  // 이미 발행됨 상태
  const [alreadyPublished, setAlreadyPublished] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [publishedDate, setPublishedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  async function handleCrawl() {
    if (!publishedUrl) return;
    setIsCrawling(true);
    setCrawlError(null);
    try {
      // blog_url에서 네이버 ID 추출 (blog.naver.com/{id} 패턴)
      const accountsForCrawl = blogAccounts.map((a) => {
        const naverMatch = a.blog_url?.match(/blog\.naver\.com\/([A-Za-z0-9_]+)/);
        return {
          id: a.id,
          blog_id: naverMatch?.[1] ?? null,
          account_name: a.account_name,
        };
      });
      const result = await crawlPublishedUrl(publishedUrl, accountsForCrawl);
      if (result.error) {
        setCrawlError(result.error);
      } else {
        if (result.title && !title.trim()) setTitle(result.title);
        if (result.publishedDate) setPublishedDate(result.publishedDate);
        if (result.blogAccountId) setBlogAccountId(result.blogAccountId);
      }
    } finally {
      setIsCrawling(false);
    }
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("제목은 필수입니다.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createContent({
        clientId,
        keywordId:      keywordId || null,
        blogAccountId:  blogAccountId || null,
        title:          title.trim(),
        body:           body || null,
        metaDescription: metaDescription || null,
        contentType,
        generatedBy:    "human",
        publishStatus:  alreadyPublished ? "published" : "draft",
        publishedUrl:   alreadyPublished ? publishedUrl || null : null,
        publishedDate:  alreadyPublished ? publishedDate || null : null,
        isTracking:     alreadyPublished,
      });

      if (result.success && result.id) {
        router.push(`/ops/contents/${result.id}`);
      } else {
        setError(result.error ?? "저장 실패");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* 기본 정보 */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          기본 정보
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>타겟 키워드</Label>
            <select
              value={keywordId}
              onChange={(e) => setKeywordId(e.target.value)}
              className={selectCls}
            >
              <option value="">키워드 선택 (선택)</option>
              {keywords.map((kw) => (
                <option key={kw.id} value={kw.id}>
                  {kw.keyword}
                  {kw.monthly_search_total ? ` (월 ${kw.monthly_search_total.toLocaleString()}회)` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>콘텐츠 타입</Label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className={selectCls}
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>
            제목 <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="원고 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>메타 설명 <span className="text-muted-foreground text-xs">(선택)</span></Label>
          <Input
            placeholder="검색 결과에 표시될 설명 (150자 이내)"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>발행 계정 <span className="text-muted-foreground text-xs">(선택)</span></Label>
          <select
            value={blogAccountId}
            onChange={(e) => setBlogAccountId(e.target.value)}
            className={selectCls}
          >
            <option value="">계정 선택</option>
            {blogAccounts.filter((a) => a.is_active).map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_name}
                {acc.blog_score ? ` (점수: ${acc.blog_score})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 본문 */}
      <div className="rounded-lg border p-6 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          본문 (Markdown)
        </h2>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="원고 본문을 마크다운으로 입력하세요..."
          className="flex w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[400px] resize-y"
          spellCheck={false}
        />
      </div>

      {/* 이미 발행됨 */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={alreadyPublished}
            onChange={(e) => setAlreadyPublished(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm font-semibold text-emerald-800">
            이미 발행된 원고 (SERP 순위 추적 즉시 시작)
          </span>
        </label>

        {alreadyPublished && (
          <div className="pl-6 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-emerald-700">발행 URL <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://blog.naver.com/..."
                  value={publishedUrl}
                  onChange={(e) => { setPublishedUrl(e.target.value); setCrawlError(null); }}
                  className="border-emerald-200 focus-visible:ring-emerald-400 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCrawl}
                  disabled={!publishedUrl || isCrawling}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 shrink-0"
                  title="URL에서 제목/발행일 자동 추출"
                >
                  {isCrawling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1 text-xs">{isCrawling ? "추출 중..." : "자동 추출"}</span>
                </Button>
              </div>
              {crawlError && (
                <p className="text-xs text-red-500">{crawlError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-emerald-700">발행일</Label>
              <Input
                type="date"
                value={publishedDate}
                onChange={(e) => setPublishedDate(e.target.value)}
                className="border-emerald-200 focus-visible:ring-emerald-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* 에러 + 제출 */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isPending || !title.trim()}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {isPending ? "저장 중..." : alreadyPublished ? "등록 + 순위 추적 시작" : "초안으로 저장"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          취소
        </Button>
      </div>
    </div>
  );
}
