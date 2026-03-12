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
import { Badge } from "@/components/ui/badge";
import { bulkCreateKeywords } from "@/lib/actions/keyword-actions";

interface CsvRow {
  keyword: string;
  subKeyword: string;
  platform: string;
  priority: string;
  _error?: string;
}

const VALID_PLATFORMS = ["naver", "google", "both"];
const VALID_PRIORITIES = ["high", "medium", "low"];

const SAMPLE_CSV = `메인키워드,서브키워드,플랫폼,우선순위
가평 글램핑 추천,가평 글램핑 가족,naver,high
서울 호캉스,서울 호캉스 가성비,both,medium
제주 펜션,,naver,low`;

function downloadSample() {
  const blob = new Blob(["\uFEFF" + SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "keywords_sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface KeywordCsvDialogProps {
  clientId: string;
  open: boolean;
  onClose: () => void;
}

export function KeywordCsvDialog({ clientId, open, onClose }: KeywordCsvDialogProps) {
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
          data[0]?.[0]?.toLowerCase().includes("keyword")
            ? 1
            : 0;

        const parsed: CsvRow[] = data.slice(startIdx).map((row) => {
          const keyword = (row[0] ?? "").trim();
          const subKeyword = (row[1] ?? "").trim();
          const platform = (row[2] ?? "").trim().toLowerCase();
          const priority = (row[3] ?? "").trim().toLowerCase();

          let error: string | undefined;
          if (!keyword) error = "메인키워드 필수";
          else if (platform && !VALID_PLATFORMS.includes(platform))
            error = `플랫폼 오류 (${platform})`;
          else if (priority && !VALID_PRIORITIES.includes(priority))
            error = `우선순위 오류 (${priority})`;

          return {
            keyword,
            subKeyword,
            platform: VALID_PLATFORMS.includes(platform) ? platform : "both",
            priority: VALID_PRIORITIES.includes(priority) ? priority : "medium",
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
      const result = await bulkCreateKeywords(
        clientId,
        validRows.map((r) => ({
          keyword: r.keyword,
          subKeyword: r.subKeyword || null,
          platform: r.platform,
          priority: r.priority,
        }))
      );
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>CSV 대량 등록 — 키워드</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 min-h-0 flex-1">
          {/* 파일 업로드 버튼 */}
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

          {/* 형식 안내 (파일 미선택 시) */}
          {rows.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              <p>
                CSV 형식:{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  메인키워드, 서브키워드, 플랫폼(naver/google/both), 우선순위(high/medium/low)
                </code>
              </p>
              <p className="mt-1 text-xs">첫 행을 헤더로 자동 감지합니다. UTF-8 인코딩을 권장합니다.</p>
            </div>
          )}

          {/* 미리보기 테이블 */}
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
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">메인키워드</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">서브키워드</th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground">플랫폼</th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground">우선순위</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className={row._error ? "bg-red-50/60" : "hover:bg-muted/20"}
                      >
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium">
                          {row.keyword || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {row.subKeyword || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <Badge variant="outline" className="text-[10px] px-1">
                            {row.platform}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1 ${
                              row.priority === "high"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : row.priority === "low"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {row.priority}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5">
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
