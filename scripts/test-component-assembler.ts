/**
 * test-component-assembler.ts
 * Waide 컴포넌트 어셈블러 로컬 테스트
 *
 * 실행: npx tsx scripts/test-component-assembler.ts
 *
 * 1. rest-clinic.com 디자인 토큰 추출 (vision-analyzer)
 * 2. 컴포넌트 선택 (ComponentPlan)
 * 3. 어셈블러로 HTML 생성
 * 4. output/ 에 저장 + 브라우저에서 열기
 */

import { selectComponents, extractDesignTokens } from "../lib/homepage/components/index";
import { assembleHomepage } from "../lib/homepage/generate/component-assembler";
import { getUnsplashImages } from "../lib/homepage/generate/unsplash-images";
import type { BrandInfo, PersonaInfo } from "../lib/homepage/generate/content-mapper";
import type { ReferenceStructure } from "../lib/homepage/generate/vision-analyzer";
import type { ImageMap } from "../lib/homepage/components/types";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ── 에버유의원 브랜드 정보 ──────────────────────────────────────────────────

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
  keywords: ["강남 피부과", "강남 보톡스", "강남 필러"],
  tone: "전문적이고 신뢰감 있는, 따뜻한 톤",
};

const PERSONA_INFO: PersonaInfo = {
  usp: "20년 경력 피부과 전문의가 직접 시술하는 맞춤형 피부 솔루션",
  target_customer: "30~50대 피부 고민이 있는 강남 직장인",
  tagline: "당신만의 피부 솔루션, 에버유의원",
  one_liner: "강남역 피부과 전문의 직접 시술 — 에버유의원",
};

// ── rest-clinic.com 스타일 시뮬레이션 (ReferenceStructure) ───────────────────

const REST_CLINIC_STRUCTURE: ReferenceStructure = {
  sections: [
    { type: "hero", order: 1, layout: "full-width-bg", colorScheme: "image-bg", contentHints: "배경 이미지 + 중앙 텍스트" },
    { type: "about", order: 2, layout: "2-col-image-left", colorScheme: "light-bg", contentHints: "의원 소개" },
    { type: "services", order: 3, layout: "3-card-grid", colorScheme: "light-bg", contentHints: "시술 카드" },
    { type: "gallery", order: 4, layout: "3-col-grid", colorScheme: "light-bg", contentHints: "시술 결과" },
    { type: "testimonials", order: 5, layout: "slider", colorScheme: "dark-bg", contentHints: "후기" },
    { type: "contact", order: 6, layout: "split-form", colorScheme: "light-bg", contentHints: "예약 폼" },
  ],
  globalStyle: {
    designTone: "luxury medical",
    primaryColor: "#1a1210",
    secondaryColor: "#c8a97e",
    accentColor: "#c8a97e",
    backgroundColor: "#ffffff",
    textColor: "#1a1210",
    headingFont: "Playfair Display",
    bodyFont: "Noto Sans KR",
    borderRadius: "soft",
    spacing: "spacious",
  },
  heroStyle: {
    hasBackgroundImage: true,
    hasOverlay: true,
    textAlignment: "center",
    ctaStyle: "primary-button",
  },
  navStyle: {
    position: "fixed",
    background: "transparent-to-white",
    alignment: "space-between",
  },
};

// ── 메인 ──────────────────────────────────────────────────────────────────

async function main() {
  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("=".repeat(60));
  console.log("  Waide 컴포넌트 어셈블러 테스트");
  console.log("=".repeat(60));

  // Step 1: 디자인 토큰 추출
  console.log("\n[Step 1] 디자인 토큰 추출...");
  const tokens = extractDesignTokens(REST_CLINIC_STRUCTURE);
  console.log(`  primaryColor: ${tokens.primaryColor}`);
  console.log(`  accentColor: ${tokens.accentColor}`);
  console.log(`  headingFont: ${tokens.headingFont}`);
  console.log(`  bodyFont: ${tokens.bodyFont}`);
  console.log(`  tone: ${tokens.tone}`);
  console.log(`  borderRadius: ${tokens.borderRadius}`);

  // Step 2: 컴포넌트 선택
  console.log("\n[Step 2] 컴포넌트 선택...");
  const plan = selectComponents(REST_CLINIC_STRUCTURE, BRAND_INFO);
  console.log(`  nav: ${plan.nav}`);
  console.log(`  hero: ${plan.hero}`);
  console.log(`  about: ${plan.about}`);
  console.log(`  services: ${plan.services}`);
  console.log(`  gallery: ${plan.gallery}`);
  console.log(`  contact: ${plan.contact}`);
  console.log(`  blog: ${plan.blog}`);
  console.log(`  cta: ${plan.cta}`);
  console.log(`  footer: ${plan.footer}`);

  // Step 3: 이미지 맵 생성
  console.log("\n[Step 3] 업종별 이미지 맵...");
  const unsplash = getUnsplashImages(BRAND_INFO.industry);
  const images: ImageMap = {
    hero: unsplash.hero,
    section: unsplash.section,
    about: unsplash.about,
    gallery: unsplash.gallery,
  };
  console.log(`  hero: ${images.hero.length}장`);
  console.log(`  section: ${images.section.length}장`);
  console.log(`  about: ${images.about.length}장`);
  console.log(`  gallery: ${images.gallery.length}장`);

  // Step 4: HTML 어셈블
  console.log("\n[Step 4] HTML 어셈블...");
  const startTime = Date.now();
  const html = assembleHomepage(plan, tokens, BRAND_INFO, PERSONA_INFO, images);
  const elapsed = Date.now() - startTime;
  console.log(`  HTML 생성: ${Math.round(html.length / 1024)}KB (${elapsed}ms)`);

  // Step 5: 검증
  console.log("\n[Step 5] 검증...");
  const hasWaideClasses = html.includes("waide-hero") && html.includes("waide-nav") && html.includes("waide-services");
  const hasNoExternalClasses = !html.includes("rest-clinic") && !html.includes('class="sc-') && !html.includes("css-module");
  const hasCssVariables = html.includes("--waide-primary") && html.includes("--waide-accent");
  const hasBlogSection = html.includes("waide-blog") && html.includes("최신 블로그 포스트");
  const hasGoogleFonts = html.includes("fonts.googleapis.com");
  const hasUnsplashImages = html.includes("images.unsplash.com");

  console.log(`  Waide 클래스 사용: ${hasWaideClasses ? "PASS" : "FAIL"}`);
  console.log(`  외부 클래스 없음: ${hasNoExternalClasses ? "PASS" : "FAIL"}`);
  console.log(`  CSS 변수 주입: ${hasCssVariables ? "PASS" : "FAIL"}`);
  console.log(`  블로그 섹션 포함: ${hasBlogSection ? "PASS" : "FAIL"}`);
  console.log(`  Google Fonts 링크: ${hasGoogleFonts ? "PASS" : "FAIL"}`);
  console.log(`  Unsplash 이미지: ${hasUnsplashImages ? "PASS" : "FAIL"}`);

  // Step 6: 저장
  const resultPath = path.join(outputDir, "20260319_에버유의원_waide_components.html");
  fs.writeFileSync(resultPath, html, "utf-8");

  console.log("\n" + "=".repeat(60));
  console.log("  생성 완료!");
  console.log("=".repeat(60));
  console.log(`  결과 파일: ${resultPath}`);
  console.log(`  크기: ${Math.round(html.length / 1024)}KB`);

  // 브라우저에서 열기
  try {
    execSync(`open "${resultPath}"`);
  } catch { /* ignore */ }
}

main().catch((err) => {
  console.error("\nFAIL:", err);
  process.exit(1);
});
