import { getContent } from "@/lib/actions/ops-actions";
import { getBlogAccounts } from "@/lib/actions/blog-account-actions";
import { ContentEditor } from "@/components/ops/content-editor";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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
      <div className="flex items-center gap-3">
        <Link
          href="/ops/contents"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          콘텐츠 목록
        </Link>
      </div>
      <ContentEditor content={content} blogAccounts={blogAccounts.filter((a) => a.is_active)} />
    </div>
  );
}
