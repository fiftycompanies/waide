import { SourcesClient } from "@/components/sources/sources-client";
import { getContentSources } from "@/lib/actions/content-source-actions";
import { getSelectedClientId } from "@/lib/actions/brand-actions";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const clientId = await getSelectedClientId();
  const sources = await getContentSources(clientId);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <SourcesClient sources={sources} clientId={clientId} />
    </div>
  );
}
