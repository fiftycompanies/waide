import { getContents } from "@/lib/actions/ops-actions";
import { getBrandList, getSelectedClientId } from "@/lib/actions/brand-actions";
import { Badge } from "@/components/ui/badge";
import { BrandBadge } from "@/components/ui/brand-badge";
import Link from "next/link";
import { ContentsPageHeaderWithSelector } from "@/components/ops/contents-page-header";

const PUBLISH_STATUSES = [
  { label: "전체", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Review", value: "review" },
  { label: "Approved", value: "approved" },
  { label: "Published", value: "published" },
  { label: "Rejected", value: "rejected" },
];

const GENERATED_BY_TABS = [
  { label: "전체", value: "" },
  { label: "🤖 AI 생성", value: "ai" },
  { label: "✍️ 수동 등록", value: "human" },
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
  searchParams: Promise<{ status?: string; by?: string }>;
}

export default async function ContentsPage({ searchParams }: ContentsPageProps) {
  const params = await searchParams;
  const status = params.status ?? "";
  const generatedBy = params.by ?? "";

  const [clientId, allBrands] = await Promise.all([
    getSelectedClientId(),
    getBrandList(),
  ]);
  const isAllMode = !clientId;

  const contents = await getContents({
    ...(status ? { publishStatus: status } : {}),
    ...(generatedBy ? { generatedBy } : {}),
    ...(clientId ? { clientId } : {}),
  });

  const brands = (allBrands ?? [])
    .filter((b) => b.is_active)
    .map((b) => ({ id: b.id, name: b.name }));

  function buildUrl(overrides: Record<string, string>) {
    const p: Record<string, string> = {};
    if (status) p.status = status;
    if (generatedBy) p.by = generatedBy;
    Object.assign(p, overrides);
    const qs = Object.entries(p)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `/ops/contents${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="p-6 space-y-6">
      <ContentsPageHeaderWithSelector brands={brands} />

      {/* 생성 주체 필터 */}
      <div className="flex gap-1.5">
        {GENERATED_BY_TABS.map((t) => (
          <Link
            key={t.value}
            href={buildUrl({ by: t.value })}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
              generatedBy === t.value
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:border-foreground/40"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* 발행 상태 필터 */}
      <div className="flex gap-2 flex-wrap">
        {PUBLISH_STATUSES.map((s) => (
          <Link
            key={s.value}
            href={buildUrl({ status: s.value })}
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
          <div className={`grid ${isAllMode ? "grid-cols-[auto_1fr_auto_auto_auto_auto_auto]" : "grid-cols-[1fr_auto_auto_auto_auto_auto]"} gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b`}>
            {isAllMode && <span>브랜드</span>}
            <span>제목</span>
            <span>구분</span>
            <span>글자수</span>
            <span>QC</span>
            <span>상태</span>
            <span>생성일</span>
          </div>

          <div className="divide-y">
            {contents.map((content) => (
              <Link
                key={content.id}
                href={`/ops/contents/${content.id}`}
                className={`grid ${isAllMode ? "grid-cols-[auto_1fr_auto_auto_auto_auto_auto]" : "grid-cols-[1fr_auto_auto_auto_auto_auto]"} gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors`}
              >
                {isAllMode && (
                  <div>
                    {content.client_name ? (
                      <BrandBadge name={content.client_name} />
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </div>
                )}
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

                <span className="text-base" title={content.generated_by ?? ""}>
                  {content.generated_by === "human" ? "✍️" : "🤖"}
                </span>

                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {content.word_count?.toLocaleString() ?? "—"}자
                </span>

                {/* QC 점수 */}
                <span className="text-xs whitespace-nowrap">
                  {content.metadata?.qc_score != null ? (
                    <span className={content.metadata.qc_pass ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                      {content.metadata.qc_score}점
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
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
