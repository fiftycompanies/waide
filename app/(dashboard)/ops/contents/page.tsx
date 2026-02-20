import { getContents } from "@/lib/actions/ops-actions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const PUBLISH_STATUSES = [
  { label: "전체", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Review", value: "review" },
  { label: "Approved", value: "approved" },
  { label: "Published", value: "published" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  published: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

interface ContentsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ContentsPage({ searchParams }: ContentsPageProps) {
  const params = await searchParams;
  const status = params.status ?? "";
  const contents = await getContents(status ? { publishStatus: status } : {});

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">콘텐츠 뷰어</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI가 생성한 원고를 확인하고 편집합니다
        </p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {PUBLISH_STATUSES.map((s) => (
          <Link
            key={s.value}
            href={s.value ? `/ops/contents?status=${s.value}` : "/ops/contents"}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
              status === s.value
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:border-foreground/40"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Content table */}
      {contents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">콘텐츠 없음</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
            <span>제목</span>
            <span>글자수</span>
            <span>상태</span>
            <span>생성일</span>
          </div>

          <div className="divide-y">
            {contents.map((content) => (
              <Link
                key={content.id}
                href={`/ops/contents/${content.id}`}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {content.title ?? "(제목 없음)"}
                  </p>
                  {content.tags && content.tags.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {content.tags.slice(0, 3).join(", ")}
                    </p>
                  )}
                </div>

                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {content.word_count?.toLocaleString() ?? "—"}자
                </span>

                <Badge
                  variant="outline"
                  className={`text-xs ${STATUS_COLORS[content.publish_status] ?? ""}`}
                >
                  {content.publish_status}
                </Badge>

                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(content.created_at).toLocaleString("ko-KR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
