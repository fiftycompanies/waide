// ─── 브랜드 분석 페이지 (Server Component) ─────────────────────────────────
// 고객(client_owner/client_member): 자기 브랜드 정보 + AI 추론 + 마케팅 방향
// 어드민(super_admin/admin/sales/viewer): 선택된 브랜드의 동일 정보
// ─────────────────────────────────────────────────────────────────────────────
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import { getBrandAnalysisPageData } from "@/lib/actions/persona-actions";
import BrandAnalysisClient from "@/components/brand-analysis/brand-analysis-client";
import { Microscope } from "lucide-react";

export default async function BrandAnalysisPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">
          로그인이 필요합니다.
        </p>
      </div>
    );
  }

  // 역할별 clientId 확보
  let clientId: string | null = null;
  if (isAdminRole(currentUser.role)) {
    clientId = await getSelectedClientId();
  } else {
    clientId = currentUser.client_id;
  }

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Microscope className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-bold mb-1">
          {isAdminRole(currentUser.role)
            ? "브랜드를 선택하세요"
            : "브랜드 정보를 불러올 수 없습니다"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {isAdminRole(currentUser.role)
            ? "사이드바 상단의 브랜드 선택기에서 분석할 브랜드를 선택해주세요."
            : "연결된 브랜드가 없습니다. 관리자에게 문의해주세요."}
        </p>
      </div>
    );
  }

  const data = await getBrandAnalysisPageData(clientId);

  if (data) {
    data.userRole = currentUser.role;
    data.userName = currentUser.name || currentUser.email || "";
    data.userPhone = currentUser.phone || "";
    data.userEmail = currentUser.email || "";
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Microscope className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-bold mb-1">브랜드 데이터를 찾을 수 없습니다</h3>
        <p className="text-sm text-muted-foreground">
          해당 브랜드의 정보가 아직 등록되지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">브랜드 분석</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data.client.name}의 마케팅 분석 결과와 브랜드 페르소나를 확인하고 관리합니다
        </p>
      </div>
      <BrandAnalysisClient data={data} />
    </div>
  );
}
