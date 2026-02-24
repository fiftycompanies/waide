"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { PublishRecommendation, RecommendationStats, AccountGrade } from "@/lib/actions/recommendation-actions";
import { acceptRecommendation, rejectRecommendation } from "@/lib/actions/recommendation-actions";

// ── 상수 ────────────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  S: "bg-violet-100 text-violet-700 border-violet-300",
  A: "bg-blue-100 text-blue-700 border-blue-200",
  B: "bg-amber-100 text-amber-700 border-amber-200",
  C: "bg-gray-100 text-gray-600 border-gray-200",
};

const FEEDBACK_COLORS: Record<string, string> = {
  top3:        "bg-emerald-100 text-emerald-700",
  top10:       "bg-blue-100 text-blue-700",
  top20:       "bg-amber-100 text-amber-700",
  exposed:     "bg-amber-100 text-amber-700",
  not_exposed: "bg-red-100 text-red-600",
};

const FEEDBACK_LABELS: Record<string, string> = {
  top3:        "TOP3 달성",
  top10:       "TOP10 진입",
  top20:       "TOP20 노출",
  exposed:     "노출",
  not_exposed: "미노출",
};

const STATUS_FILTERS = [
  { key: "all",      label: "전체" },
  { key: "pending",  label: "대기" },
  { key: "accepted", label: "수락" },
  { key: "rejected", label: "거절" },
];

// ── 통계 카드 ────────────────────────────────────────────────────────────────

function StatsCards({ stats }: { stats: RecommendationStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">총 추천</p>
          <p className="text-2xl font-bold mt-1">{stats.total}건</p>
          <p className="text-xs text-muted-foreground mt-1">수락 {stats.accepted}건</p>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">성공률 (TOP10)</p>
          <p className="text-2xl font-bold mt-1">{stats.successRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">평가 {stats.evaluated}건 중</p>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-100">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">TOP3 달성</p>
          <p className="text-2xl font-bold mt-1">{stats.top3Count}건</p>
          <p className="text-xs text-muted-foreground mt-1">TOP10 포함 {stats.top3Count + stats.top10Count}건</p>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-100">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">미노출</p>
          <p className="text-2xl font-bold mt-1">{stats.notExposedCount}건</p>
          <p className="text-xs text-muted-foreground mt-1">피드백 반영 예정</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 계정 등급 요약 ────────────────────────────────────────────────────────────

function AccountGradeSummary({ grades }: { grades: AccountGrade[] }) {
  if (grades.length === 0) return null;
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">계정 등급 현황</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">계정</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">등급</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">점수</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">노출률</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">TOP10</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">등급 변화 사유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {grades.map((g) => (
                <tr key={g.account_id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{g.account_name}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-bold ${GRADE_COLORS[g.grade] ?? ""}`}>
                      {g.grade}
                      {g.previous_grade && g.previous_grade !== g.grade && (
                        <span className="ml-0.5">
                          {["S","A","B","C"].indexOf(g.grade) < ["S","A","B","C"].indexOf(g.previous_grade) ? "↑" : "↓"}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-mono">{g.account_score.toFixed(1)}</td>
                  <td className="px-3 py-2 text-center">{g.exposure_rate.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center">{g.top10_ratio.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-muted-foreground text-[11px] max-w-[240px] truncate">
                    {g.grade_change_reason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── 추천 행 ──────────────────────────────────────────────────────────────────

function RecommendationRow({ rec }: { rec: PublishRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAccept() {
    startTransition(async () => {
      const r = await acceptRecommendation(rec.id);
      if (r.success) { toast.success("추천을 수락했습니다."); router.refresh(); }
      else toast.error(r.error ?? "실패");
    });
  }

  function handleReject() {
    startTransition(async () => {
      const r = await rejectRecommendation(rec.id);
      if (r.success) { toast.success("추천을 거절했습니다."); router.refresh(); }
      else toast.error(r.error ?? "실패");
    });
  }

  const hasBonus   = Object.values(rec.bonuses).some(Boolean);
  const hasPenalty = Object.values(rec.penalties).some(Boolean);

  return (
    <>
      <tr className="hover:bg-muted/20 transition-colors">
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-violet-500">{rec.rank}위</span>
            <span className="text-xs font-semibold">{rec.keyword_text}</span>
            <span className={`inline-flex items-center rounded border px-1 text-[10px] font-bold ${GRADE_COLORS[rec.keyword_grade] ?? ""}`}>
              {rec.keyword_grade}
            </span>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{rec.account_name}</span>
            <span className={`inline-flex items-center rounded border px-1 text-[10px] font-bold ${GRADE_COLORS[rec.account_grade] ?? ""}`}>
              {rec.account_grade}
            </span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className="text-sm font-bold text-violet-600">{rec.match_score.toFixed(0)}</span>
        </td>
        <td className="px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-0.5">
            {hasBonus  && <span className="text-emerald-600 text-[10px] font-medium">+보너스</span>}
            {hasPenalty && <span className="text-red-500 text-[10px] font-medium">-페널티</span>}
          </div>
        </td>
        <td className="px-3 py-2.5 text-center">
          {rec.feedback_result ? (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${FEEDBACK_COLORS[rec.feedback_result] ?? ""}`}>
              {FEEDBACK_LABELS[rec.feedback_result] ?? rec.feedback_result}
              {rec.feedback_rank_achieved ? ` (${rec.feedback_rank_achieved}위)` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground/40 text-[11px]">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-center">
          {rec.status === "pending" ? (
            <div className="flex items-center justify-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px] text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={handleAccept}
                disabled={isPending}
              >
                <Check className="h-3 w-3 mr-0.5" />수락
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px] text-red-500 border-red-200 hover:bg-red-50"
                onClick={handleReject}
                disabled={isPending}
              >
                <X className="h-3 w-3 mr-0.5" />거절
              </Button>
            </div>
          ) : (
            <Badge
              variant="outline"
              className={`text-[10px] ${
                rec.status === "accepted"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : rec.status === "rejected"
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              {rec.status === "accepted" ? "수락됨" : rec.status === "rejected" ? "거절됨" : rec.status}
            </Badge>
          )}
        </td>
        <td className="px-3 py-2.5 text-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </td>
      </tr>
      {expanded && rec.reason && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border/30">
            💡 {rec.reason}
          </td>
        </tr>
      )}
    </>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface RecommendationsSectionProps {
  recommendations: PublishRecommendation[];
  stats: RecommendationStats;
  accountGrades: AccountGrade[];
}

export function RecommendationsSection({
  recommendations,
  stats,
  accountGrades,
}: RecommendationsSectionProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = statusFilter === "all"
    ? recommendations
    : recommendations.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <StatsCards stats={stats} />

      {/* 계정 등급 요약 */}
      <AccountGradeSummary grades={accountGrades} />

      {/* 추천 목록 */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold">
              추천 목록
              <span className="ml-2 text-xs font-normal text-muted-foreground">{filtered.length}건</span>
            </CardTitle>
            {/* 상태 필터 탭 */}
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    statusFilter === f.key
                      ? "bg-violet-600 text-white"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">
              {statusFilter === "all"
                ? "추천 데이터가 없습니다. ANALYST_MATCH 에이전트를 실행해주세요."
                : `${STATUS_FILTERS.find(f=>f.key===statusFilter)?.label} 상태의 추천이 없습니다.`
              }
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">키워드</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">계정</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">매칭점수</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">보정</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">피드백</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">상태</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">사유</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filtered.map((rec) => (
                    <RecommendationRow key={rec.id} rec={rec} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
