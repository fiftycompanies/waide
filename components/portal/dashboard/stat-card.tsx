"use client";

import { useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, X } from "lucide-react";

interface HistoryPoint {
  date: string;
  value: number | null;
}

interface Props {
  title: string;
  currentValue: number | null;
  previousValue: number | null;
  history: HistoryPoint[];
  fullHistory: HistoryPoint[];
  unit?: string;
  color?: string;
}

export default function StatCard({
  title,
  currentValue,
  previousValue,
  history,
  fullHistory,
  unit = "",
  color = "#10b981",
}: Props) {
  const [showModal, setShowModal] = useState(false);

  const delta =
    currentValue != null && previousValue != null
      ? currentValue - previousValue
      : null;
  const gradId = `stat-${title.replace(/\s+/g, "")}`;
  const gradIdFull = `stat-full-${title.replace(/\s+/g, "")}`;

  const chartData = history
    .filter((p) => p.value != null)
    .map((p) => ({ d: p.date.slice(5), v: p.value! }));
  const fullData = fullHistory
    .filter((p) => p.value != null)
    .map((p) => ({ d: p.date.slice(5), v: p.value! }));

  return (
    <>
      <div className="rounded-xl border bg-white p-4 min-h-[140px] flex flex-col">
        <p className="text-xs text-gray-500 font-medium mb-1">{title}</p>
        <div className="flex items-end gap-2">
          {currentValue != null ? (
            <>
              <span className="text-2xl font-bold text-gray-900">
                {currentValue.toLocaleString()}
                {unit}
              </span>
              {delta != null && delta !== 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium mb-0.5 ${
                    delta > 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {delta > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {delta > 0 ? "+" : ""}
                  {delta}
                </span>
              )}
            </>
          ) : (
            <span className="text-2xl font-bold text-gray-200">—</span>
          )}
        </div>

        {/* Mini Chart */}
        <div className="flex-1 mt-2 min-h-[40px]">
          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#${gradId})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[10px] text-gray-300 text-center pt-3">
              데이터 수집 중
            </p>
          )}
        </div>

        {fullHistory.length > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="mt-1 text-[10px] text-gray-400 hover:text-gray-600 self-end"
          >
            30일 보기 →
          </button>
        )}
      </div>

      {/* 30-Day Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl p-5 mx-4 w-full max-w-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                {title} — 30일 추이
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            {fullData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={fullData}>
                  <defs>
                    <linearGradient
                      id={gradIdFull}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop
                        offset="100%"
                        stopColor={color}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="d"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    labelFormatter={(v) => String(v)}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [
                      `${Number(v).toLocaleString()}${unit}`,
                      title,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#${gradIdFull})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">
                데이터가 충분하지 않습니다
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
