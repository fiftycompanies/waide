import { Suspense } from "react";
import { getContents } from "@/lib/actions/ops-actions";
import { getBrandList, getSelectedClientId } from "@/lib/actions/brand-actions";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Radio, Building2, RefreshCw, Send } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ContentsPageHeaderWithSelector } from "@/components/ops/contents-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentsTabsWrapper } from "@/components/contents/contents-tabs-wrapper";
import { ContentListClient } from "@/components/contents/content-list-client";
import {
  getRecommendationsList,
  getRecommendationStats,
  getAccountGrades,
} from "@/lib/actions/recommendation-actions";
import { getBlogAccounts } from "@/lib/actions/blog-account-actions";
import {
  getAutoPublishSettings,
  getPublications,
} from "@/lib/actions/publish-actions";
import { getKeywordPublishHistory } from "@/lib/actions/keyword-actions";
import { RecommendationsSection } from "@/components/analytics/recommendations-section";
import { AutoPublishSettingsClient } from "@/components/publish/auto-publish-settings-client";
import { KeywordHistoryClient } from "@/components/contents/keyword-history-client";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  tracking: "bg-sky-100 text-sky-700 border-sky-200",
  published: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  review: "검토",
  approved: "승인",
  tracking: "추적중",
  published: "발행됨",
  rejected: "반려",
  archived: "보관",
};

interface ContentsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ContentsPage({ searchParams }: ContentsPageProps) {
  const params = await searchParams;

  // tab=publish → /contents/publish 리다이렉트 (하위 호환)
  if (params.tab === "publish") {
    const { redirect } = await import("next/navigation");
    redirect("/contents/publish");
  }

  const tab = (params.tab ?? "list") as "list" | "recommend" | "history" | "keyword_history" | "auto";

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
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ContentListTab clientId={clientId} isAllMode={isAllMode} />
          </Suspense>
        )}
        {tab === "recommend" && (
          <Suspense fallback={<Skeleton className="h-96" />}>
            <PublishRecommendTab clientId={clientId} />
          </Suspense>
        )}
        {tab === "history" && (
          <Suspense fallback={<Skeleton className="h-96" />}>
            <PublishHistoryTab clientId={clientId} />
          </Suspense>
        )}
        {tab === "keyword_history" && (
          <Suspense fallback={<Skeleton className="h-96" />}>
            <KeywordHistoryTab clientId={clientId} />
          </Suspense>
        )}
        {tab === "auto" && (
          <Suspense fallback={<Skeleton className="h-96" />}>
            <PublishAutoTab clientId={clientId} />
          </Suspense>
        )}
      </ContentsTabsWrapper>
    </div>
  );
}

// ── Tab 1: 콘텐츠 목록 (dropdown filter + 더보기) ────────────────────────
async function ContentListTab({
  clientId,
  isAllMode,
}: {
  clientId: string | null;
  isAllMode: boolean;
}) {
  const contents = await getContents({
    ...(clientId ? { clientId } : {}),
  });

  return <ContentListClient contents={contents} isAllMode={isAllMode} />;
}

// ── Tab 2: 발행 추천 (이전 발행 대기) ─────────────────────────────────
async function PublishRecommendTab({ clientId }: { clientId: string | null }) {
  if (!clientId) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Building2 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">브랜드를 먼저 선택해주세요</p>
        </CardContent>
      </Card>
    );
  }

  const [recommendations, stats, accountGrades, approvedContents] = await Promise.all([
    getRecommendationsList(clientId, { limit: 100 }),
    getRecommendationStats(clientId),
    getAccountGrades(clientId),
    getContents({ clientId, publishStatus: "approved" }),
  ]);

  return (
    <div className="space-y-6">
      {approvedContents.length > 0 && (
        <PublishReadyContents contents={approvedContents} />
      )}

      <RecommendationsSection
        recommendations={recommendations}
        stats={stats}
        accountGrades={accountGrades}
      />
    </div>
  );
}

// ── 발행 준비 완료 콘텐츠 (5+5 더보기) ──────────────────────────────────
function PublishReadyContents({ contents }: { contents: Array<{
  id: string;
  title: string | null;
  tags: string[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any> | null;
  created_at: string;
}> }) {
  return <PublishReadyContentsClient contents={contents} />;
}

// ── Tab 3: 발행 이력 (bug fix: null clientId guard) ─────────────────────
function safeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR");
}

