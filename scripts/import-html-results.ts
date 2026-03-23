/**
 * import-html-results.ts
 * AI Studio에서 수동 생성한 HTML 결과를 파이프라인 형태로 조립
 *
 * 사용법:
 *   1. npx tsx scripts/test-multipage-pipeline.ts --export-prompts  → tmp/prompts/ 에 프롬프트 저장
 *   2. AI Studio에서 각 프롬프트로 HTML 생성
 *   3. 생성된 HTML을 tmp/html-results/ 에 저장 (파일명: 01_index.html, 02_about.html, ...)
 *   4. npx tsx scripts/import-html-results.ts                       → tmp/pipeline-result.json 생성
 */

import * as fs from "fs";
import * as path from "path";

// ── 타입 (gemini-html-generator.ts의 GeneratedPage와 동일) ──────────────────

interface GeneratedPage {
  name: string;
  slug: string;
  html: string;
  tokenCount?: number;
}

interface PipelineResult {
  generatedAt: string;
  source: "manual-import";
  pages: GeneratedPage[];
  summary: {
    totalPages: number;
    totalSizeKB: number;
    files: string[];
  };
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

function main() {
  const htmlDir = path.join(process.cwd(), "tmp", "html-results");
  const outputPath = path.join(process.cwd(), "tmp", "pipeline-result.json");

  console.log("=".repeat(60));
  console.log(" HTML 결과 임포트 (수동 검증용)");
  console.log("=".repeat(60));

  // ── 디렉토리 확인 ────────────────────────────────────────────────────────

  if (!fs.existsSync(htmlDir)) {
    console.error(`\n❌ tmp/html-results/ 디렉토리가 없습니다.`);
    console.log("\n사용 방법:");
    console.log("  1. npx tsx scripts/test-multipage-pipeline.ts --export-prompts");
    console.log("  2. AI Studio에서 각 프롬프트로 HTML 생성");
    console.log("  3. mkdir -p tmp/html-results");
    console.log("  4. 생성된 HTML을 tmp/html-results/ 에 저장");
    console.log("     파일명 예시: 01_index.html, 02_about.html, ...");
    console.log("  5. npx tsx scripts/import-html-results.ts");
    process.exit(1);
  }

  // ── HTML 파일 스캔 ───────────────────────────────────────────────────────

  const files = fs.readdirSync(htmlDir)
    .filter((f) => f.endsWith(".html"))
    .sort();

  if (files.length === 0) {
    console.error(`\n❌ tmp/html-results/ 에 .html 파일이 없습니다.`);
    console.log("   AI Studio에서 생성한 HTML 파일을 이 디렉토리에 저장하세요.");
    process.exit(1);
  }

  console.log(`\n📂 발견된 HTML 파일: ${files.length}개`);
  console.log("-".repeat(40));

  // ── HTML → GeneratedPage 조립 ────────────────────────────────────────────

  const pages: GeneratedPage[] = [];
  let totalSize = 0;

  for (const file of files) {
    const filepath = path.join(htmlDir, file);
    const html = fs.readFileSync(filepath, "utf-8");
    const sizeKB = Math.round(html.length / 1024);
    totalSize += html.length;

    // 파일명에서 slug 추출: "01_index.html" → "index"
    const match = file.match(/^\d+_(.+)\.html$/);
    const slug = match ? match[1] : file.replace(".html", "");

    // slug → 페이지명 매핑
    const name = slugToName(slug);

    pages.push({ name, slug, html });

    console.log(`  ✅ ${file} → "${name}" (/${slug}) — ${sizeKB}KB`);
  }

  // ── 결과 JSON 저장 ──────────────────────────────────────────────────────

  const result: PipelineResult = {
    generatedAt: new Date().toISOString(),
    source: "manual-import",
    pages,
    summary: {
      totalPages: pages.length,
      totalSizeKB: Math.round(totalSize / 1024),
      files,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ 파이프라인 결과 저장: ${outputPath}`);
  console.log(`   페이지: ${pages.length}개`);
  console.log(`   총 크기: ${Math.round(totalSize / 1024)}KB`);
  console.log(`   생성 시각: ${result.generatedAt}`);
  console.log(`${"=".repeat(60)}`);
}

// ── slug → 한국어 페이지명 매핑 ─────────────────────────────────────────────

function slugToName(slug: string): string {
  const map: Record<string, string> = {
    index: "메인",
    home: "메인",
    about: "소개",
    services: "서비스 안내",
    gallery: "갤러리",
    contact: "문의/예약",
    blog: "블로그",
    team: "팀 소개",
    pricing: "가격 안내",
    faq: "자주 묻는 질문",
    portfolio: "포트폴리오",
    testimonials: "고객 후기",
    rooms: "객실 안내",
    menu: "메뉴",
    reservation: "예약",
    access: "오시는 길",
  };

  return map[slug] || slug;
}

// ── 실행 ─────────────────────────────────────────────────────────────────────

main();
