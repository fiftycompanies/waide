import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?mode=customer");
  }

  if (!user.client_id) {
    // 고객이지만 클라이언트 연결 안 됨
    redirect("/login?error=no_client");
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
