"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SerpDataPoint, SerpKeyword } from "@/lib/actions/analytics-actions";

// recharts LineChart용 데이터 변환:
// [{date, "글램핑 추천_PC": 3, "글램핑 추천_MO": 5, ...}, ...]
function buildChartData(
  trend: SerpDataPoint[],
  device: "PC" | "MO",
): Array<Record<string, string | number | null>> {
  const byDate = new Map<string, Record<string, string | number | null>>();
  for (const pt of trend) {
    const entry = byDate.get(pt.date) ?? { date: pt.date };
    entry[pt.keyword] = device === "PC" ? pt.rank_pc : pt.rank_mo;
    byDate.set(pt.date, entry);
  }
  return Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
}

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
];

// Y축 반전: 순위 1위가 상단 표시
function invertRank(value: number | null) {
  if (value === null) return null;
  return -value;
}

interface SerpRankChartProps {
  trend: SerpDataPoint[];
  keywords: SerpKeyword[];
}

export function SerpRankChart({ trend, keywords }: SerpRankChartProps) {
  const [device, setDevice] = useState<"PC" | "MO">("PC");

  const chartData = buildChartData(trend, device);

  const isEmpty = trend.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">SERP 순위 추이 (최근 30일)</CardTitle>
        <div className="flex gap-1">
          {(["PC", "MO"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                device === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-52 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">SERP 데이터 없음</p>
              <p className="mt-1 text-xs text-muted-foreground">
                김연구원(RND)이 순위 트래킹을 시작하면 여기에 표시됩니다
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 현재 순위 배지 */}
            <div className="mb-4 flex flex-wrap gap-2">
              {keywords.map((kw, i) => {
                const rank = device === "PC" ? kw.current_rank_pc : kw.current_rank_mo;
                return (
                  <Badge
                    key={kw.id}
                    variant="outline"
                    className="gap-1.5"
                    style={{ borderColor: COLORS[i % COLORS.length] + "60" }}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    {kw.keyword}
                    {rank !== null && (
                      <span className="font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                        {rank}위
                      </span>
                    )}
                  </Badge>
                );
              })}
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)} // MM-DD
                />
                <YAxis
                  reversed          // 1위가 위로
                  domain={[1, 30]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}위`}
                />
                <Tooltip
                  formatter={(value: unknown, name: string | undefined) => {
                    const rank = typeof value === "number" ? value : null;
                    const label = name ?? "";
                    return rank !== null ? [`${rank}위`, label] : ["미노출", label];
                  }}
                  labelFormatter={(label) => `📅 ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {keywords.map((kw, i) => (
                  <Line
                    key={kw.id}
                    type="monotone"
                    dataKey={kw.keyword}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-right text-xs text-muted-foreground">
              낮은 순위 = 상위 노출. 네이버 SERP 기준.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
