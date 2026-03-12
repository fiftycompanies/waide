import { redirect } from "next/navigation";

// /ops/sources → /sources (route alias)
export default function SourcesRedirectPage() {
  redirect("/sources");
}
