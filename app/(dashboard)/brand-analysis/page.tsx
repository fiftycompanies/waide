// ─── 브랜드 분석 페이지 (Server Component) ─────────────────────────────────
// 고객 사용자용 독립 페이지 — 어드민 클라이언트 상세 "브랜드 분석" 탭과 동일 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
import { getCurrentUser } from "@/lib/auth";
import BrandAnalysisClient from "@/components/brand-analysis/brand-analysis-client";

export default async function BrandAnalysisPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.client_id) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">
          브랜드 정보를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  return <BrandAnalysisClient clientId={currentUser.client_id} />;
}
