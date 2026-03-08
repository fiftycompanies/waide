import { redirect } from "next/navigation";

// /ops/contents/[id]/publish → /contents/[id]/publish (route migrated)
export default async function OpsContentPublishRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/contents/${id}/publish`);
}
