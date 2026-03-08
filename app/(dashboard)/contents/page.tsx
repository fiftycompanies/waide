import { getContents, getJobs } from "@/lib/actions/ops-actions";
import { getBrandList, getSelectedClientId, getAiMarketBrands } from "@/lib/actions/brand-actions";
import { Badge } from "@/components/ui/badge";
import { BrandBadge } from "@/components/ui/brand-badge";
import Link from "next/link";
import { ExternalLink, FileText, Radio, Building2, Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ContentsPageHeaderWithSelector } from "@/components/ops/contents-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getBestRankContents } from "@/lib/actions/campaign-actions";
import {
  getActiveKeywordPool,
  getSuggestedKeywords,
} from "@/lib/actions/campaign-planning-actions";
import { CampaignPlanningClient } from "@/components/campaigns/campaign-planning-client";
import { ContentSourceSelector } from "@/components/contents/content-source-selector";
import { ContentsTabsWrapper } from "@/components/contents/contents-tabs-wrapper";

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

const JOB_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  DONE: "bg-green-100 text-green-700 border-green-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
};

interface ContentsPageProps {
  searchParams: Promise<{ status?: string; by?: string; tab?: string }>;
}

export default async function ContentsPage({ searchParams }: ContentsPageProps) {
  const params = await searchParams;
  const status = params.status ?? "";
  const generatedBy = params.by ?? "";
  const tab = (params.tab ?? "list") as "list" | "create" | "jobs";

  const [clientId, allBrands] = await Promise.all([
    getSelectedClientId(),
    getBrandList(),
  ]);
  const isAllMode = !clientId;

  const brands = (allBrands ?? [])
    .filter((b) => b.is_active)
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="p-6 space-y-6">
      <ContentsPageHeaderWithSelector brands={brands} />
      <ContentsTabsWrapper activeTab={tab}>
        {tab === "list" && (
          <ContentListTab
            clientId={clientId}
            isAllMode={isAllMode}
            status={status}
            generatedBy={generatedBy}
          />
        )}
        {tab === "create" && (
          <ContentCreateTab clientId={clientId} />
        )}
        {tab === "jobs" && (
          <ContentJobsTab clientId={clientId} />
        )}
      </ContentsTabsWrapper>
    </div>
  );
}

// ── Tab 1: 콘텐츠 목록 ───────────────────────────────────────────────────────
async function ContentListTab({
  clientId,
  isAllMode,
  status,
  generatedBy,
}: {
  clientId: string | null;
  isAllMode: boolean;
  status: string;
  generatedBy: string;
}) {
  const contents = await getContents({
    ...(status ? { publishStatus: status } : {}),
    ...(generatedBy ? { generatedBy } : {}),
    ...(clientId ? { clientId } : {}),
  });

  function buildUrl(overrides: Record<string, string>) {
    const p: Record<string, string> = { tab: "list" };
    if (status) p.status = status;
    if (generatedBy) p.by = generatedBy;
    Object.assign(p, overrides);
    const qs = Object.entries(p)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `/contents${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-4">
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
        <EmptyState
          icon={FileText}
          title="콘텐츠가 없습니다"
          description="콘텐츠가 생성되면 여기에 표시됩니다."
          actionLabel="새 콘텐츠 생성"
          actionHref="/contents?tab=create"
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
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
            {contents.slice(0, 20).map((content) => (
              <Link
                key={content.id}
                href={`/contents/${content.id}`}
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
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">
                      {content.title ?? "(제목 없음)"}
                    </p>
                    {content.published_url && (
                      <span title="발행됨">
                        <ExternalLink className="h-3 w-3 text-emerald-500 shrink-0" />
                      </span>
                    )}
                    {content.is_tracking && (
                      <span title="순위 추적 중">
                        <Radio className="h-3 w-3 text-blue-500 shrink-0" />
                      </span>
                    )}
                  </div>
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

// ── Tab 2: 새 콘텐츠 생성 ───────────────────────────────────────────────
async function ContentCreateTab({ clientId }: { clientId: string | null }) {
  if (!clientId) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Building2 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            사이드바에서 브랜드를 먼저 선택해주세요
          </p>
        </CardContent>
      </Card>
    );
  }

  const brands = await getAiMarketBrands();
  const selectedBrand = brands.find((b) => b.id === clientId);

  const [activePool, suggestedKeywords, bestContents] = await Promise.all([
    getActiveKeywordPool(clientId),
    getSuggestedKeywords(clientId),
    getBestRankContents(clientId),
  ]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{selectedBrand?.name}</span>의
        타겟 키워드를 선택하고 AI 에이전트에게 콘텐츠 생성을 지시합니다
      </p>
      <CampaignPlanningClient
        clientId={clientId}
        initialActivePool={activePool}
        initialSuggestedKeywords={suggestedKeywords}
        bestContents={bestContents}
      />
    </div>
  );
}

// ── Tab 3: 작업 현황 ──────────────────────────────────────────────────────────
async function ContentJobsTab({ clientId }: { clientId: string | null }) {
  const jobs = await getJobs({
    ...(clientId ? { clientId } : {}),
  });

  const activeJobs = jobs.filter(
    (j) => j.status === "PENDING" || j.status === "IN_PROGRESS"
  );

  if (activeJobs.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="진행 중인 작업이 없습니다"
        description="콘텐츠 생성을 지시하면 여기에 작업 현황이 표시됩니다."
        actionLabel="새 콘텐츠 생성"
        actionHref="/contents?tab=create"
      />
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
        <span>작업명</span>
        <span>유형</span>
        <span>우선순위</span>
        <span>상태</span>
        <span>생성일</span>
      </div>
      <div className="divide-y">
        {activeJobs.map((job) => (
          <div
            key={job.id}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{job.title ?? "(제목 없음)"}</p>
              {job.assigned_agent && (
                <p className="text-xs text-muted-foreground mt-0.5">{job.assigned_agent}</p>
              )}
            </div>
            <Badge variant="outline" className="text-xs">{job.job_type}</Badge>
            <Badge variant="outline" className="text-xs">{job.priority}</Badge>
            <Badge variant="outline" className={`text-xs ${JOB_STATUS_COLORS[job.status] ?? ""}`}>
              {job.status}
            </Badge>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(job.created_at).toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
