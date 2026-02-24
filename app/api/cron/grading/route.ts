/**
 * 계정 등급 + 키워드 난이도 + 발행 추천 크론 API
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

// ── 등급 유틸 ─────────────────────────────────────────────
const GRADE_THRESHOLDS: [number, string][] = [[75, "S"], [55, "A"], [35, "B"], [0, "C"]];
function scoreToGrade(score: number): string {
  for (const [th, g] of GRADE_THRESHOLDS) {
    if (score >= th) return g;
  }
  return "C";
}
const GRADE_NUM: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };

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

    // 클라이언트 목록
    const { data: clients } = await db
      .from("clients")
      .select("id, name")
      .eq("is_active", true);

    if (!clients?.length) return { accounts: 0, keywords: 0, recommendations: 0 };

    const clientIds = clients.map((c) => c.id);
    let totalAccounts = 0;
    let totalKeywords = 0;
    let totalRecs = 0;
    const gradeChanges: Array<{ name: string; prev: string; curr: string; score: number }> = [];
    const gradeDist = { S: 0, A: 0, B: 0, C: 0 };

    for (const clientId of clientIds) {
      // ── STEP 1: 계정 등급 ──────────────────────────────
      const accountResult = await gradeAccounts(db, clientId, today);
      totalAccounts += accountResult.count;
      gradeChanges.push(...accountResult.changes);

      // ── STEP 2: 키워드 난이도 ──────────────────────────
      const kwResult = await gradeKeywords(db, clientId, today);
      totalKeywords += kwResult.count;
      for (const [g, n] of Object.entries(kwResult.dist)) {
        gradeDist[g as keyof typeof gradeDist] += n;
      }

      // ── STEP 3: 발행 추천 ─────────────────────────────
      const recCount = await generateRecommendations(db, clientId, today);
      totalRecs += recCount;
    }

    // Slack 알림 — 등급 변화
    const slackLines = [
      "📊 *[분석봇] 주간 등급 재산출 완료*",
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

    // 매월 1일: 월간 리포트
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
// 계정 등급 (run-analyst.mjs 로직 인라인)
// ════════════════════════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gradeAccounts(db: any, clientId: string, today: string) {
  const { data: accounts } = await db
    .from("blog_accounts")
    .select("id, account_name")
    .eq("client_id", clientId)
    .eq("is_active", true);

  const changes: Array<{ name: string; prev: string; curr: string; score: number }> = [];
  let count = 0;

  for (const acc of accounts ?? []) {
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

    const kwIds = [...new Set((contents ?? []).map((c: { keyword_id: string }) => c.keyword_id).filter(Boolean))];
    const { data: kwData } = await db.from("keywords").select("id, current_rank_naver_pc").in("id", kwIds);
    const rankMap: Record<string, number> = {};
    for (const k of kwData ?? []) if (k.current_rank_naver_pc != null) rankMap[k.id] = k.current_rank_naver_pc;

    const ranks = (contents ?? []).map((c: { keyword_id: string }) => rankMap[c.keyword_id]).filter((r: number | undefined): r is number => r != null);
    const exposedCount = ranks.length;
    const exposureRate = total > 0 ? exposedCount / total : 0;
    const top3 = ranks.filter((r: number) => r <= 3).length;
    const top10 = ranks.filter((r: number) => r <= 10).length;
    const top20 = ranks.filter((r: number) => r <= 20).length;
    const avgRank = ranks.length > 0 ? ranks.reduce((a: number, b: number) => a + b, 0) / ranks.length : null;

    const rankQuality = (top3 / total) * 1.0 + ((top10 - top3) / total) * 0.6 + ((top20 - top10) / total) * 0.3;
    const consistency = 0.5;
    const volumeBonus = Math.min(total / 30, 1.0);

    let score = exposureRate * 35 + rankQuality * 35 + consistency * 20 + volumeBonus * 10;
    score = Math.round(Math.min(100, score) * 10) / 10;
    const grade = scoreToGrade(score);

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
      ? `등급 유지 (${grade}급). 노출률 ${(exposureRate * 100).toFixed(0)}%, TOP10 ${((top10 / total) * 100).toFixed(0)}%`
      : `신규 발행 ${total}건, 초기 등급 ${grade}급`;

    await db.from("account_grades").upsert(
      {
        account_id: acc.id, client_id: clientId, measured_at: today,
        total_published: total, exposed_keywords: exposedCount,
        exposure_rate: Math.round(exposureRate * 10000) / 100,
        avg_rank: avgRank ? Math.round(avgRank * 10) / 10 : null,
        top3_count: top3, top10_count: top10,
        top3_ratio: Math.round((top3 / total) * 10000) / 100,
        top10_ratio: Math.round((top10 / total) * 10000) / 100,
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
// 키워드 난이도
// ════════════════════════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gradeKeywords(db: any, clientId: string, today: string) {
  const { data: keywords } = await db
    .from("keywords")
    .select("id, monthly_search_total, monthly_search_pc, monthly_search_mo, competition_level, current_rank_naver_pc, current_rank_naver_mo")
    .eq("client_id", clientId)
    .in("status", ["active", "queued", "refresh"]);

  const dist = { S: 0, A: 0, B: 0, C: 0 };
  let count = 0;

  for (const kw of keywords ?? []) {
    const vol = kw.monthly_search_total || 0;
    const searchDemand = vol >= 100 ? 1.0 : vol >= 50 ? 0.7 : vol >= 20 ? 0.4 : 0.2;
    const comp = { high: 1.0, medium: 0.6, low: 0.3 }[kw.competition_level as string] ?? 0.6;
    const rankPc = kw.current_rank_naver_pc;
    const gap = rankPc == null ? 1.0 : rankPc > 10 ? 0.6 : rankPc > 3 ? 0.3 : 0.1;

    let diffScore = searchDemand * 30 + comp * 40 + gap * 30;
    diffScore = Math.round(Math.min(100, diffScore) * 10) / 10;
    const grade = scoreToGrade(diffScore);
    dist[grade as keyof typeof dist]++;

    let oppScore = Math.round(searchDemand * (1 - comp) * 1000) / 10;
    oppScore = Math.min(100, oppScore);

    const moRatio = vol > 0 ? Math.round(((kw.monthly_search_mo || 0) / vol) * 1000) / 10 : 0;

    await db.from("keyword_difficulty").upsert(
      {
        keyword_id: kw.id, client_id: clientId, measured_at: today,
        search_volume_total: vol, competition_level: kw.competition_level || "medium",
        current_rank_pc: rankPc, current_rank_mo: kw.current_rank_naver_mo,
        mo_ratio: moRatio, difficulty_score: diffScore, grade, opportunity_score: oppScore,
      },
      { onConflict: "keyword_id,measured_at" },
    );
    count++;
  }

  return { count, dist };
}

// ════════════════════════════════════════════════════════════
// 발행 추천
// ════════════════════════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateRecommendations(db: any, clientId: string, today: string): Promise<number> {
  const { data: accountGrades } = await db
    .from("account_grades")
    .select("account_id, grade, account_score, total_published")
    .eq("client_id", clientId)
    .eq("measured_at", today);

  const { data: keywordGrades } = await db
    .from("keyword_difficulty")
    .select("keyword_id, grade, difficulty_score, opportunity_score, competition_level")
    .eq("client_id", clientId)
    .eq("measured_at", today);

  if (!accountGrades?.length || !keywordGrades?.length) return 0;

  // 계정 이름
  const accIds = accountGrades.map((a: { account_id: string }) => a.account_id);
  const { data: accNames } = await db.from("blog_accounts").select("id, account_name").in("id", accIds);
  const nameMap: Record<string, string> = {};
  for (const a of accNames ?? []) nameMap[a.id] = a.account_name;

  // 중복 체크
  const { data: pubContents } = await db
    .from("contents")
    .select("keyword_id, account_id")
    .eq("client_id", clientId)
    .eq("publish_status", "published");
  const dupeMap: Record<string, Set<string>> = {};
  for (const c of pubContents ?? []) {
    if (c.keyword_id && c.account_id) {
      if (!dupeMap[c.keyword_id]) dupeMap[c.keyword_id] = new Set();
      dupeMap[c.keyword_id].add(c.account_id);
    }
  }

  const records: Array<Record<string, unknown>> = [];
  for (const kw of keywordGrades) {
    const scored: Array<{ score: number; acc: typeof accountGrades[0]; bonuses: Record<string, boolean>; penalties: Record<string, boolean> }> = [];

    for (const acc of accountGrades) {
      const accNum = GRADE_NUM[acc.grade] || 1;
      const kwNum = GRADE_NUM[kw.grade] || 1;
      let base = 100 - Math.abs(accNum - kwNum) * 25;

      const bonuses: Record<string, boolean> = {};
      const penalties: Record<string, boolean> = {};

      if (kw.competition_level === "low" && accNum >= 2) bonuses.low_competition = true;
      if ((kw.opportunity_score || 0) >= 70) bonuses.high_opportunity = true;
      if (dupeMap[kw.keyword_id]?.has(acc.account_id)) penalties.duplicate = true;
      if ((acc.total_published || 0) < 5 && acc.grade === "C") penalties.new_account = true;

      const bv = (bonuses.low_competition ? 10 : 0) + (bonuses.high_opportunity ? 5 : 0);
      const pv = (penalties.duplicate ? 15 : 0) + (penalties.new_account ? 20 : 0);
      const score = Math.max(0, Math.min(100, base + bv - pv));
      scored.push({ score, acc, bonuses, penalties });
    }

    scored.sort((a, b) => b.score - a.score);

    for (let i = 0; i < Math.min(scored.length, 3); i++) {
      const s = scored[i];
      records.push({
        client_id: clientId,
        keyword_id: kw.keyword_id,
        account_id: s.acc.account_id,
        match_score: Math.round(s.score * 10) / 10,
        rank: i + 1,
        account_grade: s.acc.grade,
        keyword_grade: kw.grade,
        bonuses: s.bonuses,
        penalties: s.penalties,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendMonthlyReport(db: any) {
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
