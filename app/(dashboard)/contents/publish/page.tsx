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

  const [brandAnalysis, publishingAccounts, activePool, rawPersona] = await Promise.all([
    getBrandAnalysisForPublishing(clientId),
    getPublishingAccounts(clientId),
    getActiveKeywordPool(clientId),
    getPersona(clientId),
  ]);

  const activeKeywords = (activePool || []).map((kw) => ({
    keyword: kw.keyword,
    id: kw.id,
  }));

  // 페르소나 데이터 직렬화 (서버→클라이언트 전달용)
  const personaForPublish = rawPersona
    ? getPersonaForPipeline(rawPersona as Record<string, unknown>)
    : null;

  // owner_input 데이터도 별도 전달
  const ownerInput = rawPersona
    ? {
        brand_story: (rawPersona as Record<string, unknown>).owner_input
          ? ((rawPersona as Record<string, unknown>).owner_input as Record<string, unknown>)?.brand_story as string || ""
          : "",
        forbidden_content: (rawPersona as Record<string, unknown>).owner_input
          ? ((rawPersona as Record<string, unknown>).owner_input as Record<string, unknown>)?.forbidden_content as string || ""
          : "",
        awards_certifications: (rawPersona as Record<string, unknown>).owner_input
          ? ((rawPersona as Record<string, unknown>).owner_input as Record<string, unknown>)?.awards_certifications as string[] || []
          : [],
      }
    : null;

  return (
    <BlogPublishFlow
      clientId={clientId}
      brandAnalysis={brandAnalysis}
      publishingAccounts={publishingAccounts}
      activeKeywords={activeKeywords}
      initialKeywordId={keywordId}
      initialKeywordName={keywordName ? decodeURIComponent(keywordName) : undefined}
      personaData={personaForPublish}
      ownerInputData={ownerInput}
    />
  );
}
