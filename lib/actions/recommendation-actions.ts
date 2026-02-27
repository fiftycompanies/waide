"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

export interface AccountGrade {
  account_id: string;
  account_name: string;
  grade: "S" | "A" | "B" | "C";
  account_score: number;
  previous_grade: string | null;
  grade_change_reason: string | null;
  exposure_rate: number;
  top3_ratio: number;
  top10_ratio: number;
  consistency_rate: number;
  total_published: number;
  avg_rank: number | null;
  measured_at: string;
}

export interface KeywordDifficulty {
  keyword_id: string;
  grade: "S" | "A" | "B" | "C";
  difficulty_score: number;
  opportunity_score: number;
  competition_level: string;
  search_volume_total: number;
  current_rank_pc: number | null;
  measured_at: string;
}

export interface PublishRecommendation {
  id: string;
  client_id: string;
  keyword_id: string;
  keyword_text: string;
  account_id: string;
  account_name: string;
  match_score: number;
  rank: number;
  account_grade: string;
  keyword_grade: string;
  bonuses: Record<string, boolean>;
  penalties: Record<string, boolean>;
  reason: string | null;
  status: "pending" | "accepted" | "rejected" | "expired";
  feedback_result: string | null;
  feedback_rank_achieved: number | null;
  feedback_at: string | null;
  measured_at: string;
}

// ── 계정 등급 조회 ────────────────────────────────────────────────────────────

export async function getAccountGrades(
  clientId: string | null
): Promise<AccountGrade[]> {
  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("account_grades")
    .select(
      `id, account_id, grade, account_score, previous_grade,
       grade_change_reason, exposure_rate, top3_ratio, top10_ratio,
       consistency_rate, total_published, avg_rank, measured_at,
       blog_accounts(account_name)`
    )
    .eq("measured_at", today)
    .order("account_score", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[recommendation-actions] getAccountGrades:", error);
    return [];
  }

  return ((data ?? []) as any[]).map((r) => ({
    account_id: r.account_id,
    account_name: r.blog_accounts?.account_name ?? r.account_id,
    grade: r.grade,
    account_score: r.account_score,
    previous_grade: r.previous_grade,
    grade_change_reason: r.grade_change_reason,
    exposure_rate: r.exposure_rate,
    top3_ratio: r.top3_ratio,
    top10_ratio: r.top10_ratio,
    consistency_rate: r.consistency_rate,
    total_published: r.total_published,
    avg_rank: r.avg_rank,
    measured_at: r.measured_at,
  }));
}

// ── 키워드 난이도 조회 ─────────────────────────────────────────────────────────

export async function getKeywordDifficulty(
  keywordId: string
): Promise<KeywordDifficulty | null> {
  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await (db as any)
    .from("keyword_difficulty")
    .select("*")
    .eq("keyword_id", keywordId)
    .eq("measured_at", today)
    .single();

  if (error) return null;
  return data as KeywordDifficulty;
}

// ── 키워드별 추천 계정 조회 ────────────────────────────────────────────────────

export async function getRecommendationsForKeyword(
  keywordId: string,
  clientId: string,
  limit = 3
): Promise<PublishRecommendation[]> {
  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await (db as any)
    .from("publishing_recommendations")
    .select(
      `id, client_id, keyword_id, account_id, match_score, rank,
       account_grade, keyword_grade, bonuses, penalties, reason,
       status, feedback_result, feedback_rank_achieved, feedback_at, measured_at,
       blog_accounts(account_name),
       keywords(keyword)`
    )
    .eq("keyword_id", keywordId)
    .eq("client_id", clientId)
    .eq("measured_at", today)
    .eq("status", "pending")
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[recommendation-actions] getRecommendationsForKeyword:", error);
    return [];
  }

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    client_id: r.client_id,
    keyword_id: r.keyword_id,
    keyword_text: r.keywords?.keyword ?? "",
    account_id: r.account_id,
    account_name: r.blog_accounts?.account_name ?? "",
    match_score: r.match_score,
    rank: r.rank,
    account_grade: r.account_grade,
    keyword_grade: r.keyword_grade,
    bonuses: r.bonuses ?? {},
    penalties: r.penalties ?? {},
    reason: r.reason,
    status: r.status,
    feedback_result: r.feedback_result,
    feedback_rank_achieved: r.feedback_rank_achieved,
    feedback_at: r.feedback_at,
    measured_at: r.measured_at,
  }));
}

// ── 전체 추천 목록 (추천 현황 페이지용) ───────────────────────────────────────

