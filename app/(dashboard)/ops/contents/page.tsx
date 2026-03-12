import { redirect } from "next/navigation";

// /ops/contents → /contents (route migrated)
export default async function OpsContentsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; by?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.tab) qs.set("tab", params.tab);
  if (params.status) qs.set("status", params.status);
  if (params.by) qs.set("by", params.by);
  const query = qs.toString();
  redirect(`/contents${query ? `?${query}` : ""}`);
}
