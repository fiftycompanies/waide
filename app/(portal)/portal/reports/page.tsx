"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart2,
  Calendar,
  Download,
  FileText,
  Key,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ContentsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const [y, m] = (label as string).split("-");
  return (
    <div className="bg-white border rounded-lg shadow-sm px-3 py-2 text-sm">
      <p className="text-gray-500 text-xs mb-1">{y}년 {parseInt(m)}월</p>
      <p className="font-medium text-gray-900">{payload[0].value}건</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function KeywordsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const [y, m] = (label as string).split("-");
  return (
    <div className="bg-white border rounded-lg shadow-sm px-3 py-2 text-sm">
      <p className="text-gray-500 text-xs mb-1">{y}년 {parseInt(m)}월</p>
      <p className="font-medium text-gray-900">{payload[0].value}개 활성 키워드</p>
    </div>
  );
}
import { getPortalReportV2 } from "@/lib/actions/portal-actions";

interface ReportData {
  selectedMonth: { year: number; month: number };
  summary: {
    monthlyContents: number;
    newKeywords: number;
    agentExecutions: number;
  };
  contentsTrend: { month: string; count: number }[];
  keywordsTrend: { month: string; count: number }[];
  serpRankings: { keyword: string; rank: number; rank_google?: number | null; device: string; checked_at: string }[];
  agentTypeCounts: Record<string, number>;
  analyses: Array<{
    id: string;
    marketing_score: number;
    analyzed_at: string;
    content_strategy: { improvements?: string[] } | null;
  }>;
}

function formatMonth(monthStr: string): string {
  const [y, m] = monthStr.split("-");
  return `${parseInt(m)}월`;
}

