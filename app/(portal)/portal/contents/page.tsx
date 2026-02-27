"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Calendar, Award } from "lucide-react";
import { getPortalContents } from "@/lib/actions/portal-actions";

interface ContentItem {
  id: string;
  title: string;
  keyword: string;
  publish_status: string;
  published_at: string | null;
  platform: string | null;
  qc_score: number | null;
  created_at: string;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  published: { text: "발행됨", color: "bg-emerald-100 text-emerald-700" },
  approved: { text: "승인", color: "bg-blue-100 text-blue-700" },
  review: { text: "검토 중", color: "bg-amber-100 text-amber-700" },
  draft: { text: "초안", color: "bg-gray-100 text-gray-600" },
  rejected: { text: "반려", color: "bg-red-100 text-red-700" },
};

export default function PortalContentsPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    if (clientId) {
      getPortalContents(clientId).then((d) => {
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

  const published = contents.filter((c) => c.publish_status === "published");
  const pending = contents.filter((c) => c.publish_status !== "published");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">콘텐츠 현황</h1>
        <p className="text-sm text-gray-500 mt-1">
          발행된 콘텐츠와 예정 콘텐츠를 확인하세요
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border bg-white text-center">
          <p className="text-sm text-gray-500">총 콘텐츠</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{contents.length}</p>
        </div>
        <div className="p-5 rounded-xl border bg-white text-center">
          <p className="text-sm text-gray-500">발행 완료</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{published.length}</p>
        </div>
        <div className="p-5 rounded-xl border bg-white text-center">
          <p className="text-sm text-gray-500">준비 중</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{pending.length}</p>
        </div>
      </div>

      {/* Content list */}
      {contents.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">아직 콘텐츠가 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">
            마케팅 서비스가 시작되면 여기에 콘텐츠가 표시됩니다
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contents.map((content) => {
            const status = statusLabels[content.publish_status] || statusLabels.draft;
            return (
              <div
                key={content.id}
                className="rounded-xl border bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {content.title || "제목 없음"}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {content.keyword && (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {content.keyword}
                        </span>
                      )}
                      {content.platform && (
                        <span className="capitalize">{content.platform}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {content.published_at
                          ? new Date(content.published_at).toLocaleDateString("ko-KR")
                          : new Date(content.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {content.qc_score !== null && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Award className="h-3 w-3" />
                        {content.qc_score}점
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                    >
                      {status.text}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
