"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Check,
  Key,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Archive,
} from "lucide-react";
import { getPortalKeywordsV2 } from "@/lib/actions/portal-actions";
import {
  approveSuggestedKeyword,
  rejectSuggestedKeyword,
} from "@/lib/actions/keyword-expansion-actions";

interface KeywordItem {
  id: string;
  keyword: string;
  status: string;
  source: string | null;
  created_at: string;
  metadata: {
    content_angle?: string;
    search_intent?: string;
    relevance?: string;
    competition_estimate?: string;
    reason?: string;
  } | null;
}

type TabType = "active" | "suggested" | "archived";

const sourceLabels: Record<string, string> = {
  manual: "수동 등록",
  niche_expansion: "AI 발굴",
  gsc_discovery: "GSC 발견",
};

export default function PortalKeywordsPage() {
  const [activeKeywords, setActiveKeywords] = useState<KeywordItem[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<KeywordItem[]>([]);
  const [archivedKeywords, setArchivedKeywords] = useState<KeywordItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [keywordStrategy, setKeywordStrategy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    if (clientId) {
      getPortalKeywordsV2(clientId).then((d) => {
        setActiveKeywords(d.activeKeywords as KeywordItem[]);
        setSuggestedKeywords(d.suggestedKeywords as KeywordItem[]);
        setArchivedKeywords(d.archivedKeywords as KeywordItem[]);
        setKeywordStrategy(d.keywordStrategy || null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (keywordId: string) => {
    setActionLoading(keywordId);
    const result = await approveSuggestedKeyword(keywordId);
    if (result.success) {
      const approved = suggestedKeywords.find((k) => k.id === keywordId);
      if (approved) {
        setSuggestedKeywords((prev) => prev.filter((k) => k.id !== keywordId));
        setActiveKeywords((prev) => [{ ...approved, status: "active" }, ...prev]);
      }
    }
    setActionLoading(null);
  };

  const handleReject = async (keywordId: string) => {
    setActionLoading(keywordId);
    const result = await rejectSuggestedKeyword(keywordId);
    if (result.success) {
      const rejected = suggestedKeywords.find((k) => k.id === keywordId);
      if (rejected) {
        setSuggestedKeywords((prev) => prev.filter((k) => k.id !== keywordId));
        setArchivedKeywords((prev) => [{ ...rejected, status: "archived" }, ...prev]);
      }
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const tabs: { key: TabType; label: string; count: number; icon: typeof Key }[] = [
    { key: "active", label: "활성 키워드", count: activeKeywords.length, icon: Key },
    { key: "suggested", label: "AI 추천", count: suggestedKeywords.length, icon: Sparkles },
    { key: "archived", label: "보관", count: archivedKeywords.length, icon: Archive },
  ];

  const currentKeywords =
    activeTab === "active"
      ? activeKeywords
      : activeTab === "suggested"
        ? suggestedKeywords
        : archivedKeywords;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">키워드 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          키워드 현황을 관리하고 AI 추천 키워드를 승인하세요
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key
                  ? tab.key === "suggested" ? "bg-violet-100 text-violet-700" : "bg-gray-200 text-gray-600"
                  : "bg-gray-200 text-gray-500"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      {activeTab === "active" && (
        <>
          {activeKeywords.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <Key className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">등록된 키워드가 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">AI 추천 탭에서 키워드를 승인하거나 매니저에게 문의하세요</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">키워드</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">소스</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {activeKeywords.map((kw) => (
                    <tr key={kw.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{kw.keyword}</span>
                      </td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">
                        <span className="text-xs text-gray-500">
                          {sourceLabels[kw.source || ""] || kw.source || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-gray-500">
                        {new Date(kw.created_at).toLocaleDateString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Suggested Tab Content */}
      {activeTab === "suggested" && (
        <>
          {suggestedKeywords.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">대기 중인 AI 추천 키워드가 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">AI가 새로운 키워드를 발굴하면 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedKeywords.map((kw) => (
                <div
                  key={kw.id}
                  className="rounded-xl border bg-white p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{kw.keyword}</p>
                      {kw.metadata?.content_angle && (
                        <p className="text-xs text-violet-600 mt-1">
                          콘텐츠 각도: {kw.metadata.content_angle}
                        </p>
                      )}
                      {kw.metadata?.search_intent && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          검색 의도: {kw.metadata.search_intent}
                        </p>
                      )}
                      {kw.metadata?.relevance && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          관련도: {kw.metadata.relevance}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApprove(kw.id)}
                        disabled={actionLoading === kw.id}
                        className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors disabled:opacity-50"
                        title="승인"
                      >
                        {actionLoading === kw.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(kw.id)}
                        disabled={actionLoading === kw.id}
                        className="h-8 w-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-50"
                        title="거절"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Archived Tab Content */}
      {activeTab === "archived" && (
        <>
          {archivedKeywords.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">보관된 키워드가 없습니다</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">키워드</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">소스</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedKeywords.map((kw) => (
                    <tr key={kw.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-gray-500">{kw.keyword}</span>
                      </td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">
                        <span className="text-xs text-gray-400">
                          {sourceLabels[kw.source || ""] || kw.source || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-gray-400">
                        {new Date(kw.created_at).toLocaleDateString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Keyword Strategy Section (only when data exists) */}
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
    </div>
  );
}
