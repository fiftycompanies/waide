import { getSerpSchedulerSettings } from "@/lib/actions/settings-actions";
import { getBrandSummaryStats } from "@/lib/actions/analytics-actions";
import { SerpSettingsClient } from "@/components/ops/serp-settings-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SerpSettingsPage() {
  const [settings, brandStats] = await Promise.all([
    getSerpSchedulerSettings(),
    getBrandSummaryStats(),
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SERP 스케줄러 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          네이버 SERP 순위 수집 주기, 알림 채널, 임계값을 설정합니다
        </p>
      </div>
      <SerpSettingsClient settings={settings} />

      {/* 브랜드별 키워드 수집 현황 */}
      {brandStats.length > 0 && (
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">브랜드별 수집 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left font-medium">브랜드</th>
                    <th className="py-2 text-center font-medium">활성 키워드</th>
                    <th className="py-2 text-center font-medium">발행 계정</th>
                    <th className="py-2 text-center font-medium">이번달 콘텐츠</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {brandStats.map((b) => (
                    <tr key={b.brand_id} className="hover:bg-muted/20">
                      <td className="py-2 font-medium">{b.brand_name}</td>
                      <td className="py-2 text-center">
                        {b.active_keywords > 0 ? (
                          <span className="font-semibold text-violet-600">{b.active_keywords}</span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="py-2 text-center">
                        {b.active_accounts > 0 ? b.active_accounts : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="py-2 text-center">
                        {b.content_this_month > 0 ? (
                          <span className="font-semibold text-emerald-600">{b.content_this_month}</span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
