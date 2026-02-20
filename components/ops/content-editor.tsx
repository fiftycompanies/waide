"use client";

import { useState, useTransition } from "react";
import type { Content } from "@/lib/actions/ops-actions";
import { updateContent } from "@/lib/actions/ops-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, Code } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  published: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

/**
 * Extract the first ```json ... ``` block from markdown body
 */
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

/**
 * Replace the first ```json ... ``` block in body with new JSON string
 */
function replaceJsonBlock(body: string, newJson: string): string {
  return body.replace(
    /```json\s*([\s\S]*?)```/,
    "```json\n" + newJson + "\n```"
  );
}

interface ContentEditorProps {
  content: Content;
}

export function ContentEditor({ content }: ContentEditorProps) {
  const [body, setBody] = useState(content.body ?? "");
  const [title, setTitle] = useState(content.title ?? "");
  const [schemaEditMode, setSchemaEditMode] = useState(false);
  const [schemaText, setSchemaText] = useState(
    () => extractJsonBlock(content.body ?? "") ?? ""
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayedSchema = schemaEditMode
    ? schemaText
    : (extractJsonBlock(body) ?? "");

  function handleSave() {
    setError(null);
    setSaved(false);

    // If schema was edited, merge it back into body
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

  return (
    <div className="space-y-4">
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

      {/* Save button + status */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isPending ? "저장 중..." : "저장"}
        </Button>
        {saved && (
          <span className="text-xs text-green-600">✓ 저장되었습니다</span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {/* 2-column editor */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 min-h-[calc(100vh-280px)]">
        {/* Left: markdown editor */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            원고 (Markdown)
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 font-mono text-sm rounded-lg border bg-muted/20 p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[500px]"
            placeholder="콘텐츠 본문..."
            spellCheck={false}
          />
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
