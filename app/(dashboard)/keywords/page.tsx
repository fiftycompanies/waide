import { getSelectedClientId, getAiMarketBrands } from "@/lib/actions/brand-actions";
import { getKeywords, getPublishRecommendedKeywords } from "@/lib/actions/keyword-actions";
import { getKeywordStrategy } from "@/lib/actions/keyword-strategy-actions";
import { getQuestions } from "@/lib/actions/question-actions";
import { checkNaverAdApiAvailable } from "@/lib/actions/keyword-volume-actions";
import { getEffectiveClientId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/service";
import { KeywordsClient } from "@/components/keywords/keywords-client";
import { KeywordStrategySection } from "@/components/keywords/keyword-strategy-section";
import { KeywordsTabsWrapper } from "@/components/keywords/keywords-tabs-wrapper";
import { QuestionsTab } from "@/components/questions/questions-tab";
import { KeywordVolumeTab } from "@/components/keywords/keyword-volume-tab";

export const dynamic = "force-dynamic";

// ── KPI 데이터 조회 ──────────────────────────────────────────────────────
interface KeywordKpi {
  total: number;
  archived: number;
  exposedCount: number;
  top3Count: number;
  top10Count: number;
  exposureRate: number;
  avgRankPc: number | null;
  avgRankMo: number | null;
  exposedDiff: number | null; // 전주 대비
}

async function getKeywordKpi(clientId: string | null): Promise<KeywordKpi | null> {
  if (!clientId) return null;
  try {
    const db = createAdminClient();

    // 1. keywords 카운트
    const [activeRes, archivedRes] = await Promise.all([
      db
        .from("keywords")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .in("status", ["active", "queued", "refresh"]),
      db
        .from("keywords")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "archived"),
    ]);

    const total = activeRes.count || 0;
    const archived = archivedRes.count || 0;

    // 2. keyword_visibility 최신일 기준
    const { data: latestVis } = await db
      .from("keyword_visibility")
      .select("measured_at")
      .eq("client_id", clientId)
      .order("measured_at", { ascending: false })
      .limit(1);

    let exposedCount = 0;
    let top3Count = 0;
    let top10Count = 0;

    if (latestVis && latestVis.length > 0) {
      const latestDate = latestVis[0].measured_at;

      const { data: visRows } = await db
        .from("keyword_visibility")
        .select("is_exposed, rank_pc, rank_mo")
        .eq("client_id", clientId)
        .eq("measured_at", latestDate);

      if (visRows) {
        for (const r of visRows) {
          if (r.is_exposed) exposedCount++;
          const pc = r.rank_pc as number | null;
          const mo = r.rank_mo as number | null;
          if ((pc && pc <= 3) || (mo && mo <= 3)) top3Count++;
          if ((pc && pc <= 10) || (mo && mo <= 10)) top10Count++;
        }
      }
    }

    // 3. daily_visibility_summary 최신 + 7일 전
    const { data: summaryRows } = await db
      .from("daily_visibility_summary")
      .select("measured_at, exposure_rate, exposed_keywords, avg_rank_pc, avg_rank_mo")
      .eq("client_id", clientId)
      .order("measured_at", { ascending: false })
      .limit(2);

    let exposureRate = 0;
    let avgRankPc: number | null = null;
    let avgRankMo: number | null = null;
    let exposedDiff: number | null = null;

    if (summaryRows && summaryRows.length > 0) {
      const latest = summaryRows[0];
      exposureRate = Number(latest.exposure_rate) || 0;
      avgRankPc = latest.avg_rank_pc != null ? Number(latest.avg_rank_pc) : null;
      avgRankMo = latest.avg_rank_mo != null ? Number(latest.avg_rank_mo) : null;

      // 7일 전 데이터 별도 조회
      const latestDate = new Date(latest.measured_at);
      const weekAgo = new Date(latestDate);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().slice(0, 10);

      const { data: prevRows } = await db
        .from("daily_visibility_summary")
        .select("exposed_keywords")
        .eq("client_id", clientId)
        .lte("measured_at", weekAgoStr)
        .order("measured_at", { ascending: false })
        .limit(1);

      if (prevRows && prevRows.length > 0) {
        const prevExposed = prevRows[0].exposed_keywords || 0;
        const currentExposed = latest.exposed_keywords || 0;
        exposedDiff = currentExposed - prevExposed;
      }
    }

    return { total, archived, exposedCount, top3Count, top10Count, exposureRate, avgRankPc, avgRankMo, exposedDiff };
  } catch {
    return null;
  }
}

