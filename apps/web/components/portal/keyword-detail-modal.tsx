"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, X } from "lucide-react";
import { getSerpByKeyword, getContentsByKeyword } from "@/lib/actions/keyword-actions";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface KeywordDetailModalProps {
  keywordId: string;
  keywordName: string;
  searchVolume: number | null;
  onClose: () => void;
}

interface SerpPoint {
  captured_at: string;
  content_id: string;
  content_title: string;
  rank_pc: number | null;
  rank_mo: number | null;
}

interface KeywordContent {
  id: string;
  title: string;
  publish_status: string;
  published_at: string | null;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  published: { text: "발행됨", color: "bg-emerald-100 text-emerald-700" },
  approved: { text: "승인됨", color: "bg-blue-100 text-blue-700" },
  review: { text: "검토중", color: "bg-amber-100 text-amber-700" },
  draft: { text: "작성중", color: "bg-gray-100 text-gray-600" },
  rejected: { text: "반려", color: "bg-red-100 text-red-700" },
};

export default function KeywordDetailModal({ keywordId, keywordName, searchVolume, onClose }: KeywordDetailModalProps) {
  const [serpData, setSerpData] = useState<SerpPoint[]>([]);
  const [contents, setContents] = useState<KeywordContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSerpByKeyword(keywordId),
      getContentsByKeyword(keywordId),
    ]).then(([serp, cont]) => {
      setSerpData(serp as unknown as SerpPoint[]);
      setContents(cont as unknown as KeywordContent[]);
      setLoading(false);
    });
  }, [keywordId]);

  // 차트 데이터: rank를 역전 (1위가 위에 오도록)
  const chartData = serpData.map((p) => ({
    date: new Date(p.captured_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    PC: p.rank_pc,
    MO: p.rank_mo,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{keywordName}</h2>
            {searchVolume != null && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                월 검색량 {searchVolume.toLocaleString()}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              {/* SERP 순위 추이 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">순위 추이</h3>
                {chartData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis reversed domain={[1, "auto"]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="PC" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="MO" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">순위 데이터가 아직 수집되지 않았습니다</p>
                )}
              </div>

              {/* 키워드 관련 콘텐츠 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  발행 콘텐츠 ({contents.length}건)
                </h3>
                {contents.length > 0 ? (
                  <div className="space-y-2">
                    {contents.map((c) => {
                      const st = statusLabels[c.publish_status] || statusLabels.draft;
                      return (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                          <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{c.title || "제목 없음"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${st.color}`}>
                                {st.text}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(c.published_at || c.created_at).toLocaleDateString("ko-KR")}
                              </span>
                            </div>
                          </div>
                          {c.published_url && (
                            <a
                              href={c.published_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">이 키워드로 발행된 콘텐츠가 없습니다</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
