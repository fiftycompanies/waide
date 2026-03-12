#!/usr/bin/env node
/**
 * 계정 등급 / 키워드 난이도 / 발행 추천 일괄 실행 스크립트
 *
 * Python 에이전트 대신 직접 실행하여 account_grades, keyword_difficulty,
 * publishing_recommendations 테이블을 채운다.
 *
 * 사용법:
 *   node scripts/run-analyst.mjs                                    # 전체
 *   node scripts/run-analyst.mjs --client <clientId>                # 특정 client
 *   node scripts/run-analyst.mjs --step account                     # 계정 등급만
 *   node scripts/run-analyst.mjs --step keyword                     # 키워드 난이도만
 *   node scripts/run-analyst.mjs --step recommend                   # 발행 추천만
 */

import { createClient } from "@supabase/supabase-js";

const dotenv = await import("dotenv");
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE 환경변수 미설정");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CLI 파싱 ───────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}
const targetClientId = getArg("client");
const stepFilter = getArg("step"); // 'account' | 'keyword' | 'recommend' | null(전체)

const today = new Date().toISOString().slice(0, 10);

// ── 등급 유틸 ──────────────────────────────────────────
const GRADE_THRESHOLDS = [[75, "S"], [55, "A"], [35, "B"], [0, "C"]];
function scoreToGrade(score) {
  for (const [th, g] of GRADE_THRESHOLDS) {
    if (score >= th) return g;
  }
  return "C";
}
const GRADE_NUM = { S: 4, A: 3, B: 2, C: 1 };

// ════════════════════════════════════════════════════════
// STEP 1: 계정 등급 산출
// ════════════════════════════════════════════════════════
async function gradeAccounts(clientIds) {
  console.log("\n════════ STEP 1: 계정 등급 산출 ════════");
  let totalUpdated = 0;

  for (const clientId of clientIds) {
    // 블로그 계정 조회
    const { data: accounts } = await db
      .from("blog_accounts")
      .select("id, account_name, platform, is_active, blog_url")
      .eq("client_id", clientId)
      .eq("is_active", true);

    if (!accounts?.length) {
      console.log(`  [${clientId}] 활성 계정 없음`);
      continue;
    }

    console.log(`  클라이언트 ${clientId}: ${accounts.length}개 계정`);

    for (const acc of accounts) {
      // 해당 계정의 발행된 콘텐츠 조회
      const { data: contents } = await db
        .from("contents")
        .select("id, keyword_id, account_id, publish_status, published_at")
        .eq("account_id", acc.id)
        .eq("client_id", clientId)
        .eq("publish_status", "published");

      const total = contents?.length || 0;

      if (total === 0) {
        // 발행 없음 → C등급
        await upsertGrade(acc.id, clientId, {
          total_published: 0,
          exposed_keywords: 0,
          exposure_rate: 0,
          avg_rank: null,
          top3_count: 0,
          top10_count: 0,
          top3_ratio: 0,
          top10_ratio: 0,
          consistency_rate: 0,
          account_score: 0,
          grade: "C",
          previous_grade: null,
          grade_change_reason: "발행 이력 없음",
        });
        console.log(`    ${acc.account_name}: C등급 (발행 0건)`);
        totalUpdated++;
        continue;
      }

      // 키워드별 현재 순위 조회
      const kwIds = [...new Set(contents.map((c) => c.keyword_id).filter(Boolean))];
      const { data: kwData } = await db
        .from("keywords")
        .select("id, current_rank_naver_pc, current_rank_naver_mo")
        .in("id", kwIds);

      const kwRankMap = {};
      for (const k of kwData || []) {
        kwRankMap[k.id] = k.current_rank_naver_pc;
      }

      // 순위 데이터 집계
      const ranks = [];
      for (const c of contents) {
        const rank = kwRankMap[c.keyword_id];
        if (rank != null) ranks.push(rank);
      }

      const exposedCount = ranks.length;
      const exposureRate = total > 0 ? exposedCount / total : 0;

      const top3Count = ranks.filter((r) => r <= 3).length;
      const top10Count = ranks.filter((r) => r <= 10).length;
      const top20Count = ranks.filter((r) => r <= 20).length;

      const top3Ratio = (top3Count / total) * 100;
      const top10Ratio = (top10Count / total) * 100;

      const avgRank = ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;

      // rank_quality 계산
      const top3R = top3Count / total;
      const top10Only = (top10Count - top3Count) / total;
      const top20Only = (top20Count - top10Count) / total;
      const rankQuality = top3R * 1.0 + top10Only * 0.6 + top20Only * 0.3;

      // consistency: 첫 실행이므로 데이터 부족 → 중립값
      const consistency = 0.5;

      // volume_bonus
      const volumeBonus = Math.min(total / 30, 1.0);

      // 종합 점수
      let score =
        exposureRate * 35 +
        rankQuality * 35 +
        consistency * 20 +
        volumeBonus * 10;
      score = Math.round(Math.min(100.0, score) * 10) / 10;
      const grade = scoreToGrade(score);

      // 이전 등급 조회
      const { data: prevData } = await db
        .from("account_grades")
        .select("grade, account_score, exposure_rate, top10_ratio")
        .eq("account_id", acc.id)
        .lt("measured_at", today)
        .order("measured_at", { ascending: false })
        .limit(1);

      const prev = prevData?.[0] || null;
      const previousGrade = prev?.grade || null;

      const reason = previousGrade
        ? `등급 유지 (${grade}급). 노출률 ${(exposureRate * 100).toFixed(0)}%, TOP10비율 ${top10Ratio.toFixed(0)}%`
        : `신규 계정 발행 ${total}건 기록, 초기 등급 ${grade}급 책정`;

      await upsertGrade(acc.id, clientId, {
        total_published: total,
        exposed_keywords: exposedCount,
        exposure_rate: Math.round(exposureRate * 10000) / 100,
        avg_rank: avgRank ? Math.round(avgRank * 10) / 10 : null,
        top3_count: top3Count,
        top10_count: top10Count,
        top3_ratio: Math.round(top3Ratio * 100) / 100,
        top10_ratio: Math.round(top10Ratio * 100) / 100,
        consistency_rate: Math.round(consistency * 10000) / 100,
        account_score: score,
        grade,
        previous_grade: previousGrade,
        grade_change_reason: reason,
      });

      console.log(`    ${acc.account_name}: ${grade}등급 (${score}점) — 발행 ${total}건, 노출 ${exposedCount}건, TOP10 ${top10Count}건`);
      totalUpdated++;
    }
  }

  console.log(`\n  ✅ 계정 등급 완료: ${totalUpdated}개 계정 처리`);
  return totalUpdated;
}

