import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { getContent } from "@/lib/actions/ops-actions";
import { getBlogAccounts } from "@/lib/actions/blog-account-actions";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ContentEditor } from "@/components/ops/content-editor";

export const dynamic = "force-dynamic";

async function ContentDetailInner({ id }: { id: string }) {
  const content = await getContent(id);
  if (!content) notFound();

  const blogAccounts = await getBlogAccounts(content.client_id ?? null);
  const activeAccounts = blogAccounts.filter((a: any) => a.is_active);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "콘텐츠 관리", href: "/contents" },
          { label: content.title ?? "(제목 없음)" },
        ]}
      />
      <ContentEditor content={content} blogAccounts={activeAccounts} />
    </div>
  );
}

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        <ContentDetailPageInner params={params} />
      </Suspense>
    </div>
  );
}

async function ContentDetailPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentDetailInner id={id} />;
}
