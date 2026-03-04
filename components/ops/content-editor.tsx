"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import type { Content } from "@/lib/actions/ops-actions";
import type { BlogAccount } from "@/lib/actions/blog-account-actions";
import { updateContent, updatePublishedUrl } from "@/lib/actions/ops-actions";
import { linkContentBlogAccount } from "@/lib/actions/blog-account-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Save, Code, Link2, CheckCircle2, Copy, Check, Eye, Pencil, UserCircle2, ChevronDown, ChevronUp, AlertTriangle, RotateCcw } from "lucide-react";

// ── 상태 스텝 ─────────────────────────────────────────────────────────────────
const STEPS = [
  { key: "draft",     label: "초안" },
  { key: "review",    label: "검토중" },
  { key: "approved",  label: "승인" },
  { key: "published", label: "발행됨" },
  { key: "tracking",  label: "순위추적" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function getActiveStepIndex(publishStatus: string, isTracking: boolean | null): number {
  if (isTracking) return 4;
  if (publishStatus === "published") return 3;
  if (publishStatus === "approved") return 2;
  if (publishStatus === "review") return 1;
  return 0;
}

function StatusSteps({
  publishStatus,
  isTracking,
}: {
  publishStatus: string;
  isTracking: boolean | null;
}) {
  const activeIdx = getActiveStepIndex(publishStatus, isTracking);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const done = idx < activeIdx;
        const active = idx === activeIdx;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-violet-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : idx + 1}
              </div>
              <span
                className={`text-[10px] whitespace-nowrap ${
                  active ? "text-violet-600 font-semibold" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-px w-8 mb-4 mx-1 ${done ? "bg-emerald-400" : "bg-border/60"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── JSON-LD 헬퍼 ──────────────────────────────────────────────────────────────
function extractJsonBlock(body: string): string | null {
  const match = body.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return match[1].trim();
  }
}

function replaceJsonBlock(body: string, newJson: string): string {
  return body.replace(
    /```json\s*([\s\S]*?)```/,
    "```json\n" + newJson + "\n```"
  );
}

// ── 마크다운 프리뷰 컴포넌트 ─────────────────────────────────────────────────
function MarkdownPreview({ body }: { body: string }) {
  return (
    <div className="flex-1 rounded-lg border bg-background p-6 overflow-auto min-h-[500px] text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-6 mb-3 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-5 mb-2 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 text-foreground/90">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground/90">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/80">{children}</em>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <pre className="my-3 rounded-lg bg-muted p-4 text-xs overflow-auto">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-violet-300 pl-4 my-3 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border/60" />,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

// ── QC v2 결과 섹션 ──────────────────────────────────────────────────────────
function QcResultSection({ metadata }: { metadata: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qc = metadata.qc_result as Record<string, any>;
  const qcScore = (metadata.qc_score as number) ?? qc?.total_score ?? qc?.score ?? 0;
  const qcPass = (metadata.qc_pass as boolean) ?? qc?.pass ?? false;
  const rewriteCount = (metadata.rewrite_count as number) ?? 0;
  const rewriteHistory = (metadata.rewrite_history as Array<Record<string, unknown>>) ?? [];
  const needsManualReview = metadata.needs_manual_review as boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Array<Record<string, any>> = Array.isArray(qc?.items) ? qc.items : [];
  const topIssues: string[] = Array.isArray(qc?.top_issues) ? qc.top_issues : (Array.isArray(qc?.critical_issues) ? qc.critical_issues : []);
  const verdict: string = qc?.verdict || qc?.overall_feedback || "";
  const benchmarkComparison: string = qc?.benchmark_comparison
    ? (typeof qc.benchmark_comparison === "string" ? qc.benchmark_comparison : JSON.stringify(qc.benchmark_comparison))
    : "";

  const scoreColor = qcPass
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${qcPass ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">QC 검수 결과 (v2)</span>
          <Badge variant="outline" className={`text-xs ${scoreColor}`}>
            {qcScore}/100 {qcPass ? "PASS" : "FAIL"}
          </Badge>
          {rewriteCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              재작성: {rewriteCount}회
            </span>
          )}
          {needsManualReview && (
            <span className="flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              수동 검토 필요
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3" /> 접기</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> 상세 보기</>
          )}
        </button>
      </div>

      {/* 항목별 점수 (항상 표시) */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {items.map((item, idx) => {
            const itemScore = item.score ?? 0;
            const maxScore = item.maxScore ?? item.max_score ?? 10;
            const status = item.status ?? (itemScore >= maxScore * 0.8 ? "pass" : itemScore >= maxScore * 0.5 ? "warn" : "fail");
            const statusIcon = status === "pass" ? "✅" : status === "warn" ? "⚠️" : "❌";
            return (
              <div key={idx} className="flex items-center gap-1.5 text-xs">
                <span>{statusIcon}</span>
                <span className="text-muted-foreground truncate">{item.name || item.label || `항목${idx + 1}`}</span>
                <span className="font-semibold ml-auto">{itemScore}/{maxScore}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 확장: 상세 피드백 */}
      {expanded && (
        <div className="space-y-3 pt-2 border-t border-border/40">
          {/* 주요 이슈 */}
          {topIssues.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">주요 이슈</p>
              <ul className="space-y-0.5">
                {topIssues.map((issue, idx) => (
                  <li key={idx} className="text-xs text-foreground/80 flex items-start gap-1">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 벤치마크 비교 */}
          {benchmarkComparison && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">벤치마크 비교</p>
              <p className="text-xs text-foreground/80 bg-muted/50 rounded p-2">{benchmarkComparison}</p>
            </div>
          )}

          {/* 종합 판정 */}
          {verdict && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">종합 판정</p>
              <p className="text-xs text-foreground/80">{verdict}</p>
            </div>
          )}

          {/* 재작성 이력 */}
          {rewriteHistory.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">재작성 이력</p>
              <ul className="space-y-1">
                {rewriteHistory.map((entry, idx) => (
                  <li key={idx} className="text-xs text-foreground/80 flex items-start gap-1">
                    <span className="text-violet-500 mt-0.5">•</span>
                    {entry.attempt as number}회차: {Array.isArray(entry.changes) ? (entry.changes as string[]).join(", ") : "수정"} ({entry.previous_score as number}점 →)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 항목별 상세 (detail 필드) */}
          {items.some((i) => i.detail) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">항목별 상세</p>
              <div className="space-y-1">
                {items
                  .filter((i) => i.detail)
                  .map((item, idx) => (
                    <div key={idx} className="text-xs text-foreground/80">
                      <span className="font-medium">{item.name || item.label}:</span> {item.detail}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 메인 에디터 ───────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  published: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

interface ContentEditorProps {
  content: Content;
  blogAccounts?: BlogAccount[];
}

export function ContentEditor({ content, blogAccounts = [] }: ContentEditorProps) {
  const [body, setBody] = useState(content.body ?? "");
  const [title, setTitle] = useState(content.title ?? "");
  const [previewMode, setPreviewMode] = useState(false);
  const [schemaEditMode, setSchemaEditMode] = useState(false);
  const [schemaText, setSchemaText] = useState(
    () => extractJsonBlock(content.body ?? "") ?? ""
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 복사 버튼 상태
  const [copied, setCopied] = useState(false);

  // 블로그 계정 셀렉터
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    content.blog_account_id ?? ""
  );
  const [accountPending, startAccountTransition] = useTransition();
  const [accountSaved, setAccountSaved] = useState(false);

  // 발행 URL 브릿지
  const [publishUrl, setPublishUrl] = useState(content.published_url ?? content.url ?? "");
  const [urlPending, startUrlTransition] = useTransition();
  const [urlSaved, setUrlSaved] = useState(content.is_tracking === true);
  const [urlError, setUrlError] = useState<string | null>(null);

  const displayedSchema = schemaEditMode
    ? schemaText
    : (extractJsonBlock(body) ?? "");

  function handleSave() {
    setError(null);
    setSaved(false);

    let finalBody = body;
    if (schemaEditMode && schemaText) {
      finalBody = replaceJsonBlock(body, schemaText);
      setBody(finalBody);
    }

    startTransition(async () => {
      const result = await updateContent(content.id, {
        title: title || undefined,
        body: finalBody,
      });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error ?? "저장 실패");
      }
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleAccountSave(accountId: string) {
    setAccountSaved(false);
    setSelectedAccountId(accountId);
    startAccountTransition(async () => {
      await linkContentBlogAccount(content.id, accountId || null);
      setAccountSaved(true);
      setTimeout(() => setAccountSaved(false), 2000);
    });
  }

  function handleUrlSave() {
    if (!publishUrl.trim()) return;
    setUrlError(null);
    setUrlSaved(false);
    startUrlTransition(async () => {
      const res = await updatePublishedUrl(content.id, publishUrl.trim());
      if (res.success) {
        setUrlSaved(true);
      } else {
        setUrlError(res.error ?? "저장 실패");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 발행 계정 셀렉터 */}
      <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
          <UserCircle2 className="h-3.5 w-3.5" />
          발행 계정 선택
          {accountSaved && (
            <span className="ml-2 flex items-center gap-1 text-emerald-600 font-normal">
              <Check className="h-3 w-3" /> 저장됨
            </span>
          )}
        </div>
        {blogAccounts.length === 0 ? (
          <p className="text-xs text-violet-600">
            등록된 블로그 계정이 없습니다.{" "}
            <Link href="/blog-accounts" className="underline font-medium">
              블로그 계정 등록하기
            </Link>
          </p>
        ) : (
          <select
            value={selectedAccountId}
            onChange={(e) => handleAccountSave(e.target.value)}
            disabled={accountPending}
            className="flex h-8 w-full max-w-xs rounded-md border border-violet-200 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-400 disabled:opacity-50"
          >
            <option value="">계정을 선택하세요</option>
            {blogAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_name}
                {acc.blog_score ? ` (${acc.blog_score})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 발행 URL 브릿지 */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <Link2 className="h-3.5 w-3.5" />
          발행 완료 URL 등록
          <span className="font-normal text-emerald-600 ml-1">
            — 저장하면 김연구원이 내일부터 SERP 순위 추적을 시작합니다
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="https://blog.naver.com/..."
            value={publishUrl}
            onChange={(e) => { setPublishUrl(e.target.value); setUrlSaved(false); }}
            className="h-8 text-sm flex-1 bg-white border-emerald-200 focus-visible:ring-emerald-400"
          />
          <Button
            size="sm"
            onClick={handleUrlSave}
            disabled={urlPending || !publishUrl.trim()}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            {urlPending ? "저장 중..." : "저장"}
          </Button>
        </div>
        {urlSaved && (
          <p className="flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            URL 저장 완료 — SERP 추적 활성화됨
          </p>
        )}
        {urlError && <p className="text-xs text-red-600">{urlError}</p>}
      </div>

      {/* 상태 스텝 */}
      <div className="flex items-center gap-4 flex-wrap">
        <StatusSteps
          publishStatus={content.publish_status}
          isTracking={content.is_tracking}
        />
      </div>

      {/* QC v2 검수 결과 (metadata.qc_result가 있을 때만 표시) */}
      {content.metadata?.qc_result && (
        <QcResultSection metadata={content.metadata} />
      )}

      {/* Meta header */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 없음"
          className="text-xl font-bold bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`text-xs ${STATUS_COLORS[content.publish_status] ?? ""}`}
          >
            {content.publish_status}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {content.content_type}
          </Badge>
          {content.word_count != null && (
            <Badge variant="outline" className="text-xs">
              {content.word_count.toLocaleString()}자
            </Badge>
          )}
          {content.tags && content.tags.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {content.tags.slice(0, 5).join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isPending ? "저장 중..." : "저장"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              복사됨
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              📋 복사하기
            </>
          )}
        </Button>
        <button
          onClick={() => setPreviewMode((prev) => !prev)}
          className="flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          {previewMode ? (
            <>
              <Pencil className="h-3 w-3" />
              편집 모드
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" />
              미리보기
            </>
          )}
        </button>
        {saved && (
          <span className="text-xs text-green-600">✓ 저장되었습니다</span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {/* 2-column editor */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 min-h-[calc(100vh-380px)]">
        {/* Left: 원고 에디터 / 미리보기 */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            원고 {previewMode ? "(미리보기)" : "(Markdown)"}
          </p>
          {previewMode ? (
            <MarkdownPreview body={body} />
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="flex-1 font-mono text-sm rounded-lg border bg-muted/20 p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[500px]"
              placeholder="콘텐츠 본문..."
              spellCheck={false}
            />
          )}
        </div>

        {/* Right: JSON-LD schema viewer / editor */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              JSON-LD 스키마
            </p>
            <button
              onClick={() => setSchemaEditMode((prev) => !prev)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Code className="h-3 w-3" />
              {schemaEditMode ? "뷰어로 전환" : "스키마 편집"}
            </button>
          </div>

          {displayedSchema ? (
            schemaEditMode ? (
              <textarea
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
                className="flex-1 font-mono text-xs rounded-lg border bg-muted/20 p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[500px]"
                spellCheck={false}
              />
            ) : (
              <pre className="flex-1 font-mono text-xs rounded-lg border bg-muted/20 p-4 overflow-auto min-h-[500px] whitespace-pre-wrap break-words">
                {displayedSchema}
              </pre>
            )
          ) : (
            <div className="flex-1 rounded-lg border bg-muted/10 flex items-center justify-center min-h-[500px]">
              <p className="text-sm text-muted-foreground text-center px-4">
                본문에 ` ```json ``` ` 블록이 없습니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
