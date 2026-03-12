// ─── 리서치 & 분석 페이지 (Server Component) ──────────────────────────────────
// SEO: SERP 순위 추이 · 노출 점유율 · Style Transfer
// AEO: AI 노출 추적 · 경쟁 분석 · Citation 분석
// ─────────────────────────────────────────────────────────────────────────────
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiHeaderCards } from "@/components/analytics/kpi-header-cards";
import { SerpRankChart } from "@/components/analytics/serp-rank-chart";
import { StyleTransferWidget } from "@/components/analytics/style-transfer-widget";
import { EvolvingKnowledgeTable } from "@/components/analytics/evolving-knowledge-table";
import {
  getOpsKpiCards,
  getOpsSerp,
  getBestContents,
  getEvolvingKnowledge,
  getKeywordVisibilityTable,
} from "@/lib/actions/analytics-actions";
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import { VisibilitySection } from "@/components/analytics/visibility-section";
import { AnalyticsTabsWrapper } from "@/components/analytics/analytics-tabs-wrapper";
import {
  getAEOAnalyticsData,
  getAEOCompetitionData,
  getAEOCitationData,
} from "@/lib/actions/aeo-tracking-actions";

async function AnalyticsSection() {
  const clientId = await getSelectedClientId();

  const [kpiData, serpData, bestContents, ekRecords, visibilityRows] = await Promise.all([
    getOpsKpiCards(clientId ?? undefined),
    getOpsSerp(clientId ?? undefined, 30),
    getBestContents(clientId ?? undefined, 5),
    getEvolvingKnowledge(clientId ?? undefined, 30),
    getKeywordVisibilityTable(clientId ?? undefined, 50),
  ]);

  // AEO 데이터 (clientId 필수)
  let aeoData: Awaited<ReturnType<typeof getAEOAnalyticsData>> = {
    scoreTrend: [], questionTable: [], totalTracked: 0, totalMentioned: 0,
  };
  let competitionData: Awaited<ReturnType<typeof getAEOCompetitionData>> = {
    competitors: [], shareOfVoice: [], ourMentionCount: 0,
  };
  let citationData: Awaited<ReturnType<typeof getAEOCitationData>> = {
    topSources: [], ourContentCited: [],
  };

  if (clientId) {
    [aeoData, competitionData, citationData] = await Promise.all([
      getAEOAnalyticsData(clientId, 30),
      getAEOCompetitionData(clientId),
      getAEOCitationData(clientId),
    ]);
  }

  // SEO 탭 콘텐츠
  const seoContent = (
    <div className="space-y-6">
      <KpiHeaderCards data={kpiData} />
      <div className="grid gap-5 lg:grid-cols-2">
        <SerpRankChart trend={serpData.trend} keywords={serpData.keywords} />
        <StyleTransferWidget contents={bestContents} />
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">노출 점유율 상세</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            키워드별 당일 노출 점수 및 순위 현황
          </p>
        </div>
        <VisibilitySection rows={visibilityRows} />
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">진화 지식 현황</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            SERP 성과를 기반으로 에이전트가 자동 축적한 집필 패턴 · 전략 규칙
          </p>
        </div>
        <EvolvingKnowledgeTable records={ekRecords} />
      </div>
    </div>
  );

  return (
    <AnalyticsTabsWrapper
      clientId={clientId || ""}
      aeoData={aeoData}
      competitionData={competitionData}
      citationData={citationData}
      seoContent={seoContent}
    />
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">성과 분석</h1>
        <p className="text-sm text-muted-foreground mt-1">
          SEO 순위 추이 · AEO 노출 추적 · 경쟁 분석 · Citation 분석
        </p>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsSection />
      </Suspense>
    </div>
  );
}