async function upsertGrade(accountId, clientId, data) {
  await db.from("account_grades").upsert(
    { account_id: accountId, client_id: clientId, measured_at: today, ...data },
    { onConflict: "account_id,measured_at" }
  );
}

// ════════════════════════════════════════════════════════
// STEP 2: 키워드 난이도 산출
// ════════════════════════════════════════════════════════
async function gradeKeywords(clientIds) {
  console.log("\n════════ STEP 2: 키워드 난이도 산출 ════════");
  let totalUpdated = 0;
  const gradeDist = { S: 0, A: 0, B: 0, C: 0 };

  for (const clientId of clientIds) {
    const { data: keywords } = await db
      .from("keywords")
      .select(
        "id, keyword, monthly_search_pc, monthly_search_total, " +
        "monthly_search_mo, competition_level, " +
        "current_rank_naver_pc, current_rank_naver_mo, status"
      )
      .eq("client_id", clientId)
      .in("status", ["active", "queued", "refresh"]);

    if (!keywords?.length) {
      console.log(`  [${clientId}] 키워드 없음`);
      continue;
    }

    console.log(`  클라이언트 ${clientId}: ${keywords.length}개 키워드`);

    for (const kw of keywords) {
      const totalVol = kw.monthly_search_total || 0;
      const pcVol = kw.monthly_search_pc || 0;
      const moVol = kw.monthly_search_mo || 0;

      // 검색량 지표
      let searchDemand;
      if (totalVol >= 100) searchDemand = 1.0;
      else if (totalVol >= 50) searchDemand = 0.7;
      else if (totalVol >= 20) searchDemand = 0.4;
      else searchDemand = 0.2;

      // 경쟁도 지표
      const compLevel = kw.competition_level || "medium";
      const competition = { high: 1.0, medium: 0.6, low: 0.3 }[compLevel] ?? 0.6;

      // 노출 격차 지표
      const rankPc = kw.current_rank_naver_pc;
      let exposureGap;
      if (rankPc == null) exposureGap = 1.0;
      else if (rankPc > 10) exposureGap = 0.6;
      else if (rankPc > 3) exposureGap = 0.3;
      else exposureGap = 0.1;

      // 종합 점수
      let difficultyScore = searchDemand * 30 + competition * 40 + exposureGap * 30;
      difficultyScore = Math.round(Math.min(100.0, difficultyScore) * 10) / 10;
      const grade = scoreToGrade(difficultyScore);
      gradeDist[grade]++;

      // 기회 점수
      let opportunityScore = Math.round(searchDemand * (1.0 - competition) * 100 * 10) / 10;
      opportunityScore = Math.round(Math.min(100.0, opportunityScore) * 10) / 10;

      // MO 비율
      const moRatio = totalVol > 0 ? Math.round((moVol / totalVol) * 1000) / 10 : 0;

      await db.from("keyword_difficulty").upsert(
        {
          keyword_id: kw.id,
          client_id: clientId,
          measured_at: today,
          search_volume_total: totalVol,
          competition_level: compLevel,
          current_rank_pc: rankPc,
          current_rank_mo: kw.current_rank_naver_mo,
          mo_ratio: moRatio,
          difficulty_score: difficultyScore,
          grade,
          opportunity_score: opportunityScore,
        },
        { onConflict: "keyword_id,measured_at" }
      );

      totalUpdated++;
    }
  }

  console.log(`\n  ✅ 키워드 난이도 완료: ${totalUpdated}개 처리`);
  console.log(`  등급 분포: S=${gradeDist.S}, A=${gradeDist.A}, B=${gradeDist.B}, C=${gradeDist.C}`);
  return { totalUpdated, gradeDist };
}

