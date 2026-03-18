import { getClientPointsList, getPointTransactions, getPointSettings } from "@/lib/actions/point-actions";
import { PointsPageClient } from "@/components/points/points-page-client";

export const dynamic = "force-dynamic";

export default async function PointsPage() {
  const [clientPoints, transactions, settings] = await Promise.all([
    getClientPointsList(),
    getPointTransactions(),
    getPointSettings(),
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">포인트 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          고객별 포인트 잔액 관리 및 거래 이력
        </p>
      </div>

      <PointsPageClient
        clientPoints={clientPoints}
        transactions={transactions}
        settings={settings}
      />
    </div>
  );
}
