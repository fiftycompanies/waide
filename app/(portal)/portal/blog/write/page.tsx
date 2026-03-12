import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import PortalWriteV2Client from "@/components/portal/portal-write-v2-client";

// NOTE: Old PortalWriteClient kept at components/portal/portal-write-client.tsx (not deleted)

export default async function PortalBlogWritePage() {
  const user = await getCurrentUser();

  if (!user || !user.client_id) {
    redirect("/login");
  }

  return <PortalWriteV2Client clientId={user.client_id} />;
}
