import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getAEOSettings } from "@/lib/actions/aeo-tracking-actions";
import { AEOSettingsClient } from "@/components/settings/aeo-settings-client";

export const dynamic = "force-dynamic";

async function AEOSettingsSection() {
  const settings = await getAEOSettings();
  return <AEOSettingsClient initialSettings={settings} />;
}

export default function AEOSettingsPage() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AEO 추적 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI 엔진별 브랜드 언급 추적 설정 관리
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <AEOSettingsSection />
      </Suspense>
    </div>
  );
}
