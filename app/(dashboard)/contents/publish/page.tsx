import { Suspense } from "react";
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveKeywordPool } from "@/lib/actions/campaign-planning-actions";
import { BlogPublishFlow } from "@/components/contents/blog-publish-flow";
import {
  getPublishingAccounts,
  getBrandAnalysisForPublishing,
  getClientInfoForPublishing,
} from "@/lib/actions/publishing-account-actions";
import { getPersona } from "@/lib/actions/persona-actions";
import { getPersonaForPipeline } from "@/lib/utils/persona-compat";

export const dynamic = "force-dynamic";

interface PublishPageProps {
  searchParams: Promise<{ keywordId?: string; keywordName?: string }>;
}

export default async function PublishPage({ searchParams }: PublishPageProps) {
  const params = await searchParams;
  const clientId = await getSelectedClientId();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">블로그 발행</h1>
        <p className="text-muted-foreground text-sm mt-1">
          브리프 작성부터 콘텐츠 생성, 발행까지 한 번에 진행합니다
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <PublishContent
          clientId={clientId}
          keywordId={params.keywordId}
          keywordName={params.keywordName}
        />
      </Suspense>
    </div>
  );
}

async function PublishContent({
  clientId,
  keywordId,
  keywordName,
}: {
  clientId: string | null;
  keywordId?: string;
  keywordName?: string;
}) {
  if (!clientId) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Building2 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            사이드바에서 브랜드를 먼저 선택해주세요
          </p>
        </CardContent>
      </Card>
    );
  }

  const [brandAnalysis, publishingAccounts, activePool, rawPersona, clientInfo] = await Promise.all([
    getBrandAnalysisForPublishing(clientId),
    getPublishingAccounts(clientId),
    getActiveKeywordPool(clientId),
    getPersona(clientId),
    getClientInfoForPublishing(clientId),
  ]);

  const activeKeywords = (activePool || [])
    .map((kw) => ({
      keyword: kw.keyword,
      id: kw.id,
      monthlySearch: kw.monthlySearchTotal ?? 0,
    }))
    .sort((a, b) => b.monthlySearch - a.monthlySearch);

  // 페르소나 데이터 직렬화 (서버→클라이언트 전달용)
  const personaForPublish = rawPersona
    ? getPersonaForPipeline(rawPersona as Record<string, unknown>)
    : null;

  // owner_input 데이터도 별도 전달
  const bp = rawPersona as Record<string, unknown> | null;
  const ownerInput = bp
    ? {
        brand_story: bp.owner_input
          ? ((bp.owner_input as Record<string, unknown>)?.brand_story as string) || ""
          : "",
        forbidden_content: bp.owner_input
          ? ((bp.owner_input as Record<string, unknown>)?.forbidden_content as string) || ""
          : "",
        awards_certifications: bp.owner_input
          ? ((bp.owner_input as Record<string, unknown>)?.awards_certifications as string[]) || []
          : [],
      }
    : null;

  // rawPersona에서 location/URL 필드 추출 (getPersonaForPipeline이 제거하는 필드들)
  const aiInferred = bp?.ai_inferred as Record<string, unknown> | undefined;
  const personaExtras = bp
    ? {
        category: (bp.category as string) || "",
        region: (bp.region as string) || (bp.location as string) || "",
        naverPlaceUrl: (bp.naver_place_url as string) || (bp.place_url as string) || "",
        homepage: (bp.homepage_url as string) || (bp.website as string) || (bp.homepage as string) || (bp.website_url as string) || "",
        placeId: (bp.place_id as string) || (aiInferred?.place_id as string) || (bp.naver_place_id as string) || "",
      }
    : null;

  return (
    <BlogPublishFlow
      clientId={clientId}
      clientName={clientInfo?.name || null}
      clientWebsiteUrl={clientInfo?.websiteUrl || null}
      brandAnalysis={brandAnalysis}
      publishingAccounts={publishingAccounts}
      activeKeywords={activeKeywords}
      initialKeywordId={keywordId}
      initialKeywordName={keywordName ? decodeURIComponent(keywordName) : undefined}
      personaData={personaForPublish}
      ownerInputData={ownerInput}
      personaExtras={personaExtras}
    />
  );
}
