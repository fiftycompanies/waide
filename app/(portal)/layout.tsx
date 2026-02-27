import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { PortalPendingPage } from "@/components/portal/portal-pending";

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

  return (
    <PortalShell
      userName={user.name}
      userEmail={user.email}
      userId={user.id}
      clientId={user.client_id}
      brandName={user.client_brand_name || ""}
    >
      {children}
    </PortalShell>
  );
}
