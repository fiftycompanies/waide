/**
 * test-multipage-pipeline.ts
 * 멀티페이지 홈페이지 생성 파이프라인 테스트 스크립트
 *
 * 사용법:
 *   npx tsx scripts/test-multipage-pipeline.ts              → 분석 + 프롬프트만 출력
 *   npx tsx scripts/test-multipage-pipeline.ts --generate    → 분석 + 프롬프트 + 실제 HTML 생성
 *   npx tsx scripts/test-multipage-pipeline.ts --export-prompts → 프롬프트를 tmp/prompts/에 파일로 저장
 *
 * 테스트 URL: https://www.rest-clinic.com
 * 테스트 브랜드: 에버유의원 (피부과)
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// .env.local 로드 (apps/web/.env.local → 루트 .env.local 순서)
dotenv.config({ path: path.join(process.cwd(), "apps/web/.env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { analyzeReferenceUrl } from "../lib/homepage/generate/reference-analyzer";
import { mapBrandToPages, type BrandInput } from "../lib/homepage/generate/brand-mapper";
import { generateMultipageHtml } from "../lib/homepage/generate/gemini-html-generator";

// ── 테스트 데이터 ────────────────────────────────────────────────────────────

const TEST_URL = "https://www.rest-clinic.com";

const TEST_BRAND: BrandInput = {
  name: "에버유의원",
  industry: "피부과",
  phone: "02-1234-5678",
  address: "서울특별시 강남구 테헤란로 123, 에버유빌딩 3층",
  services: [
    "보톡스",
    "필러",
    "레이저 토닝",
    "울쎄라 리프팅",
    "피부 관리",
    "여드름 치료",
  ],
  keywords: ["강남 피부과", "보톡스 잘하는 곳", "필러 추천", "피부과 추천"],
  tagline: "당신의 아름다움, 에버유가 완성합니다",
  usp: "1:1 맞춤 시술로 자연스러운 아름다움을 추구하는 강남 프리미엄 피부과",
  description: "에버유의원은 10년 이상의 경험을 가진 피부과 전문의가 직접 상담하고 시술하는 프리미엄 피부과입니다. 자연스러운 결과를 위한 1:1 맞춤 시술을 제공합니다.",
  businessHours: "월-금 10:00-19:00 / 토 10:00-15:00 / 일·공휴일 휴무",
  sns: {
    instagram: "@everyou_clinic",
    blog: "blog.naver.com/everyou",
    kakao: "에버유의원",
  },
};

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const shouldGenerate = args.includes("--generate");
  const shouldExportPrompts = args.includes("--export-prompts");

  console.log("=".repeat(60));
  console.log(" 멀티페이지 홈페이지 생성 파이프라인 테스트");
  console.log("=".repeat(60));
  console.log(`레퍼런스 URL: ${TEST_URL}`);
  console.log(`브랜드: ${TEST_BRAND.name} (${TEST_BRAND.industry})`);
  console.log(`HTML 생성: ${shouldGenerate ? "활성화 (--generate)" : "비활성화 (--generate 플래그 추가 시 실행)"}`);
  console.log("=".repeat(60));

  // ── Step 1: 레퍼런스 URL 분석 ──────────────────────────────────────────────

  console.log("\n📌 Step 1: 레퍼런스 URL 분석 (Gemini URL Context)");
  console.log("-".repeat(40));

  let analysis;
  try {
    analysis = await analyzeReferenceUrl(TEST_URL);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`\n⚠️  분석 실패: ${msg}`);
    console.log("   → GEMINI_API_KEY를 apps/web/.env.local에 설정하세요.");
    console.log("   → 기본 분석 결과로 Step 2를 계속합니다.\n");

    // 기본 분석 결과로 폴백 (피부과 레퍼런스 기본 구조)
    analysis = {
      pages: [
        {
          name: "메인",
          slug: "index",
          sections: [
            { type: "hero", order: 1, contentDescription: "히어로 배너 (전면 이미지 + 슬로건)", hasImage: true, layout: "fullscreen" },
            { type: "about", order: 2, contentDescription: "의원 소개 섹션", hasImage: true, layout: "split-left" },
            { type: "services", order: 3, contentDescription: "시술 서비스 카드 목록", hasImage: true, layout: "grid-3" },
            { type: "gallery", order: 4, contentDescription: "시술 전후 갤러리", hasImage: true, layout: "grid-3" },
            { type: "testimonials", order: 5, contentDescription: "고객 후기", hasImage: false, layout: "slider" },
            { type: "contact", order: 6, contentDescription: "상담 예약 폼 + 오시는 길", hasImage: false, layout: "form-split" },
            { type: "footer", order: 7, contentDescription: "푸터 (연락처, 저작권)", hasImage: false, layout: "centered" },
          ],
          purpose: "피부과 브랜드 소개 및 시술 안내, 상담 예약 유도",
        },
      ],
      designSystem: {
        primaryColor: "#1a1a2e",
        accentColor: "#c8a882",
        backgroundColor: "#ffffff",
        textColor: "#333333",
        headingFont: "Noto Sans KR",
        bodyFont: "Noto Sans KR",
        style: "luxury",
      },
      navigation: {
        items: [
          { label: "홈", slug: "index" },
          { label: "소개", slug: "about" },
          { label: "시술 안내", slug: "services" },
          { label: "갤러리", slug: "gallery" },
          { label: "상담 예약", slug: "contact" },
        ],
        style: "fixed-top",
        hasDropdown: false,
      },
      businessType: "피부과",
      rawAnalysis: "(폴백 데이터 — GEMINI_API_KEY 미설정)",
    };
  }

  console.log(`\n✅ 분석 결과:`);
  console.log(`  업종: ${analysis.businessType}`);
  console.log(`  페이지 수: ${analysis.pages.length}`);
  console.log(`  디자인 스타일: ${analysis.designSystem.style}`);
  console.log(`  메인 색상: ${analysis.designSystem.primaryColor}`);
  console.log(`  강조색: ${analysis.designSystem.accentColor}`);
  console.log(`  제목 폰트: ${analysis.designSystem.headingFont}`);
  console.log(`  본문 폰트: ${analysis.designSystem.bodyFont}`);

  console.log(`\n  네비게이션 (${analysis.navigation.items.length}개):`);
  for (const item of analysis.navigation.items) {
    console.log(`    - ${item.label} → ${item.slug}`);
  }

  console.log(`\n  페이지 상세:`);
  for (const page of analysis.pages) {
    console.log(`\n    📄 ${page.name} (/${page.slug})`);
    console.log(`       목적: ${page.purpose}`);
    console.log(`       섹션 (${page.sections.length}개):`);
    for (const section of page.sections) {
      console.log(`         [${section.order}] ${section.type} (${section.layout}) — ${section.contentDescription}`);
    }
  }

  // ── Step 2: 브랜드 매핑 + 프롬프트 생성 ────────────────────────────────────

  console.log("\n\n📌 Step 2: 브랜드 매핑 + Gemini 프롬프트 생성");
  console.log("-".repeat(40));

  const mappedPages = mapBrandToPages(analysis, TEST_BRAND);

  for (const page of mappedPages) {
    console.log(`\n📄 ${page.name} (/${page.slug})`);
    console.log(`  섹션 (${page.sections.length}개):`);
    for (const section of page.sections) {
      const contentKeys = Object.keys(section.content);
      console.log(`    [${section.order}] ${section.koreanTitle} (${section.type}, ${section.layout})`);
      console.log(`         콘텐츠 키: ${contentKeys.join(", ")}`);
    }

    console.log(`\n  프롬프트 (처음 500자):`);
    console.log(`  ${page.prompt.slice(0, 500).replace(/\n/g, "\n  ")}...`);
  }

  // ── Step 2.5: 프롬프트 내보내기 (--export-prompts 플래그) ─────────────────

  if (shouldExportPrompts) {
    console.log("\n\n📌 Step 2.5: 프롬프트 파일 내보내기");
    console.log("-".repeat(40));

    const promptDir = path.join(process.cwd(), "tmp", "prompts");
    if (!fs.existsSync(promptDir)) {
      fs.mkdirSync(promptDir, { recursive: true });
    }

    for (let i = 0; i < mappedPages.length; i++) {
      const page = mappedPages[i];
      const num = String(i + 1).padStart(2, "0");
      const filename = `${num}_${page.slug}.txt`;
      const filepath = path.join(promptDir, filename);

      const header = `=== AI Studio에 이 프롬프트를 붙여넣으세요 ===\n페이지: ${page.name} (/${page.slug})\n섹션 수: ${page.sections.length}개\n${"=".repeat(50)}\n\n`;
      const content = header + page.prompt;

      fs.writeFileSync(filepath, content, "utf-8");

      // 처음 3줄 미리보기
      const previewLines = page.prompt.split("\n").slice(0, 3).join("\n  ");
      console.log(`  💾 ${filename} (${Math.round(content.length / 1024)}KB)`);
      console.log(`  ${previewLines}`);
      console.log("");
    }

    console.log(`\n✅ 프롬프트 ${mappedPages.length}개 파일 저장 → ${promptDir}`);
    console.log("   AI Studio (https://aistudio.google.com) 에서 각 파일 내용을 붙여넣고 HTML을 생성하세요.");
    console.log("   생성된 HTML은 tmp/html-results/ 에 같은 이름으로 저장 후:");
    console.log("   npx tsx scripts/import-html-results.ts");

    if (!shouldGenerate) {
      return;
    }
  }

  // ── Step 3: HTML 생성 (--generate 플래그 필요) ─────────────────────────────

  if (!shouldGenerate) {
    console.log("\n\n📌 Step 3: HTML 생성 (건너뜀)");
    console.log("-".repeat(40));
    console.log("  실제 HTML을 생성하려면 --generate 플래그를 추가하세요:");
    console.log("  npx tsx scripts/test-multipage-pipeline.ts --generate");
    console.log("\n✅ 테스트 완료 (분석 + 프롬프트까지)");
    return;
  }

  console.log("\n\n📌 Step 3: Gemini API로 HTML 생성");
  console.log("-".repeat(40));

  const generatedPages = await generateMultipageHtml({
    pages: mappedPages,
    designSystem: analysis.designSystem,
    onProgress: (current, total, pageName) => {
      console.log(`  [${current}/${total}] "${pageName}" 생성 중...`);
    },
  });

  // 결과 파일 저장
  const outputDir = path.join(process.cwd(), "output", "multipage-test");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const page of generatedPages) {
    const filename = `${page.slug}.html`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, page.html, "utf-8");
    console.log(`  💾 저장: ${filepath} (${Math.round(page.html.length / 1024)}KB)`);
  }

  console.log(`\n✅ HTML 생성 완료: ${generatedPages.length}개 파일 → ${outputDir}`);
}

// ── 실행 ─────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("\n❌ 파이프라인 테스트 실패:", err);
  process.exit(1);
});
