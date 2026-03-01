import { getSelectedClientId, getAiMarketBrands } from "@/lib/actions/brand-actions";
import { getBestRankContents } from "@/lib/actions/campaign-actions";
import {
  getActiveKeywordPool,
  getSuggestedKeywords,
} from "@/lib/actions/campaign-planning-actions";
import { CampaignPlanningClient } from "@/components/campaigns/campaign-planning-client";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default async function CampaignPlanPage() {
  const [selectedClientId, brands] = await Promise.all([
    getSelectedClientId(),
    getAiMarketBrands(),
  ]);

  const selectedBrand = brands.find((b) => b.id === selectedClientId);

  if (!selectedClientId) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">캠페인 기획</h1>
          <p className="text-sm text-muted-foreground mt-1">
            타겟 키워드를 선택하고 AI 에이전트에게 콘텐츠 생성을 지시합니다
          </p>
        </div>
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Building2 className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              사이드바에서 브랜드를 먼저 선택해주세요
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [activePool, suggestedKeywords, bestContents] = await Promise.all([
    getActiveKeywordPool(selectedClientId),
    getSuggestedKeywords(selectedClientId),
    getBestRankContents(selectedClientId),
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">캠페인 기획</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-medium text-foreground">{selectedBrand?.name}</span>의
          타겟 키워드를 선택하고 AI 에이전트에게 콘텐츠 생성을 지시합니다
        </p>
      </div>

      <CampaignPlanningClient
        clientId={selectedClientId}
        initialActivePool={activePool}
        initialSuggestedKeywords={suggestedKeywords}
        bestContents={bestContents}
      />
    </div>
  );
}
