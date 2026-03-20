import { getCurrentUser, isClientRole } from "@/lib/auth";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import { getClientHomepage } from "@/lib/actions/homepage-actions";
import { ClientHomepageView } from "@/components/homepage/client-homepage-view";
import { AdminHomepageView } from "@/components/homepage/admin-homepage-view";

export const dynamic = "force-dynamic";

export default async function HomepagePage() {
  const user = await getCurrentUser();

  // 클라이언트 역할: 자신의 홈페이지만 표시
  if (user && isClientRole(user.role) && user.client_id) {
    const project = await getClientHomepage(user.client_id);
    return <ClientHomepageView project={project} clientId={user.client_id} />;
  }

  // 어드민: Supabase Auth + HMAC 폴백
  const session = user ? { role: user.role } : await getAdminSession();
  if (!session) {
    return <AdminHomepageView />;
  }

  // 브랜드 셀렉터 선택값 반영
  const selectedClientId = await getSelectedClientId();

  return <AdminHomepageView clientId={selectedClientId} />;
}
