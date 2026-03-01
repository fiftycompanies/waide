"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Calendar,
  ChevronLeft,
  ExternalLink,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { getPortalContentsV2 } from "@/lib/actions/portal-actions";

interface ContentItem {
  id: string;
  title: string;
  keyword: string;
  publish_status: string;
  published_at: string | null;
  published_url: string | null;
  platform: string | null;
  qc_score: number | null;
  created_at: string;
  body: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qcResult: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rewriteHistory: any;
}

type FilterType = "all" | "draft" | "review" | "approved" | "published";

const statusLabels: Record<string, { text: string; color: string }> = {
  published: { text: "발행됨", color: "bg-emerald-100 text-emerald-700" },
  approved: { text: "검수완료", color: "bg-blue-100 text-blue-700" },
  review: { text: "검토필요", color: "bg-amber-100 text-amber-700" },
  draft: { text: "작성중", color: "bg-gray-100 text-gray-600" },
  rejected: { text: "반려", color: "bg-red-100 text-red-700" },
};

const filters: { key: FilterType; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "draft", label: "작성중" },
  { key: "review", label: "검토필요" },
  { key: "approved", label: "검수완료" },
  { key: "published", label: "발행됨" },
];

export default function PortalContentsPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    if (clientId) {
      getPortalContentsV2(clientId).then((d) => {
        setContents(d as ContentItem[]);
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

  const filtered = filter === "all"
    ? contents
    : contents.filter((c) => c.publish_status === filter);

  const countByStatus = (status: string) => contents.filter((c) => c.publish_status === status).length;

  // Detail view
  if (selectedContent) {
    const st = statusLabels[selectedContent.publish_status] || statusLabels.draft;
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedContent(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          목록으로 돌아가기
        </button>

        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{selectedContent.title || "제목 없음"}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                {selectedContent.keyword && (
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                    {selectedContent.keyword}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                  {st.text}
                </span>
                {selectedContent.platform && (
                  <span className="capitalize text-xs">{selectedContent.platform}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedContent(null)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-6 pb-4 border-b">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              작성일: {new Date(selectedContent.created_at).toLocaleDateString("ko-KR")}
            </span>
            {selectedContent.published_at && (
              <span>발행일: {new Date(selectedContent.published_at).toLocaleDateString("ko-KR")}</span>
            )}
            {selectedContent.qc_score !== null && (
              <span className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                QC {selectedContent.qc_score}점
              </span>
            )}
          </div>

          {/* Published URL */}
          {selectedContent.published_url && (
            <div className="mb-4">
              <a
                href={selectedContent.published_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                발행된 글 보기
              </a>
            </div>
          )}

          {/* Body preview */}
          {selectedContent.body ? (
            <div className="prose prose-sm max-w-none text-gray-700">
              <div
                dangerouslySetInnerHTML={{
                  __html: selectedContent.body.length > 3000
                    ? selectedContent.body.substring(0, 3000) + "..."
                    : selectedContent.body,
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">본문 내용이 없습니다</p>
          )}
        </div>

        {/* QC Result */}
        {selectedContent.qcResult && (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">QC 검수 결과</h2>
            {typeof selectedContent.qcResult === "object" && selectedContent.qcResult.items ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(selectedContent.qcResult.items as any[]).map((item: { name: string; score: number; max: number; feedback?: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (item.score / item.max) >= 0.8 ? "bg-emerald-500" :
                            (item.score / item.max) >= 0.5 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${(item.score / item.max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {item.score}/{item.max}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                QC 점수: {selectedContent.qc_score ?? "-"}점
              </p>
            )}
          </div>
        )}

        {/* Rewrite History */}
        {selectedContent.rewriteHistory && Array.isArray(selectedContent.rewriteHistory) && selectedContent.rewriteHistory.length > 0 && (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">재작성 이력</h2>
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(selectedContent.rewriteHistory as any[]).map((entry: { attempt: number; qc_score?: number; timestamp?: string }, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0 text-sm">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-medium">
                    {entry.attempt || i + 1}
                  </span>
                  <span className="text-gray-700">
                    {entry.qc_score ? `QC ${entry.qc_score}점` : "재작성"}
                  </span>
                  {entry.timestamp && (
                    <span className="text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleDateString("ko-KR")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">콘텐츠 현황</h1>
        <p className="text-sm text-gray-500 mt-1">
          발행된 콘텐츠와 예정 콘텐츠를 확인하세요
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border bg-white text-center">
          <p className="text-xs text-gray-500">전체</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{contents.length}</p>
        </div>
        <div className="p-4 rounded-xl border bg-white text-center">
          <p className="text-xs text-gray-500">발행됨</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{countByStatus("published")}</p>
        </div>
        <div className="p-4 rounded-xl border bg-white text-center">
          <p className="text-xs text-gray-500">검수완료</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{countByStatus("approved")}</p>
        </div>
        <div className="p-4 rounded-xl border bg-white text-center">
          <p className="text-xs text-gray-500">작성중</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{countByStatus("draft") + countByStatus("review")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {filter === "all" ? "아직 콘텐츠가 없습니다" : `${filters.find(f => f.key === filter)?.label} 상태의 콘텐츠가 없습니다`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            마케팅 서비스가 시작되면 여기에 콘텐츠가 표시됩니다
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">제목</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">키워드</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">상태</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600 hidden md:table-cell">QC</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600 hidden md:table-cell">날짜</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">URL</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((content) => {
                const st = statusLabels[content.publish_status] || statusLabels.draft;
                return (
                  <tr
                    key={content.id}
                    onClick={() => setSelectedContent(content)}
                    className="border-b last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-[300px]">
                        {content.title || "제목 없음"}
                      </p>
                      <p className="text-xs text-gray-400 sm:hidden mt-0.5">
                        {content.keyword}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <span className="text-xs text-gray-500">{content.keyword || "-"}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.text}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center hidden md:table-cell">
                      {content.qc_score !== null ? (
                        <span className={`text-xs font-medium ${
                          content.qc_score >= 70 ? "text-emerald-600" : "text-amber-600"
                        }`}>
                          {content.qc_score}점
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-gray-500 hidden md:table-cell">
                      {content.published_at
                        ? new Date(content.published_at).toLocaleDateString("ko-KR")
                        : new Date(content.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="py-3 px-4 text-center hidden lg:table-cell">
                      {content.published_url ? (
                        <a
                          href={content.published_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5 inline" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
