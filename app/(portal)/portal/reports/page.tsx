"use client";

import { useEffect, useState } from "react";
import { BarChart2, FileText, Loader2, TrendingUp } from "lucide-react";
import { getPortalReport } from "@/lib/actions/portal-actions";

interface ReportData {
  analyses: Array<{
    id: string;
    marketing_score: number;
    analyzed_at: string;
    content_strategy: { improvements?: string[] } | null;
  }>;
  contents: Array<{
    id: string;
    title: string;
    keyword: string;
    published_at: string;
    qc_score: number | null;
  }>;
}

export default function PortalReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    if (clientId) {
      getPortalReport(clientId).then((d) => {
        setData(d as ReportData);
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

  const latest = data?.analyses?.[0];
  const previous = data?.analyses?.[1];
  const scoreDiff = latest && previous ? latest.marketing_score - previous.marketing_score : 0;
  const improvements = (latest?.content_strategy?.improvements ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">리포트</h1>
        <p className="text-sm text-gray-500 mt-1">마케팅 성과를 확인하세요</p>
      </div>

      {!latest ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">아직 리포트 데이터가 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">
            분석이 완료되면 여기에 리포트가 표시됩니다
          </p>
        </div>
      ) : (
        <>
          {/* Score trend */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              마케팅 점수 변화
            </h2>
            <div className="flex items-end gap-8">
              <div>
                <p className="text-sm text-gray-500">현재</p>
                <p className="text-4xl font-bold text-gray-900">
                  {latest.marketing_score}
                </p>
              </div>
              {previous && (
                <div>
                  <p className="text-sm text-gray-500">이전</p>
                  <p className="text-2xl font-medium text-gray-400">
                    {previous.marketing_score}
                  </p>
                </div>
              )}
              {scoreDiff !== 0 && (
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    scoreDiff > 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  <TrendingUp
                    className={`h-4 w-4 ${scoreDiff < 0 ? "rotate-180" : ""}`}
                  />
                  {scoreDiff > 0 ? "+" : ""}
                  {scoreDiff}점
                </div>
              )}
            </div>

            {/* Score history */}
            {data!.analyses.length > 1 && (
              <div className="mt-6 flex items-end gap-2 h-24">
                {data!.analyses
                  .slice()
                  .reverse()
                  .map((a, i) => (
                    <div key={a.id} className="flex flex-col items-center flex-1">
                      <span className="text-xs text-gray-500 mb-1">
                        {a.marketing_score}
                      </span>
                      <div
                        className="w-full bg-emerald-500 rounded-t"
                        style={{
                          height: `${Math.max(8, a.marketing_score)}%`,
                        }}
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

          {/* Improvements */}
          {improvements.length > 0 && (
            <div className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                개선 제안
              </h2>
              <ul className="space-y-2">
                {improvements.map((imp, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-gray-700 py-2 border-b last:border-0"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent contents */}
          {data!.contents.length > 0 && (
            <div className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                최근 발행 콘텐츠
              </h2>
              <div className="space-y-2">
                {data!.contents.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 truncate">{c.title}</p>
                      <p className="text-xs text-gray-400">
                        {c.keyword} ·{" "}
                        {new Date(c.published_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    {c.qc_score !== null && (
                      <span className="text-xs text-gray-500 shrink-0 ml-2">
                        QC {c.qc_score}점
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
