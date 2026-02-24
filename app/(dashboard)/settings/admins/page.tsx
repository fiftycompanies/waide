import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/admin-session";
import { getAdmins } from "@/lib/actions/admin-actions";
import { AdminsClient } from "@/components/settings/admins-client";

export default async function AdminsPage() {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) redirect("/dashboard");

  const admins = await getAdmins();

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">어드민 관리</h1>
        <p className="text-muted-foreground">어드민 계정을 생성하고 권한을 관리합니다 (슈퍼 어드민 전용)</p>
      </div>
      <AdminsClient admins={admins} currentAdminId={session.id} />
    </div>
  );
}
