// ─── 브랜드 분석 페이지 (Server Component) ─────────────────────────────────
// 고객 사용자용 독립 페이지 — 어드민 클라이언트 상세 "브랜드 분석" 탭과 동일 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import BrandAnalysisClient from "@/components/brand-analysis/brand-analysis-client";

export default async function BrandAnalysisPage() {
  const clientId = await getSelectedClientId();

  if (!clientId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">
          브랜드를 선택해주세요.
        </p>
      </div>
    );
  }

  return <BrandAnalysisClient clientId={clientId} />;
}
