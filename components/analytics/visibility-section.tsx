"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { KeywordVisibilityRow } from "@/lib/actions/analytics-actions";

interface VisibilitySectionProps {
  rows: KeywordVisibilityRow[];
}

type SortKey = "visibility_score_pc" | "rank_pc" | "rank_mo" | "search_volume_pc";

function RankCell({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="text-muted-foreground/40">미노출</span>;
  const cls = rank <= 3 ? "text-emerald-600 font-bold" : rank <= 10 ? "text-amber-600 font-semibold" : "text-muted-foreground";
  return <span className={cls}>{rank}위</span>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-violet-500" : score >= 40 ? "bg-blue-400" : score >= 10 ? "bg-amber-400" : "bg-gray-300";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{score.toFixed(0)}</span>
    </div>
  );
}

export function VisibilitySection({ rows }: VisibilitySectionProps) {
  const [sortKey, setSortKey] = useState<SortKey>("visibility_score_pc");
  const [asc, setAsc] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else { setSortKey(key); setAsc(false); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? (asc ? Infinity : -Infinity);
    const bv = b[sortKey] ?? (asc ? Infinity : -Infinity);
    return asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const thCls = "px-3 py-2 text-left text-[11px] font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none";

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            키워드별 노출 점유율
            <span className="ml-2 text-xs font-normal text-muted-foreground">오늘 기준</span>
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{rows.length}개</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">
            SERP 수집 후 데이터가 표시됩니다
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border/40">
                <tr>
                  <th className={`${thCls} w-[180px]`}>키워드</th>
                  <th className={thCls} onClick={() => toggleSort("rank_pc")}>
                    <div className="flex items-center gap-1">PC 순위 <SortIcon k="rank_pc" /></div>
                  </th>
                  <th className={thCls} onClick={() => toggleSort("rank_mo")}>
                    <div className="flex items-center gap-1">MO 순위 <SortIcon k="rank_mo" /></div>
                  </th>
                  <th className={`${thCls} min-w-[140px]`} onClick={() => toggleSort("visibility_score_pc")}>
                    <div className="flex items-center gap-1">PC 점수 (0~100) <SortIcon k="visibility_score_pc" /></div>
                  </th>
                  <th className={thCls} onClick={() => toggleSort("search_volume_pc")}>
                    <div className="flex items-center gap-1">검색량 PC <SortIcon k="search_volume_pc" /></div>
                  </th>
                  <th className={thCls}>노출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {sorted.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 font-medium">{row.keyword}</td>
                    <td className="px-3 py-2 text-center">
                      <RankCell rank={row.rank_pc} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <RankCell rank={row.rank_mo} />
                    </td>
                    <td className="px-3 py-2">
                      <ScoreBar score={row.visibility_score_pc} />
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {row.search_volume_pc > 0 ? row.search_volume_pc.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.is_exposed ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">노출</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200">미노출</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
