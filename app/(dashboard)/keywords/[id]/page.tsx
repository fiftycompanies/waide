import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getKeyword,
  getContentsByKeyword,
  getSerpByKeyword,
  getAccountPerfByKeyword,
} from "@/lib/actions/keyword-actions";
import { getAccountGrades, getRecommendationsForKeyword } from "@/lib/actions/recommendation-actions";
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import { Badge } from "@/components/ui/badge";
import { KeywordSerpChart } from "@/components/keywords/keyword-serp-chart";
import { KeywordContentsTable } from "@/components/keywords/keyword-contents-table";
import { ChevronLeft, Plus, FileEdit } from "lucide-react";
import { KeywordDetailActions } from "@/components/keywords/keyword-detail-actions";

// ── 상수 ──────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-100 text-green-700 border-green-200",
  paused:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
  queued:   "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  refresh:  "bg-red-500/10 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  active: "활성", paused: "일시정지", archived: "보관됨",
  queued: "대기중", refresh: "리프레시",
};

const PUBLISH_COLORS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600 border-gray-200",
  review:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved:  "bg-blue-100 text-blue-700 border-blue-200",
  published: "bg-green-100 text-green-700 border-green-200",
  rejected:  "bg-red-100 text-red-700 border-red-200",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  single: "일반", list: "목록", review: "후기", info: "정보", special: "기획",
};