// ════════════════════════════════════════════════════════
// STEP 3: 발행 추천 매칭
// ════════════════════════════════════════════════════════
async function generateRecommendations(clientIds) {
  console.log("\n════════ STEP 3: 발행 추천 매칭 ════════");
  let totalRecs = 0;

  for (const clientId of clientIds) {
    // 오늘 등급 데이터 로드
    const { data: accountGrades } = await db
      .from("account_grades")
      .select("account_id, grade, account_score, total_published, exposure_rate")
      .eq("client_id", clientId)
      .eq("measured_at", today);

    const { data: keywordGrades } = await db
      .from("keyword_difficulty")
      .select("keyword_id, grade, difficulty_score, opportunity_score, competition_level")
      .eq("client_id", clientId)
      .eq("measured_at", today);

    if (!accountGrades?.length || !keywordGrades?.length) {
      console.log(`  [${clientId}] 등급 데이터 부족 (계정: ${accountGrades?.length || 0}, 키워드: ${keywordGrades?.length || 0})`);
      continue;
    }

    // 계정 이름 조회
    const accIds = accountGrades.map((a) => a.account_id);
    const { data: accNames } = await db
      .from("blog_accounts")
      .select("id, account_name")
      .in("id", accIds);
    const nameMap = {};
    for (const a of accNames || []) nameMap[a.id] = a.account_name;
    for (const a of accountGrades) a.account_name = nameMap[a.account_id] || a.account_id;

    // 키워드 텍스트 조회
    const kwIds = keywordGrades.map((k) => k.keyword_id);
    const { data: kwTexts } = await db
      .from("keywords")
      .select("id, keyword")
      .in("id", kwIds);
    const kwMap = {};
    for (const k of kwTexts || []) kwMap[k.id] = k.keyword;
    for (const k of keywordGrades) k.keyword = kwMap[k.keyword_id] || "";

    // 최근 발행 데이터 (보너스/패널티용)
    const cutoff7d = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const { data: recentContents } = await db
      .from("contents")
      .select("account_id")
      .eq("client_id", clientId)
      .gte("published_at", cutoff7d);
    const recentPub = {};
    for (const c of recentContents || []) {
      if (c.account_id) recentPub[c.account_id] = (recentPub[c.account_id] || 0) + 1;
    }

    // 이미 발행된 키워드-계정 조합 (중복 방지)
    const { data: pubContents } = await db
      .from("contents")
      .select("keyword_id, account_id")
      .eq("client_id", clientId)
      .eq("publish_status", "published");
    const duplicateMap = {};
    for (const c of pubContents || []) {
      if (c.keyword_id && c.account_id) {
        if (!duplicateMap[c.keyword_id]) duplicateMap[c.keyword_id] = new Set();
        duplicateMap[c.keyword_id].add(c.account_id);
      }
    }

    console.log(`  클라이언트 ${clientId}: ${accountGrades.length}개 계정 × ${keywordGrades.length}개 키워드 매칭`);

    const records = [];
    for (const kw of keywordGrades) {
      const scored = [];
      for (const acc of accountGrades) {
        const accNum = GRADE_NUM[acc.grade] || 1;
        const kwNum = GRADE_NUM[kw.grade] || 1;
        let baseScore = 100 - Math.abs(accNum - kwNum) * 25;

        const bonuses = {};
        const penalties = {};

        // 보너스
        if (kw.competition_level === "low" && accNum >= 2) bonuses.low_competition = true;
        if (!recentPub[acc.account_id]) bonuses.no_recent = true;
        if ((kw.opportunity_score || 0) >= 70) bonuses.high_opportunity = true;

        // 패널티
        if (duplicateMap[kw.keyword_id]?.has(acc.account_id)) penalties.duplicate = true;
        if ((acc.total_published || 0) < 5 && acc.grade === "C") penalties.new_account = true;

        const bonusVal =
          (bonuses.low_competition ? 10 : 0) +
          (bonuses.no_recent ? 5 : 0) +
          (bonuses.high_opportunity ? 5 : 0);
        const penaltyVal =
          (penalties.duplicate ? 15 : 0) +
          (penalties.new_account ? 20 : 0);

        const score = Math.max(0, Math.min(100, baseScore + bonusVal - penaltyVal));
        scored.push({ score, acc, bonuses, penalties });
      }

      scored.sort((a, b) => b.score - a.score);

      for (let i = 0; i < Math.min(scored.length, 3); i++) {
        const s = scored[i];
        const reason = buildReason(s.acc, kw, i + 1, s.score, s.bonuses, s.penalties);

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
          reason,
          status: "pending",
          measured_at: today,
        });
      }
    }

    // Batch upsert
    if (records.length > 0) {
      for (let i = 0; i < records.length; i += 100) {
        await db.from("publishing_recommendations").upsert(
          records.slice(i, i + 100),
          { onConflict: "keyword_id,account_id,measured_at" }
        );
      }
      totalRecs += records.length;
    }

    // 상위 10개 출력
    const top10 = records.filter((r) => r.rank === 1).sort((a, b) => b.match_score - a.match_score).slice(0, 10);
    console.log("\n  📋 상위 10개 추천:");
    for (const r of top10) {
      const accName = nameMap[r.account_id] || "?";
      const kwText = kwMap[r.keyword_id] || "?";
      console.log(`    ${r.match_score}점 | ${accName}(${r.account_grade}) → "${kwText}"(${r.keyword_grade})`);
    }
  }

  console.log(`\n  ✅ 발행 추천 완료: ${totalRecs}건 생성`);
  return totalRecs;
}

