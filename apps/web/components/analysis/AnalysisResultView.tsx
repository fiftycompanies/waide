"use client";

import {
  MapPin,
  Star,
  FileText,
  Search,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  ClipboardList,
  Award,
  Sparkles,
  Camera,
} from "lucide-react";
import { ScoreGauge } from "./ScoreGauge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalysisData = Record<string, any>;

interface AnalysisResultViewProps {
  data: AnalysisData;
  variant?: "portal" | "public";
  compact?: boolean;
}

export function AnalysisResultView({ data, variant = "portal", compact = false }: AnalysisResultViewProps) {
  const bi = data.basic_info ?? {};
  const ka = data.keyword_analysis ?? {};
  const cs = data.content_strategy ?? {};
  const ba = cs.brand_analysis ?? {};
  const ra = data.review_analysis ?? {};
  const score = data.marketing_score ?? 0;
  const breakdown = cs.score_breakdown ?? {};
  const isWebsite = data.url_type === "website";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seoAudit = data.seo_audit as { items: any[]; totalIssues: number; criticalIssues: number; score: number } | null;
  const kwRankings = (data.keyword_rankings ?? []) as Array<{
    keyword: string; searchVolume: number; rank: number | null;
    status: "good" | "warning" | "danger" | "not_found";
  }>;
  const keywords: Array<{
    keyword: string; intent: string; priority: string;
    monthlySearch?: number; competition?: string;
  }> = [...(ka.keywords ?? [])].sort(
    (a: { monthlySearch?: number }, b: { monthlySearch?: number }) =>
      (b.monthlySearch ?? 0) - (a.monthlySearch ?? 0)
  );
  const improvements = (cs.improvements ?? []) as string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysisResult = (data.analysis_result ?? {}) as Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const improvementPlan = analysisResult.improvement_plan as Record<string, any> | null;

  const isPortal = variant === "portal";

  // Portal theme classes
  const card = isPortal
    ? "rounded-xl border border-gray-200 bg-white p-5"
    : "rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6";
  const heading = isPortal ? "text-gray-900" : "text-white";
  const subText = isPortal ? "text-gray-500" : "text-[#a0a0a0]";
  const mutedText = isPortal ? "text-gray-400" : "text-[#666666]";
  const innerCard = isPortal
    ? "bg-gray-50 border border-gray-100 rounded-lg"
    : "bg-[#111111] border border-[#2a2a2a] rounded-xl";

  return (
    <div className="space-y-5">
      {/* ── Summary + Score ── */}
      <div className={card}>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${heading} mb-2`}>
              {bi.name || "분석 결과"}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {bi.category && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {bi.category}
                </span>
              )}
              {bi.region && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs ${mutedText} border ${isPortal ? "border-gray-200" : "border-[#2a2a2a]"} flex items-center gap-1`}>
                  <MapPin className="h-3 w-3" />
                  {bi.region}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {(bi.visitor_reviews ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  <span className={subText}>방문자 리뷰 {(bi.visitor_reviews ?? 0).toLocaleString()}</span>
                </div>
              )}
              {(bi.blog_reviews ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  <span className={subText}>블로그 리뷰 {(bi.blog_reviews ?? 0).toLocaleString()}</span>
                </div>
              )}
              {bi.image_count > 0 && (
                <div className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-purple-400" />
                  <span className={subText}>이미지 {bi.image_count}장</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className={`text-xs ${mutedText} mb-1`}>마케팅 종합 점수</p>
            <ScoreGauge score={score} size={120} variant={isPortal ? "light" : "dark"} />
            <p className={`text-xs ${subText} mt-1`}>
              {score >= 70 ? "우수" : score >= 40 ? "개선 여지 있음" : "마케팅 강화 필요"}
            </p>
          </div>
        </div>
      </div>

      {/* ── SEO Audit + Keyword Rankings ── */}
      {(seoAudit || kwRankings.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {seoAudit && (
            <div className={card}>
              <h3 className={`text-sm font-semibold ${heading} mb-1 flex items-center gap-1.5`}>
                <ClipboardList className="h-4 w-4 text-amber-500" />
                {isWebsite ? "웹사이트 SEO 진단" : "플레이스 SEO 진단"}
              </h3>
              <p className={`text-xs ${mutedText} mb-3`}>
                진단 점수{" "}
                <span className={`font-bold ${seoAudit.score >= 70 ? "text-emerald-600" : seoAudit.score >= 40 ? "text-amber-500" : "text-red-500"}`}>
                  {seoAudit.score}점
                </span>
                {seoAudit.criticalIssues > 0 && <span className="text-red-500 ml-1.5">결격 {seoAudit.criticalIssues}건</span>}
              </p>
              <div className="space-y-1.5">
                {seoAudit.items.slice(0, compact ? 4 : undefined).map((item: { label: string; value: string; status: string; detail: string }, i: number) => (
                  <div key={i} className={`flex items-center gap-2.5 p-2 ${innerCard}`}>
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                      item.status === "good" ? "bg-emerald-500" :
                      item.status === "warning" ? "bg-amber-400" :
                      item.status === "danger" ? "bg-red-500" : "bg-gray-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs ${subText}`}>{item.label}</span>
                        <span className={`text-xs font-medium ${
                          item.status === "good" ? "text-emerald-600" :
                          item.status === "warning" ? "text-amber-500" :
                          item.status === "danger" ? "text-red-500" : mutedText
                        }`}>{item.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {kwRankings.length > 0 && (
            <div className={card}>
              <h3 className={`text-sm font-semibold ${heading} mb-1 flex items-center gap-1.5`}>
                <Search className="h-4 w-4 text-blue-500" />
                키워드 순위
              </h3>
              <p className={`text-xs ${mutedText} mb-3`}>네이버 로컬 검색 기준</p>
              <div className="space-y-2">
                {kwRankings.slice(0, compact ? 3 : undefined).map((kw, i) => {
                  const rankColor = kw.status === "good" ? "text-emerald-600" :
                    kw.status === "warning" ? "text-amber-500" :
                    kw.status === "danger" ? "text-red-500" : mutedText;
                  return (
                    <div key={i} className={`p-2.5 ${innerCard}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-medium ${heading}`}>{kw.keyword}</span>
                        <span className={`text-base font-bold ${rankColor}`}>
                          {kw.rank !== null ? `${kw.rank}위` : "미노출"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className={mutedText}>월간 {(kw.searchVolume ?? 0).toLocaleString()}</span>
                        <span className={`font-medium ${rankColor}`}>
                          {kw.rank !== null && kw.rank <= 5 ? "상위 노출" :
                           kw.rank !== null && kw.rank <= 20 ? "노출 중" :
                           kw.rank !== null ? "하위" : "50위 밖"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Score Breakdown (6 areas) ── */}
      {Object.keys(breakdown).length > 0 && (
        <div className={card}>
          <h3 className={`text-sm font-semibold ${heading} mb-3 flex items-center gap-1.5`}>
            <Award className="h-4 w-4 text-emerald-500" />
            점수 상세
          </h3>
          <div className="space-y-3">
            {[
              { key: "review_reputation", label: "리뷰/평판", icon: "⭐" },
              { key: "naver_keyword", label: "네이버 키워드", icon: "🔍" },
              { key: "google_keyword", label: "구글 키워드", icon: "🌐" },
              { key: "image_quality", label: "이미지 품질", icon: "📸" },
              { key: "online_channels", label: "온라인 채널", icon: "📱" },
              { key: "seo_aeo_readiness", label: "SEO/AEO", icon: "📊" },
            ].map(({ key, label, icon }) => {
              const item = breakdown[key] ?? { score: 0, max: 0 };
              const maxVal = item.max || 25;
              const pct = maxVal > 0 ? (item.score / maxVal) * 100 : 0;
              const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={subText}>{icon} {label}</span>
                    <span className={`font-medium ${heading}`}>{item.score}/{maxVal}</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isPortal ? "bg-gray-100" : "bg-[#2a2a2a]"}`}>
                    <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Website: Brand Analysis ── */}
      {isWebsite && ba && (
        <div className={card}>
          <h3 className={`text-sm font-semibold ${heading} mb-3 flex items-center gap-1.5`}>
            <Sparkles className="h-4 w-4 text-violet-500" />
            브랜드 분석
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {ba.tone && (
              <div className={`p-3 ${innerCard}`}>
                <p className={`text-xs ${mutedText} mb-0.5`}>브랜드 톤</p>
                <p className={`text-sm font-medium ${heading}`}>{ba.tone.style}</p>
              </div>
            )}
            {ba.target_audience && (
              <div className={`p-3 ${innerCard}`}>
                <p className={`text-xs ${mutedText} mb-0.5`}>타겟 고객</p>
                <p className={`text-sm font-medium ${heading}`}>{ba.target_audience.primary}</p>
              </div>
            )}
            {ba.usp && (ba.usp as string[]).length > 0 && (
              <div className={`p-3 ${innerCard} md:col-span-2`}>
                <p className={`text-xs ${mutedText} mb-1.5`}>차별화 포인트 (USP)</p>
                <div className="flex flex-wrap gap-1.5">
                  {(ba.usp as string[]).map((u: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">{u}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top Keywords ── */}
      {keywords.length > 0 && !compact && (
        <div className={card}>
          <h3 className={`text-sm font-semibold ${heading} mb-3 flex items-center gap-1.5`}>
            <Search className="h-4 w-4 text-blue-500" />
            키워드 분석
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {ka.main_keyword && (
              <span className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                메인: {ka.main_keyword}
              </span>
            )}
            {ka.secondary_keyword && (
              <span className={`px-3 py-1 rounded-lg text-xs ${isPortal ? "bg-gray-50 text-gray-600 border border-gray-200" : "bg-[#111111] text-[#a0a0a0] border border-[#2a2a2a]"}`}>
                2차: {ka.secondary_keyword}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${isPortal ? "border-gray-200 text-gray-400" : "border-[#2a2a2a] text-[#666666]"}`}>
                  <th className="text-left py-2 px-2">키워드</th>
                  <th className="text-left py-2 px-2">의도</th>
                  <th className="text-center py-2 px-2">월간 검색량</th>
                  <th className="text-center py-2 px-2">우선순위</th>
                </tr>
              </thead>
              <tbody>
                {keywords.slice(0, 10).map((kw, i) => (
                  <tr key={i} className={`border-b ${isPortal ? "border-gray-100 hover:bg-gray-50" : "border-[#2a2a2a]/50 hover:bg-white/[0.02]"}`}>
                    <td className={`py-2 px-2 font-medium ${heading}`}>{kw.keyword}</td>
                    <td className={`py-2 px-2 ${subText}`}>{kw.intent}</td>
                    <td className={`py-2 px-2 text-center ${subText}`}>{kw.monthlySearch ? kw.monthlySearch.toLocaleString() : "-"}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        kw.priority === "high" ? "bg-red-50 text-red-600" :
                        kw.priority === "medium" ? "bg-amber-50 text-amber-600" :
                        "bg-gray-50 text-gray-500"
                      }`}>
                        {kw.priority === "high" ? "높음" : kw.priority === "medium" ? "중간" : "낮음"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Content Strategy ── */}
      {!compact && (cs.recommended_content_types ?? []).length > 0 && (
        <div className={card}>
          <h3 className={`text-sm font-semibold ${heading} mb-3 flex items-center gap-1.5`}>
            <Lightbulb className="h-4 w-4 text-amber-500" />
            AI 콘텐츠 전략
          </h3>
          <div className="grid md:grid-cols-3 gap-3">
            <div className={`p-3 ${innerCard}`}>
              <p className={`text-xs ${mutedText} mb-1`}>추천 콘텐츠 타입</p>
              <div className="flex flex-wrap gap-1">
                {(cs.recommended_content_types ?? []).map((type: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">{type}</span>
                ))}
              </div>
            </div>
            <div className={`p-3 ${innerCard}`}>
              <p className={`text-xs ${mutedText} mb-1`}>발행 빈도</p>
              <p className={`text-sm font-medium ${heading}`}>{cs.posting_frequency ?? "주 2~3회"}</p>
            </div>
            <div className={`p-3 ${innerCard}`}>
              <p className={`text-xs ${mutedText} mb-1`}>톤앤매너</p>
              <p className={`text-sm font-medium ${heading}`}>{ba.tone?.style ?? "-"}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Selling Points (reviews) ── */}
      {!compact && !isWebsite && (ra.selling_points ?? []).length > 0 && (
        <div className={card}>
          <h3 className={`text-sm font-semibold ${heading} mb-3 flex items-center gap-1.5`}>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            고객 강점 TOP
          </h3>
          <div className="space-y-1.5">
            {(ra.selling_points as string[]).slice(0, 5).map((point: string, i: number) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-[10px] font-bold">{i + 1}</div>
                <span className={`text-sm ${subText}`}>{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Improvement Plan ── */}
      {!compact && improvementPlan?.roadmap && (
        <div className={card}>
          <h3 className={`text-sm font-semibold ${heading} mb-2 flex items-center gap-1.5`}>
            <Lightbulb className="h-4 w-4 text-amber-500" />
            개선 액션플랜
          </h3>
          {improvementPlan.priority_summary && (
            <p className={`text-xs ${subText} mb-3`}>{improvementPlan.priority_summary}</p>
          )}
          <div className="space-y-3">
            {(["week1", "month1", "month3"] as const).map((period) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const items = (improvementPlan.roadmap?.[period] ?? []) as any[];
              if (items.length === 0) return null;
              const periodLabel = period === "week1" ? "1주 내" : period === "month1" ? "1개월" : "3개월";
              const periodColor = period === "week1" ? "text-emerald-600" : period === "month1" ? "text-blue-600" : "text-purple-600";
              return (
                <div key={period}>
                  <h4 className={`text-xs font-medium ${periodColor} mb-1.5`}>{periodLabel} 액션</h4>
                  <div className="space-y-1.5">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {items.slice(0, 3).map((item: any, i: number) => (
                      <div key={i} className={`p-2.5 ${innerCard} flex items-start gap-2`}>
                        <ArrowRight className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${periodColor}`} />
                        <div>
                          <p className={`text-xs ${heading}`}>{item.action}</p>
                          {item.expected_score_gain && (
                            <span className="text-[10px] text-emerald-600">+{item.expected_score_gain}점</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Improvements (simple list) ── */}
      {!compact && !improvementPlan?.roadmap && improvements.length > 0 && (
        <div className={card}>
          <h3 className={`text-sm font-semibold ${heading} mb-3 flex items-center gap-1.5`}>
            <Lightbulb className="h-4 w-4 text-amber-500" />
            개선 포인트
          </h3>
          <div className="space-y-1.5">
            {improvements.slice(0, 5).map((item, i) => (
              <div key={i} className={`p-2.5 ${innerCard} flex items-start gap-2`}>
                <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                <p className={`text-xs ${subText}`}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
