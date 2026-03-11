import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import PortalKeywordsClient from "./portal-keywords-client";

export default async function PortalKeywordsPage() {
  const user = await getCurrentUser();

  if (!user || !user.client_id) {
    redirect("/login");
  }

  return <PortalKeywordsClient clientId={user.client_id} />;
}
