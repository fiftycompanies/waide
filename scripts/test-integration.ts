/**
 * test-integration.ts
 * Phase F1~F4 통합 가동 검증 스크립트
 *
 * 사용법:
 *   npx tsx scripts/test-integration.ts             # 전체 (dry-run + live)
 *   npx tsx scripts/test-integration.ts --dry-run   # DB 쿼리만 (AI 호출 없음)
 *   npx tsx scripts/test-integration.ts --live       # AI 포함 전체 테스트
 *
 * 필수 환경변수: .env.local 로드 필요
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   ANTHROPIC_API_KEY (--live 모드)
 *   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET (시나리오 C)
 */

import * as dotenv from "dotenv";
import * as path from "path";

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ═══════════════════════════════════════════
// 설정
// ═══════════════════════════════════════════

const isDryRun = process.argv.includes("--dry-run") || !process.argv.includes("--live");
const TEST_CLIENT_ID = "d9af5297-de7c-4353-96ea-78ba0bb59f0c"; // 캠핏

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
  durationMs?: number;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(`  ${msg}`);
}

function pass(name: string, detail: string, ms?: number) {
  results.push({ name, status: "PASS", detail, durationMs: ms });
  console.log(`  ✅ ${name}: ${detail}${ms ? ` (${ms}ms)` : ""}`);
}

function fail(name: string, detail: string) {
  results.push({ name, status: "FAIL", detail });
  console.log(`  ❌ ${name}: ${detail}`);
}

function skip(name: string, detail: string) {
  results.push({ name, status: "SKIP", detail });
  console.log(`  ⏭️  ${name}: ${detail}`);
}

// ═══════════════════════════════════════════
// 0. 환경변수 체크
// ═══════════════════════════════════════════

async function checkEnvVars() {
  console.log("\n[0] 환경변수 체크");

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
  ];

  const optional = [
    "ANTHROPIC_API_KEY",
    "NAVER_CLIENT_ID",
    "NAVER_CLIENT_SECRET",
    "NAVER_AD_API_KEY",
    "NAVER_AD_SECRET_KEY",
    "NAVER_AD_CUSTOMER_ID",
    "SLACK_BOT_TOKEN",
  ];

  let allRequired = true;
  for (const key of required) {
    if (process.env[key]) {
      pass(`ENV_${key}`, "설정됨");
    } else {
      fail(`ENV_${key}`, "미설정 — 필수");
      allRequired = false;
    }
  }

  for (const key of optional) {
    if (process.env[key]) {
      pass(`ENV_${key}`, "설정됨");
    } else {
      skip(`ENV_${key}`, "미설정 (선택)");
    }
  }

  return allRequired;
}

// ═══════════════════════════════════════════
// 1. DB 테이블 존재 확인
// ═══════════════════════════════════════════

