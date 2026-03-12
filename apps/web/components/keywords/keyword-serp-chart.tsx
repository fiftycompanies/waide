"use client";

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
import type { SerpPoint } from "@/lib/actions/keyword-actions";

const COLORS = [
  "#7c3aed", "#059669", "#dc2626", "#d97706", "#2563eb",
  "#db2777", "#0891b2", "#65a30d", "#9333ea", "#f59e0b",
];

interface Props {
  data: SerpPoint[];
}

// (content_id, title) 목록 추출 (중복 제거)
function getContents(data: SerpPoint[]) {
  const seen = new Set<string>();
  const result: { id: string; title: string }[] = [];
  for (const p of data) {
    if (!seen.has(p.content_id)) {
      seen.add(p.content_id);
      result.push({ id: p.content_id, title: p.content_title });
    }
  }
  return result;
}

// recharts용 데이터 변환
// [{date, "콘텐츠A_PC": 3, "콘텐츠A_MO": 5, ...}]
function buildChartData(data: SerpPoint[], contents: { id: string; title: string }[]) {
  const dateMap: Record<string, Record<string, number | null>> = {};
  for (const p of data) {
    if (!dateMap[p.captured_at]) dateMap[p.captured_at] = {};
    const shortTitle = p.content_title.slice(0, 12);
    if (p.rank_pc != null) dateMap[p.captured_at][`${shortTitle}_PC`] = p.rank_pc;
    if (p.rank_mo != null) dateMap[p.captured_at][`${shortTitle}_MO`] = p.rank_mo;
  }

  return Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
}

export function KeywordSerpChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        순위 데이터가 없습니다
      </div>
    );
  }

  const contents = getContents(data);
  const chartData = buildChartData(data, contents);

  // 라인 키 목록
  const lineKeys: string[] = [];
  for (const c of contents) {
    const short = c.title.slice(0, 12);
    lineKeys.push(`${short}_PC`);
    lineKeys.push(`${short}_MO`);
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis
          reversed
          domain={[1, "dataMax+2"]}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `${v}위`}
          width={40}
        />
        <Tooltip
          formatter={(value: unknown) => [`${value}위`, undefined]}
          labelFormatter={(label: unknown) => `날짜: ${label}`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {lineKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={key.endsWith("_MO") ? 1.5 : 2}
            strokeDasharray={key.endsWith("_MO") ? "4 2" : undefined}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
