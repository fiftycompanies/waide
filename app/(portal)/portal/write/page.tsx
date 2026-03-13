import { redirect } from "next/navigation";

export default function PortalWritePage() {
  redirect("/portal/contents?tab=create");
}
