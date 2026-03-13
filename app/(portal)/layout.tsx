import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalPendingPage } from "@/components/portal/portal-pending";
import { KakaoFloatingButton } from "@/components/portal/kakao-floating-button";
import { getUnreadCount } from "@/lib/actions/notification-actions";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // client_id 없는 사용자 → 리디렉트 대신 인라인 대기 페이지 (루프 방지)
  if (!user.client_id) {
    return <PortalPendingPage />;
  }

  // 읽지 않은 알림 수 조회
  let unreadCount = 0;
  try {
    unreadCount = await getUnreadCount(user.client_id);
  } catch {
    // 알림 테이블 미생성 시 graceful skip
  }

  return (
    <>
      <SidebarProvider>
        <AppSidebar
          userRole={user.role}
          userName={user.name}
          userEmail={user.email}
          brandName={user.client_brand_name || ""}
          unreadNotificationCount={unreadCount}
        />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/40 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {user.client_brand_name && (
              <span className="text-sm font-medium text-muted-foreground">
                {user.client_brand_name}
              </span>
            )}
          </header>
          <main className="flex-1 overflow-auto">
            {/* Hidden meta for client pages to read clientId/userId */}
            <meta name="portal-client-id" content={user.client_id} />
            <meta name="portal-user-id" content={user.id} />
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <KakaoFloatingButton />
    </>
  );
}
