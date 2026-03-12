import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { PortalPendingPage } from "@/components/portal/portal-pending";
import { KakaoFloatingButton } from "@/components/portal/kakao-floating-button";
import { getUnreadCount } from "@/lib/actions/notification-actions";

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

  // Phase 4: 읽지 않은 알림 수 조회
  let unreadCount = 0;
  try {
    unreadCount = await getUnreadCount(user.client_id);
  } catch {
    // 알림 테이블 미생성 시 graceful skip
  }

  return (
    <>
      <PortalShell
        userName={user.name}
        userEmail={user.email}
        userId={user.id}
        clientId={user.client_id}
        brandName={user.client_brand_name || ""}
        unreadNotificationCount={unreadCount}
      >
        {children}
      </PortalShell>
      <KakaoFloatingButton />
    </>
  );
}
