#!/usr/bin/env node
/**
 * keyword-regrade.mjs
 *
 * 전체 활성 키워드를 competition v2 알고리즘으로 재채점하여
 * keyword_difficulty 테이블에 upsert하고
 * keywords.competition_level을 갱신한다.
 *
 * 사용법:
 *   cd apps/web && node scripts/keyword-regrade.mjs
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: "/Users/kk/Desktop/my-ai-agents/ai-marketer/apps/web/.env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_KEY 환경변수 미설정");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const today = new Date().toISOString().slice(0, 10);

// ── 등급 임계값 ──────────────────────────────────────────
const GRADE_THRESHOLDS = [
  [75, "S"],
  [55, "A"],
  [35, "B"],
  [0, "C"],
];

function scoreToGrade(score) {
  for (const [th, g] of GRADE_THRESHOLDS) {
    if (score >= th) return g;
  }
  return "C";
}

// ── _calc_search_demand ──────────────────────────────────
function calcSearchDemand(volume) {
  if (volume >= 10000) return 1.0;
  if (volume >= 5000) return 0.85;
  if (volume >= 1000) return 0.7;
  if (volume >= 500) return 0.5;
  if (volume >= 100) return 0.35;
  if (volume >= 20) return 0.2;
  return 0.1;
}

// ── _calc_competition_v2 ─────────────────────────────────
function calcCompetitionV2(volume, level, compIdx, rankPc) {
  const hasVolume = volume > 0;
  const hasComp = level != null && level !== "";

  // 데이터 부족: 검색량도 없고 경쟁도도 없고 compIdx도 없으면 "미측정"
  if (!hasVolume && !hasComp && compIdx == null) {
    return [0.5, "미측정"];
  }

  // Step 1: 검색량 기반 베이스
  let base, baseLevel;
  if (volume >= 10000) {
    base = 0.9;
    baseLevel = "high";
  } else if (volume >= 1000) {
    base = 0.6;
    baseLevel = "medium";
  } else if (volume > 0) {
    base = 0.3;
    baseLevel = "low";
  } else {
    base = 0.5;
    baseLevel = "미측정";
  }

  // Step 2: compIdx 보정 (네이버 광고 API의 "높음/중간/낮음")
  if (hasComp && (level === "high" || level === "높음")) {
    base = Math.max(base, 0.85);
    baseLevel = "high";
  } else if (hasComp && (level === "medium" || level === "중간")) {
    base = (base + 0.6) / 2;
    if (baseLevel === "low") {
      baseLevel = "medium";
    }
  } else if (hasComp && (level === "low" || level === "낮음")) {
    base = Math.min(base, 0.35);
    baseLevel = "low";
  }

  // competition_index (0~100 수치) 추가 보정
  if (compIdx != null) {
    const idxFactor = Math.min(compIdx / 100.0, 1.0);
    base = base * 0.6 + idxFactor * 0.4;
  }

  // Step 3: 우리 콘텐츠 상위권이면 난이도 하향
  if (rankPc != null) {
    if (rankPc <= 3) {
      base *= 0.7; // TOP3: 30% 하향
    } else if (rankPc <= 10) {
      base *= 0.85; // TOP10: 15% 하향
    }
  }

  const competition = Math.round(Math.min(1.0, Math.max(0.0, base)) * 1000) / 1000;

  // resolved level 결정
  let resolved;
  if (competition >= 0.7) {
    resolved = "high";
  } else if (competition >= 0.4) {
    resolved = "medium";
  } else {
    resolved = "low";
  }

  return [competition, resolved];
}

// ── _calc_exposure_gap ───────────────────────────────────
function calcExposureGap(rankPc) {
  if (rankPc == null) return 1.0;
  if (rankPc > 20) return 0.8;
  if (rankPc > 10) return 0.6;
  if (rankPc > 3) return 0.3;
  return 0.1;
}

// ════════════════════════════════════════════════════════
// 메인 실행
// ════════════════════════════════════════════════════════
async function main() {
  console.log("=== Keyword Re-grade (competition v2) ===");
  console.log(`날짜: ${today}\n`);

  // 1. 전체 클라이언트 목록 조회
  const { data: clients, error: cErr } = await db
    .from("clients")
    .select("id, name")
    .eq("is_active", true);

  if (cErr) {
    console.error("clients 조회 실패:", cErr.message);
    process.exit(1);
  }
  if (!clients?.length) {
    console.log("활성 클라이언트 없음.");
    return;
  }

  console.log(`클라이언트: ${clients.map((c) => c.name).join(", ")}\n`);

  let totalProcessed = 0;
  const gradeDist = { S: 0, A: 0, B: 0, C: 0 };
  let sumDifficulty = 0;
  let sumOpportunity = 0;

  for (const client of clients) {
    const clientId = client.id;

    // 2. 키워드 조회
    const { data: keywords, error: kwErr } = await db
      .from("keywords")
      .select(
        "id, keyword, client_id, monthly_search_total, monthly_search_pc, " +
          "monthly_search_mo, competition_level, competition_index, " +
          "current_rank_naver_pc, current_rank_naver_mo"
      )
      .eq("client_id", clientId)
      .in("status", ["active", "queued", "refresh"]);

    if (kwErr) {
      console.error(`  [${client.name}] 키워드 조회 오류:`, kwErr.message);
      continue;
    }
    if (!keywords?.length) {
      console.log(`  [${client.name}] 대상 키워드 없음`);
      continue;
    }

    console.log(`  [${client.name}] ${keywords.length}개 키워드 처리 중...`);

    const upsertBatch = [];
    const updateBatch = [];

    for (const kw of keywords) {
      const totalVol = kw.monthly_search_total || 0;
      const moVol = kw.monthly_search_mo || 0;
      const rankPc = kw.current_rank_naver_pc;
      const rankMo = kw.current_rank_naver_mo;
      const compLevel = kw.competition_level;
      const compIdx = kw.competition_index;

      // 3. 각 지표 계산
      const searchDemand = calcSearchDemand(totalVol);
      const [competition, resolvedLevel] = calcCompetitionV2(
        totalVol,
        compLevel,
        compIdx,
        rankPc
      );
      const exposureGap = calcExposureGap(rankPc);

      // 종합 점수
      let difficultyScore = searchDemand * 30 + competition * 40 + exposureGap * 30;
      difficultyScore = Math.round(Math.min(100.0, difficultyScore) * 10) / 10;
      const grade = scoreToGrade(difficultyScore);

      // 기회 점수
      let opportunityScore = Math.round(
        searchDemand * (1.0 - competition) * 100 * 10
      ) / 10;
      opportunityScore = Math.round(Math.min(100.0, opportunityScore) * 10) / 10;

      // MO 비율
      const moRatio =
        totalVol > 0
          ? Math.round((moVol / totalVol) * 1000) / 10
          : 0;

      // keyword_difficulty upsert 레코드
      upsertBatch.push({
        keyword_id: kw.id,
        client_id: clientId,
        measured_at: today,
        search_volume_total: totalVol,
        competition_level: resolvedLevel === "미측정" ? "medium" : resolvedLevel,
        current_rank_pc: rankPc,
        current_rank_mo: rankMo,
        mo_ratio: moRatio,
        difficulty_score: difficultyScore,
        grade,
        opportunity_score: opportunityScore,
      });

      // keywords.competition_level 갱신 (미측정이면 medium 유지)
      const kwCompLevel = resolvedLevel === "미측정" ? "medium" : resolvedLevel;
      updateBatch.push({ id: kw.id, competition_level: kwCompLevel });

      // 집계
      gradeDist[grade]++;
      sumDifficulty += difficultyScore;
      sumOpportunity += opportunityScore;
      totalProcessed++;
    }

    // 4. Batch upsert keyword_difficulty (100개씩)
    for (let i = 0; i < upsertBatch.length; i += 100) {
      const chunk = upsertBatch.slice(i, i + 100);
      const { error: uErr } = await db
        .from("keyword_difficulty")
        .upsert(chunk, { onConflict: "keyword_id,measured_at" });
      if (uErr) {
        console.error(`    keyword_difficulty upsert 오류 (batch ${i}):`, uErr.message);
      }
    }

    // 5. keywords.competition_level 개별 업데이트
    for (const upd of updateBatch) {
      const { error: uErr } = await db
        .from("keywords")
        .update({ competition_level: upd.competition_level })
        .eq("id", upd.id);
      if (uErr) {
        console.error(`    keywords 업데이트 오류 (${upd.id}):`, uErr.message);
      }
    }

    console.log(`    -> ${upsertBatch.length}개 완료`);
  }

  // 6. 요약 출력
  console.log("\n════════════════════════════════════════");
  console.log("         Re-grade 결과 요약");
  console.log("════════════════════════════════════════");
  console.log(`총 처리:         ${totalProcessed}개 키워드`);
  console.log(
    `등급 분포:       S=${gradeDist.S}, A=${gradeDist.A}, B=${gradeDist.B}, C=${gradeDist.C}`
  );
  console.log(
    `평균 난이도:     ${totalProcessed > 0 ? (sumDifficulty / totalProcessed).toFixed(1) : 0}`
  );
  console.log(
    `평균 기회점수:   ${totalProcessed > 0 ? (sumOpportunity / totalProcessed).toFixed(1) : 0}`
  );
  console.log("════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n치명적 오류:", err.message);
  process.exit(1);
});
