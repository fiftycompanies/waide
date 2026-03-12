import { getSelectedClientId, getAiMarketBrands, getChildClients } from "@/lib/actions/brand-actions";
import { getActiveKeywordsForClient, getBestRankContents } from "@/lib/actions/campaign-actions";
import { getContentSources } from "@/lib/actions/content-source-actions";
import { NewCampaignForm } from "@/components/campaigns/new-campaign-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

export default async function NewCampaignPage() {
  const [selectedClientId, brands] = await Promise.all([
    getSelectedClientId(),
    getAiMarketBrands(),
  ]);

  const selectedBrand = brands.find((b) => b.id === selectedClientId);

  if (!selectedClientId) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">새 캠페인</h1>
        </div>
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Building2 className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              브랜드를 먼저 선택해주세요
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [activeKeywords, bestContents, contentSources, childClients] = await Promise.all([
    getActiveKeywordsForClient(selectedClientId),
    getBestRankContents(selectedClientId),
    getContentSources(selectedClientId),
    getChildClients(selectedClientId),
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">새 캠페인</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-medium text-foreground">{selectedBrand?.name}</span>의 새 콘텐츠 캠페인을 기획합니다
          </p>
        </div>
      </div>

      <NewCampaignForm
        clientId={selectedClientId}
        activeKeywords={activeKeywords}
        bestContents={bestContents}
        contentSources={contentSources}
        childClients={childClients}
      />
    </div>
  );
}
