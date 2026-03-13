import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { getAiMarketBrands, getSelectedClientId, getSelectedBrandInfo } from "@/lib/actions/brand-actions";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getCurrentUser, isClientRole } from "@/lib/auth";
import { OnboardingCheckModal } from "@/components/onboarding/onboarding-check-modal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 각 데이터를 독립적으로 fetch — 하나가 실패해도 나머지는 정상 동작
  const [brandsResult, selectedClientIdResult, adminSessionResult, currentUserResult] =
    await Promise.allSettled([
      getAiMarketBrands(),
      getSelectedClientId(),
      getAdminSession(),
      getCurrentUser(),
    ]);

  const brands =
    brandsResult.status === "fulfilled" ? brandsResult.value : [];
  const selectedClientId =
    selectedClientIdResult.status === "fulfilled"
      ? selectedClientIdResult.value
      : null;
  const adminSession =
    adminSessionResult.status === "fulfilled"
      ? adminSessionResult.value
      : null;
  const currentUser =
    currentUserResult.status === "fulfilled"
      ? currentUserResult.value
      : null;

  // 고객 역할 감지
  const isClient = currentUser && isClientRole(currentUser.role);

  // 선택된 브랜드의 온보딩 상태 확인 (실패 시 null)
  let brandInfo: Awaited<ReturnType<typeof getSelectedBrandInfo>> = null;
  if (selectedClientId) {
    try {
      brandInfo = await getSelectedBrandInfo(selectedClientId);
    } catch {
      brandInfo = null;
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        brands={brands}
        selectedClientId={selectedClientId}
        adminRole={adminSession?.role}
        // 고객 역할 사용자 정보
        userRole={isClient ? currentUser.role : undefined}
        userName={isClient ? currentUser.name : undefined}
        userEmail={isClient ? currentUser.email : undefined}
        brandName={isClient ? (currentUser.client_brand_name || "") : undefined}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/40 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {/* 고객 역할: 브랜드명 표시 */}
          {isClient && currentUser.client_brand_name && (
            <span className="text-sm font-medium text-muted-foreground">
              {currentUser.client_brand_name}
            </span>
          )}
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>

      {/* 온보딩 미완료 브랜드 알림 모달 (어드민만) */}
      {!isClient && brandInfo && (
        <OnboardingCheckModal
          clientId={brandInfo.id}
          clientName={brandInfo.name}
          onboardingStatus={brandInfo.onboarding_status}
          hasBrandPersona={brandInfo.has_brand_persona}
          hasBrandAnalysis={brandInfo.has_brand_analysis}
        />
      )}
    </SidebarProvider>
  );
}