function buildReason(acc, kw, rank, score, bonuses, penalties) {
  const parts = [`${acc.grade}급 계정 ${acc.account_name}을 ${kw.grade}급 키워드 '${kw.keyword}'에 추천.`];
  if (bonuses.low_competition) parts.push("저경쟁 키워드 + B급 이상 계정(+10).");
  if (bonuses.no_recent) parts.push("최근 7일 발행 없음(+5).");
  if (bonuses.high_opportunity) parts.push("기회 점수 70+(+5).");
  if (penalties.duplicate) parts.push("⚠️ 동일 키워드 이미 발행 중(-15).");
  if (penalties.new_account) parts.push("⚠️ 신규 계정(-20).");
  parts.push(`매칭 ${score.toFixed(0)}점.`);
  return parts.join(" ");
}

// ════════════════════════════════════════════════════════
// 메인 실행
// ════════════════════════════════════════════════════════
async function main() {
  console.log("=== Analyst 일괄 실행 ===");
  console.log(`날짜: ${today}`);

  // 클라이언트 목록
  let clientQuery = db.from("clients").select("id, name").eq("is_active", true);
  if (targetClientId) clientQuery = clientQuery.eq("id", targetClientId);

  const { data: clients, error } = await clientQuery;
  if (error) { console.error("clients 조회 실패:", error.message); process.exit(1); }
  if (!clients?.length) { console.log("활성 클라이언트 없음."); return; }

  console.log(`클라이언트: ${clients.map((c) => c.name).join(", ")}`);
  const clientIds = clients.map((c) => c.id);

  if (!stepFilter || stepFilter === "account") {
    await gradeAccounts(clientIds);
  }
  if (!stepFilter || stepFilter === "keyword") {
    await gradeKeywords(clientIds);
  }
  if (!stepFilter || stepFilter === "recommend") {
    await generateRecommendations(clientIds);
  }

  console.log("\n=== 전체 완료 ===");
}

main().catch((err) => {
  console.error("\n치명적 오류:", err.message);
  process.exit(1);
});