interface KeywordsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function KeywordsPage({ searchParams }: KeywordsPageProps) {
  const params = await searchParams;
  const tab = (params.tab ?? "keywords") as "keywords" | "questions" | "volume";

  const [selectedClientId, brands] = await Promise.all([
    getSelectedClientId(),
    getAiMarketBrands(),
  ]);

  // 고객 역할이면 본인 client_id, 어드민이면 브랜드 셀렉터 값
  const effectiveClientId = await getEffectiveClientId(selectedClientId);

  const selectedBrand = brands.find((b) => b.id === selectedClientId);
  const keywords = await getKeywords(effectiveClientId);
  const isAllMode = !effectiveClientId;

  // KPI 데이터 조회
  const kpi = await getKeywordKpi(effectiveClientId);

  // 발행 우선 추천 키워드
  const publishRecommended = effectiveClientId
    ? await getPublishRecommendedKeywords(effectiveClientId)
    : [];

  // 키워드 전략 조회 (클라이언트 선택 시만)
  const strategy = effectiveClientId ? await getKeywordStrategy(effectiveClientId) : null;

  // 질문 조회 (클라이언트 선택 시만)
  const questions = effectiveClientId ? await getQuestions(effectiveClientId) : [];

  // 검색량 API 사용 가능 여부
  const apiAvailable = tab === "volume" ? await checkNaverAdApiAvailable() : false;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">키워드 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAllMode ? (
              <span className="font-medium text-foreground">전체 브랜드</span>
            ) : (
              <span className="font-medium text-foreground">{selectedBrand?.name}</span>
            )}
            의 타겟 키워드 · {keywords.length}개 등록됨
          </p>
        </div>
      </div>

      {/* KPI 카드 */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 등록 키워드 */}
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">등록 키워드</p>
            <p className="text-2xl font-bold mt-1">{kpi.total}<span className="text-sm font-normal text-muted-foreground">개</span></p>
            <p className="text-xs text-muted-foreground mt-1">보관 {kpi.archived}개</p>
          </div>

          {/* 20위권 노출 */}
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">20위권 노출</p>
            <p className="text-2xl font-bold mt-1">{kpi.exposedCount}<span className="text-sm font-normal text-muted-foreground">개</span></p>
            <p className="text-xs mt-1">
              {kpi.exposedDiff != null ? (
                <span className={kpi.exposedDiff > 0 ? "text-green-600" : kpi.exposedDiff < 0 ? "text-red-500" : "text-muted-foreground"}>
                  전주 대비 {kpi.exposedDiff > 0 ? "+" : ""}{kpi.exposedDiff}
                </span>
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
            </p>
          </div>

          {/* 키워드 점유율 */}
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">키워드 점유율</p>
            <p className="text-2xl font-bold mt-1">{kpi.exposureRate.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">%</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              PC {kpi.avgRankPc != null ? kpi.avgRankPc.toFixed(1) : "--"}위 · MO {kpi.avgRankMo != null ? kpi.avgRankMo.toFixed(1) : "--"}위
            </p>
          </div>

          {/* 상위 3위 */}
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">상위 3위</p>
            <p className="text-2xl font-bold mt-1">{kpi.top3Count}<span className="text-sm font-normal text-muted-foreground">개</span></p>
            <p className="text-xs text-muted-foreground mt-1">상위 10위 {kpi.top10Count}개</p>
          </div>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <KeywordsTabsWrapper activeTab={tab} questionCount={questions.length}>
        {tab === "keywords" && (
          <>
            {/* AI 키워드 전략 섹션 (클라이언트 선택 시만) */}
            {effectiveClientId && (
              <KeywordStrategySection
                clientId={effectiveClientId}
                initialStrategy={strategy}
              />
            )}

            {/* 클라이언트 컴포넌트 (테이블 + 다이얼로그) */}
            <KeywordsClient keywords={keywords} clientId={effectiveClientId} publishRecommended={publishRecommended} />
          </>
        )}

        {tab === "questions" && effectiveClientId && (
          <QuestionsTab
            clientId={effectiveClientId}
            questions={questions}
            keywords={keywords}
          />
        )}

        {tab === "questions" && !effectiveClientId && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              사이드바에서 브랜드를 먼저 선택해주세요
            </p>
          </div>
        )}

        {tab === "volume" && (
          <KeywordVolumeTab
            clientId={effectiveClientId}
            apiAvailable={apiAvailable}
          />
        )}
      </KeywordsTabsWrapper>
    </div>
  );
}
