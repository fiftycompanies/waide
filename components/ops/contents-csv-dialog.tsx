"use client";

import { useState, useRef, useTransition } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Download, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { bulkCreateContents } from "@/lib/actions/ops-actions";

interface CsvRow {
  subKeyword: string;
  title: string;
  publishedUrl: string;
  accountName: string;
  publishedAt: string;
  _error?: string;
}

const SAMPLE_CSV = `서브키워드,제목,발행URL,계정명,발행일
가평 글램핑 가족,가족과 함께하는 가평 글램핑 추천 TOP5,https://blog.naver.com/example/123,포코러쉬공식블로그,2024-03-15
서울 호캉스 가성비,2024 서울 호캉스 가성비 호텔 모음,https://blog.naver.com/example/124,포코러쉬뷰티스타그램,2024-03-16`;

function downloadSample() {
  const blob = new Blob(["\uFEFF" + SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "contents_sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function isValidDate(str: string): boolean {
  if (!str) return true; // optional
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

interface ContentsCsvDialogProps {
  clientId: string;
  open: boolean;
  onClose: () => void;
}

export function ContentsCsvDialog({ clientId, open, onClose }: ContentsCsvDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const validRows = rows.filter((r) => !r._error);
  const errorRows = rows.filter((r) => r._error);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data;
        const startIdx =
          data[0]?.[0]?.toLowerCase().includes("키워드") ||
          data[0]?.[0]?.toLowerCase().includes("keyword") ||
          data[0]?.[1]?.toLowerCase().includes("제목")
            ? 1
            : 0;

        const parsed: CsvRow[] = data.slice(startIdx).map((row) => {
          const subKeyword = (row[0] ?? "").trim();
          const title = (row[1] ?? "").trim();
          const publishedUrl = (row[2] ?? "").trim();
          const accountName = (row[3] ?? "").trim();
          const publishedAt = (row[4] ?? "").trim();

          let error: string | undefined;
          if (!title && !subKeyword) error = "제목 또는 서브키워드 필수";
          else if (publishedAt && !isValidDate(publishedAt)) error = `날짜 형식 오류 (${publishedAt})`;

          return {
            subKeyword,
            title,
            publishedUrl,
            accountName,
            publishedAt,
            _error: error,
          };
        });

        setRows(parsed);
      },
    });
    e.target.value = "";
  }

  function handleClose() {
    setRows([]);
    setFileName(null);
    onClose();
  }

  function handleSubmit() {
    if (validRows.length === 0) {
      toast.error("등록할 수 있는 유효한 행이 없습니다.");
      return;
    }
    startTransition(async () => {
      const result = await bulkCreateContents(clientId, validRows);
      const msg = [
        result.inserted > 0 ? `${result.inserted}개 등록` : null,
        result.skipped > 0 ? `${result.skipped}개 중복 건너뜀` : null,
        result.errors.length > 0 ? `${result.errors.length}개 배치 오류` : null,
      ]
        .filter(Boolean)
        .join(", ");

      if (result.inserted > 0 || result.success) {
        toast.success(msg || "등록 완료");
        handleClose();
        router.refresh();
      } else {
        toast.error(result.errors[0] ?? "등록 실패");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>CSV 대량 등록 — 콘텐츠</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 min-h-0 flex-1">
          {/* 파일 업로드 */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              파일 선택
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={downloadSample}
              className="gap-1.5 text-muted-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              샘플 다운로드
            </Button>
            {fileName && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {fileName}
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {/* 형식 안내 */}
          {rows.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              <p>
                CSV 형식:{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  서브키워드, 제목, 발행URL, 계정명, 발행일(YYYY-MM-DD)
                </code>
              </p>
              <p className="mt-1 text-xs">
                서브키워드로 기존 키워드를 자동 연결합니다. 계정명은 블로그 계정명과 정확히 일치해야 합니다.
              </p>
              <p className="mt-0.5 text-xs">
                발행 URL이 있으면 published 상태로, 없으면 draft로 등록됩니다.
              </p>
            </div>
          )}

          {/* 미리보기 */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  등록 가능: {validRows.length}개
                </span>
                {errorRows.length > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    오류 (건너뜀): {errorRows.length}개
                  </span>
                )}
              </div>

              <div className="overflow-auto rounded-lg border border-border/60 flex-1 min-h-0 max-h-80">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground">서브키워드</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground">제목</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground">URL</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground">계정명</th>
                      <th className="px-2 py-2 text-center font-medium text-muted-foreground">발행일</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className={row._error ? "bg-red-50/60" : "hover:bg-muted/20"}
                      >
                        <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-1.5 text-muted-foreground max-w-[100px] truncate">
                          {row.subKeyword || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-2 py-1.5 font-medium max-w-[160px] truncate">
                          {row.title || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground max-w-[100px] truncate">
                          {row.publishedUrl ? (
                            <span title={row.publishedUrl} className="text-blue-600">
                              {row.publishedUrl.replace(/https?:\/\//, "").slice(0, 25)}…
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground max-w-[100px] truncate">
                          {row.accountName || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-2 py-1.5 text-center whitespace-nowrap">
                          {row.publishedAt || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-2 py-1.5">
                          {row._error ? (
                            <span className="flex items-center gap-1 text-red-500">
                              <X className="h-3 w-3 shrink-0" />
                              {row._error}
                            </span>
                          ) : (
                            <span className="text-emerald-600">✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-4 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || validRows.length === 0}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isPending ? "등록 중..." : `${validRows.length}개 등록`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
