import { BrandAnalyzer } from "@/components/onboarding";
import { OnboardingActions } from "@/components/onboarding/onboarding-actions";
import { createAdminClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  // 고객 목록 조회 (분석 연결용)
  const db = createAdminClient();
  const { data: clients } = await db
    .from("clients")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            브랜드 온보딩
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            웹사이트 URL을 입력하여 AI가 브랜드의 페르소나를 자동으로 분석합니다.
          </p>
        </div>
        <OnboardingActions
          clients={(clients ?? []).map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))}
        />
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center gap-4 mb-8 p-4 rounded-lg bg-muted/50 border border-border/40">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-white text-sm font-semibold">
            1
          </div>
          <span className="text-sm font-medium">URL 입력</span>
        </div>
        <div className="h-px flex-1 bg-border/40" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold">
            2
          </div>
          <span className="text-sm text-muted-foreground">AI 분석</span>
        </div>
        <div className="h-px flex-1 bg-border/40" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold">
            3
          </div>
          <span className="text-sm text-muted-foreground">저장</span>
        </div>
      </div>

      {/* Brand Analyzer Component */}
      <BrandAnalyzer />
    </div>
  );
}
