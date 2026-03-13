// ─── 브랜드 분석 페이지 (Server Component) ─────────────────────────────────
// 고객 사용자용 독립 페이지 — 어드민 클라이언트 상세 "브랜드 분석" 탭과 동일 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
import { getCurrentUser } from "@/lib/auth";
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import BrandAnalysisClient from "@/components/brand-analysis/brand-analysis-client";

export default async function BrandAnalysisPage() {
  // 고객 역할: getCurrentUser().client_id 직접 사용
  // 어드민 역할: 브랜드 셀렉터(쿠키) 기반 getSelectedClientId() 폴백
  const currentUser = await getCurrentUser();
  const clientId = currentUser?.client_id || (await getSelectedClientId());

  if (!clientId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">
          브랜드 정보를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  return <BrandAnalysisClient clientId={clientId} />;
}
