import { redirect } from "next/navigation";

export default function PortalReportsPage() {
  redirect("/portal/analytics?tab=report");
}
