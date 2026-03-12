import { redirect } from "next/navigation";

// /clients/[id] → /ops/clients/[id] (route alias)
export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/ops/clients/${id}`);
}
