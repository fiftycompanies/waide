import { redirect } from "next/navigation";

// /ops/contents/[id] → /contents/[id] (route migrated)
export default async function OpsContentDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/contents/${id}`);
}