async function PublishHistoryTab({ clientId }: { clientId: string | null }) {
  if (!clientId) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Building2 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">브랜드를 먼저 선택해주세요</p>
        </CardContent>
      </Card>
    );
  }

  const [publications, publishedContents] = await Promise.all([
    getPublications({ clientId }),
    getContents({ clientId, publishStatus: "published" }),
  ]);

  const hasPublications = publications.length > 0;

  if (!hasPublications && publishedContents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="발행된 콘텐츠가 없습니다"
        description="콘텐츠를 발행하면 여기에 이력이 표시됩니다."
      />
    );
  }

  const platformLabel = (p: string) => {
    switch (p) {
      case "tistory": return "Tistory";
      case "wordpress": return "WordPress";
      case "medium": return "Medium";
      case "naver": return "Naver";
      default: return p;
    }
  };

  const platformEmoji = (p: string) => {
    switch (p) {
      case "tistory": return "📝";
      case "wordpress": return "🌐";
      case "medium": return "✍️";
      case "naver": return "🟢";
      default: return "📄";
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">발행완료</Badge>;
      case "failed":
        return <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">실패</Badge>;
      case "publishing":
        return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">발행중</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  if (hasPublications) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>제목</span>
          <span>플랫폼</span>
          <span>유형</span>
          <span>상태</span>
          <span>URL</span>
          <span>발행일</span>
        </div>
        <div className="divide-y">
          {publications.map((pub) => (
            <div
              key={pub.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {pub.content_title ?? "(제목 없음)"}
                </p>
                {pub.account_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{pub.account_name}</p>
                )}
              </div>
              <span className="text-xs whitespace-nowrap flex items-center gap-1">
                <span>{platformEmoji(pub.platform)}</span>
                {platformLabel(pub.platform)}
              </span>
              <Badge variant="outline" className={`text-xs ${pub.publish_type === "auto" ? "bg-violet-50 text-violet-700 border-violet-200" : ""}`}>
                {pub.publish_type === "auto" ? "자동" : "수동"}
              </Badge>
              {statusBadge(pub.status)}
              <div>
                {pub.external_url ? (
                  <a
                    href={pub.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    링크
                  </a>
                ) : pub.status === "failed" ? (
                  <span className="inline-flex items-center gap-1 text-xs text-red-500">
                    <RefreshCw className="h-3 w-3" />
                    {pub.retry_count >= 3 ? "재시도 초과" : `재시도 ${pub.retry_count}/3`}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {safeDate(pub.published_at ?? pub.created_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: contents 기반 이력
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
        <span>제목</span>
        <span>발행 URL</span>
        <span>추적 상태</span>
        <span>발행일</span>
      </div>
      <div className="divide-y">
        {publishedContents.map((content) => (
          <Link
            key={content.id}
            href={`/contents/${content.id}`}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{content.title ?? "(제목 없음)"}</p>
            </div>
            <div>
              {content.published_url ? (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(content.published_url!, "_blank");
                  }}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  링크
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                content.is_tracking
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              {content.is_tracking ? (
                <><Radio className="h-3 w-3 mr-1" />추적중</>
              ) : "미추적"}
            </Badge>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {safeDate(content.published_at ?? content.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Tab 4: 키워드 이력 ──────────────────────────────────────────────────
async function KeywordHistoryTab({ clientId }: { clientId: string | null }) {
  if (!clientId) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Building2 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">브랜드를 먼저 선택해주세요</p>
        </CardContent>
      </Card>
    );
  }

  const items = await getKeywordPublishHistory(clientId);

  return <KeywordHistoryClient items={items} />;
}

// ── Tab 5: 자동 발행 설정 ──────────────────────────────────────────────
async function PublishAutoTab({ clientId }: { clientId: string | null }) {
  if (!clientId) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Building2 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">브랜드를 먼저 선택해주세요</p>
        </CardContent>
      </Card>
    );
  }

  const [settings, accounts] = await Promise.all([
    getAutoPublishSettings(clientId),
    getBlogAccounts(clientId),
  ]);

  return (
    <AutoPublishSettingsClient
      clientId={clientId}
      settings={settings}
      accounts={accounts}
    />
  );
}


// ── PublishReadyContentsClient (5+5 더보기) ──────────────────────────────
// 이 컴포넌트는 server component에서 사용할 수 없으므로 별도 import 필요
// 하지만 간단한 렌더링이므로 server component로 처리 (더보기는 link 기반)
function PublishReadyContentsClient({ contents }: { contents: Array<{
  id: string;
  title: string | null;
  tags: string[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any> | null;
  created_at: string;
}> }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">발행 준비 완료 콘텐츠</h3>
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>제목</span>
          <span>QC 점수</span>
          <span>생성일</span>
          <span>발행</span>
        </div>
        <div className="divide-y">
          {contents.slice(0, 5).map((content) => (
            <div
              key={content.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{content.title ?? "(제목 없음)"}</p>
                {content.tags && content.tags.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">{content.tags.slice(0, 3).join(", ")}</p>
                )}
              </div>
              <span className="text-xs whitespace-nowrap">
                {content.metadata?.qc_score != null ? (
                  <span className="text-emerald-600 font-medium">{String(content.metadata.qc_score)}점</span>
                ) : "—"}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(content.created_at).toLocaleDateString("ko-KR")}
              </span>
              <Link
                href={`/contents/${content.id}/publish`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors"
              >
                <Send className="h-3 w-3" />
                발행하기
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
