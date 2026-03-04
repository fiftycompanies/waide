import { getContent } from "@/lib/actions/ops-actions";
import { getBlogAccounts } from "@/lib/actions/blog-account-actions";
import { ContentEditor } from "@/components/ops/content-editor";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { notFound } from "next/navigation";

interface ContentPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContentPage({ params }: ContentPageProps) {
  const { id } = await params;
  const content = await getContent(id);

  if (!content) {
    notFound();
  }

  // 해당 콘텐츠의 client_id로 블로그 계정 목록 조회
  const blogAccounts = content.client_id
    ? await getBlogAccounts(content.client_id)
    : [];

  return (
    <div className="p-6 space-y-4">
      <Breadcrumb items={[
        { label: "콘텐츠", href: "/ops/contents" },
        { label: content.title || "콘텐츠 상세" },
      ]} />
      <ContentEditor content={content} blogAccounts={blogAccounts.filter((a) => a.is_active)} />
    </div>
  );
}
