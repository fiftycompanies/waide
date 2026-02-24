// ─── 발행 추천 현황 페이지 (Server Component) ─────────────────────────────────
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import {
  getRecommendationsList,
  getRecommendationStats,
  getAccountGrades,
} from "@/lib/actions/recommendation-actions";
import { RecommendationsSection } from "@/components/analytics/recommendations-section";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

async function RecommendationsContent() {
  const clientId = await getSelectedClientId();

  if (!clientId) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Building2 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">브랜드를 먼저 선택해주세요</p>
        </CardContent>
      </Card>
    );
  }

  const [recommendations, stats, accountGrades] = await Promise.all([
    getRecommendationsList(clientId, { limit: 100 }),
    getRecommendationStats(clientId),
    getAccountGrades(clientId),
  ]);

  return (
    <RecommendationsSection
      recommendations={recommendations}
      stats={stats}
      accountGrades={accountGrades}
    />
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">발행 추천 현황</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI 계정-키워드 매칭 추천 목록 · 피드백 결과 통계
        </p>
      </div>

      <Suspense fallback={<RecommendationsSkeleton />}>
        <RecommendationsContent />
      </Suspense>
    </div>
  );
}