// ── 페이지 ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KeywordDetailPage({ params }: PageProps) {
  const { id } = await params;

  const clientId = (await getSelectedClientId()) ?? undefined;

  const [keyword, contents, serpData, accountPerf] = await Promise.all([
    getKeyword(id),
    getContentsByKeyword(id),
    getSerpByKeyword(id),
    getAccountPerfByKeyword(id),
  ]);

  // 계정 등급 + 이 키워드에 대한 AI 추천
  const [accountGrades, recommendations] = clientId
    ? await Promise.all([
        getAccountGrades(clientId),
        getRecommendationsForKeyword(id, clientId, 3),
      ])
    : [[], []];

  if (!keyword) notFound();

  const currentRankPc = keyword.current_rank_naver_pc ?? keyword.current_rank_naver ?? null;
  const currentRankMo = keyword.current_rank_naver_mo ?? null;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* 뒤로 가기 */}
      <Link
        href="/keywords"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        키워드 목록
      </Link>

      {/* ── 3-1. 헤더 ── */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{keyword.keyword}</h1>
              <Badge
                variant="outline"
                className={`${STATUS_COLORS[keyword.status] ?? ""}`}
              >
                {STATUS_LABELS[keyword.status] ?? keyword.status}
              </Badge>
              {keyword.platform && (
                <Badge variant="secondary" className="text-xs">{keyword.platform}</Badge>
              )}
            </div>
            {keyword.sub_keyword && (
              <p className="text-sm text-muted-foreground">서브 키워드: {keyword.sub_keyword}</p>
            )}
          </div>

          {/* 현재 순위 */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">PC 순위</p>
              <p className={`text-3xl font-bold ${currentRankPc != null ? (currentRankPc <= 5 ? "text-emerald-600" : currentRankPc <= 10 ? "text-amber-600" : "text-foreground") : "text-muted-foreground/40"}`}>
                {currentRankPc != null ? `${currentRankPc}위` : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">MO 순위</p>
              <p className={`text-3xl font-bold ${currentRankMo != null ? (currentRankMo <= 5 ? "text-emerald-600" : currentRankMo <= 10 ? "text-amber-600" : "text-foreground") : "text-muted-foreground/40"}`}>
                {currentRankMo != null ? `${currentRankMo}위` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* 메타 정보 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-border/40">
          <div>
            <p className="text-xs text-muted-foreground">월 검색량 (전체)</p>
            <p className="text-sm font-semibold mt-0.5">
              {keyword.monthly_search_total?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">PC / MO</p>
            <p className="text-sm font-semibold mt-0.5">
              {keyword.monthly_search_pc?.toLocaleString() ?? "—"}
              {" / "}
              {keyword.monthly_search_mo?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">경쟁도</p>
            <p className="text-sm font-semibold mt-0.5">
              {keyword.competition_level ?? "—"}
              {keyword.competition_index != null && (
                <span className="text-muted-foreground font-normal"> ({keyword.competition_index})</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">우선순위 점수</p>
            <p className="text-sm font-semibold mt-0.5">
              {keyword.priority_score?.toFixed(1) ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3-5. 액션 버튼 ── */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/campaigns/new?keyword_id=${keyword.id}&keyword=${encodeURIComponent(keyword.keyword)}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          새 콘텐츠 생성 (캠페인)
        </Link>
        <Link
          href={`/ops/contents/new?keyword_id=${keyword.id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <FileEdit className="h-4 w-4" />
          외부 원고 직접 등록
        </Link>
        <KeywordDetailActions keywordId={keyword.id} />
      </div>

      {/* ── 3-2. 연결된 콘텐츠 목록 ── */}
      <div className="rounded-lg border overflow-hidden">
        <div className="px-4 py-3 bg-muted/50 border-b">
          <h2 className="text-sm font-semibold">
            연결된 콘텐츠
            <span className="ml-2 text-xs text-muted-foreground font-normal">{contents.length}개</span>
          </h2>
        </div>
        <KeywordContentsTable contents={contents} />
      </div>

      {/* ── 3-3. 순위 추이 차트 ── */}
      <div className="rounded-lg border p-5 space-y-3">
        <h2 className="text-sm font-semibold">
          순위 추이
          <span className="ml-2 text-xs text-muted-foreground font-normal">실선=PC, 점선=MO</span>
        </h2>
        <KeywordSerpChart data={serpData} />
      </div>

      {/* ── 3-4. 계정별 성과 요약 ── */}
      {accountPerf.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b">
            <h2 className="text-sm font-semibold">
              계정별 성과 비교
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                어떤 계정이 이 키워드에 강한지 확인
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">블로그 계정</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">등급</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">AI추천</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">발행수</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">평균순위</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">최고순위</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">활성글</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {accountPerf.map((a) => {
                  const gradeInfo = accountGrades.find(
                    (g) => g.account_id === a.blog_account_id
                  );
                  const recInfo = recommendations.find(
                    (r) => r.account_id === a.blog_account_id
                  );
                  const GRADE_CLS: Record<string, string> = {
                    S: "bg-violet-100 text-violet-700 border-violet-300",
                    A: "bg-blue-100 text-blue-700 border-blue-200",
                    B: "bg-amber-100 text-amber-700 border-amber-200",
                    C: "bg-gray-100 text-gray-600 border-gray-200",
                  };
                  return (
                    <tr key={a.blog_account_id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium">{a.account_name}</td>
                      <td className="px-4 py-2.5 text-center">
                        {gradeInfo ? (
                          <span className={`inline-flex items-center rounded border px-1.5 text-[10px] font-bold ${GRADE_CLS[gradeInfo.grade] ?? ""}`}>
                            {gradeInfo.grade}
                            {gradeInfo.previous_grade && gradeInfo.previous_grade !== gradeInfo.grade && (
                              <span className="ml-0.5">{["S","A","B","C"].indexOf(gradeInfo.grade) < ["S","A","B","C"].indexOf(gradeInfo.previous_grade) ? "↑" : "↓"}</span>
                            )}
                          </span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {recInfo ? (
                          <span className="text-violet-600 font-semibold text-[11px]">
                            {recInfo.rank}위 ({recInfo.match_score.toFixed(0)}점)
                          </span>
                        ) : <span className="text-muted-foreground/40 text-[11px]">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">{a.publish_count}</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">
                        {a.avg_rank != null ? `${a.avg_rank}위` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {a.best_rank != null ? (
                          <span className={`font-semibold ${a.best_rank <= 3 ? "text-emerald-600" : a.best_rank <= 10 ? "text-amber-600" : "text-foreground"}`}>
                            {a.best_rank}위
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">{a.active_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
