import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import PortalSerpClient from "@/components/portal/portal-serp-client";

export default async function PortalSerpPage() {
  const user = await getCurrentUser();

  if (!user || !user.client_id) {
    redirect("/login");
  }

  return <PortalSerpClient clientId={user.client_id} />;
}
