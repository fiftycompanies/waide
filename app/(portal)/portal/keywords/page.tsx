"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Archive,
  Check,
  Key,
  Lightbulb,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { getPortalKeywordsV2 } from "@/lib/actions/portal-actions";
import {
  approveSuggestedKeyword,
  rejectSuggestedKeyword,
} from "@/lib/actions/keyword-expansion-actions";
import { updateKeywordStatus, createKeyword } from "@/lib/actions/keyword-actions";
import { suggestKeywordsForClient } from "@/lib/actions/campaign-planning-actions";
import KeywordDetailModal from "@/components/portal/keyword-detail-modal";

interface KeywordItem {
  id: string;
  keyword: string;
  status: string;
  source: string | null;
  created_at: string;
  monthly_search_volume?: number | null;
  current_rank_naver_pc?: number | null;
  current_rank_naver_mo?: number | null;
  metadata: {
    content_angle?: string;
    search_intent?: string;
    relevance?: string;
    competition_estimate?: string;
    reason?: string;
    description?: string;
  } | null;
}

type TabType = "active" | "suggested" | "archived";

export default function PortalKeywordsPage() {
  const [activeKeywords, setActiveKeywords] = useState<KeywordItem[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<KeywordItem[]>([]);
  const [archivedKeywords, setArchivedKeywords] = useState<KeywordItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [keywordStrategy, setKeywordStrategy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const handleAddKeyword = async () => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    if (!newKeyword.trim() || !clientId) return;
    setAddingKeyword(true);
    const result = await createKeyword({
      clientId,
      keyword: newKeyword.trim(),
      platform: "naver",
      competitionLevel: "medium",
    });
    if (result.success) {
      setNewKeyword("");
      setShowAddForm(false);
      loadData();
    }
    setAddingKeyword(false);
  };

  const handleSuggestKeywords = async () => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    if (!clientId) return;
    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const result = await suggestKeywordsForClient(clientId, 5);
      if (result.success) {
        loadData();
      } else {
        setSuggestError(result.error || "AI 추천에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } catch {
      setSuggestError("AI 추천에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSuggestLoading(false);
    }
  };

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

  const handleArchive = async (keywordId: string) => {
    setActionLoading(keywordId);
    const result = await updateKeywordStatus(keywordId, "archived");
    if (result.success) {
      const archived = activeKeywords.find((k) => k.id === keywordId);
      if (archived) {
        setActiveKeywords((prev) => prev.filter((k) => k.id !== keywordId));
        setArchivedKeywords((prev) => [{ ...archived, status: "archived" }, ...prev]);
      }
    }
    setActionLoading(null);
  };

  const handleRestore = async (keywordId: string) => {
    setActionLoading(keywordId);
    const result = await updateKeywordStatus(keywordId, "active");
    if (result.success) {
      const restored = archivedKeywords.find((k) => k.id === keywordId);
      if (restored) {
        setArchivedKeywords((prev) => prev.filter((k) => k.id !== keywordId));
        setActiveKeywords((prev) => [{ ...restored, status: "active" }, ...prev]);
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">키워드 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            키워드 현황을 관리하고 AI 추천 키워드를 승인하세요
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          키워드 추가
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-xl border bg-white p-4 flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddKeyword(); }}
            placeholder="추가할 키워드 입력"
            className="flex-1 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={addingKeyword}
          />
          <button
            onClick={handleAddKeyword}
            disabled={addingKeyword || !newKeyword.trim()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {addingKeyword ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
          </button>
        </div>
      )}

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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">키워드</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600 hidden md:table-cell">월 검색량</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">순위(PC)</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">순위(MO)</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">1페이지</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeKeywords.map((kw) => {
                      const isExposed = kw.current_rank_naver_pc != null && kw.current_rank_naver_pc <= 10;
                      return (
                        <tr
                          key={kw.id}
                          className="border-b last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedKeyword(kw)}
                        >
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900">{kw.keyword}</span>
                          </td>
                          <td className="py-3 px-4 text-center hidden md:table-cell">
                            <span className="text-sm text-gray-600">
                              {kw.monthly_search_volume != null ? kw.monthly_search_volume.toLocaleString() : "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center hidden sm:table-cell">
                            <span className="text-sm text-gray-600">
                              {kw.current_rank_naver_pc != null ? `${kw.current_rank_naver_pc}위` : "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center hidden sm:table-cell">
                            <span className="text-sm text-gray-600">
                              {kw.current_rank_naver_mo != null ? `${kw.current_rank_naver_mo}위` : "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center hidden lg:table-cell">
                            {isExposed ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">노출중</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">미노출</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleArchive(kw.id); }}
                              disabled={actionLoading === kw.id}
                              className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              title="보관"
                            >
                              {actionLoading === kw.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin inline" />
                              ) : (
                                <Archive className="h-3.5 w-3.5 inline" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
              <p className="text-gray-500">아직 AI 추천 키워드가 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">활성 키워드가 3개 이상 쌓이면 자동으로 추천됩니다.</p>
              <button
                onClick={handleSuggestKeywords}
                disabled={suggestLoading}
                className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2 transition-colors"
              >
                {suggestLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI 추천 받기
                  </>
                )}
              </button>
              {suggestError && (
                <p className="text-sm text-red-500 mt-2">{suggestError}</p>
              )}
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
                      {kw.metadata?.reason && (
                        <p className="text-xs text-gray-500 mt-1">{kw.metadata.reason}</p>
                      )}
                      {kw.metadata?.description && !kw.metadata?.reason && (
                        <p className="text-xs text-gray-500 mt-1">{kw.metadata.description}</p>
                      )}
                      {kw.metadata?.content_angle && (
                        <p className="text-xs text-violet-600 mt-1">
                          콘텐츠 각도: {kw.metadata.content_angle}
                        </p>
                      )}
                      {kw.monthly_search_volume != null && (
                        <p className="text-xs text-blue-500 mt-1">
                          예상 검색량: {kw.monthly_search_volume.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApprove(kw.id)}
                        disabled={actionLoading === kw.id}
                        className="h-8 px-3 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50"
                        title="활성 키워드로 추가"
                      >
                        {actionLoading === kw.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            활성화
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(kw.id)}
                        disabled={actionLoading === kw.id}
                        className="h-8 px-3 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50"
                        title="제외"
                      >
                        <X className="h-3.5 w-3.5" />
                        제외
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
                    <th className="text-center py-3 px-4 font-medium text-gray-600">보관일</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedKeywords.map((kw) => (
                    <tr key={kw.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-gray-500">{kw.keyword}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-gray-400">
                        {new Date(kw.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRestore(kw.id)}
                          disabled={actionLoading === kw.id}
                          className="text-xs text-blue-500 hover:text-blue-600 disabled:opacity-50 flex items-center gap-1 mx-auto"
                        >
                          {actionLoading === kw.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-3.5 w-3.5" />
                              복원
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Keyword Strategy Section */}
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

      {/* Keyword Detail Modal */}
      {selectedKeyword && (
        <KeywordDetailModal
          keywordId={selectedKeyword.id}
          keywordName={selectedKeyword.keyword}
          searchVolume={selectedKeyword.monthly_search_volume ?? null}
          onClose={() => setSelectedKeyword(null)}
        />
      )}
    </div>
  );
}
