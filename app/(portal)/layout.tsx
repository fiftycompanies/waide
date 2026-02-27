import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.client_id) {
    // client_id 없는 사용자 → Supabase 세션 정리 후 로그인으로 (루프 방지)
    const supabase = await createClient();
    await supabase.auth.signOut();
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
