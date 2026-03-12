import { getScoringWeights, getAnalysisOptions } from "@/lib/actions/settings-actions";
import { ScoringSettingsClient } from "@/components/ops/scoring-settings-client";

export default async function ScoringSettingsPage() {
  const [settings, analysisOptions] = await Promise.all([
    getScoringWeights(),
    getAnalysisOptions(),
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">점수 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          계정등급 / 키워드난이도 / 발행추천 / QC검수 / 마케팅점수 가중치를 관리합니다.
          변경 시 다음 산출부터 즉시 반영됩니다.
        </p>
      </div>
      <ScoringSettingsClient settings={settings} analysisOptions={analysisOptions} />
    </div>
  );
}
