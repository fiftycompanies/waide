import { getCurrentUser, isClientRole } from "@/lib/auth";
import { getClientHomepage } from "@/lib/actions/homepage-actions";
import { ClientHomepageView } from "@/components/homepage/client-homepage-view";
import { AdminHomepageView } from "@/components/homepage/admin-homepage-view";

export const dynamic = "force-dynamic";

export default async function HomepagePage() {
  const user = await getCurrentUser();

  if (user && isClientRole(user.role) && user.client_id) {
    const project = await getClientHomepage(user.client_id);
    return <ClientHomepageView project={project} />;
  }

  return <AdminHomepageView />;
}
