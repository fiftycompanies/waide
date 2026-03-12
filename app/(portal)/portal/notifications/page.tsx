import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import PortalNotificationsClient from "@/components/portal/portal-notifications-client";

export default async function PortalNotificationsPage() {
  const user = await getCurrentUser();

  if (!user || !user.client_id) {
    redirect("/login");
  }

  return <PortalNotificationsClient clientId={user.client_id} />;
}
