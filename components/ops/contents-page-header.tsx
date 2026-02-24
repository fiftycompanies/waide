"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentsCsvDialog } from "@/components/ops/contents-csv-dialog";

interface Brand {
  id: string;
  name: string;
}

interface ContentsPageHeaderProps {
  brands: Brand[];
}

export function ContentsPageHeader({ brands }: ContentsPageHeaderProps) {
  const [csvOpen, setCsvOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>(brands[0]?.id ?? "");

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">콘텐츠 에디터</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI가 생성한 원고를 확인하고 편집합니다
        </p>
      </div>
      <div className="flex items-center gap-2">
        {brands.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvOpen(true)}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            CSV 대량 등록
          </Button>
        )}
        <Link
          href="/ops/contents/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          원고 직접 등록
        </Link>
      </div>

      {brands.length > 0 && (
        <ContentsCsvDialog
          clientId={selectedClientId}
          open={csvOpen}
          onClose={() => setCsvOpen(false)}
        />
      )}
    </div>
  );
}

// CSV 브랜드 선택기 포함 버전
interface ContentsPageHeaderWithSelectorProps {
  brands: Brand[];
}

export function ContentsPageHeaderWithSelector({ brands }: ContentsPageHeaderWithSelectorProps) {
  const [csvOpen, setCsvOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>(brands[0]?.id ?? "");

  const selectCls =
    "flex h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">콘텐츠 에디터</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI가 생성한 원고를 확인하고 편집합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          {brands.length > 0 && (
            <>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={selectCls}
                title="CSV 등록할 브랜드 선택"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCsvOpen(true)}
                className="gap-1.5"
                disabled={!selectedClientId}
              >
                <Upload className="h-3.5 w-3.5" />
                CSV 대량 등록
              </Button>
            </>
          )}
          <Link
            href="/ops/contents/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            원고 직접 등록
          </Link>
        </div>
      </div>

      {brands.length > 0 && selectedClientId && (
        <ContentsCsvDialog
          clientId={selectedClientId}
          open={csvOpen}
          onClose={() => setCsvOpen(false)}
        />
      )}
    </>
  );
}
