/**
 * test-multi-url-verification.ts
 * Multi-URL 파이프라인 검증 테스트
 *
 * 3개 레퍼런스 URL로 파이프라인 견고성을 검증한다.
 * - A: banobagi.com (성형외과 — 동종 업계)
 * - B: glamping.co.kr (글램핑 — Waide 핵심 타겟)
 * - C: naver.com (복잡 JS 사이트 — 레질리언스 테스트)
 *
 * ⚠️ 읽기 전용 검증 — 코드 수정 없음
 */

import { captureScreenshots, type ScreenshotSet } from "../lib/homepage/generate/screenshot-crawler";
import {
  generateHtmlFromScreenshots,
  extractDesignTokensFromScreenshot,
} from "../lib/homepage/generate/vision-to-html";
import { injectBrandInfo } from "../lib/homepage/generate/brand-injector";
import type { BrandInfo, PersonaInfo } from "../lib/homepage/generate/content-mapper";
import * as fs from "fs";
import * as path from "path";

// ── 테스트 대상 URL ──────────────────────────────────────────────────────────

interface TestCase {
  label: string;
  url: string;
  industry: string;
  difficulty: string;
  expectedChallenges: string[];
}

const TEST_CASES: TestCase[] = [
  {
    label: "A",
    url: "https://www.banobagi.com",
    industry: "성형외과",
    difficulty: "중간",
    expectedChallenges: ["복잡한 메가메뉴", "다량 이미지", "다국어 지원"],
  },
  {
    label: "B",
    url: "https://www.glamping.co.kr",
    industry: "글램핑",
    difficulty: "중간",
    expectedChallenges: ["이미지 중심 레이아웃", "카드 그리드", "검색 UI"],
  },
  {
    label: "C",
    url: "https://www.naver.com",
    industry: "포털",
    difficulty: "높음",
    expectedChallenges: ["SPA/CSR 렌더링", "복잡 JS", "봇 차단 가능성", "동적 콘텐츠"],
  },
];

// ── 브랜드 정보 (동일) ──────────────────────────────────────────────────────

const BRAND_INFO: BrandInfo = {
  name: "에버유의원",
  industry: "의원",
  phone: "02-555-7890",
  address: "서울시 강남구 논현로 512 3층",
  services: ["피부관리", "보톡스", "필러", "리프팅", "레이저토닝"],
  keywords: ["강남 피부과", "보톡스 잘하는 곳", "필러 추천"],
  tone: "luxury",
};

const PERSONA: PersonaInfo = {
  usp: "15년 경력 피부과 전문의가 직접 시술하는 프리미엄 피부관리",
  target_customer: "30~50대 피부 관리에 관심 있는 여성",
  tagline: "당신의 피부, 에버유가 지킵니다",
  one_liner: "당신의 피부, 에버유가 지킵니다",
};

// ── 결과 타입 ────────────────────────────────────────────────────────────────

interface StepResult {
  name: string;
  success: boolean;
  durationSec: number;
  detail: string;
  error?: string;
}

interface QualityCheck {
  name: string;
  pass: boolean;
  detail: string;
}

interface TestResult {
  label: string;
  url: string;
  industry: string;
  totalTimeSec: number;
  steps: StepResult[];
  qualityChecks: QualityCheck[];
  htmlSizeKb: number;
  outputPath: string;
  overallPass: boolean;
  error?: string;
}

// ── 품질 검증 함수 ──────────────────────────────────────────────────────────

