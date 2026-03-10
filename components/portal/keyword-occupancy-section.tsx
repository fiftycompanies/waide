"use client";

import { Eye } from "lucide-react";

interface KeywordOccupancy {
  total: number;
  exposed: number;
  keywords: { keyword_id: string; rank_pc: number | null; rank_mo: number | null; is_exposed: boolean }[];
}

export default function KeywordOccupancySection({ data }: { data: KeywordOccupancy }) {
  if (data.total === 0) return null;

  const pct = data.total > 0 ? Math.round((data.exposed / data.total) * 100) : 0;

  // 노출 키워드를 rank_pc 기준 오름차순 정렬
  const sorted = [...data.keywords].sort((a, b) => (a.rank_pc ?? 99) - (b.rank_pc ?? 99));

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex items-center gap-2 text-gray-900 mb-4">
        <Eye className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-semibold">키워드 점유율</h2>
      </div>

      <p className="text-sm text-gray-600 mb-3">
        활성 키워드 <span className="font-bold text-gray-900">{data.total}</span>개 중{" "}
        <span className="font-bold text-emerald-600">{data.exposed}</span>개 1페이지 노출 중
      </p>

      {/* 진행바 */}
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* 노출 키워드 칩 */}
      {sorted.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((kw) => (
            <span
              key={kw.keyword_id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs border border-emerald-100"
            >
              {kw.rank_pc != null && (
                <span className="font-semibold">{kw.rank_pc}위</span>
              )}
              {kw.keyword_id.slice(0, 8)}
            </span>
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <p className="text-xs text-gray-400">아직 1페이지에 노출된 키워드가 없습니다</p>
      )}
    </div>
  );
}
