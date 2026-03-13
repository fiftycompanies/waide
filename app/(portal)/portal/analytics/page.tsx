"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3,
  Loader2,
  Radio,
  TrendingUp,
} from "lucide-react";

import PortalSerpClient from "@/components/portal/portal-serp-client";

// Dynamically import the reports page content as a component
import PortalReportsContent from "./reports-content";

type TabKey = "seo" | "aeo" | "report";

export default function PortalAnalyticsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(true);

  const tabParam = searchParams.get("tab") as TabKey | null;
  const tab = tabParam && ["seo", "aeo", "report"].includes(tabParam) ? tabParam : "seo";

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const cid = el?.getAttribute("content") || "";
    setClientId(cid);
    setLoading(false);
  }, []);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "seo", label: "SEO 분석", icon: <TrendingUp className="h-4 w-4" /> },
    { key: "aeo", label: "AEO 노출", icon: <Radio className="h-4 w-4" /> },
    { key: "report", label: "월간 리포트", icon: <BarChart3 className="h-4 w-4" /> },
  ];

  const handleTabChange = (key: TabKey) => {
    router.push(`/portal/analytics?tab=${key}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">성과 분석</h1>
        <p className="text-sm text-gray-500 mt-1">SEO 순위 추이 · AEO 노출 추적 · 월간 리포트</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "seo" && clientId && (
        <PortalSerpClient clientId={clientId} />
      )}

      {tab === "aeo" && (
        <PortalAEOSection clientId={clientId} />
      )}

      {tab === "report" && (
        <PortalReportsContent />
      )}
    </div>
  );
}

// ── AEO Section (inline, uses portal-actions) ───────────────────────────
function PortalAEOSection({ clientId }: { clientId: string }) {
  const [data, setData] = useState<{
    score: number | null;
    previousScore: number | null;
    byModel: { model: string; mentions: number }[];
    topQuestions: { question: string; model: string; position: number | null }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    import("@/lib/actions/portal-actions").then((mod) => {
      // getPortalDashboardV2 includes aeoScore data
      mod.getPortalDashboardV2(clientId).then((d) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aeo = (d as any)?.aeoScore;
        setData(aeo || null);
        setLoading(false);
      });
    });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data || data.score === null) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center">
        <Radio className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">AEO 추적 데이터가 없습니다</p>
        <p className="text-xs text-gray-400 mt-1">AEO 추적이 활성화되면 AI 모델별 노출 현황이 표시됩니다</p>
      </div>
    );
  }

  const diff = data.previousScore != null ? data.score! - data.previousScore : null;

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-gray-500">AEO Visibility Score</p>
            <p className="text-4xl font-bold text-purple-600">{data.score}</p>
          </div>
          {diff !== null && diff !== 0 && (
            <div className={`flex items-center gap-1 text-sm font-medium ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}>
              <TrendingUp className={`h-4 w-4 ${diff < 0 ? "rotate-180" : ""}`} />
              {diff > 0 ? "+" : ""}{Math.round(diff * 10) / 10}
            </div>
          )}
        </div>
      </div>

      {/* Model breakdown */}
      {data.byModel.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.byModel.map((m) => (
            <div key={m.model} className="rounded-xl border bg-white p-4 text-center">
              <p className="text-xs text-gray-500">{m.model}</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{m.mentions}회</p>
              <p className="text-[10px] text-gray-400">언급 횟수</p>
            </div>
          ))}
        </div>
      )}

      {/* Top questions */}
      {data.topQuestions.length > 0 && (
        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">상위 노출 질문</h3>
          <div className="space-y-2">
            {data.topQuestions.map((q, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-700 truncate flex-1">{q.question}</span>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-xs text-gray-400">{q.model}</span>
                  {q.position && <span className="text-xs font-bold text-emerald-600">{q.position}위</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
