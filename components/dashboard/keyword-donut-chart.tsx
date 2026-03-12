"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KeywordDistribution } from "@/lib/actions/analytics-actions";

interface KeywordDonutChartProps {
  data: KeywordDistribution;
}

const COLORS = ["#7c3aed", "#3b82f6", "#f59e0b", "#6b7280"];
const LABELS = ["TOP 3위", "4~10위", "11~20위", "미노출"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value}개</p>
    </div>
  );
}

export function KeywordDonutChart({ data }: KeywordDonutChartProps) {
  const total = data.top3 + data.top4to10 + data.rank11to20 + data.notExposed;

  const chartData = [
    { name: LABELS[0], value: data.top3 },
    { name: LABELS[1], value: data.top4to10 },
    { name: LABELS[2], value: data.rank11to20 },
    { name: LABELS[3], value: data.notExposed },
  ].filter((d) => d.value > 0);

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          키워드 노출 분포
          {total > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              총 {total}개
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            SERP 수집 후 데이터가 표시됩니다
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 text-xs">
              {[
                { label: "TOP 3위", value: data.top3, color: COLORS[0] },
                { label: "4~10위", value: data.top4to10, color: COLORS[1] },
                { label: "11~20위", value: data.rank11to20, color: COLORS[2] },
                { label: "미노출", value: data.notExposed, color: COLORS[3] },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold ml-auto">{item.value}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-border/40 flex items-center gap-2">
                <span className="text-muted-foreground">노출률</span>
                <span className="font-semibold ml-auto text-emerald-600">
                  {total > 0 ? Math.round((data.top3 + data.top4to10 + data.rank11to20) / total * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
