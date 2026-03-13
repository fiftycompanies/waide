import { redirect } from "next/navigation";

export default function PortalBlogWritePage() {
  redirect("/portal/contents?tab=create");
}
