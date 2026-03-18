import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getContent } from "@/lib/actions/ops-actions";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PublishWizard } from "@/app/(dashboard)/ops/contents/[id]/publish/publish-wizard";

export const dynamic = "force-dynamic";

async function PublishContent({ id }: { id: string }) {
  const content = await getContent(id);

  if (!content) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        콘텐츠를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "콘텐츠 관리", href: "/contents" },
          { label: content.title ?? "(제목 없음)", href: `/contents/${id}` },
          { label: "발행" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">콘텐츠 발행</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {content.title}
        </p>
      </div>
      <PublishWizard content={content} />
    </div>
  );
}

export default function PublishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="p-6 space-y-6">
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        <PublishInner params={params} />
      </Suspense>
    </div>
  );
}

async function PublishInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublishContent id={id} />;
}
