import { redirect } from "next/navigation";

// /ops/jobs → /contents?tab=jobs (absorbed into contents management)
export default function JobsRedirectPage() {
  redirect("/contents?tab=jobs");
}
