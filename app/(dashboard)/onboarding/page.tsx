import { BrandAnalyzer } from "@/components/onboarding";

export default function OnboardingPage() {
  return (
    <div className="container max-w-4xl py-8 px-4 md:px-6">
      {/* Page Header */}
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          브랜드 온보딩
        </h1>
        <p className="text-muted-foreground text-lg">
          웹사이트 URL을 입력하여 AI가 브랜드의 페르소나를 자동으로 분석합니다.
        </p>
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