function runQualityChecks(html: string, screenshots: ScreenshotSet): QualityCheck[] {
  const checks: QualityCheck[] = [];

  function check(name: string, condition: boolean, detail: string) {
    checks.push({ name, pass: condition, detail });
  }

  // 1. 크롤링/캡처 품질
  check(
    "크롭 캡처 1개 이상",
    screenshots.crops.length >= 1,
    `${screenshots.crops.length}개 크롭`
  );

  // 2. Tailwind CSS
  check("Tailwind CDN 포함", html.includes("cdn.tailwindcss.com"), "");
  check("tailwind.config 포함", html.includes("tailwind.config"), "");

  const twClasses = ["bg-", "text-", "flex", "grid", "py-", "px-", "mx-auto", "rounded", "font-bold"];
  const found = twClasses.filter((c) => html.includes(c));
  check("Tailwind 클래스 5개+", found.length >= 5, `${found.length}/${twClasses.length}개`);

  // 3. 브랜드 주입
  check("브랜드명 포함", html.includes("에버유의원"), "");
  check("전화번호 포함", html.includes("02-555-7890"), "");
  check("주소 포함", html.includes("논현로") || html.includes("강남구"), "");

  const serviceCount = BRAND_INFO.services.filter((s) => html.includes(s)).length;
  check("서비스 3개+ 포함", serviceCount >= 3, `${serviceCount}/5개`);

  // 4. 이미지
  const unsplashCount = (html.match(/images\.unsplash\.com/g) || []).length;
  check("Unsplash 이미지 3개+", unsplashCount >= 3, `${unsplashCount}개`);

  // 5. 레퍼런스 텍스트 유출 방지
  check("레퍼런스 원본 URL 없음", !html.includes("banobagi") && !html.includes("glamping.co.kr") && !html.includes("naver.com"), "");

  // 6. 플레이스홀더 미교체 확인
  const unreplaced = html.match(/\{\{[^}]*\}\}/g) || [];
  check("{{}} 미교체 0건", unreplaced.length === 0, unreplaced.length > 0 ? `미교체: ${unreplaced.slice(0, 5).join(", ")}` : "모두 교체됨");

  // 7. HTML 구조
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : "";
  check("body 내 <head> 없음", !/<head[^>]*>/i.test(bodyContent), "");

  // 8. <style> 태그 최소화
  const styleTags = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const nonFont = styleTags.filter((s) => !s.includes("font-family") && !s.includes("font-smoothing"));
  check("<style> 최소화", nonFont.length === 0, `총 ${styleTags.length}개, 비폰트 ${nonFont.length}개`);

  // 9. 폼 라벨 서비스명 오염 없음
  const formLabels: string[] = [];
  let m: RegExpExecArray | null;
  const re = /<label[^>]*>([\s\S]*?)<\/label>/gi;
  while ((m = re.exec(html)) !== null) formLabels.push(m[1]);
  const contaminated = BRAND_INFO.services.some((s) => formLabels.some((l) => l.includes(s)));
  check("폼 라벨 서비스명 없음", !contaminated, "");

  // 10. Nav flex 컨테이너 확인
  const hasFlexNav = html.includes("flex") && html.includes("justify-between");
  check("Nav flex 컨테이너 존재", hasFlexNav, "");

  return checks;
}

// ── 단일 URL 파이프라인 실행 ─────────────────────────────────────────────────

