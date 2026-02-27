import { Suspense } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, Brain, FileText, MessageSquare, RefreshCw, Search, Star } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/service";
import {
  getBrandAnalysis,
  type BrandAnalysisRow,
} from "@/lib/actions/analysis-brand-actions";

// ── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={`${pct * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="fill-foreground text-2xl font-bold">{score}</text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">/ 100</text>
    </svg>
  );
}

// ── Source Badge ─────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  "행정구역": "bg-blue-100 text-blue-700 border-blue-200",
  "생활권":   "bg-emerald-100 text-emerald-700 border-emerald-200",
  "근교":     "bg-orange-100 text-orange-700 border-orange-200",
  "관광지":   "bg-purple-100 text-purple-700 border-purple-200",
  "브랜드":   "bg-red-100 text-red-700 border-red-200",
};

function SourceBadge({ source }: { source?: string }) {
  if (!source || source === "-") return <span className="text-xs text-muted-foreground">-</span>;
  const cls = SOURCE_COLORS[source] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {source}
    </span>
  );
}

// ── Analysis Sections ────────────────────────────────────────────────────────

function BasicInfoSection({ bi, score }: { bi: Record<string, unknown>; score: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          <ScoreGauge score={score} />
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div><p className="text-xs text-muted-foreground">업체명</p><p className="font-semibold text-lg">{bi.name as string ?? "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">업종</p><p className="font-medium">{bi.category as string ?? "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">지역</p><p className="font-medium">{bi.region as string ?? bi.address as string ?? "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">영업시간</p><p className="font-medium">{bi.hours as string || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">방문자 리뷰</p><p className="font-medium">{((bi.visitor_reviews as number) ?? 0).toLocaleString()}건</p></div>
            <div><p className="text-xs text-muted-foreground">블로그 리뷰</p><p className="font-medium">{((bi.blog_reviews as number) ?? 0).toLocaleString()}건</p></div>
            {typeof bi.homepage_url === "string" && bi.homepage_url && (
              <div className="col-span-2"><p className="text-xs text-muted-foreground">홈페이지</p><a href={bi.homepage_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline text-sm">{bi.homepage_url}</a></div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewSection({ ra, cs }: { ra: Record<string, unknown>; cs: Record<string, unknown> }) {
  const sellingPoints = (ra.selling_points ?? []) as string[];
  const usp = (ra.usp ?? []) as string[];
  const ba = (cs.brand_analysis ?? {}) as Record<string, unknown>;
  const forbidden = (ba.forbidden_terms ?? []) as string[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> 고객이 뽑은 강점 TOP 5</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sellingPoints.slice(0, 5).map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
              <div className="flex-1 bg-amber-50 rounded-full h-7 flex items-center px-3">
                <span className="text-sm">{p}</span>
              </div>
            </div>
          ))}
          {sellingPoints.length === 0 && <p className="text-xs text-muted-foreground">데이터 없음</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">차별화 포인트 (USP)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {usp.map((u, i) => <Badge key={i} variant="secondary">{u}</Badge>)}
          </div>
        </CardContent>
      </Card>
      {forbidden.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm text-red-600">금기 표현</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {forbidden.map((f, i) => <Badge key={i} variant="destructive">{f}</Badge>)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KeywordSection({ ka }: { ka: Record<string, unknown> }) {
  const mainKw = ka.main_keyword as string ?? "";
  const secondaryKw = ka.secondary_keyword as string ?? "";
  const tertiaryKw = ka.tertiary_keyword as string ?? "";
  const brandKw = ka.brand_keyword as string ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywords = [...((ka.keywords ?? []) as any[])].sort((a: { monthlySearch?: number }, b: { monthlySearch?: number }) => (b.monthlySearch ?? 0) - (a.monthlySearch ?? 0));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Search className="h-4 w-4 text-blue-500" /> 공략 키워드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {mainKw && <Badge className="bg-amber-500 text-white">{mainKw}</Badge>}
            {secondaryKw && <Badge className="bg-blue-500 text-white">{secondaryKw}</Badge>}
            {tertiaryKw && <Badge className="bg-emerald-500 text-white">{tertiaryKw}</Badge>}
            {brandKw && <Badge variant="outline">{brandKw}</Badge>}
          </div>
          {keywords.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 text-left font-medium">키워드</th>
                    <th className="py-2 text-left font-medium">의도</th>
                    <th className="py-2 text-right font-medium">월간 검색량</th>
                    <th className="py-2 text-center font-medium">경쟁도</th>
                    <th className="py-2 text-center font-medium">출처</th>
                    <th className="py-2 text-center font-medium">우선순위</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {keywords.map((kw, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="py-2 font-medium">{kw.keyword}</td>
                      <td className="py-2 text-muted-foreground">{kw.intent}</td>
                      <td className="py-2 text-right font-mono">{kw.monthlySearch?.toLocaleString() ?? "—"}</td>
                      <td className="py-2 text-center"><Badge variant="outline" className="text-xs">{kw.competition ?? "—"}</Badge></td>
                      <td className="py-2 text-center"><SourceBadge source={kw.source} /></td>
                      <td className="py-2 text-center">
                        <Badge className={`text-xs ${kw.priority === "high" ? "bg-red-100 text-red-700" : kw.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {kw.priority}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Keyword Cloud */}
      {keywords.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">키워드 클라우드 (크기 = 검색량)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 items-center">
              {keywords.map((kw, i) => {
                const vol = kw.monthlySearch ?? 0;
                const sz = vol >= 10000 ? "text-lg font-bold px-3 py-1.5" : vol >= 1000 ? "text-base font-semibold px-2.5 py-1" : vol >= 100 ? "text-sm px-2 py-0.5" : "text-xs px-2 py-0.5";
                const srcCls = SOURCE_COLORS[kw.source ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200";
                return (
                  <span key={i} className={`${sz} rounded-full border cursor-default transition-all hover:scale-105 ${srcCls}`} title={`${kw.keyword} | 검색량: ${vol.toLocaleString()} | 출처: ${kw.source ?? "-"}`}>
                    {kw.keyword}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ContentStrategySection({ cs }: { cs: Record<string, unknown> }) {
  const ba = (cs.brand_analysis ?? {}) as Record<string, unknown>;
  const contentTypes = (cs.recommended_content_types ?? []) as string[];
  const frequency = cs.posting_frequency as string ?? "—";
  const differentiation = cs.competitor_differentiation as string ?? "—";
  const angles = (cs.content_angles ?? []) as string[];
  const scoreBreakdown = (cs.score_breakdown ?? {}) as Record<string, { score: number; max?: number; details?: string; detail?: string }>;
  const improvements = (cs.improvements ?? []) as string[];
  const cta = (ba.cta ?? {}) as Record<string, string>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-purple-500" /> AI 콘텐츠 전략</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">추천 콘텐츠 타입</p>
              <div className="flex gap-1.5 flex-wrap">
                {contentTypes.map((t, i) => <Badge key={i} className="bg-purple-100 text-purple-700">{t}</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">추천 발행빈도</p>
              <p className="font-semibold">{frequency}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">경쟁사 차별화 전략</p>
            <p className="text-sm">{differentiation}</p>
          </div>
          {cta.primary && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">CTA</p>
              <p className="text-sm font-medium">{cta.primary} / {cta.secondary}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-2">콘텐츠 주제 아이디어</p>
            <div className="grid grid-cols-2 gap-2">
              {angles.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {a}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      {Object.keys(scoreBreakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">마케팅 점수 6개 영역</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { key: "review_reputation", label: "네이버 리뷰/평판", icon: "⭐" },
                { key: "naver_keyword", label: "네이버 키워드 노출", icon: "🔍" },
                { key: "google_keyword", label: "구글 키워드 노출", icon: "🌐" },
                { key: "image_quality", label: "이미지 품질", icon: "📸" },
                { key: "online_channels", label: "온라인 채널 완성도", icon: "📱" },
                { key: "seo_aeo_readiness", label: "SEO/AEO 준비도", icon: "📊" },
              ].map(({ key, label, icon }) => {
                const val = scoreBreakdown[key];
                if (!val) return null;
                const maxVal = val.max ?? 25;
                const pct = maxVal > 0 ? (val.score / maxVal) * 100 : 0;
                const detailText = val.details ?? val.detail ?? "";
                const isFuture = maxVal === 15 && val.score === 0 && detailText.includes("예정");
                const barColor = isFuture ? "bg-muted-foreground/30" : pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400";
                return (
                  <div key={key} className={isFuture ? "opacity-50" : ""}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{icon} {label}</span>
                      <span className="font-bold">{isFuture ? "측정 예정" : `${val.score}/${maxVal}`}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${isFuture ? 0 : pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{detailText}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {improvements.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">📈 개선 포인트</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {improvements.slice(0, 5).map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-600 font-bold shrink-0">{i + 1}.</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CustomerEditsSection({ edits }: { edits: Record<string, unknown> | null }) {
  if (!edits || Object.keys(edits).length === 0)
    return <p className="text-sm text-muted-foreground py-8 text-center">고객 보완 정보 없음</p>;

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-emerald-500" /> 고객 보완 정보</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {typeof edits.mainMenu === "string" && edits.mainMenu && <div><p className="text-xs text-muted-foreground">주요 메뉴/상품</p><p>{edits.mainMenu}</p></div>}
          {typeof edits.strength === "string" && edits.strength && <div><p className="text-xs text-muted-foreground">우리 매장 강점</p><p>{edits.strength}</p></div>}
          {typeof edits.targetCustomer === "string" && edits.targetCustomer && <div><p className="text-xs text-muted-foreground">타겟 고객</p><p>{edits.targetCustomer}</p></div>}
          {typeof edits.additionalKeywords === "string" && edits.additionalKeywords && <div><p className="text-xs text-muted-foreground">추가 키워드</p><p>{edits.additionalKeywords}</p></div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

async function BrandDetailContent({ id }: { id: string }) {
  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("id, name, company_name, website_url, industry, is_active")
    .eq("id", id)
    .single();

  if (!client) {
    return <div className="text-center py-12 text-muted-foreground">브랜드를 찾을 수 없습니다.</div>;
  }

  const analysis = await getBrandAnalysis(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/brands">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> 목록</Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.industry ?? client.company_name ?? ""}</p>
          </div>
        </div>
        {analysis && (
          <form action={async () => {
            "use server";
            const { refreshBrandAnalysis } = await import("@/lib/actions/analysis-brand-actions");
            await refreshBrandAnalysis(analysis.id);
          }}>
            <Button type="submit" variant="outline" size="sm">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> 재분석
            </Button>
          </form>
        )}
      </div>

      {/* No Analysis */}
      {!analysis && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-4">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <div>
              <p className="text-lg font-semibold">아직 AI 분석이 없습니다</p>
              <p className="text-sm text-muted-foreground mt-1">매장 URL을 입력하면 AI가 자동으로 분석합니다.</p>
            </div>
            <form action={async (formData: FormData) => {
              "use server";
              const url = formData.get("url") as string;
              if (!url) return;
              const { runBrandAnalysis } = await import("@/lib/actions/analysis-brand-actions");
              await runBrandAnalysis(id, url);
            }}>
              <div className="flex gap-2 max-w-md mx-auto">
                <input name="url" type="text" placeholder="네이버 플레이스 URL 입력..." className="flex-1 h-10 rounded-md border px-3 text-sm" required />
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white">분석 시작</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Analysis Tabs */}
      {analysis && (() => {
        const bi = (analysis.basic_info ?? {}) as Record<string, unknown>;
        const ra = (analysis.review_analysis ?? {}) as Record<string, unknown>;
        const ka = (analysis.keyword_analysis ?? {}) as Record<string, unknown>;
        const cs = (analysis.content_strategy ?? {}) as Record<string, unknown>;
        const score = analysis.marketing_score ?? 0;

        return (
          <>
            <BasicInfoSection bi={bi} score={score} />
            <Tabs defaultValue="review" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="review">리뷰 분석</TabsTrigger>
                <TabsTrigger value="keyword">키워드</TabsTrigger>
                <TabsTrigger value="strategy">콘텐츠 전략</TabsTrigger>
                <TabsTrigger value="customer">고객 보완</TabsTrigger>
              </TabsList>
              <TabsContent value="review" className="mt-4">
                <ReviewSection ra={ra} cs={cs} />
              </TabsContent>
              <TabsContent value="keyword" className="mt-4">
                <KeywordSection ka={ka} />
              </TabsContent>
              <TabsContent value="strategy" className="mt-4">
                <ContentStrategySection cs={cs} />
              </TabsContent>
              <TabsContent value="customer" className="mt-4">
                <CustomerEditsSection edits={analysis.customer_edits} />
              </TabsContent>
            </Tabs>
          </>
        );
      })()}
    </div>
  );
}

export default function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 16: params is a Promise
  return (
    <div className="p-6">
      <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>}>
        <BrandDetailInner params={params} />
      </Suspense>
    </div>
  );
}

async function BrandDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BrandDetailContent id={id} />;
}
