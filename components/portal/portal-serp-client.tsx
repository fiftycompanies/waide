"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Loader2,
  Minus,
  PenLine,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { getPortalSerpPage } from "@/lib/actions/portal-actions";
import { createKeyword, updateKeywordStatus } from "@/lib/actions/keyword-actions";
import { getSerpByKeyword } from "@/lib/actions/keyword-actions";

interface SerpKeyword {
  id: string;
  keyword: string;
  platform: "naver" | "google";
  currentRank: number | null;
  rankGoogle: number | null;
  rankChange: number | null;
  sparkline: number[];
  publishedUrl: string | null;
  statusBadge: "top" | "mid" | "danger" | "invisible";
  lastPublishedAt: string | null;
}

interface Props {
  clientId: string;
}

type PlatformFilter = "all" | "naver" | "google";
type StatusFilter = "all" | "top" | "mid" | "danger" | "invisible";

// Mini sparkline SVG component
function MiniSparkline({ data, className }: { data: number[]; className?: string }) {
  const width = 80;
  const height = 24;
  const padding = 2;
  const validData = data.filter((d) => d > 0);
  if (validData.length < 2) {
    return <span className="text-xs text-gray-300">-</span>;
  }

  const maxVal = Math.max(...validData, 1);
  const minVal = Math.min(...validData);
  const range = maxVal - minVal || 1;

  const points = data
    .map((val, i) => {
      if (val <= 0) return null;
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      // Y axis inverted (lower rank = higher on chart)
      const y = padding + ((val - minVal) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  const lastVal = data[data.length - 1];
  const prevVal = data.length >= 2 ? data[data.length - 2] : lastVal;
  const isImproving = lastVal > 0 && prevVal > 0 && lastVal < prevVal;
  const color = isImproving ? "#059669" : lastVal < prevVal ? "#dc2626" : "#6b7280";

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

export default function PortalSerpClient({ clientId }: Props) {
  const [keywords, setKeywords] = useState<SerpKeyword[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
  const [criticalKeywordId, setCriticalKeywordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Expanded row for 30-day chart
  const [expandedKeywordId, setExpandedKeywordId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Add keyword modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dismiss missing banner
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const loadData = useCallback(async () => {
    const data = await getPortalSerpPage(clientId);
    setKeywords(data.keywords);
    setMissingKeywords(data.missingKeywords);
    setCriticalKeywordId(data.criticalKeywordId);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExpandRow = async (keywordId: string) => {
    if (expandedKeywordId === keywordId) {
      setExpandedKeywordId(null);
      return;
    }
    setExpandedKeywordId(keywordId);
    setChartLoading(true);
    const data = await getSerpByKeyword(keywordId);
    setChartData(data);
    setChartLoading(false);
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;
    setAddingKeyword(true);
    await createKeyword({
      clientId,
      keyword: newKeyword.trim(),
      platform: "naver",
      competitionLevel: "medium",
    });
    setNewKeyword("");
    setShowAddModal(false);
    setAddingKeyword(false);
    loadData();
  };

  const handleArchiveKeyword = async (keywordId: string) => {
    setDeletingId(keywordId);
    await updateKeywordStatus(keywordId, "archived");
    setDeletingId(null);
    loadData();
  };

  // Filter keywords
  const filtered = keywords.filter((kw) => {
    if (statusFilter !== "all" && kw.statusBadge !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const statusBadgeStyle = (badge: string) => {
    switch (badge) {
      case "top": return "bg-emerald-100 text-emerald-700";
      case "mid": return "bg-blue-100 text-blue-700";
      case "danger": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  const statusBadgeLabel = (badge: string) => {
    switch (badge) {
      case "top": return "상위";
      case "mid": return "중위";
      case "danger": return "위험";
      default: return "미노출";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SERP 트래킹</h1>
          <p className="text-sm text-gray-500 mt-1">
            키워드별 검색 순위를 추적하고 관리하세요
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          키워드 추가
        </button>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        {/* Platform tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "naver", "google"] as PlatformFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                platformFilter === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "all" ? "전체" : p === "naver" ? "네이버" : "구글"}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "top", "mid", "danger", "invisible"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s === "all" ? "전체" : statusBadgeLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Missing keywords banner */}
      {missingKeywords.length > 0 && !dismissedBanner && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">
                {missingKeywords.length}개 키워드가 미노출 상태입니다
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                {missingKeywords.slice(0, 3).join(", ")}
                {missingKeywords.length > 3 ? ` 외 ${missingKeywords.length - 3}개` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {criticalKeywordId && (
              <a
                href={`/portal/blog/write?keyword_id=${criticalKeywordId}&from=serp_alert`}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700"
              >
                지금 발행하기
              </a>
            )}
            <button onClick={() => setDismissedBanner(true)} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Keyword table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">추적 중인 키워드가 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">키워드를 추가하여 순위 추적을 시작하세요</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">키워드</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">네이버</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">구글</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 hidden md:table-cell">변화</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">7일 추이</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">상태</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 hidden md:table-cell">최근 발행</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((kw) => (
                  <>
                    <tr
                      key={kw.id}
                      className="border-b last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleExpandRow(kw.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{kw.keyword}</span>
                          {kw.publishedUrl && (
                            <a
                              href={kw.publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-emerald-600"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">
                        <span className="text-sm text-gray-700">
                          {kw.currentRank != null ? `${kw.currentRank}위` : "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">
                        <span className="text-sm text-gray-700">
                          {kw.rankGoogle != null ? `${kw.rankGoogle}위` : "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center hidden md:table-cell">
                        {kw.rankChange != null ? (
                          <span className={`flex items-center justify-center gap-0.5 text-xs font-medium ${
                            kw.rankChange > 0 ? "text-emerald-600" : kw.rankChange < 0 ? "text-red-600" : "text-gray-400"
                          }`}>
                            {kw.rankChange > 0 ? <ArrowUp className="h-3 w-3" /> : kw.rankChange < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {Math.abs(kw.rankChange)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center hidden lg:table-cell">
                        <MiniSparkline data={kw.sparkline} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadgeStyle(kw.statusBadge)}`}>
                          {statusBadgeLabel(kw.statusBadge)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center hidden md:table-cell">
                        <span className="text-xs text-gray-400">
                          {kw.lastPublishedAt ? new Date(kw.lastPublishedAt).toLocaleDateString("ko-KR") : "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={`/portal/blog/write?keyword_id=${kw.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
                            title="콘텐츠 발행"
                          >
                            <PenLine className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleArchiveKeyword(kw.id); }}
                            disabled={deletingId === kw.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-50"
                            title="삭제"
                          >
                            {deletingId === kw.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleExpandRow(kw.id); }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                            title="30일 추이"
                          >
                            {expandedKeywordId === kw.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* 30-day chart expand */}
                    {expandedKeywordId === kw.id && (
                      <tr key={`${kw.id}-chart`}>
                        <td colSpan={8} className="px-4 py-4 bg-gray-50 border-b">
                          {chartLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            </div>
                          ) : chartData.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">아직 순위 데이터가 없습니다</p>
                          ) : (
                            <div className="space-y-2">
                              <h3 className="text-sm font-medium text-gray-700">30일 순위 추이 — {kw.keyword}</h3>
                              <SerpChart data={chartData} />
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add keyword modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">키워드 추가</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">키워드</label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddKeyword(); }}
                  placeholder="추적할 키워드 입력"
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={addingKeyword}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleAddKeyword}
                  disabled={addingKeyword || !newKeyword.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {addingKeyword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 30-day chart (simple SVG implementation)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SerpChart({ data }: { data: any[] }) {
  const width = 600;
  const height = 160;
  const padding = { top: 20, right: 40, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Sort by date, take last 30
  const sorted = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30);

  if (sorted.length < 2) {
    return <p className="text-sm text-gray-400 text-center py-4">데이터가 부족합니다</p>;
  }

  const ranks = sorted.map((d) => d.rank ?? 0).filter((r) => r > 0);
  if (ranks.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">순위 데이터가 없습니다</p>;
  }

  const maxRank = Math.max(...ranks, 50);
  const minRank = Math.min(...ranks, 1);

  const getX = (i: number) => padding.left + (i / (sorted.length - 1)) * chartW;
  // Y inverted: rank 1 at top, maxRank at bottom
  const getY = (rank: number) => {
    if (rank <= 0) return padding.top + chartH;
    return padding.top + ((rank - minRank) / (maxRank - minRank)) * chartH;
  };

  const points = sorted
    .map((d, i) => {
      const rank = d.rank;
      if (!rank || rank <= 0) return null;
      return `${getX(i)},${getY(rank)}`;
    })
    .filter(Boolean)
    .join(" ");

  // Grid lines
  const gridRanks = [1, 10, 20, 30, 50].filter((r) => r >= minRank && r <= maxRank);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[600px]">
      {/* Grid lines */}
      {gridRanks.map((r) => (
        <g key={r}>
          <line
            x1={padding.left}
            y1={getY(r)}
            x2={width - padding.right}
            y2={getY(r)}
            stroke="#e5e7eb"
            strokeDasharray="4,4"
          />
          <text x={padding.left - 8} y={getY(r) + 4} textAnchor="end" className="text-[10px] fill-gray-400">
            {r}위
          </text>
        </g>
      ))}

      {/* Date labels */}
      {sorted.filter((_, i) => i % Math.max(1, Math.floor(sorted.length / 5)) === 0).map((d, i, arr) => {
        const idx = sorted.indexOf(d);
        const date = new Date(d.date);
        return (
          <text
            key={i}
            x={getX(idx)}
            y={height - 5}
            textAnchor="middle"
            className="text-[10px] fill-gray-400"
          >
            {`${date.getMonth() + 1}/${date.getDate()}`}
          </text>
        );
      })}

      {/* Line */}
      <polyline
        fill="none"
        stroke="#059669"
        strokeWidth="2"
        points={points}
      />

      {/* Dots */}
      {sorted.map((d, i) => {
        const rank = d.rank;
        if (!rank || rank <= 0) return null;
        return (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(rank)}
            r="3"
            fill="white"
            stroke="#059669"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Publish markers */}
      {sorted.map((d, i) => {
        if (!d.publishedAt) return null;
        return (
          <text
            key={`pub-${i}`}
            x={getX(i)}
            y={padding.top - 5}
            textAnchor="middle"
            className="text-[10px]"
          >
            📝
          </text>
        );
      })}
    </svg>
  );
}
