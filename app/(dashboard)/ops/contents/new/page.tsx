import { redirect } from "next/navigation";
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import { getKeywords } from "@/lib/actions/keyword-actions";
import { getBlogAccounts } from "@/lib/actions/blog-account-actions";
import { NewContentForm } from "@/components/ops/new-content-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ keyword_id?: string }>;
}

export default async function NewContentPage({ searchParams }: PageProps) {
  const clientId = await getSelectedClientId();
  if (!clientId) redirect("/ops/contents");

  const params = await searchParams;
  const preselectedKeywordId = params.keyword_id ?? null;

  const [keywords, blogAccounts] = await Promise.all([
    getKeywords(clientId),
    getBlogAccounts(clientId),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link
          href="/ops/contents"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          콘텐츠 목록
        </Link>
        <h1 className="text-2xl font-bold">원고 직접 등록</h1>
        <p className="text-muted-foreground text-sm mt-1">
          작성한 원고를 수동으로 등록하고 SERP 순위를 추적합니다
        </p>
      </div>

      <NewContentForm
        clientId={clientId}
        keywords={keywords}
        blogAccounts={blogAccounts}
        defaultKeywordId={preselectedKeywordId}
      />
    </div>
  );
}