async function checkDbTables() {
  console.log("\n[1] DB 테이블 존재 확인 (045~052 마이그레이션)");

  const { createAdminClient } = await import("../lib/supabase/service");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const tables = [
    { name: "scoring_criteria", migration: "045" },
    { name: "agent_execution_logs", migration: "046" },
    { name: "content_benchmarks", migration: "047" },
    { name: "agent_prompts", migration: "049", check: "task column" },
    { name: "keywords", migration: "051", check: "metadata column" },
    { name: "contents", migration: "052", check: "metadata column" },
  ];

  for (const tbl of tables) {
    try {
      const { count, error } = await db
        .from(tbl.name)
        .select("*", { count: "exact", head: true });

      if (error) {
        fail(`DB_${tbl.name}`, `${tbl.migration}: ${error.message}`);
      } else {
        pass(`DB_${tbl.name}`, `${tbl.migration}: 존재 (${count}건)`);
      }
    } catch (err) {
      fail(`DB_${tbl.name}`, `${tbl.migration}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // clients.brand_persona 컬럼 확인 (048)
  try {
    const { data, error } = await db
      .from("clients")
      .select("brand_persona")
      .limit(1);

    if (error) {
      fail("DB_clients.brand_persona", `048: ${error.message}`);
    } else {
      pass("DB_clients.brand_persona", `048: 컬럼 존재 (${data?.length || 0}건 조회)`);
    }
  } catch (err) {
    fail("DB_clients.brand_persona", `048: ${err instanceof Error ? err.message : String(err)}`);
  }

  // agent_prompts 시딩 확인 (050)
  try {
    const { data, error } = await db
      .from("agent_prompts")
      .select("agent_type, task, title")
      .not("task", "is", null);

    if (error) {
      fail("DB_agent_prompts_seed", `050: ${error.message}`);
    } else {
      const count = data?.length || 0;
      const expected = 10;
      if (count >= expected) {
        pass("DB_agent_prompts_seed", `050: ${count}개 프롬프트 확인 (목표 ${expected})`);
      } else {
        fail("DB_agent_prompts_seed", `050: ${count}개만 존재 (목표 ${expected})`);
      }
    }
  } catch (err) {
    fail("DB_agent_prompts_seed", `050: ${err instanceof Error ? err.message : String(err)}`);
  }

  // scoring_criteria 시딩 확인 (045 seed)
  try {
    const { count, error } = await db
      .from("scoring_criteria")
      .select("*", { count: "exact", head: true });

    if (error) {
      fail("DB_scoring_criteria_seed", `045: ${error.message}`);
    } else {
      if ((count ?? 0) >= 20) {
        pass("DB_scoring_criteria_seed", `045: ${count}건 (마케팅+QC)`);
      } else {
        fail("DB_scoring_criteria_seed", `045: ${count}건만 — 20건 이상 필요`);
      }
    }
  } catch (err) {
    fail("DB_scoring_criteria_seed", `045: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ═══════════════════════════════════════════
// 2. 모듈 임포트 체크
// ═══════════════════════════════════════════

async function checkModuleImports() {
  console.log("\n[2] 모듈 임포트 체크 (F1~F4 파일)");

  const modules = [
    { path: "../lib/agent-runner", export: "runAgent" },
    { path: "../lib/agent-chain", export: "runAgentChain" },
    { path: "../lib/scoring-engine", export: "loadCriteria" },
    { path: "../lib/competitor-collector", export: "collectCompetitors" },
    { path: "../lib/analysis-agent-chain", export: "runAnalysisAgentChain" },
    { path: "../lib/naver-suggest-collector", export: "collectNaverSuggestions" },
    { path: "../lib/content-benchmark", export: "getBenchmark" },
    { path: "../lib/content-pipeline-v2", export: "createContentV2" },
    { path: "../lib/content-qc-v2", export: "runQcV2" },
    { path: "../lib/content-rewrite-loop", export: "runRewriteLoop" },
  ];

  for (const mod of modules) {
    try {
      const imported = await import(mod.path);
      if (typeof imported[mod.export] === "function") {
        pass(`IMPORT_${mod.export}`, `${mod.path} — 함수 존재`);
      } else {
        fail(`IMPORT_${mod.export}`, `${mod.path} — export 없음`);
      }
    } catch (err) {
      fail(`IMPORT_${mod.export}`, `${mod.path} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ═══════════════════════════════════════════
// 3. 시나리오 A: 분석 → 에이전트 체인 → 페르소나
// ═══════════════════════════════════════════

async function scenarioA_Analysis() {
  console.log("\n[3] 시나리오 A: 분석 에이전트 체인");

  if (isDryRun) {
    // Dry-run: DB 쿼리만 확인
    log("(dry-run) DB 쿼리 검증만 수행");

    const { createAdminClient } = await import("../lib/supabase/service");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    // 클라이언트 존재 확인
    try {
      const { data, error } = await db
        .from("clients")
        .select("id, name, brand_persona")
        .eq("id", TEST_CLIENT_ID)
        .single();

      if (error || !data) {
        fail("A_client_query", `클라이언트 조회 실패: ${error?.message}`);
        return;
      }
      pass("A_client_query", `클라이언트: ${data.name}, 페르소나: ${data.brand_persona ? "있음" : "없음"}`);
    } catch (err) {
      fail("A_client_query", String(err));
      return;
    }

    // brand_analyses 조회
    try {
      const { data, error } = await db
        .from("brand_analyses")
        .select("id, status, analysis_result")
        .eq("client_id", TEST_CLIENT_ID)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        fail("A_analysis_query", `분석 조회 실패: ${error.message}`);
      } else if (!data) {
        skip("A_analysis_query", "분석 데이터 없음");
      } else {
        const hasAgentData = !!(
          data.analysis_result?.competitor_analysis ||
          data.analysis_result?.seo_comments ||
          data.analysis_result?.improvement_plan
        );
        pass("A_analysis_query", `분석 ID: ${data.id}, 에이전트 데이터: ${hasAgentData ? "있음" : "없음"}`);
      }
    } catch (err) {
      fail("A_analysis_query", String(err));
    }

    // 에이전트 실행 로그 확인
    try {
      const { count, error } = await db
        .from("agent_execution_logs")
        .select("*", { count: "exact", head: true })
        .eq("client_id", TEST_CLIENT_ID);

      if (error) {
        fail("A_agent_logs", `로그 조회 실패: ${error.message}`);
      } else {
        pass("A_agent_logs", `에이전트 실행 로그: ${count}건`);
      }
    } catch (err) {
      fail("A_agent_logs", String(err));
    }

    return;
  }

  // Live 모드: 실제 에이전트 체인 실행
  if (!process.env.ANTHROPIC_API_KEY) {
    skip("A_agent_chain", "ANTHROPIC_API_KEY 미설정 — live 모드 불가");
    return;
  }

  try {
    const { runAnalysisAgentChain } = await import("../lib/analysis-agent-chain");

    const start = Date.now();
    const result = await runAnalysisAgentChain({
      clientId: TEST_CLIENT_ID,
      analysisId: "test-" + Date.now(),
      placeData: {
        placeId: "test-place-id",
        name: "통합테스트 매장",
        category: "카페",
        region: "서울 강남구",
        address: "서울시 강남구 역삼동 123",
        reviewCount: 100,
        blogReviewCount: 50,
        businessHours: "09:00~22:00",
      },
      scoringResult: { score: 65, breakdown: {}, improvements: [] },
      keywords: ["강남 카페"],
      seoAudit: { items: [] },
    });

    const elapsed = Date.now() - start;

    if (result) {
      pass("A_agent_chain", `에이전트 체인 완료 — 결과 키: ${Object.keys(result).join(", ")}`, elapsed);
    } else {
      skip("A_agent_chain", `에이전트 체인 null 반환 (API 키 확인)`, );
    }
  } catch (err) {
    fail("A_agent_chain", `에이전트 체인 실패: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ═══════════════════════════════════════════
// 4. 시나리오 B: 키워드 확장 → 전략
// ═══════════════════════════════════════════

async function scenarioB_Keywords() {
  console.log("\n[4] 시나리오 B: 키워드 확장 + 전략");

  if (isDryRun) {
    log("(dry-run) DB 쿼리 검증만 수행");

    const { createAdminClient } = await import("../lib/supabase/service");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    // 키워드 테이블 status 확인
    try {
      const { data, error } = await db
        .from("keywords")
        .select("id, keyword, status, metadata, source")
        .eq("client_id", TEST_CLIENT_ID)
        .limit(5);

      if (error) {
        fail("B_keywords_query", `키워드 조회 실패: ${error.message}`);
      } else {
        const suggestedCount = (data || []).filter((k: { status: string }) => k.status === "suggested").length;
        pass("B_keywords_query", `키워드 ${(data || []).length}건 조회, suggested: ${suggestedCount}건`);
      }
    } catch (err) {
      fail("B_keywords_query", String(err));
    }

    // keywords.metadata 컬럼 확인
    try {
      const { data, error } = await db
        .from("keywords")
        .select("metadata")
        .eq("client_id", TEST_CLIENT_ID)
        .limit(1);

      if (error) {
        fail("B_keywords_metadata", `metadata 컬럼 실패: ${error.message}`);
      } else {
        pass("B_keywords_metadata", "metadata 컬럼 접근 가능");
      }
    } catch (err) {
      fail("B_keywords_metadata", String(err));
    }

    return;
  }

  // Live 모드
  if (!process.env.ANTHROPIC_API_KEY) {
    skip("B_keyword_expansion", "ANTHROPIC_API_KEY 미설정");
    return;
  }

  try {
    const { expandNicheKeywords } = await import("../lib/actions/keyword-expansion-actions");

    const start = Date.now();
    const result = await expandNicheKeywords({
      clientId: TEST_CLIENT_ID,
      mainKeywords: ["캠핏 글램핑", "가평 글램핑"],
    });
    const elapsed = Date.now() - start;

    if (result.success) {
      pass("B_keyword_expansion", `확장 완료: inserted=${result.inserted}, skipped=${result.skipped}`, elapsed);
    } else {
      fail("B_keyword_expansion", `실패: ${result.error}`);
    }
  } catch (err) {
    fail("B_keyword_expansion", String(err));
  }
}

// ═══════════════════════════════════════════
// 5. 시나리오 C: 콘텐츠 v2 생성 → QC → 재작성
// ═══════════════════════════════════════════

async function scenarioC_Content() {
  console.log("\n[5] 시나리오 C: 콘텐츠 v2 파이프라인");

  if (isDryRun) {
    log("(dry-run) DB 쿼리 검증만 수행");

    const { createAdminClient } = await import("../lib/supabase/service");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    // contents.metadata 확인
    try {
      const { data, error } = await db
        .from("contents")
        .select("id, title, publish_status, metadata")
        .eq("client_id", TEST_CLIENT_ID)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        fail("C_contents_query", `콘텐츠 조회 실패: ${error.message}`);
      } else {
        const withMeta = (data || []).filter((c: { metadata: unknown }) => c.metadata).length;
        pass("C_contents_query", `콘텐츠 ${(data || []).length}건, metadata 있는 것: ${withMeta}건`);
      }
    } catch (err) {
      fail("C_contents_query", String(err));
    }

    // content_benchmarks 캐시 확인
    try {
      const { count, error } = await db
        .from("content_benchmarks")
        .select("*", { count: "exact", head: true });

      if (error) {
        fail("C_benchmarks", `벤치마크 조회 실패: ${error.message}`);
      } else {
        pass("C_benchmarks", `벤치마크 캐시: ${count}건`);
      }
    } catch (err) {
      fail("C_benchmarks", String(err));
    }

    // PENDING Job 확인
    try {
      const { count, error } = await db
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("job_type", "CONTENT_CREATE")
        .eq("status", "PENDING");

      if (error) {
        fail("C_pending_jobs", `Job 조회 실패: ${error.message}`);
      } else {
        pass("C_pending_jobs", `PENDING CONTENT_CREATE Job: ${count}건`);
      }
    } catch (err) {
      fail("C_pending_jobs", String(err));
    }

    return;
  }

  // Live 모드: 전체 파이프라인
  if (!process.env.ANTHROPIC_API_KEY) {
    skip("C_content_v2", "ANTHROPIC_API_KEY 미설정");
    return;
  }

  try {
    const { generateContentV2 } = await import("../lib/actions/content-generate-actions");

    const start = Date.now();
    const result = await generateContentV2({
      clientId: TEST_CLIENT_ID,
      keyword: "캠핏 글램핑",
      contentType: "review",
    });
    const elapsed = Date.now() - start;

    if (result.success) {
      pass(
        "C_content_v2",
        `생성 완료: title="${result.title}", QC=${result.qcScore}점 (${result.qcPass ? "PASS" : "FAIL"}), rewrites=${result.rewrites}`,
        elapsed
      );
    } else {
      fail("C_content_v2", `실패: ${result.error}`);
    }
  } catch (err) {
    fail("C_content_v2", String(err));
  }
}

// ═══════════════════════════════════════════
// 메인
// ═══════════════════════════════════════════

async function main() {
  console.log("════════════════════════════════════════════");
  console.log("  Phase F1~F4 통합 검증 스크립트");
  console.log(`  모드: ${isDryRun ? "DRY-RUN (AI 호출 없음)" : "LIVE (전체 실행)"}`);
  console.log("════════════════════════════════════════════");

  // 0. 환경변수
  const envOk = await checkEnvVars();
  if (!envOk) {
    console.log("\n❌ 필수 환경변수 미설정 — 중단");
    process.exit(1);
  }

  // 1. DB 테이블
  await checkDbTables();

  // 2. 모듈 임포트
  await checkModuleImports();

  // 3~5. 시나리오
  await scenarioA_Analysis();
  await scenarioB_Keywords();
  await scenarioC_Content();

  // 결과 요약
  console.log("\n════════════════════════════════════════════");
  console.log("  결과 요약");
  console.log("════════════════════════════════════════════");

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;

  console.log(`  PASS: ${passed}  |  FAIL: ${failed}  |  SKIP: ${skipped}`);

  if (failed > 0) {
    console.log("\n  실패 항목:");
    for (const r of results.filter((r) => r.status === "FAIL")) {
      console.log(`    ❌ ${r.name}: ${r.detail}`);
    }
  }

  console.log("\n════════════════════════════════════════════");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("스크립트 오류:", err);
  process.exit(1);
});