async function runPipelineForUrl(testCase: TestCase, apiKey: string, outputDir: string): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];
  let html = "";
  let screenshots: ScreenshotSet = {
    top: "",
    middle: null,
    crops: [],
    url: testCase.url,
  };

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[${testCase.label}] ${testCase.url} (${testCase.industry})`);
  console.log(`    난이도: ${testCase.difficulty} | 예상 도전: ${testCase.expectedChallenges.join(", ")}`);
  console.log(`${"=".repeat(60)}`);

  try {
    // Step 1: 스크린샷 캡처
    console.log(`\n  [1/4] 스크린샷 캡처...`);
    const t1 = Date.now();
    try {
      screenshots = await captureScreenshots(testCase.url);
      const d1 = (Date.now() - t1) / 1000;
      steps.push({
        name: "스크린샷 캡처",
        success: true,
        durationSec: d1,
        detail: `top: ${Math.round(screenshots.top.length / 1024)}KB, crops: ${screenshots.crops.length}개`,
      });
      console.log(`    ✅ ${d1.toFixed(1)}초 — top ${Math.round(screenshots.top.length / 1024)}KB, crops ${screenshots.crops.length}개`);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      steps.push({ name: "스크린샷 캡처", success: false, durationSec: (Date.now() - t1) / 1000, detail: "", error: err });
      console.log(`    ❌ 실패: ${err}`);
      throw e;
    }

    // Step 2: 디자인 토큰 추출
    console.log(`  [2/4] 디자인 토큰 추출...`);
    const t2 = Date.now();
    try {
      const tokens = await extractDesignTokensFromScreenshot(screenshots.top, apiKey);
      const d2 = (Date.now() - t2) / 1000;
      steps.push({
        name: "디자인 토큰",
        success: true,
        durationSec: d2,
        detail: `primary=${tokens.primaryColor}, bg=${tokens.backgroundColor}`,
      });
      console.log(`    ✅ ${d2.toFixed(1)}초 — primary=${tokens.primaryColor}, bg=${tokens.backgroundColor}`);

      // Step 3: Vision AI HTML 생성
      console.log(`  [3/4] Vision AI HTML 생성...`);
      const t3 = Date.now();
      try {
        const rawHtml = await generateHtmlFromScreenshots({ screenshots, tokens, apiKey });
        const d3 = (Date.now() - t3) / 1000;
        steps.push({
          name: "HTML 생성",
          success: true,
          durationSec: d3,
          detail: `${Math.round(rawHtml.length / 1024)}KB`,
        });
        console.log(`    ✅ ${d3.toFixed(1)}초 — ${Math.round(rawHtml.length / 1024)}KB`);

        // Step 4: 브랜드 주입
        console.log(`  [4/4] 브랜드 정보 주입...`);
        const t4 = Date.now();
        html = injectBrandInfo(rawHtml, BRAND_INFO, PERSONA, "의원");
        const d4 = (Date.now() - t4) / 1000;
        steps.push({
          name: "브랜드 주입",
          success: true,
          durationSec: d4,
          detail: `최종 ${Math.round(html.length / 1024)}KB`,
        });
        console.log(`    ✅ ${d4.toFixed(1)}초 — 최종 ${Math.round(html.length / 1024)}KB`);
      } catch (e: unknown) {
        const err = e instanceof Error ? e.message : String(e);
        steps.push({ name: "HTML 생성", success: false, durationSec: (Date.now() - t3) / 1000, detail: "", error: err });
        console.log(`    ❌ HTML 생성 실패: ${err}`);
        throw e;
      }
    } catch (e: unknown) {
      if (!steps.find((s) => s.name === "디자인 토큰")) {
        const err = e instanceof Error ? e.message : String(e);
        steps.push({ name: "디자인 토큰", success: false, durationSec: (Date.now() - t2) / 1000, detail: "", error: err });
        console.log(`    ❌ 디자인 토큰 실패: ${err}`);
      }
      throw e;
    }
  } catch (e: unknown) {
    // 파이프라인 실패 — 부분 결과로 리포트 생성
    const totalTime = (Date.now() - startTime) / 1000;
    const outputPath = path.join(outputDir, `20260320_verification_${testCase.label}_FAILED.html`);
    if (html) fs.writeFileSync(outputPath, html, "utf-8");

    return {
      label: testCase.label,
      url: testCase.url,
      industry: testCase.industry,
      totalTimeSec: totalTime,
      steps,
      qualityChecks: [],
      htmlSizeKb: html ? Math.round(html.length / 1024) : 0,
      outputPath,
      overallPass: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 품질 검증
  console.log(`\n  === 품질 검증 ===`);
  const qualityChecks = runQualityChecks(html, screenshots);
  for (const qc of qualityChecks) {
    console.log(`  ${qc.pass ? "✅" : "❌"} ${qc.name}${qc.detail ? ` (${qc.detail})` : ""}`);
  }

  // 파일 저장
  const outputPath = path.join(outputDir, `20260320_verification_${testCase.label}_${testCase.industry.replace(/\//g, "_")}.html`);
  fs.writeFileSync(outputPath, html, "utf-8");
  console.log(`\n  📄 저장: ${outputPath}`);

  const totalTime = (Date.now() - startTime) / 1000;
  const passCount = qualityChecks.filter((q) => q.pass).length;
  const failCount = qualityChecks.filter((q) => !q.pass).length;
  const overallPass = failCount <= 2 && steps.every((s) => s.success);

  console.log(`\n  결과: ${passCount} PASS / ${failCount} FAIL (${totalTime.toFixed(1)}초)`);

  return {
    label: testCase.label,
    url: testCase.url,
    industry: testCase.industry,
    totalTimeSec: totalTime,
    steps,
    qualityChecks,
    htmlSizeKb: Math.round(html.length / 1024),
    outputPath,
    overallPass,
  };
}

// ── 리포트 생성 ──────────────────────────────────────────────────────────────

function generateReport(results: TestResult[]): string {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  let md = `# Homepage Pipeline Multi-URL Verification Report

> 생성일: ${now}
> 테스트 URL: ${results.length}개
> 브랜드: 에버유의원 (의원)

---

## 1. 결과 요약

| # | URL | 업종 | 소요시간 | HTML | 품질 PASS | 품질 FAIL | 결과 |
|---|-----|------|---------|------|----------|----------|------|
`;

  for (const r of results) {
    const passCount = r.qualityChecks.filter((q) => q.pass).length;
    const failCount = r.qualityChecks.filter((q) => !q.pass).length;
    const status = r.error ? "❌ FAIL (에러)" : r.overallPass ? "✅ PASS" : "⚠️ PARTIAL";
    md += `| ${r.label} | ${r.url} | ${r.industry} | ${r.totalTimeSec.toFixed(1)}초 | ${r.htmlSizeKb}KB | ${passCount} | ${failCount} | ${status} |\n`;
  }

  md += `\n---\n\n## 2. 단계별 상세\n\n`;

  for (const r of results) {
    md += `### [${r.label}] ${r.url}\n\n`;

    if (r.error) {
      md += `**에러**: ${r.error}\n\n`;
    }

    md += `| 단계 | 성공 | 소요시간 | 상세 |\n`;
    md += `|------|------|---------|------|\n`;

    for (const s of r.steps) {
      const icon = s.success ? "✅" : "❌";
      md += `| ${s.name} | ${icon} | ${s.durationSec.toFixed(1)}초 | ${s.error || s.detail} |\n`;
    }

    md += `\n`;

    if (r.qualityChecks.length > 0) {
      md += `**품질 검증:**\n\n`;
      md += `| 항목 | 결과 | 상세 |\n`;
      md += `|------|------|------|\n`;
      for (const qc of r.qualityChecks) {
        md += `| ${qc.name} | ${qc.pass ? "✅" : "❌"} | ${qc.detail} |\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  // 3. 취약점 분석
  md += `## 3. 취약점 분석\n\n`;

  // 봇 차단
  const blocked = results.filter((r) => r.error && (r.error.includes("timeout") || r.error.includes("Navigation") || r.error.includes("403")));
  md += `### 3-1. 봇 차단 / 크롤링 실패\n\n`;
  if (blocked.length > 0) {
    for (const b of blocked) {
      md += `- **${b.url}**: ${b.error}\n`;
    }
  } else {
    md += `- 봇 차단 없음\n`;
  }

  // sanitize 패턴
  md += `\n### 3-2. 레퍼런스 텍스트 유출\n\n`;
  const leaks = results.filter((r) => r.qualityChecks.some((q) => q.name.includes("레퍼런스") && !q.pass));
  if (leaks.length > 0) {
    for (const l of leaks) {
      md += `- **${l.url}**: 원본 텍스트 유출 감지\n`;
    }
  } else {
    md += `- 유출 없음\n`;
  }

  // Nav 감지
  md += `\n### 3-3. Nav 감지 견고성\n\n`;
  const navFails = results.filter((r) => r.qualityChecks.some((q) => q.name.includes("Nav") && !q.pass));
  if (navFails.length > 0) {
    for (const n of navFails) {
      md += `- **${n.url}**: Nav flex 컨테이너 미생성\n`;
    }
  } else {
    md += `- 모든 URL에서 Nav flex 컨테이너 정상 생성\n`;
  }

  // 미교체 플레이스홀더
  md += `\n### 3-4. 플레이스홀더 미교체\n\n`;
  const phFails = results.filter((r) => r.qualityChecks.some((q) => q.name.includes("미교체") && !q.pass));
  if (phFails.length > 0) {
    for (const p of phFails) {
      const qc = p.qualityChecks.find((q) => q.name.includes("미교체") && !q.pass);
      md += `- **${p.url}**: ${qc?.detail || "미교체 발견"}\n`;
    }
  } else {
    md += `- 모든 플레이스홀더 교체 완료\n`;
  }

  // 전체 요약
  md += `\n---\n\n## 4. 종합 평가\n\n`;

  const totalPass = results.filter((r) => r.overallPass).length;
  const totalFail = results.filter((r) => !r.overallPass).length;
  const avgTime = results.reduce((sum, r) => sum + r.totalTimeSec, 0) / results.length;

  md += `- **통과율**: ${totalPass}/${results.length} (${((totalPass / results.length) * 100).toFixed(0)}%)\n`;
  md += `- **평균 소요시간**: ${avgTime.toFixed(1)}초\n`;
  md += `- **실패 URL**: ${totalFail > 0 ? results.filter((r) => !r.overallPass).map((r) => r.url).join(", ") : "없음"}\n`;

  md += `\n### 권장 조치\n\n`;

  if (blocked.length > 0) {
    md += `- [ ] 봇 차단 사이트 대응: User-Agent 로테이션 / Playwright stealth 강화\n`;
  }
  if (leaks.length > 0) {
    md += `- [ ] sanitizeReferenceText()에 새 패턴 추가 필요\n`;
  }
  if (navFails.length > 0) {
    md += `- [ ] wrapNavInFlexContainer() 감지 로직 보강 필요\n`;
  }
  if (phFails.length > 0) {
    md += `- [ ] Vision AI 프롬프트에서 플레이스홀더 형식 강화 필요\n`;
  }
  if (totalPass === results.length) {
    md += `- 모든 URL 통과 — 현재 파이프라인 견고성 양호\n`;
  }

  return md;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY 환경변수가 필요합니다.");
    process.exit(1);
  }

  console.log("=== Multi-URL Pipeline Verification Test ===");
  console.log(`테스트 URL: ${TEST_CASES.length}개`);
  console.log(`브랜드: ${BRAND_INFO.name} (${BRAND_INFO.industry})\n`);

  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const results: TestResult[] = [];

  for (const tc of TEST_CASES) {
    const result = await runPipelineForUrl(tc, apiKey, outputDir);
    results.push(result);

    // URL 사이 10초 쿨다운 (API rate limit 회피)
    if (tc !== TEST_CASES[TEST_CASES.length - 1]) {
      console.log(`\n⏳ 10초 쿨다운...\n`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  // 리포트 생성
  const report = generateReport(results);
  const reportPath = path.join(__dirname, "20260320_homepage-pipeline-verification-report.md");
  fs.writeFileSync(reportPath, report, "utf-8");
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 리포트 저장: ${reportPath}`);

  // 최종 요약
  const totalPass = results.filter((r) => r.overallPass).length;
  console.log(`\n=== 최종 결과: ${totalPass}/${results.length} PASS ===\n`);

  for (const r of results) {
    const icon = r.error ? "💥" : r.overallPass ? "✅" : "⚠️";
    console.log(`  ${icon} [${r.label}] ${r.url} — ${r.totalTimeSec.toFixed(1)}초${r.error ? ` (에러: ${r.error.slice(0, 50)})` : ""}`);
  }

  if (results.some((r) => !r.overallPass)) process.exit(1);
}

main().catch((e) => {
  console.error("💥 치명적 오류:", e);
  process.exit(1);
});
