import { redirect } from "next/navigation";

export default function PortalContentsPage() {
  redirect("/portal/blog?tab=contents");
}
