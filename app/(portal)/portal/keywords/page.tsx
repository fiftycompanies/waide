"use client";

import { useEffect, useState } from "react";
import { Key, Lightbulb, Loader2, Target, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getPortalKeywords } from "@/lib/actions/portal-actions";

interface KeywordRanking {
  keyword: string;
  rank: number | null;
  monthlySearch?: number;
}

export default function PortalKeywordsPage() {
  const [rankings, setRankings] = useState<KeywordRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [keywordStrategy, setKeywordStrategy] = useState<any>(null);

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    if (clientId) {
      getPortalKeywords(clientId).then((d) => {
        setRankings(d.keywordRankings || []);
        setAnalyzedAt(d.analyzedAt);
        setKeywordStrategy(d.keywordStrategy || null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const exposed = rankings.filter((r) => r.rank !== null);
  const top3 = exposed.filter((r) => r.rank! <= 3).length;
  const top10 = exposed.filter((r) => r.rank! <= 10).length;
  const top20 = exposed.filter((r) => r.rank! <= 20).length;
  const total = rankings.length || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">키워드 순위</h1>
        <p className="text-sm text-gray-500 mt-1">
          네이버 플레이스 검색 순위 현황
          {analyzedAt && (
            <span className="ml-2 text-gray-400">
              (마지막 분석:{" "}
              {new Date(analyzedAt).toLocaleDateString("ko-KR")})
            </span>
          )}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border bg-white text-center">
          <p className="text-sm text-gray-500">TOP 3</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{top3}개</p>
          <p className="text-xs text-gray-400 mt-1">
            {Math.round((top3 / total) * 100)}%
          </p>
        </div>
        <div className="p-5 rounded-xl border bg-white text-center">
          <p className="text-sm text-gray-500">TOP 10</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{top10}개</p>
          <p className="text-xs text-gray-400 mt-1">
            {Math.round((top10 / total) * 100)}%
          </p>
        </div>
        <div className="p-5 rounded-xl border bg-white text-center">
          <p className="text-sm text-gray-500">TOP 20</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{top20}개</p>
          <p className="text-xs text-gray-400 mt-1">
            {Math.round((top20 / total) * 100)}%
          </p>
        </div>
      </div>

      {/* Keyword Strategy Summary (only when data exists) */}
      {keywordStrategy && (
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2 text-gray-900 mb-4">
            <Target className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">키워드 전략</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {keywordStrategy.quick_win_keywords && keywordStrategy.quick_win_keywords.length > 0 && (
              <div className="rounded-lg bg-emerald-50 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Quick Win
                </p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {keywordStrategy.quick_win_keywords.slice(0, 3).map((k: any, i: number) => (
                  <p key={i} className="text-sm text-emerald-800">{k.keyword}</p>
                ))}
              </div>
            )}
            {keywordStrategy.niche_keywords && keywordStrategy.niche_keywords.length > 0 && (
              <div className="rounded-lg bg-violet-50 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-violet-700 flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />
                  니치 선점
                </p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {keywordStrategy.niche_keywords.slice(0, 3).map((k: any, i: number) => (
                  <p key={i} className="text-sm text-violet-800">{k.keyword}</p>
                ))}
              </div>
            )}
            {keywordStrategy.defense_keywords && keywordStrategy.defense_keywords.length > 0 && (
              <div className="rounded-lg bg-blue-50 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <Key className="h-3.5 w-3.5" />
                  방어 키워드
                </p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {keywordStrategy.defense_keywords.slice(0, 3).map((k: any, i: number) => (
                  <p key={i} className="text-sm text-blue-800">{k.keyword}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keywords table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-600">
                키워드
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">
                현재 순위
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">
                월간 검색량
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">
                노출 점유율
              </th>
            </tr>
          </thead>
          <tbody>
            {rankings.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center py-12 text-gray-400"
                >
                  아직 키워드 순위 데이터가 없습니다
                </td>
              </tr>
            ) : (
              rankings.map((kr, i) => {
                const visibilityScore = kr.rank
                  ? Math.max(0, Math.round(((21 - kr.rank) / 20) * 100))
                  : 0;
                return (
                  <tr
                    key={i}
                    className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {kr.keyword}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {kr.rank ? (
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            kr.rank <= 3
                              ? "text-emerald-600"
                              : kr.rank <= 10
                                ? "text-blue-600"
                                : kr.rank <= 20
                                  ? "text-amber-600"
                                  : "text-gray-500"
                          }`}
                        >
                          {kr.rank}위
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600">
                      {kr.monthlySearch
                        ? kr.monthlySearch.toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              visibilityScore >= 80
                                ? "bg-emerald-500"
                                : visibilityScore >= 50
                                  ? "bg-blue-500"
                                  : "bg-gray-400"
                            }`}
                            style={{ width: `${visibilityScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">
                          {visibilityScore}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