export default function PortalReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const loadData = (year: number, month: number) => {
    setLoading(true);
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    if (clientId) {
      getPortalReportV2(clientId, year, month).then((d) => {
        setData(d as ReportData);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedYear, selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [y, m] = e.target.value.split("-").map(Number);
    setSelectedYear(y);
    setSelectedMonth(m);
    loadData(y, m);
  };

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
      options.push({ value, label });
    }
    return options;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center">
        <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  const agentNames: Record<string, string> = {
    CMO: "CMO (전략)",
    RND: "RND (분석)",
    COPYWRITER: "COPYWRITER (작성)",
    QC: "QC (검수)",
    ANALYST: "ANALYST (분석봇)",
    PUBLISHER: "PUBLISHER (발행)",
  };

  const totalAgentRuns = Object.values(data.agentTypeCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">월간 리포트</h1>
          <p className="text-sm text-gray-500 mt-1">마케팅 성과를 확인하세요</p>
        </div>
        <div className="flex items-center gap-2">
          {/* PDF Download */}
          <button
            onClick={() => {
              window.open(`/api/portal/report-pdf?month=${selectedYear}-${String(selectedMonth).padStart(2, "0")}`, "_blank");
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">PDF 다운로드</span>
          </button>
          {/* Month selector */}
          <select
          value={`${selectedYear}-${selectedMonth}`}
          onChange={handleMonthChange}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        </div>
      </div>

      {/* Section 1: Monthly Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border bg-white text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-500 text-sm mb-2">
            <FileText className="h-4 w-4 text-purple-500" />
            발행 콘텐츠
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.summary.monthlyContents}</p>
          <p className="text-xs text-gray-400 mt-1">이번 달</p>
        </div>
        <div className="p-5 rounded-xl border bg-white text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-500 text-sm mb-2">
            <Key className="h-4 w-4 text-emerald-500" />
            신규 키워드
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.summary.newKeywords}</p>
          <p className="text-xs text-gray-400 mt-1">이번 달 추가</p>
        </div>
        <div className="p-5 rounded-xl border bg-white text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-500 text-sm mb-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            AI 실행
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.summary.agentExecutions}</p>
          <p className="text-xs text-gray-400 mt-1">에이전트 실행</p>
        </div>
      </div>

      {/* Section 2: Contents Trend Chart */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">콘텐츠 발행 추이</h2>
        {data.contentsTrend.every((d) => d.count === 0) ? (
          <p className="text-sm text-gray-400 text-center py-8">아직 콘텐츠 발행 데이터가 없습니다</p>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.contentsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <Tooltip content={<ContentsTooltip />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Section 3: Keywords Growth Trend */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">키워드 성장 추이</h2>
        {data.keywordsTrend.every((d) => d.count === 0) ? (
          <p className="text-sm text-gray-400 text-center py-8">아직 키워드 데이터가 없습니다</p>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.keywordsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <Tooltip content={<KeywordsTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Section 4: Ranking Status */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center gap-2 text-gray-900 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">순위 현황</h2>
        </div>
        {data.serpRankings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">순위 추적 준비 중입니다</p>
            <p className="text-xs text-gray-300 mt-1">곧 업데이트됩니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">키워드</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">네이버</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">구글</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600 hidden sm:table-cell">확인일</th>
                </tr>
              </thead>
              <tbody>
                {data.serpRankings.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-3 text-gray-900">{r.keyword}</td>
                    <td className="py-2 px-3 text-center">
                      {r.rank > 0 ? (
                        <span className={`font-bold ${
                          r.rank <= 3 ? "text-emerald-600" :
                          r.rank <= 10 ? "text-blue-600" :
                          r.rank <= 20 ? "text-amber-600" : "text-gray-400"
                        }`}>
                          {r.rank}위
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {r.rank_google != null ? (
                        <span className={`font-bold ${
                          r.rank_google <= 3 ? "text-emerald-600" :
                          r.rank_google <= 10 ? "text-blue-600" :
                          r.rank_google <= 20 ? "text-amber-600" : "text-gray-400"
                        }`}>
                          {r.rank_google}위
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center text-xs text-gray-400 hidden sm:table-cell">
                      {new Date(r.checked_at).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 5: AI Activity Log Summary */}
      {totalAgentRuns > 0 && (
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2 text-gray-900 mb-4">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <h2 className="text-lg font-semibold">AI 활동 요약</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(data.agentTypeCounts).map(([type, count]) => (
              <div key={type} className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">{agentNames[type] || type}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{count}회</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Marketing Score Trend */}
      {data.analyses.length > 0 && (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">마케팅 점수 변화</h2>
          <div className="flex items-end gap-8">
            <div>
              <p className="text-sm text-gray-500">현재</p>
              <p className="text-4xl font-bold text-gray-900">
                {data.analyses[0].marketing_score}
              </p>
            </div>
            {data.analyses[1] && (
              <div>
                <p className="text-sm text-gray-500">이전</p>
                <p className="text-2xl font-medium text-gray-400">
                  {data.analyses[1].marketing_score}
                </p>
              </div>
            )}
            {data.analyses[1] && (() => {
              const diff = data.analyses[0].marketing_score - data.analyses[1].marketing_score;
              if (diff === 0) return null;
              return (
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  diff > 0 ? "text-emerald-600" : "text-red-500"
                }`}>
                  <TrendingUp className={`h-4 w-4 ${diff < 0 ? "rotate-180" : ""}`} />
                  {diff > 0 ? "+" : ""}{diff}점
                </div>
              );
            })()}
          </div>

          {data.analyses.length > 1 && (
            <div className="mt-6 flex items-end gap-2 h-24">
              {data.analyses.slice().reverse().map((a) => (
                <div key={a.id} className="flex flex-col items-center flex-1">
                  <span className="text-xs text-gray-500 mb-1">
                    {a.marketing_score}
                  </span>
                  <div
                    className="w-full bg-emerald-500 rounded-t"
                    style={{ height: `${Math.max(8, a.marketing_score)}%` }}
                  />
                  <span className="text-[10px] text-gray-400 mt-1">
                    {new Date(a.analyzed_at).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
