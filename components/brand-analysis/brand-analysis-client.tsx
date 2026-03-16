"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Microscope,
  PenLine,
  Play,
  RefreshCw,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBrandAnalysis,
  refreshBrandAnalysis,
  runBrandAnalysis,
  getAnalysisStatus,
  type BrandAnalysisRow,
} from "@/lib/actions/analysis-brand-actions";

interface BrandAnalysisClientProps {
  clientId: string;
}

export default function BrandAnalysisClient({ clientId }: BrandAnalysisClientProps) {
  const router = useRouter();
  const [data, setData] = useState<BrandAnalysisRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newAnalysisUrl, setNewAnalysisUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const loadData = () => {
    getBrandAnalysis(clientId).then((d) => {
      setData(d);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // 폴링 (분석 진행 중)
  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(async () => {
      const result = await getAnalysisStatus(pollingId);
      if (result.status === "completed") {
        setAnalyzing(false);
        setPollingId(null);
        toast.success(`분석 완료! 마케팅 점수: ${result.marketing_score ?? "-"}점`);
        loadData();
      } else if (result.status === "failed") {
        setAnalyzing(false);
        setPollingId(null);
        toast.error(result.error || "분석 실패");
      }
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingId]);

  const handleRefresh = async () => {
    if (!data) return;
    setRefreshing(true);
    const result = await refreshBrandAnalysis(data.id);
    if (result.success && result.newAnalysisId) {
      setPollingId(result.newAnalysisId);
      setAnalyzing(true);
      toast.success("재분석이 시작되었습니다.");
    } else {
      toast.error(result.error || "재분석 시작 실패");
    }
    setRefreshing(false);
  };

  const handleNewAnalysis = async () => {
    if (!newAnalysisUrl.trim()) return;
    setAnalyzing(true);
    const result = await runBrandAnalysis(clientId, newAnalysisUrl.trim());
    if (result.success && result.analysisId) {
      setPollingId(result.analysisId);
      toast.success("분석이 시작되었습니다.");
      setNewAnalysisUrl("");
    } else {
      setAnalyzing(false);
      toast.error(result.error || "분석 시작 실패");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── 분석 진행 중 상태 ──
  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <h3 className="text-lg font-bold mb-1">분석 진행 중</h3>
        <p className="text-sm text-muted-foreground">AI가 데이터를 수집하고 분석하고 있습니다. 30초~1분 소요됩니다.</p>
      </div>
    );
  }

  // ── 빈 상태 ──
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Microscope className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-bold mb-1">아직 브랜드 분석이 완료되지 않았습니다</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          네이버 플레이스 URL 또는 홈페이지 URL을 입력하면 AI가 마케팅 분석을 시작합니다.
        </p>
        <div className="flex gap-2 w-full max-w-md">
          <input
            type="url"
            value={newAnalysisUrl}
            onChange={(e) => setNewAnalysisUrl(e.target.value)}
            placeholder="https://naver.me/... 또는 https://your-site.com"
            className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background"
            onKeyDown={(e) => e.key === "Enter" && handleNewAnalysis()}
          />
          <button
            onClick={handleNewAnalysis}
            disabled={!newAnalysisUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 shrink-0"
          >
            <Play className="h-3.5 w-3.5" />
            분석 시작
          </button>
        </div>
      </div>
    );
  }

  // ── 데이터 파싱 ──
  const bi = (data.basic_info ?? {}) as Record<string, unknown>;
  const ka = (data.keyword_analysis ?? {}) as Record<string, unknown>;
  const cs = (data.content_strategy ?? {}) as Record<string, unknown>;
  const ba = (cs.brand_analysis ?? {}) as Record<string, unknown>;
  const tone = (ba.tone ?? {}) as Record<string, unknown>;
  const targetAudience = (ba.target_audience ?? {}) as Record<string, unknown>;
  const usp = (ba.usp ?? []) as string[];
  const contentAngles = (ba.content_angles ?? []) as string[];
  const improvements = (cs.improvements ?? []) as Array<Record<string, unknown>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywords = (ka.keywords ?? []) as any[];
  const scoreBreakdown = (cs.score_breakdown ?? {}) as Record<string, { score: number; max?: number; details?: string; detail?: string }>;

  const scoreAreas = [
    { key: "review_reputation", label: "리뷰/평판", max: 20, color: "bg-violet-500" },
    { key: "naver_keyword", label: "네이버 키워드", max: 25, color: "bg-blue-500" },
    { key: "google_keyword", label: "구글 키워드", max: 15, color: "bg-red-400" },
    { key: "image_quality", label: "이미지 품질", max: 10, color: "bg-amber-500" },
    { key: "online_channels", label: "온라인 채널", max: 15, color: "bg-emerald-500" },
    { key: "seo_aeo_readiness", label: "SEO/AEO 준비도", max: 15, color: "bg-pink-500" },
  ];

  const totalMax = scoreAreas.reduce((s, a) => s + a.max, 0);
  const scorePct = data.marketing_score != null ? Math.round((data.marketing_score / totalMax) * 100) : 0;
  const scoreColor = scorePct >= 70 ? "text-emerald-600" : scorePct >= 40 ? "text-amber-600" : "text-red-500";

  return (
    <div className="space-y-6">
      {/* Section 1: Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">브랜드 분석 결과</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bi.name ? `${bi.name}` : ""}
            {data.analyzed_at && ` · 분석일: ${new Date(data.analyzed_at).toLocaleDateString("ko-KR")}`}
            {data.url_type && ` · ${data.url_type === "website" ? "웹사이트" : "네이버 플레이스"}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {refreshing ? "시작 중..." : "재분석"}
        </button>
      </div>

      {/* Section 2: Marketing Score */}
      <div className="border rounded-lg p-5">
        <div className="flex items-center gap-6 mb-4">
          <div className="relative flex items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#e5e7eb" strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${scorePct}, 100`}
                className={scoreColor}
              />
            </svg>
            <span className={`absolute text-lg font-bold ${scoreColor}`}>
              {data.marketing_score ?? "-"}
            </span>
          </div>
          <div>
            <h4 className="font-semibold">마케팅 종합 점수</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{totalMax}점 만점 기준</p>
          </div>
        </div>
        <div className="space-y-2">
          {scoreAreas.map(({ key, label, max, color }) => {
            const area = scoreBreakdown[key];
            const score = area?.score ?? 0;
            const areaMax = area?.max ?? max;
            const pct = areaMax > 0 ? (score / areaMax) * 100 : 0;
            return (
              <div key={key}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium w-12 text-right">{score}/{areaMax}</span>
                </div>
                {(area?.details || area?.detail) && (
                  <p className="text-xs text-muted-foreground ml-[7.5rem] mt-0.5">{area?.details || area?.detail}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Target & Positioning */}
      {(!!targetAudience.primary || !!targetAudience.secondary || !!ba.positioning) && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            타겟 & 포지셔닝
          </h4>
          <div className="grid gap-3 lg:grid-cols-2">
            {!!targetAudience.primary && (
              <div>
                <span className="text-xs text-muted-foreground">주요 타겟</span>
                <p className="text-sm mt-0.5">{String(targetAudience.primary)}</p>
              </div>
            )}
            {!!targetAudience.secondary && (
              <div>
                <span className="text-xs text-muted-foreground">보조 타겟</span>
                <p className="text-sm mt-0.5">{String(targetAudience.secondary)}</p>
              </div>
            )}
          </div>
          {!!ba.positioning && (
            <div>
              <span className="text-xs text-muted-foreground">포지셔닝</span>
              <p className="text-sm mt-0.5">{String(ba.positioning)}</p>
            </div>
          )}
        </div>
      )}

      {/* Section 4: Tone */}
      {(!!tone.style || !!tone.personality || ((tone.example_phrases as string[] | undefined) ?? []).length > 0) && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm">톤 & 보이스</h4>
          <div className="grid gap-3 lg:grid-cols-2">
            {!!tone.style && (
              <div>
                <span className="text-xs text-muted-foreground">스타일</span>
                <p className="text-sm mt-0.5">{String(tone.style)}</p>
              </div>
            )}
            {!!tone.personality && (
              <div>
                <span className="text-xs text-muted-foreground">퍼스널리티</span>
                <p className="text-sm mt-0.5">{String(tone.personality)}</p>
              </div>
            )}
          </div>
          {((tone.example_phrases as string[] | undefined) ?? []).length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">예시 표현</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {((tone.example_phrases as string[]) ?? []).map((phrase, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-xs">&ldquo;{phrase}&rdquo;</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 5: USP */}
      {usp.length > 0 && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm">고유 가치 제안 (USP)</h4>
          <ul className="space-y-1.5">
            {usp.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 6: Content Angles */}
      {contentAngles.length > 0 && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm">추천 콘텐츠 앵글</h4>
          <div className="flex flex-wrap gap-2">
            {contentAngles.map((angle, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-100">
                {angle}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section 7: Keywords */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-sm">키워드 분석</h4>
        {!!ka.main_keyword && (
          <p className="text-sm">
            <span className="text-muted-foreground">메인 키워드:</span>{" "}
            <span className="font-medium">{String(ka.main_keyword)}</span>
            {!!ka.secondary_keyword && (
              <span className="text-muted-foreground"> · 서브: {String(ka.secondary_keyword)}</span>
            )}
          </p>
        )}
        {keywords.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">키워드</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">의도</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">우선순위</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">발행</th>
                </tr>
              </thead>
              <tbody>
                {keywords.slice(0, 15).map((kw, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{kw.keyword ?? kw}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{kw.intent ?? "-"}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        kw.priority === "high" ? "bg-red-100 text-red-700" :
                        kw.priority === "medium" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {kw.priority ?? "-"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => router.push(`/contents/publish?keywordName=${encodeURIComponent(kw.keyword ?? kw)}`)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                      >
                        <PenLine className="h-3 w-3" />
                        이 키워드로 발행
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">키워드 데이터가 없습니다</p>
        )}
      </div>

      {/* Section 8: Improvements */}
      {improvements.length > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            개선 포인트
          </h4>
          <div className="space-y-3">
            {improvements.map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 mb-1">
                  {!!item.priority && (
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      item.priority === "high" ? "bg-red-100 text-red-700" :
                      item.priority === "medium" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {String(item.priority)}
                    </span>
                  )}
                  <span className="text-sm font-medium">{String(item.title ?? item.area ?? item.category ?? `개선사항 ${i + 1}`)}</span>
                </div>
                {!!item.description && (
                  <p className="text-xs text-muted-foreground">{String(item.description)}</p>
                )}
                {!!item.action && (
                  <p className="text-xs text-primary mt-1">→ {String(item.action)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 9: CTA — 블로그 자동 작성 시작 */}
      <div className="border border-primary/20 bg-primary/5 rounded-lg p-5 text-center space-y-3">
        <h4 className="font-semibold text-base">분석 결과를 바탕으로 블로그 자동 작성 시작</h4>
        <p className="text-sm text-muted-foreground">
          {keywords[0]?.keyword
            ? `"${keywords[0].keyword}" 등 분석된 키워드로 SEO 최적화 콘텐츠를 바로 생성해보세요.`
            : "분석된 키워드로 SEO 최적화 콘텐츠를 바로 생성해보세요."}
        </p>
        <button
          onClick={() => {
            const kw = keywords[0]?.keyword;
            const query = kw ? `?keywordName=${encodeURIComponent(kw)}` : "";
            router.push(`/contents/publish${query}`);
          }}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <PenLine className="h-4 w-4" />
          블로그 콘텐츠 작성하기
        </button>
      </div>
    </div>
  );
}
