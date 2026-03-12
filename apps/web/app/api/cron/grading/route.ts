/**
 * 계정 등급 + 키워드 난이도 + 발행 추천 크론 API (v2)
 *
 * scoring_weights 설정에서 모든 가중치를 동적 로딩.
 *
 * 스케줄: 매주 월요일 새벽 5시
 * 동작:
 *   1. account_grader (계정 등급 산출)
 *   2. keyword_grader (키워드 난이도 산출)
 *   3. publish_recommender (발행 추천 매칭)
 *   4. 등급 변화 Slack 알림
 *   5. 매월 1일: 알고리즘 성공률 월간 리포트
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";
import {
  verifyCronAuth,
  runScheduledTask,
  sendSlackNotification,
  getSchedulerSettings,
} from "@/lib/scheduler";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ── 타입 ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

interface ScoringWeights {
  account_grade: {
    weighted_exposure: number;
    exposure_rate: number;
    content_volume: number;
    thresholds: Record<string, number>;
    content_tiers: Record<string, number>;
  };
  keyword_difficulty: {
    search_volume: number;
    competition: number;
    serp_dominance: number;
    own_rank_bonus: number;
    thresholds: Record<string, number>;
    volume_tiers: Record<string, number>;
  };
  publish_recommendation: {
    block_already_exposed: boolean;
    block_recent_days: number;
    grade_matching: number;
    publish_history: number;
    keyword_relevance: number;
    volume_weight: number;
  };
  // qc_scoring & marketing_score are used elsewhere
}

// ── 유틸 ──────────────────────────────────────────────────
function scoreToGrade(score: number, thresholds: Record<string, number>): string {
  const sorted = Object.entries(thresholds).sort(([, a], [, b]) => b - a);
  for (const [grade, th] of sorted) {
    if (score >= th) return grade;
  }
  return "C";
}

function tierLookup(value: number, tiers: Record<string, number>): number {
  const sorted = Object.entries(tiers)
    .map(([k, v]) => [Number(k), v] as [number, number])
    .sort(([a], [b]) => b - a);
  for (const [threshold, pts] of sorted) {
    if (value >= threshold) return pts;
  }
  return sorted[sorted.length - 1]?.[1] ?? 0;
}

const GRADE_NUM: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };

// 등급 매칭 점수표
const GRADE_MATCH_TABLE: Record<string, Record<string, number>> = {
  S: { S: 100, A: 80, B: 50, C: 30 },
  A: { S: 80, A: 100, B: 80, C: 50 },
  B: { S: 40, A: 80, B: 100, C: 80 },
  C: { S: 20, A: 40, B: 80, C: 100 },
};

async function loadWeights(db: DB): Promise<ScoringWeights> {
  const { data } = await db.from("settings").select("value").eq("key", "scoring_weights").single();
  return data?.value as ScoringWeights;
}

// ── API 핸들러 ────────────────────────────────────────────
export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSchedulerSettings("grading_scheduler", {
    enabled: true,
    cron_weekday: 1,
    run_at_hour: 5,
  });

  if (!settings.enabled) {
    return NextResponse.json({ skipped: true, reason: "scheduler disabled" });
  }

  const result = await runScheduledTask("grading", async () => {
    const db = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const weights = await loadWeights(db);

    const { data: clients } = await db
      .from("clients")
      .select("id, name")
      .eq("is_active", true);

    if (!clients?.length) return { accounts: 0, keywords: 0, recommendations: 0 };

    const clientIds = clients.map((c: { id: string }) => c.id);
    let totalAccounts = 0;
    let totalKeywords = 0;
    let totalRecs = 0;
    const gradeChanges: Array<{ name: string; prev: string; curr: string; score: number }> = [];
    const gradeDist = { S: 0, A: 0, B: 0, C: 0 };

    for (const clientId of clientIds) {
      const accountResult = await gradeAccounts(db, clientId, today, weights);
      totalAccounts += accountResult.count;
      gradeChanges.push(...accountResult.changes);

      const kwResult = await gradeKeywords(db, clientId, today, weights);
      totalKeywords += kwResult.count;
      for (const [g, n] of Object.entries(kwResult.dist)) {
        gradeDist[g as keyof typeof gradeDist] += n;
      }

      const recCount = await generateRecommendations(db, clientId, today, weights);
      totalRecs += recCount;
    }

    const slackLines = [
      "📊 *[분석봇] 주간 등급 재산출 완료 (v2)*",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━",
      `📅 ${today}`,
      `계정: ${totalAccounts}개 | 키워드: ${totalKeywords}개 | 추천: ${totalRecs}건`,
      `키워드 등급 분포: S=${gradeDist.S}, A=${gradeDist.A}, B=${gradeDist.B}, C=${gradeDist.C}`,
    ];

    if (gradeChanges.length > 0) {
      slackLines.push("", "📈 *등급 변동:*");
      for (const c of gradeChanges) {
        const dir = (GRADE_NUM[c.curr] ?? 1) > (GRADE_NUM[c.prev] ?? 1) ? "⬆️" : "⬇️";
        slackLines.push(`  ${dir} ${c.name}: ${c.prev} → ${c.curr} (${c.score}점)`);
      }
    }

    await sendSlackNotification(slackLines.join("\n"), undefined, "alerts");

    if (new Date().getDate() === 1) {
      await sendMonthlyReport(db);
    }

    return {
      accounts: totalAccounts,
      keywords: totalKeywords,
      recommendations: totalRecs,
      gradeChanges: gradeChanges.length,
      keywordGradeDist: gradeDist,
    };
  });

  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}

// ════════════════════════════════════════════════════════════
// Task 2: 계정 등급 (v2)
// ════════════════════════════════════════════════════════════
async function gradeAccounts(db: DB, clientId: string, today: string, weights: ScoringWeights) {
  const w = weights.account_grade;
  const { data: accounts } = await db
    .from("blog_accounts")
    .select("id, account_name")
    .eq("client_id", clientId)
    .eq("is_active", true);

  const changes: Array<{ name: string; prev: string; curr: string; score: number }> = [];
  let count = 0;

  for (const acc of accounts ?? []) {
    // 발행 콘텐츠 + 키워드 조회
    const { data: contents } = await db
      .from("contents")
      .select("id, keyword_id")
      .eq("account_id", acc.id)
      .eq("client_id", clientId)
      .eq("publish_status", "published");

    const total = contents?.length || 0;

    if (total === 0) {
      await db.from("account_grades").upsert(
        { account_id: acc.id, client_id: clientId, measured_at: today, total_published: 0, exposed_keywords: 0, exposure_rate: 0, avg_rank: null, top3_count: 0, top10_count: 0, top3_ratio: 0, top10_ratio: 0, consistency_rate: 0, account_score: 0, grade: "C", previous_grade: null, grade_change_reason: "발행 이력 없음" },
        { onConflict: "account_id,measured_at" },
      );
      count++;
      continue;
    }

    // 키워드별 순위 + 검색량
    const kwIds = [...new Set((contents ?? []).map((c: { keyword_id: string }) => c.keyword_id).filter(Boolean))] as string[];
    const { data: kwData } = await db.from("keywords").select("id, current_rank_naver_pc, monthly_search_total").in("id", kwIds);

    const rankMap: Record<string, number> = {};
    const volMap: Record<string, number> = {};
    for (const k of kwData ?? []) {
      if (k.current_rank_naver_pc != null) rankMap[k.id] = k.current_rank_naver_pc;
      volMap[k.id] = k.monthly_search_total ?? 0;
    }

    // 검색량 가중 노출 점수
    let weightedSum = 0;
    let totalVolume = 0;
    for (const kwId of kwIds) {
      const vol = volMap[kwId] ?? 0;
      const rank = rankMap[kwId];
      totalVolume += vol;
      if (rank != null) {
        const visibility = Math.max(0, (21 - rank) / 20) * 100;
        weightedSum += vol * visibility;
      }
    }
    const weightedExposure = totalVolume > 0 ? weightedSum / totalVolume : 0;

    // 노출률
    const exposedCount = Object.keys(rankMap).length;
    const exposureRate = kwIds.length > 0 ? (exposedCount / kwIds.length) * 100 : 0;

    // 콘텐츠 보유량 점수
    const contentVolumeScore = tierLookup(total, w.content_tiers);

    // 총점
    let score = weightedExposure * w.weighted_exposure
              + exposureRate * w.exposure_rate
              + contentVolumeScore * w.content_volume;
    score = Math.round(Math.min(100, score) * 10) / 10;
    const grade = scoreToGrade(score, w.thresholds);

    // 세부 지표
    const ranks = Object.values(rankMap);
    const top3 = ranks.filter(r => r <= 3).length;
    const top10 = ranks.filter(r => r <= 10).length;
    const avgRank = ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;

    // 이전 등급
    const { data: prevData } = await db
      .from("account_grades")
      .select("grade")
      .eq("account_id", acc.id)
      .lt("measured_at", today)
      .order("measured_at", { ascending: false })
      .limit(1);

    const prevGrade = prevData?.[0]?.grade ?? null;
    if (prevGrade && prevGrade !== grade) {
      changes.push({ name: acc.account_name, prev: prevGrade, curr: grade, score });
    }

    const reason = prevGrade
      ? `노출률 ${exposureRate.toFixed(0)}%, 가중노출 ${weightedExposure.toFixed(0)}, 콘텐츠 ${total}건`
      : `신규 ${total}건, 초기 등급 ${grade}급`;

    await db.from("account_grades").upsert(
      {
        account_id: acc.id, client_id: clientId, measured_at: today,
        total_published: total, exposed_keywords: exposedCount,
        exposure_rate: Math.round(exposureRate * 100) / 100,
        avg_rank: avgRank ? Math.round(avgRank * 10) / 10 : null,
        top3_count: top3, top10_count: top10,
        top3_ratio: total > 0 ? Math.round((top3 / total) * 10000) / 100 : 0,
        top10_ratio: total > 0 ? Math.round((top10 / total) * 10000) / 100 : 0,
        consistency_rate: 50, account_score: score, grade,
        previous_grade: prevGrade, grade_change_reason: reason,
      },
      { onConflict: "account_id,measured_at" },
    );
    count++;
  }

  return { count, changes };
}

// ════════════════════════════════════════════════════════════
// Task 3: 키워드 난이도 (v2)
// ════════════════════════════════════════════════════════════
async function gradeKeywords(db: DB, clientId: string, today: string, weights: ScoringWeights) {
  const w = weights.keyword_difficulty;

  const { data: keywords } = await db
    .from("keywords")
    .select("id, monthly_search_total, monthly_search_pc, monthly_search_mo, competition_level, current_rank_naver_pc, current_rank_naver_mo")
    .eq("client_id", clientId)
    .in("status", ["active", "queued", "refresh"]);

  // 우리 계정의 SERP 순위 조회
  const { data: serpRows } = await db
    .from("serp_results")
    .select("keyword_id, rank")
    .eq("client_id", clientId)
    .eq("is_own", true)
    .order("checked_at", { ascending: false });

  const ownRankMap: Record<string, number> = {};
  for (const sr of serpRows ?? []) {
    if (!ownRankMap[sr.keyword_id]) ownRankMap[sr.keyword_id] = sr.rank;
  }

  const dist = { S: 0, A: 0, B: 0, C: 0 };
  let count = 0;

  for (const kw of keywords ?? []) {
    const vol = kw.monthly_search_total || 0;

    // 검색량 규모 점수
    const volumeScore = tierLookup(vol, w.volume_tiers);

    // 경쟁도 점수
    const compMap: Record<string, number> = { high: 100, medium: 60, low: 25 };
    const competitionScore = compMap[kw.competition_level as string] ?? 50;

    // SERP 상위 점유 + 자사 순위 보너스
    let serpScore = 50; // 기본값
    const ownRank = ownRankMap[kw.id];
    if (ownRank != null) {
      if (ownRank <= 10) serpScore = 50 + w.own_rank_bonus; // -25 → 25
      else if (ownRank <= 20) serpScore = 40;
      else serpScore = 60;
    }

    // 난이도 점수
    let diffScore = volumeScore * w.search_volume
                  + competitionScore * w.competition
                  + serpScore * w.serp_dominance;
    diffScore = Math.round(Math.min(100, diffScore) * 10) / 10;

    const grade = scoreToGrade(diffScore, w.thresholds);
    dist[grade as keyof typeof dist]++;

    // 공략 가능성 = 100 - 난이도
    const oppScore = Math.round((100 - diffScore) * 10) / 10;

    const moRatio = vol > 0 ? Math.round(((kw.monthly_search_mo || 0) / vol) * 1000) / 10 : 0;

    await db.from("keyword_difficulty").upsert(
      {
        keyword_id: kw.id, client_id: clientId, measured_at: today,
        search_volume_total: vol, competition_level: kw.competition_level || "medium",
        current_rank_pc: kw.current_rank_naver_pc, current_rank_mo: kw.current_rank_naver_mo,
        mo_ratio: moRatio, difficulty_score: diffScore, grade, opportunity_score: oppScore,
      },
      { onConflict: "keyword_id,measured_at" },
    );
    count++;
  }

  return { count, dist };
}

// ════════════════════════════════════════════════════════════
// Task 4: 발행 추천 (v2)
// ════════════════════════════════════════════════════════════
async function generateRecommendations(db: DB, clientId: string, today: string, weights: ScoringWeights): Promise<number> {
  const w = weights.publish_recommendation;

  const { data: accountGrades } = await db
    .from("account_grades")
    .select("account_id, grade, account_score, total_published")
    .eq("client_id", clientId)
    .eq("measured_at", today);

  const { data: keywordGrades } = await db
    .from("keyword_difficulty")
    .select("keyword_id, grade, difficulty_score, opportunity_score, competition_level, search_volume_total")
    .eq("client_id", clientId)
    .eq("measured_at", today);

  if (!accountGrades?.length || !keywordGrades?.length) return 0;

  // ── 차단 데이터 로드 ──
  // 1) 이미 노출 중인 계정 (serp_results에서 rank 있는 계정)
  const exposedMap: Record<string, Set<string>> = {}; // keyword_id → Set<account_id>
  if (w.block_already_exposed) {
    const { data: serpData } = await db
      .from("serp_results")
      .select("keyword_id, account_id")
      .eq("client_id", clientId)
      .eq("is_own", true)
      .not("rank", "is", null);

    for (const sr of serpData ?? []) {
      if (sr.keyword_id && sr.account_id) {
        if (!exposedMap[sr.keyword_id]) exposedMap[sr.keyword_id] = new Set();
        exposedMap[sr.keyword_id].add(sr.account_id);
      }
    }
  }

  // 2) 최근 N일 내 동일 키워드 발행한 계정
  const recentBlockDays = w.block_recent_days;
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - recentBlockDays);
  const recentDateStr = recentDate.toISOString().slice(0, 10);

  const recentPubMap: Record<string, Set<string>> = {}; // keyword_id → Set<account_id>
  const { data: recentPubs } = await db
    .from("contents")
    .select("keyword_id, account_id")
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .gte("published_date", recentDateStr);

  for (const c of recentPubs ?? []) {
    if (c.keyword_id && c.account_id) {
      if (!recentPubMap[c.keyword_id]) recentPubMap[c.keyword_id] = new Set();
      recentPubMap[c.keyword_id].add(c.account_id);
    }
  }

  // 3) 계정별 최근 7일 발행 건수
  const accPubCount: Record<string, number> = {};
  const { data: acc7d } = await db
    .from("contents")
    .select("account_id")
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .gte("published_date", recentDateStr);

  for (const c of acc7d ?? []) {
    if (c.account_id) accPubCount[c.account_id] = (accPubCount[c.account_id] ?? 0) + 1;
  }

  // 4) 계정별 유사 키워드군 TOP3 이력
  const accKwHistory: Record<string, Set<string>> = {}; // account_id → Set<keyword_id where top3>
  const { data: historyData } = await db
    .from("serp_results")
    .select("account_id, keyword_id, rank")
    .eq("client_id", clientId)
    .eq("is_own", true)
    .lte("rank", 3);

  for (const h of historyData ?? []) {
    if (h.account_id) {
      if (!accKwHistory[h.account_id]) accKwHistory[h.account_id] = new Set();
      accKwHistory[h.account_id].add(h.keyword_id);
    }
  }

  // ── 추천 생성 ──
  const records: Array<Record<string, unknown>> = [];

  for (const kw of keywordGrades) {
    const scored: Array<{ score: number; acc: typeof accountGrades[0]; bonuses: Record<string, boolean>; penalties: Record<string, boolean>; blocked: boolean; blockReason: string }> = [];

    for (const acc of accountGrades) {
      // Step 1: 차단 필터
      let blocked = false;
      let blockReason = "";

      if (w.block_already_exposed && exposedMap[kw.keyword_id]?.has(acc.account_id)) {
        blocked = true;
        blockReason = "이미 노출 중 (기존 상위노출 보호)";
      }
      if (recentPubMap[kw.keyword_id]?.has(acc.account_id)) {
        blocked = true;
        blockReason = `최근 ${recentBlockDays}일 내 동일 키워드 발행`;
      }

      if (blocked) {
        scored.push({ score: -1, acc, bonuses: {}, penalties: {}, blocked, blockReason });
        continue;
      }

      // Step 2: 점수 산출
      const bonuses: Record<string, boolean> = {};
      const penalties: Record<string, boolean> = {};

      // ① 등급 매칭
      const gradeMatchScore = GRADE_MATCH_TABLE[acc.grade]?.[kw.grade] ?? 50;

      // ② 발행 이력 여유도
      const recent = accPubCount[acc.account_id] ?? 0;
      const historyScore = recent === 0 ? 100 : recent <= 2 ? 70 : recent <= 5 ? 40 : 10;

      // ③ 키워드 관련성
      const hasTop3 = accKwHistory[acc.account_id]?.size ? true : false;
      const kwRelevanceScore = hasTop3 ? 100 : 30;
      if (hasTop3) bonuses.keyword_synergy = true;

      // ④ 검색량 가중
      const vol = kw.search_volume_total ?? 0;
      const accNum = GRADE_NUM[acc.grade] ?? 1;
      let volumeWeightScore: number;
      if (vol >= 10000) {
        volumeWeightScore = accNum >= 4 ? 100 : accNum >= 3 ? 70 : accNum >= 2 ? 40 : 20;
      } else if (vol >= 1000) {
        volumeWeightScore = 70;
      } else {
        volumeWeightScore = 100;
      }

      const score = Math.round(Math.min(100, Math.max(0,
        gradeMatchScore * w.grade_matching
        + historyScore * w.publish_history
        + kwRelevanceScore * w.keyword_relevance
        + volumeWeightScore * w.volume_weight
      )) * 10) / 10;

      scored.push({ score, acc, bonuses, penalties, blocked: false, blockReason: "" });
    }

    // 차단되지 않은 것만 점수순 정렬
    const available = scored.filter(s => !s.blocked).sort((a, b) => b.score - a.score);
    const blockedList = scored.filter(s => s.blocked);

    for (let i = 0; i < Math.min(available.length, 3); i++) {
      const s = available[i];
      records.push({
        client_id: clientId,
        keyword_id: kw.keyword_id,
        account_id: s.acc.account_id,
        match_score: s.score,
        rank: i + 1,
        account_grade: s.acc.grade,
        keyword_grade: kw.grade,
        bonuses: s.bonuses,
        penalties: { ...s.penalties, blocked_accounts: blockedList.map(b => ({ id: b.acc.account_id, reason: b.blockReason })) },
        reason: `${s.acc.grade}급→${kw.grade}급 매칭 ${s.score.toFixed(0)}점`,
        status: "pending",
        measured_at: today,
      });
    }
  }

  for (let i = 0; i < records.length; i += 100) {
    await db.from("publishing_recommendations").upsert(
      records.slice(i, i + 100),
      { onConflict: "keyword_id,account_id,measured_at" },
    );
  }

  return records.length;
}

// ════════════════════════════════════════════════════════════
// 월간 리포트
// ════════════════════════════════════════════════════════════
async function sendMonthlyReport(db: DB) {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const start = lastMonth.toISOString().slice(0, 7) + "-01";
  const end = new Date().toISOString().slice(0, 10);

  const { data: recs } = await db
    .from("publishing_recommendations")
    .select("status, feedback_result, account_grade, keyword_grade")
    .gte("measured_at", start)
    .lt("measured_at", end);

  const rows = recs ?? [];
  const total = rows.length;
  const accepted = rows.filter((r: { status: string }) => r.status === "accepted").length;
  const evaluated = rows.filter((r: { feedback_result: string | null }) => r.feedback_result).length;
  const top10 = rows.filter((r: { feedback_result: string | null }) => r.feedback_result === "top3" || r.feedback_result === "top10").length;
  const successRate = evaluated > 0 ? Math.round((top10 / evaluated) * 100) : 0;

  const msg = [
    "📊 *[분석봇] 매칭 알고리즘 월간 리포트*",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `📅 ${start} ~ ${end}`,
    `총 추천: ${total}건 | 수락: ${accepted}건 | 결과 확인: ${evaluated}건`,
    `성공률 (TOP10): ${successRate}% (${top10}/${evaluated}) ${successRate >= 70 ? "✅" : "⚠️"}`,
  ].join("\n");

  await sendSlackNotification(msg, undefined, "alerts");
}
