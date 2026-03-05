import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { getAiMarketBrands, getSelectedClientId, getSelectedBrandInfo } from "@/lib/actions/brand-actions";
import { getAdminSession } from "@/lib/auth/admin-session";
import { OnboardingCheckModal } from "@/components/onboarding/onboarding-check-modal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [brands, selectedClientId, adminSession] = await Promise.all([
    getAiMarketBrands(),
    getSelectedClientId(),
    getAdminSession(),
  ]);

  // 선택된 브랜드의 온보딩 상태 확인
  const brandInfo = selectedClientId
    ? await getSelectedBrandInfo(selectedClientId)
    : null;

  return (
    <SidebarProvider>
      <AppSidebar brands={brands} selectedClientId={selectedClientId} adminRole={adminSession?.role} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/40 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {/* Breadcrumb or page title can be added here */}
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>

      {/* 온보딩 미완료 브랜드 알림 모달 */}
      {brandInfo && (
        <OnboardingCheckModal
          clientId={brandInfo.id}
          clientName={brandInfo.name}
          onboardingStatus={brandInfo.onboarding_status}
          hasBrandPersona={brandInfo.has_brand_persona}
        />
      )}
    </SidebarProvider>
  );
}
