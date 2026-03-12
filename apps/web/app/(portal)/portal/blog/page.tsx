import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import PortalBlogUnifiedClient from "@/components/portal/portal-blog-unified-client";

export default async function PortalBlogPage() {
  const user = await getCurrentUser();

  if (!user || !user.client_id) {
    redirect("/login");
  }

  return <PortalBlogUnifiedClient clientId={user.client_id} />;
}
