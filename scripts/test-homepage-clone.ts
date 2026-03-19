/**
 * test-homepage-clone.ts
 * 홈페이지 DOM 복제 파이프라인 로컬 테스트 스크립트
 *
 * 실행: npx tsx scripts/test-homepage-clone.ts
 *
 * 1. rest-clinic.com DOM 복제 (Playwright)
 * 2. 에버유의원 브랜드 정보로 텍스트 교체 맵 생성 (Claude API)
 * 3. 이미지를 업종별 Unsplash로 교체
 * 4. HTML 패치 적용
 * 5. 결과 HTML을 output/ 에 저장 + 브라우저에서 열기
 */

import { cloneReference } from "../lib/homepage/generate/reference-cloner";
import { buildReplacementMap, type BrandInfo, type PersonaInfo } from "../lib/homepage/generate/content-mapper";
import { replaceImages } from "../lib/homepage/generate/image-replacer";
import { applyPatches } from "../lib/homepage/generate/html-patcher";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ── 설정 ──────────────────────────────────────────────────────────────────────

const REFERENCE_URL = "https://www.rest-clinic.com/";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

// 에버유의원 브랜드 정보 (DB 대신 하드코딩)
const BRAND_INFO: BrandInfo = {
  name: "에버유의원",
  industry: "의원",
  phone: "02-555-1234",
  address: "서울특별시 강남구 테헤란로 123",
  services: [
    "피부 시술",
    "보톡스",
    "필러",
    "리프팅",
    "레이저 토닝",
    "피부 관리",
    "여드름 치료",
    "기미 치료",
  ],
  keywords: ["강남 피부과", "강남 보톡스", "강남 필러", "피부 관리", "리프팅"],
  tone: "전문적이고 신뢰감 있는, 따뜻한 톤",
};

const PERSONA_INFO: PersonaInfo = {
  usp: "20년 경력 피부과 전문의가 직접 시술하는 맞춤형 피부 솔루션",
  target_customer: "30~50대 피부 고민이 있는 강남 직장인",
  tagline: "당신만의 피부 솔루션, 에버유의원",
  one_liner: "강남역 피부과 전문의 직접 시술 — 에버유의원",
};

// ── 메인 ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY 환경변수를 설정하세요");
    console.error("   예: ANTHROPIC_API_KEY=sk-... npx tsx scripts/test-homepage-clone.ts");
    process.exit(1);
  }

  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("=".repeat(60));
  console.log("🏗️  홈페이지 DOM 복제 파이프라인 테스트");
  console.log("=".repeat(60));

  // ── Step 1: 레퍼런스 사이트 DOM 복제 ──────────────────────────────────
  console.log("\n📌 Step 1: 레퍼런스 사이트 DOM 복제 중...");
  console.log(`   URL: ${REFERENCE_URL}`);

  const startClone = Date.now();
  const cloneResult = await cloneReference(REFERENCE_URL);
  const cloneTime = ((Date.now() - startClone) / 1000).toFixed(1);

  console.log(`   ✅ 복제 완료: ${Math.round(cloneResult.html.length / 1024)}KB (${cloneTime}초)`);

  // 원본 HTML 저장 (비교용)
  const originalPath = path.join(outputDir, "20260319_original_rest-clinic.html");
  fs.writeFileSync(originalPath, cloneResult.html, "utf-8");
  console.log(`   💾 원본 HTML 저장: ${originalPath}`);

  // ── Step 2: AI 텍스트 교체 맵 생성 ──────────────────────────────────
  console.log("\n📌 Step 2: AI 텍스트 교체 맵 생성 중...");

  const startMap = Date.now();
  const textReplacements = await buildReplacementMap(
    cloneResult.html,
    BRAND_INFO,
    PERSONA_INFO,
    ANTHROPIC_API_KEY
  );
  const mapTime = ((Date.now() - startMap) / 1000).toFixed(1);

  console.log(`   ✅ 교체 맵 생성: ${textReplacements.length}건 (${mapTime}초)`);

  // 교체 맵 로그
  for (const rep of textReplacements.slice(0, 10)) {
    console.log(`      "${rep.original.slice(0, 30)}..." → "${rep.replacement.slice(0, 30)}..."`);
  }
  if (textReplacements.length > 10) {
    console.log(`      ... 외 ${textReplacements.length - 10}건`);
  }

  // ── Step 3: 이미지 교체 맵 생성 ──────────────────────────────────────
  console.log("\n📌 Step 3: 이미지 교체 맵 생성 중...");

  const imageReplacements = replaceImages(cloneResult.html, BRAND_INFO.name, BRAND_INFO.industry);
  console.log(`   ✅ 이미지 교체 맵: ${imageReplacements.length}건`);

  const categoryCounts = { hero: 0, section: 0, about: 0, gallery: 0, logo: 0 };
  for (const rep of imageReplacements) {
    categoryCounts[rep.category]++;
  }
  console.log(`      히어로: ${categoryCounts.hero}, 섹션: ${categoryCounts.section}, 소개: ${categoryCounts.about}, 갤러리: ${categoryCounts.gallery}, 로고: ${categoryCounts.logo}`);

  // ── Step 4: HTML 패치 적용 ──────────────────────────────────────────
  console.log("\n📌 Step 4: HTML 패치 적용 중...");

  const seoTitle = `${BRAND_INFO.name} | ${PERSONA_INFO.tagline || BRAND_INFO.industry + " 전문"}`;
  const seoDescription = PERSONA_INFO.usp || `${BRAND_INFO.name} - ${BRAND_INFO.industry} 전문 서비스`;

  const patchResult = applyPatches(
    cloneResult.html,
    textReplacements,
    imageReplacements,
    BRAND_INFO.name,
    seoTitle,
    seoDescription
  );

  console.log(`   ✅ 패치 완료:`);
  console.log(`      텍스트 교체: ${patchResult.textReplacements}건`);
  console.log(`      이미지 교체: ${patchResult.imageReplacements}건`);
  console.log(`      메타 교체: ${patchResult.metaReplacements}건`);

  // ── Step 5: 결과 저장 ──────────────────────────────────────────────
  const resultPath = path.join(outputDir, "20260319_에버유의원_homepage.html");
  fs.writeFileSync(resultPath, patchResult.html, "utf-8");

  console.log("\n" + "=".repeat(60));
  console.log("🎉 생성 완료!");
  console.log("=".repeat(60));
  console.log(`   원본:     ${originalPath}`);
  console.log(`   생성 결과: ${resultPath}`);
  console.log(`   원본 크기: ${Math.round(cloneResult.html.length / 1024)}KB`);
  console.log(`   결과 크기: ${Math.round(patchResult.html.length / 1024)}KB`);

  // 브라우저에서 열기
  console.log("\n🌐 브라우저에서 비교할 수 있도록 열겠습니다...");
  try {
    execSync(`open "${resultPath}"`);
    // 2초 후 원본도 열기
    setTimeout(() => {
      try {
        execSync(`open "${originalPath}"`);
      } catch { /* ignore */ }
    }, 2000);
  } catch {
    console.log("   (브라우저 자동 열기 실패 — 파일을 직접 열어주세요)");
  }
}

main().catch((err) => {
  console.error("\n❌ 파이프라인 실패:", err);
  process.exit(1);
});
