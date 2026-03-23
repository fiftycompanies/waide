/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getAiMarketBrands, getSelectedClientId } from "@/lib/actions/brand-actions";
import { GeneratePipelineForm } from "@/components/homepage/generate-pipeline-form";

export const dynamic = "force-dynamic";

export default async function HomepageGeneratePage() {
  await requireAdminSession();

  const [brands, selectedClientId] = await Promise.all([
    getAiMarketBrands(),
    getSelectedClientId(),
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI 홈페이지 생성</h1>
        <p className="text-sm text-muted-foreground mt-1">
          레퍼런스 크롤링 기반으로 브랜드 맞춤형 홈페이지를 자동 생성합니다
        </p>
      </div>

      <GeneratePipelineForm brands={brands} initialClientId={selectedClientId} />
    </div>
  );
}
