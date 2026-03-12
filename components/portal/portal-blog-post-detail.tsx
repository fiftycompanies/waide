"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Calendar,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  EyeOff,
  Globe,
  Lightbulb,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { createAdminClient } from "@/lib/supabase/service";
import { getPublications, type Publication } from "@/lib/actions/publish-actions";

interface ContentDetail {
  id: string;
  title: string;
  body: string | null;
  publish_status: string;
  published_at: string | null;
  published_url: string | null;
  platform: string | null;
  created_at: string;
  keyword_id: string | null;
  keyword_name: string | null;
  current_rank_naver_pc: number | null;
}

interface Props {
  contentId: string;
  clientId: string;
}

const platformLabel: Record<string, string> = {
  tistory: "Tistory",
  wordpress: "WordPress",
  medium: "Medium",
  naver: "Naver",
};

interface RankPoint {
  date: string;
  rank: number | null;
}

export default function PortalBlogPostDetail({ contentId, clientId }: Props) {
  const router = useRouter();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [rankHistory, setRankHistory] = useState<RankPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("contents")
          .select("id, title, body, publish_status, published_at, published_url, platform, created_at, keyword_id")
          .eq("id", contentId)
          .single();

        if (data) {
          let keywordName: string | null = null;
          let rankPc: number | null = null;
          if (data.keyword_id) {
            const { data: kw } = await supabase
              .from("keywords")
              .select("keyword, current_rank_naver_pc")
              .eq("id", data.keyword_id)
              .single();
            if (kw) {
              keywordName = kw.keyword;
              rankPc = kw.current_rank_naver_pc;
            }
          }

          setContent({
            ...data,
            keyword_name: keywordName,
            current_rank_naver_pc: rankPc,
          });
        }

        const pubs = await getPublications({ clientId });
        setPublications(pubs.filter(p => p.content_id === contentId));

        // Phase 4: 발행 후 순위 추이 조회
        if (data?.keyword_id && data?.published_at) {
          const { data: serpData } = await supabase
            .from("keyword_visibility")
            .select("date, rank_pc")
            .eq("keyword_id", data.keyword_id)
            .eq("client_id", clientId)
            .gte("date", data.published_at.slice(0, 10))
            .order("date", { ascending: true })
            .limit(60);

          if (serpData && serpData.length > 0) {
            setRankHistory(
              serpData.map((s: { date: string; rank_pc: number | null }) => ({
                date: s.date,
                rank: s.rank_pc,
              }))
            );
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [contentId, clientId]);

  const handleCopyUrl = async () => {
    if (!content?.published_url) return;
    await navigator.clipboard.writeText(content.published_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHide = async () => {
    setHiding(true);
    const supabase = createAdminClient();
    await supabase
      .from("contents")
      .update({ publish_status: "archived" })
      .eq("id", contentId);
    router.push("/portal/blog");
  };

  const loadInsight = async () => {
    if (!content || insightLoading || insight) return;
    if (!content.published_at) return;

    const daysElapsed = Math.floor(
      (Date.now() - new Date(content.published_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysElapsed < 7) return;

    setInsightLoading(true);
    try {
      const res = await fetch("/api/portal/post-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: content.id,
          keyword: content.keyword_name || "",
          publishedAt: content.published_at,
          currentRank: content.current_rank_naver_pc,
          daysElapsed,
        }),
      });
      const data = await res.json();
      if (data.insight) setInsight(data.insight);
    } catch {
      // silently fail
    } finally {
      setInsightLoading(false);
    }
  };

  // Auto-load insight for published content with 7+ days elapsed
  useEffect(() => {
    if (content?.published_at) {
      const days = Math.floor(
        (Date.now() - new Date(content.published_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days >= 7) loadInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">콘텐츠를 찾을 수 없습니다</p>
        <button onClick={() => router.push("/portal/blog")} className="mt-4 text-emerald-600 text-sm font-medium hover:underline">
          블로그 목록으로 돌아가기
        </button>
      </div>
    );
  }

  // Extract preview (first 500 chars)
  const bodyPreview = content.body
    ? content.body.replace(/[#*_~`>|-]/g, "").slice(0, 500) + (content.body.length > 500 ? "..." : "")
    : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/portal/blog")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        블로그 목록
      </button>

      {/* Header */}
      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-3">{content.title || "제목 없음"}</h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
          {content.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(content.published_at).toLocaleDateString("ko-KR")}
            </span>
          )}
          {content.platform && (
            <span className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              {platformLabel[content.platform] || content.platform}
            </span>
          )}
          {content.keyword_name && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
              {content.keyword_name}
            </span>
          )}
          {content.current_rank_naver_pc != null && (
            <span className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              네이버 {content.current_rank_naver_pc}위
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {content.published_url && (
            <a
              href={content.published_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              원문 보기
            </a>
          )}
          <button
            onClick={() => router.push(`/portal/blog/write?post_id=${content.id}&mode=edit`)}
            className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="h-4 w-4" />
            수정
          </button>
          {content.published_url && (
            <button
              onClick={handleCopyUrl}
              className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "복사됨" : "URL 복사"}
            </button>
          )}
          <button
            onClick={() => router.push(`/portal/blog/write?post_id=${content.id}&mode=enhance`)}
            className="px-4 py-2 rounded-lg border text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
          >
            <Bot className="h-4 w-4" />
            AI 보완 작성
          </button>
          <button
            onClick={handleHide}
            disabled={hiding}
            className="px-4 py-2 rounded-lg border text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {hiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
            숨기기
          </button>
        </div>
      </div>

      {/* Phase 4: Rank trend chart */}
      {rankHistory.length > 0 && content.published_at && (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">발행 후 순위 추이</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={rankHistory} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                reversed
                domain={[1, (dataMax: number) => Math.max(dataMax, 50)]}
                tick={{ fontSize: 11 }}
                label={{ value: "순위", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number | undefined) => [`${value ?? "-"}위`, "순위"]}
                labelFormatter={(label: unknown) => `날짜: ${label}`}
              />
              <ReferenceLine
                x={content.published_at.slice(0, 10)}
                stroke="#10b981"
                strokeDasharray="5 5"
                label={{ value: "발행일", position: "top", fill: "#10b981", fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="rank"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Phase 4: AI Insight */}
      {(insight || insightLoading) && (
        <div className="rounded-xl border bg-gradient-to-r from-purple-50 to-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Lightbulb className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">AI 인사이트</h3>
              {insightLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  분석 중...
                </div>
              ) : (
                <p className="text-sm text-gray-600">{insight}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Body preview */}
      {bodyPreview && (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">본문 미리보기</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{bodyPreview}</p>
        </div>
      )}

      {/* Publication history */}
      {publications.length > 0 && (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">발행 이력</h2>
          <div className="space-y-2">
            {publications.map(pub => (
              <div key={pub.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{platformLabel[pub.platform] || pub.platform}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    pub.status === "published" ? "bg-emerald-100 text-emerald-700" :
                    pub.status === "failed" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {pub.status === "published" ? "발행됨" : pub.status === "failed" ? "실패" : pub.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {pub.published_at ? new Date(pub.published_at).toLocaleString("ko-KR") : "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
