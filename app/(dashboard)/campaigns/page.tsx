import { getSelectedClientId, getAiMarketBrands } from "@/lib/actions/brand-actions";
import { getCampaigns } from "@/lib/actions/campaign-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandBadge } from "@/components/ui/brand-badge";
import Link from "next/link";
import { Plus, Target } from "lucide-react";

const CAMPAIGN_STATUS_KO: Record<string, string> = {
  draft: "초안",
  active: "진행중",
  paused: "일시정지",
  completed: "완료",
  cancelled: "취소",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  active: "bg-violet-100 text-violet-700 border-violet-200",
  paused: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
};

export default async function CampaignsPage() {
  const [selectedClientId, brands] = await Promise.all([
    getSelectedClientId(),
    getAiMarketBrands(),
  ]);

  const selectedBrand = brands.find((b) => b.id === selectedClientId);
  const campaigns = await getCampaigns(selectedClientId);
  const isAllMode = !selectedClientId;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">캠페인</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAllMode ? (
              <span className="font-medium text-foreground">전체 브랜드</span>
            ) : (
              <span className="font-medium text-foreground">{selectedBrand?.name}</span>
            )}
            의 캠페인 · {campaigns.length}개
          </p>
        </div>
        {!isAllMode && (
          <Button asChild className="gap-1.5 bg-violet-600 hover:bg-violet-700">
            <Link href="/campaigns/new">
              <Plus className="h-4 w-4" />
              새 캠페인
            </Link>
          </Button>
        )}
      </div>

      {/* 캠페인 목록 */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-20 text-center gap-3">
          <Target className="h-8 w-8 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">아직 캠페인이 없습니다</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              [+ 새 캠페인] 버튼으로 첫 캠페인을 시작해보세요.
            </p>
          </div>
          {!isAllMode && (
            <Button asChild size="sm" className="mt-2 bg-violet-600 hover:bg-violet-700">
              <Link href="/campaigns/new">
                <Plus className="h-4 w-4 mr-1.5" />
                새 캠페인 시작
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
                {isAllMode && <th className="px-4 py-3 text-left">브랜드</th>}
                <th className="px-4 py-3 text-left">캠페인명</th>
                <th className="px-4 py-3 text-left">타겟 키워드</th>
                <th className="px-4 py-3 text-center">상태</th>
                <th className="px-4 py-3 text-right">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  {isAllMode && (
                    <td className="px-4 py-3">
                      {c.client_name ? (
                        <BrandBadge name={c.client_name} />
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.keyword_name ?? (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 ${STATUS_COLORS[c.status] ?? ""}`}
                    >
                      {CAMPAIGN_STATUS_KO[c.status] ?? c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
