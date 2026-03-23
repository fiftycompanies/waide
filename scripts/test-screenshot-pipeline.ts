/**
 * Screenshot-to-Code 파이프라인 E2E 테스트
 *
 * 각 단계를 독립적으로 검증하고 결과를 리포트한다.
 * Vercel 배포/DB 저장은 하지 않는다 (드라이런).
 *
 * 사용법:
 *   npx tsx scripts/test-screenshot-pipeline.ts [referenceUrl]
 *
 * 환경변수 필요:
 *   ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

// ── 환경변수 로드 ─────────────────────────────────────────────────────────────
import { config } from "dotenv";
import path from "path";

// apps/web/.env.local 로드
config({ path: path.resolve(__dirname, "../apps/web/.env.local") });

// ── 모듈 import ──────────────────────────────────────────────────────────────

import { captureScreenshots, type ScreenshotSet } from "../lib/homepage/generate/screenshot-crawler";
import {
  generateHtmlFromScreenshots,
  extractDesignTokensFromScreenshot,
  type DesignTokens,
} from "../lib/homepage/generate/vision-to-html";
import { injectBrandInfo } from "../lib/homepage/generate/brand-injector";
import type { BrandInfo, PersonaInfo } from "../lib/homepage/generate/content-mapper";

// ── 설정 ──────────────────────────────────────────────────────────────────────

const DEFAULT_REFERENCE_URL = "https://www.aestura.com";

const TEST_BRAND_INFO: BrandInfo = {
  name: "에버유의원",
  industry: "피부과",
  phone: "02-555-1234",
  address: "서울시 강남구 테헤란로 123",
  services: ["레이저 토닝", "보톡스", "필러", "리프팅", "여드름 치료"],
  keywords: ["강남 피부과", "레이저 토닝", "보톡스 잘하는 곳"],
  tone: "전문적이고 신뢰감 있는",
};

const TEST_PERSONA: PersonaInfo = {
  usp: "15년 경력 피부과 전문의의 1:1 맞춤 시술",
  target_customer: "20~40대 피부 고민이 있는 직장인",
  tagline: "당신의 피부, 에버유가 답입니다",
  one_liner: "강남 피부과 전문 에버유의원",
};

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function printSection(title: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

function printResult(label: string, pass: boolean, detail?: string) {
  const icon = pass ? "✅" : "❌";
  console.log(`  ${icon} ${label}${detail ? ` — ${detail}` : ""}`);
}

// ── 단계별 테스트 ──────────────────────────────────────────────────────────────

async function testStep1_Screenshot(url: string): Promise<ScreenshotSet | null> {
  printSection("STEP 1: 스크린샷 캡처 (Playwright)");
  try {
    const start = Date.now();
    const screenshots = await captureScreenshots(url);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    printResult("스크린샷 캡처", true, `${elapsed}초`);
    printResult("top 이미지", screenshots.top.length > 100, `${Math.round(screenshots.top.length / 1024)}KB base64`);
    printResult("middle 이미지", screenshots.middle !== null, screenshots.middle ? `${Math.round(screenshots.middle.length / 1024)}KB base64` : "null (없을 수 있음)");
    printResult("crops 이미지", screenshots.crops.length > 0, `${screenshots.crops.length}개 크롭`);
    printResult("URL 일치", screenshots.url === url || screenshots.url.includes(url.replace(/^https?:\/\//, "")), screenshots.url);

    return screenshots;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    printResult("스크린샷 캡처", false, msg);
    return null;
  }
}

async function testStep2_DesignTokens(topScreenshot: string): Promise<DesignTokens | null> {
  printSection("STEP 2: 디자인 토큰 추출 (Claude Vision)");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    printResult("ANTHROPIC_API_KEY", false, "환경변수 없음");
    return null;
  }

  try {
    const start = Date.now();
    const tokens = await extractDesignTokensFromScreenshot(topScreenshot, apiKey.trim());
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    printResult("토큰 추출", true, `${elapsed}초`);
    printResult("primaryColor", !!tokens.primaryColor, tokens.primaryColor);
    printResult("accentColor", !!tokens.accentColor, tokens.accentColor);
    printResult("backgroundColor", !!tokens.backgroundColor, tokens.backgroundColor);
    printResult("textColor", !!tokens.textColor, tokens.textColor);
    printResult("headingFont", !!tokens.headingFont, tokens.headingFont);
    printResult("bodyFont", !!tokens.bodyFont, tokens.bodyFont);

    return tokens;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    printResult("토큰 추출", false, msg);
    return null;
  }
}

async function testStep3_VisionHtml(
  screenshots: ScreenshotSet,
  tokens: DesignTokens
): Promise<string | null> {
  printSection("STEP 3: Vision AI HTML 생성 (Claude Sonnet Vision)");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    printResult("ANTHROPIC_API_KEY", false, "환경변수 없음");
    return null;
  }

  try {
    const start = Date.now();
    const html = await generateHtmlFromScreenshots({
      screenshots,
      tokens,
      apiKey: apiKey.trim(),
      industry: TEST_BRAND_INFO.industry,
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const sizeKB = Math.round(html.length / 1024);

    printResult("HTML 생성", true, `${elapsed}초, ${sizeKB}KB`);
    printResult("Tailwind CDN 포함", html.includes("tailwindcss"), "cdn.tailwindcss.com");
    printResult("tailwind.config 포함", html.includes("tailwind.config"), "커스텀 색상/폰트");
    printResult("플레이스홀더 존재", html.includes("{{BRAND_NAME}}") || html.includes("{{PHONE}}"), "{{BRAND_NAME}} 또는 {{PHONE}}");
    printResult("data-img-slot 존재", html.includes("data-img-slot"), "이미지 슬롯");

    // <style> 태그 최소화 체크
    const styleCount = (html.match(/<style[\s>]/gi) || []).length;
    printResult("<style> 태그 최소화", styleCount <= 2, `${styleCount}개`);

    return html;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    printResult("HTML 생성", false, msg);
    return null;
  }
}

function testStep4_BrandInjection(rawHtml: string): string | null {
  printSection("STEP 4: 브랜드 정보 주입 (brand-injector)");
  try {
    const start = Date.now();
    const finalHtml = injectBrandInfo(rawHtml, TEST_BRAND_INFO, TEST_PERSONA, TEST_BRAND_INFO.industry);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const sizeKB = Math.round(finalHtml.length / 1024);

    printResult("브랜드 주입", true, `${elapsed}초, ${sizeKB}KB`);
    printResult("브랜드명 교체", finalHtml.includes("에버유의원"), "{{BRAND_NAME}} → 에버유의원");
    printResult("전화번호 교체", finalHtml.includes("02-555-1234"), "{{PHONE}} → 02-555-1234");
    printResult("주소 교체", finalHtml.includes("서울시 강남구"), "{{ADDRESS}} → 서울시 강남구");

    // 원본 플레이스홀더 잔여 체크
    const remainingPlaceholders = (finalHtml.match(/\{\{[A-Z_]+[0-9]*\}\}/g) || []);
    const criticalRemaining = remainingPlaceholders.filter(
      (p) => !p.includes("BLOG_") && !p.includes("FORM_") && !p.includes("PRIVACY")
    );
    printResult(
      "핵심 플레이스홀더 교체 완료",
      criticalRemaining.length === 0,
      criticalRemaining.length > 0
        ? `남은 핵심 플레이스홀더: ${criticalRemaining.slice(0, 5).join(", ")}`
        : "모두 교체됨"
    );

    // Unsplash 이미지 교체 체크
    const unsplashCount = (finalHtml.match(/images\.unsplash\.com/g) || []).length;
    printResult("Unsplash 이미지 삽입", unsplashCount > 0, `${unsplashCount}개`);

    // 레퍼런스 텍스트 유출 체크
    const leakPatterns = ["aestura", "에스트라", "ATOBARRIER", "Atobarrier"];
    const leaks = leakPatterns.filter((p) => finalHtml.toLowerCase().includes(p.toLowerCase()));
    printResult(
      "레퍼런스 텍스트 유출 없음",
      leaks.length === 0,
      leaks.length > 0 ? `유출: ${leaks.join(", ")}` : "원본 텍스트 미감지"
    );

    return finalHtml;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    printResult("브랜드 주입", false, msg);
    return null;
  }
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

async function main() {
  const referenceUrl = process.argv[2] || DEFAULT_REFERENCE_URL;

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Screenshot-to-Code 파이프라인 E2E 테스트              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  레퍼런스 URL: ${referenceUrl}`);
  console.log(`  테스트 브랜드: ${TEST_BRAND_INFO.name}`);
  console.log(`  시작 시각: ${new Date().toLocaleString("ko-KR")}`);

  // 환경변수 체크
  printSection("STEP 0: 환경변수 사전 체크");
  printResult("ANTHROPIC_API_KEY", !!process.env.ANTHROPIC_API_KEY);
  printResult("NEXT_PUBLIC_SUPABASE_URL", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  printResult("SUPABASE_SERVICE_KEY", !!process.env.SUPABASE_SERVICE_KEY);
  printResult("VERCEL_TOKEN", !!process.env.VERCEL_TOKEN);
  printResult("VERCEL_TEAM_ID", !!process.env.VERCEL_TEAM_ID);

  const totalStart = Date.now();
  const results: { step: string; pass: boolean }[] = [];

  // Step 1: 스크린샷
  const screenshots = await testStep1_Screenshot(referenceUrl);
  results.push({ step: "스크린샷 캡처", pass: screenshots !== null });
  if (!screenshots) {
    printSection("ABORT: 스크린샷 실패 → 이후 단계 스킵");
    printSummary(results, totalStart);
    return;
  }

  // Step 2: 디자인 토큰
  const tokens = await testStep2_DesignTokens(screenshots.top);
  results.push({ step: "디자인 토큰 추출", pass: tokens !== null });
  if (!tokens) {
    printSection("ABORT: 토큰 추출 실패 → 이후 단계 스킵");
    printSummary(results, totalStart);
    return;
  }

  // Step 3: Vision HTML 생성
  const rawHtml = await testStep3_VisionHtml(screenshots, tokens);
  results.push({ step: "Vision HTML 생성", pass: rawHtml !== null });
  if (!rawHtml) {
    printSection("ABORT: HTML 생성 실패 → 이후 단계 스킵");
    printSummary(results, totalStart);
    return;
  }

  // Step 4: 브랜드 주입
  const finalHtml = testStep4_BrandInjection(rawHtml);
  results.push({ step: "브랜드 정보 주입", pass: finalHtml !== null });

  // Step 5 (skip): DB 저장 + Vercel 배포
  printSection("STEP 5: DB 저장 + Vercel 배포 (스킵 — 드라이런)");
  console.log("  ⏭️  DB 저장과 Vercel 배포는 실서비스 영향 방지를 위해 스킵합니다.");
  console.log("  ⏭️  generateHomepage() 서버 액션 통한 전체 테스트는 어드민 UI에서 수행하세요.");

  // 최종 HTML 파일 저장 (로컬 확인용)
  if (finalHtml) {
    const fs = await import("fs");
    const outPath = path.resolve(__dirname, "../tmp/test-screenshot-output.html");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, finalHtml, "utf-8");
    console.log(`\n  📄 결과 HTML 저장: ${outPath}`);
    console.log(`     브라우저에서 열어 시각적으로 확인하세요.`);
  }

  printSummary(results, totalStart);
}

function printSummary(results: { step: string; pass: boolean }[], totalStart: number) {
  const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  printSection("최종 결과");
  results.forEach((r) => {
    console.log(`  ${r.pass ? "✅" : "❌"} ${r.step}`);
  });
  console.log(`\n  총 소요: ${totalElapsed}초`);
  console.log(`  결과: ${passed} PASS / ${failed} FAIL`);
  console.log(`${"═".repeat(60)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\n💥 예기치 못한 에러:", err);
  process.exit(1);
});