export async function getRecommendationsList(
  clientId: string,
  options: {
    status?: string;
    limit?: number;
  } = {}
): Promise<PublishRecommendation[]> {
  const db = createAdminClient();
  const { status, limit = 100 } = options;

  let query = (db as any)
    .from("publishing_recommendations")
    .select(
      `id, client_id, keyword_id, account_id, match_score, rank,
       account_grade, keyword_grade, bonuses, penalties, reason,
       status, feedback_result, feedback_rank_achieved, feedback_at, measured_at,
       blog_accounts(account_name),
       keywords(keyword)`
    )
    .eq("client_id", clientId)
    .order("measured_at", { ascending: false })
    .order("rank", { ascending: true })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[recommendation-actions] getRecommendationsList:", error);
    return [];
  }

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    client_id: r.client_id,
    keyword_id: r.keyword_id,
    keyword_text: r.keywords?.keyword ?? "",
    account_id: r.account_id,
    account_name: r.blog_accounts?.account_name ?? "",
    match_score: r.match_score,
    rank: r.rank,
    account_grade: r.account_grade,
    keyword_grade: r.keyword_grade,
    bonuses: r.bonuses ?? {},
    penalties: r.penalties ?? {},
    reason: r.reason,
    status: r.status,
    feedback_result: r.feedback_result,
    feedback_rank_achieved: r.feedback_rank_achieved,
    feedback_at: r.feedback_at,
    measured_at: r.measured_at,
  }));
}

// ── 추천 상태 업데이트 ────────────────────────────────────────────────────────

export async function acceptRecommendation(
  id: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const db = createAdminClient();

  // 추천 정보 조회 (Job 생성에 필요)
  const { data: rec, error: recErr } = await (db as any)
    .from("publishing_recommendations")
    .select(
      `id, client_id, keyword_id, account_id, match_score, rank,
       account_grade, keyword_grade, reason,
       blog_accounts(account_name),
       keywords(keyword)`
    )
    .eq("id", id)
    .single();

  if (recErr || !rec) return { success: false, error: recErr?.message ?? "추천을 찾을 수 없습니다." };

  // status → accepted
  const { error } = await (db as any)
    .from("publishing_recommendations")
    .update({ status: "accepted" })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  // Job 자동 생성: 콘텐츠 작성 작업 추가
  const keywordText = rec.keywords?.keyword ?? "";
  const accountName = rec.blog_accounts?.account_name ?? "";
  const { data: job, error: jobErr } = await (db as any)
    .from("jobs")
    .insert({
      client_id: rec.client_id,
      job_type: "CONTENT_CREATE",
      assigned_agent: "COPYWRITER",
      title: `[발행추천 수락] ${keywordText} → ${accountName}`,
      priority: "medium",
      trigger_type: "USER",
      status: "PENDING",
      input_payload: {
        keyword_id: rec.keyword_id,
        keyword: keywordText,
        account_id: rec.account_id,
        account_name: accountName,
        recommendation_id: rec.id,
        match_score: rec.match_score,
        account_grade: rec.account_grade,
        keyword_grade: rec.keyword_grade,
        reason: rec.reason,
      },
    })
    .select("id")
    .single();

  if (jobErr) {
    console.error("[recommendation-actions] Job 생성 실패:", jobErr);
    // Job 생성 실패해도 수락 자체는 성공
  }

  revalidatePath("/analytics/recommendations");
  revalidatePath("/ops/jobs");
  return { success: true, jobId: job?.id };
}

export async function rejectRecommendation(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  const { error } = await (db as any)
    .from("publishing_recommendations")
    .update({ status: "rejected" })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/analytics/recommendations");
  return { success: true };
}

// ── 추천 통계 요약 ────────────────────────────────────────────────────────────

export interface RecommendationStats {
  total: number;
  accepted: number;
  pending: number;
  evaluated: number;
  successRate: number;  // TOP10 진입 %
  top3Count: number;
  top10Count: number;
  notExposedCount: number;
}

export async function getRecommendationStats(
  clientId: string
): Promise<RecommendationStats> {
  const db = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const { data } = await (db as any)
    .from("publishing_recommendations")
    .select("status, feedback_result")
    .eq("client_id", clientId)
    .gte("measured_at", thirtyDaysAgo);

  const rows = (data ?? []) as Array<{ status: string; feedback_result: string | null }>;

  const total        = rows.length;
  const accepted     = rows.filter((r) => r.status === "accepted").length;
  const pending      = rows.filter((r) => r.status === "pending").length;
  const evaluated    = rows.filter((r) => r.feedback_result !== null).length;
  const top3Count    = rows.filter((r) => r.feedback_result === "top3").length;
  const top10Count   = rows.filter((r) => r.feedback_result === "top10").length;
  const notExposed   = rows.filter((r) => r.feedback_result === "not_exposed").length;
  const successRate  = evaluated > 0
    ? Math.round(((top3Count + top10Count) / evaluated) * 100)
    : 0;

  return {
    total,
    accepted,
    pending,
    evaluated,
    successRate,
    top3Count,
    top10Count,
    notExposedCount: notExposed,
  };
}
