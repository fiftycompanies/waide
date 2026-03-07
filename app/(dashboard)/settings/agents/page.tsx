import { redirect } from "next/navigation";

// /settings/agents → /ops/agent-settings (route alias)
export default async function AgentSettingsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.tab) qs.set("tab", params.tab);
  if (params.agent) qs.set("agent", params.agent);
  const query = qs.toString();
  redirect(`/ops/agent-settings${query ? `?${query}` : ""}`);
}
