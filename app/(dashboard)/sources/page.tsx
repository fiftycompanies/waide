import { SourcesClient } from "@/components/sources/sources-client";
import { getContentSources } from "@/lib/actions/content-source-actions";
import { getSelectedClientId } from "@/lib/actions/brand-actions";

export default async function SourcesPage() {
  const clientId = await getSelectedClientId();
  const sources = await getContentSources(clientId);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <SourcesClient sources={sources} clientId={clientId} />
    </div>
  );
}
