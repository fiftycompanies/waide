/**
 * test-screenshot-e2e.ts
 * Screenshot-to-Code E2E 테스트 (Tailwind CSS + 크롭 기반)
 *
 * rest-clinic.com 스크린샷 → Stage A (구조 분석) → Stage B (크롭별 Tailwind 생성) → 브랜드 주입
 *
 * abi/screenshot-to-code 방법론 적용:
 * - Tailwind CSS 전용 (custom CSS 금지)
 * - 700px 크롭 단위 개별 변환
 * - Tailwind CDN <script> + tailwind.config
 */

import { captureScreenshots } from "../lib/homepage/generate/screenshot-crawler";
import {
  generateHtmlFromScreenshots,
  extractDesignTokensFromScreenshot,
} from "../lib/homepage/generate/vision-to-html";
import { injectBrandInfo } from "../lib/homepage/generate/brand-injector";
import type { BrandInfo, PersonaInfo } from "../lib/homepage/generate/content-mapper";
import * as fs from "fs";
import * as path from "path";

const REFERENCE_URL = "https://rest-clinic.com";

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

const SERVICE_NAMES = BRAND_INFO.services;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY 환경변수가 필요합니다.");
    process.exit(1);
  }

  const startTime = Date.now();
  console.log("=== Screenshot-to-Code E2E 테스트 (Tailwind CSS + 크롭) ===\n");

  // Step 1: 스크린샷 캡처
  console.log("📸 Step 1: 스크린샷 캡처 중...");
  const t1 = Date.now();
  const screenshots = await captureScreenshots(REFERENCE_URL);
  console.log(`   ✅ 완료 (${((Date.now() - t1) / 1000).toFixed(1)}초)`);
  console.log(`   top: ${Math.round(screenshots.top.length / 1024)}KB base64`);
  console.log(`   middle: ${screenshots.middle ? Math.round(screenshots.middle.length / 1024) + "KB base64" : "없음"}`);
  console.log(`   crops: ${screenshots.crops.length}개`);

  // Step 2: 디자인 토큰 추출
  console.log("\n🎨 Step 2: 디자인 토큰 추출 중...");
  const t2 = Date.now();
  const tokens = await extractDesignTokensFromScreenshot(screenshots.top, apiKey);
  console.log(`   ✅ 완료 (${((Date.now() - t2) / 1000).toFixed(1)}초)`);
  console.log(`   primary: ${tokens.primaryColor}`);
  console.log(`   accent: ${tokens.accentColor}`);
  console.log(`   bg: ${tokens.backgroundColor}`);
  console.log(`   text: ${tokens.textColor}`);
  console.log(`   heading: ${tokens.headingFont}`);
  console.log(`   body: ${tokens.bodyFont}`);

  // Step 3: Vision AI 2단계 Tailwind HTML 생성
  console.log("\n🤖 Step 3: Vision AI Tailwind HTML 생성 중...");
  console.log("   Stage A: 구조 분석 (1회) + Stage B: 크롭별 Tailwind 생성 (N회, 2병렬)");
  const t3 = Date.now();
  const rawHtml = await generateHtmlFromScreenshots({
    screenshots,
    tokens,
    apiKey,
  });
  console.log(`   ✅ 완료 (${((Date.now() - t3) / 1000).toFixed(1)}초)`);
  console.log(`   생성 HTML: ${Math.round(rawHtml.length / 1024)}KB`);

  // Step 4: 브랜드 정보 주입
  console.log("\n💉 Step 4: 브랜드 정보 주입 중...");
  const t4 = Date.now();
  const finalHtml = injectBrandInfo(rawHtml, BRAND_INFO, PERSONA, "의원");
  console.log(`   ✅ 완료 (${((Date.now() - t4) / 1000).toFixed(1)}초)`);
  console.log(`   최종 HTML: ${Math.round(finalHtml.length / 1024)}KB`);

  // ===== 검증 =====
  console.log("\n=== 검증 ===\n");
  let pass = 0;
  let fail = 0;

  function check(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`✅ ${name}${detail ? ` (${detail})` : ""}`);
      pass++;
    } else {
      console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
      fail++;
    }
  }

  // --- 1. 레퍼런스 원본 텍스트 유출 없음 ---
  check("rest-clinic.com 문자열 없음", !finalHtml.includes("rest-clinic.com"));

  const hasRest = finalHtml.includes("SKIN NEEDS REST") || finalHtml.includes("rest-clinic");
  check("레퍼런스 원본 텍스트 없음", !hasRest);

  // --- 2. Tailwind CSS CDN 포함 ---
  check("Tailwind CDN script 포함", finalHtml.includes("cdn.tailwindcss.com"));

  // --- 3. tailwind.config 포함 ---
  check("tailwind.config 포함", finalHtml.includes("tailwind.config"));

  // --- 4. Tailwind CSS 클래스 사용 확인 ---
  const tailwindClasses = [
    "bg-", "text-", "flex", "grid", "py-", "px-", "mx-auto", "rounded",
    "font-bold", "font-semibold", "max-w-", "space-y-", "gap-",
  ];
  const foundTwClasses = tailwindClasses.filter((cls) => finalHtml.includes(cls));
  check(
    "Tailwind CSS 클래스 사용",
    foundTwClasses.length >= 5,
    `${foundTwClasses.length}/${tailwindClasses.length}개 발견: ${foundTwClasses.slice(0, 6).join(", ")}`
  );

  // --- 5. <style> 태그 최소화 (body용 font-family만 허용) ---
  const styleTags = finalHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const nonFontStyles = styleTags.filter((s) => !s.includes("font-family") && !s.includes("font-smoothing"));
  check(
    "<style> 태그 최소화 (font 전용만)",
    nonFontStyles.length === 0,
    `총 ${styleTags.length}개 style 태그, 비폰트 ${nonFontStyles.length}개`
  );

  // --- 6. 크롭 캡처 확인 ---
  check("크롭 캡처 1개 이상", screenshots.crops.length >= 1, `${screenshots.crops.length}개 크롭`);

  // --- 7. Unsplash 이미지 포함 ---
  const unsplashCount = (finalHtml.match(/images\.unsplash\.com/g) || []).length;
  check("Unsplash 이미지 포함", unsplashCount >= 3, `${unsplashCount}개`);

  // --- 8. 브랜드 정보 주입 확인 ---
  check("에버유의원 브랜드명 포함", finalHtml.includes("에버유의원"));
  check("전화번호 포함", finalHtml.includes("02-555-7890"));

  // --- 9. body 내 <head> 태그 없음 ---
  const bodyMatch = finalHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : "";
  const headInBody = /<head[^>]*>/i.test(bodyContent);
  check("body 내 <head> 태그 없음", !headInBody);

  // --- 10. {{}} 미교체 플레이스홀더 0건 확인 ---
  const unreplacedMatches = finalHtml.match(/\{\{[^}]*\}\}/g) || [];
  check(
    "{{}} 미교체 플레이스홀더 0건",
    unreplacedMatches.length === 0,
    unreplacedMatches.length > 0
      ? `미교체: ${unreplacedMatches.slice(0, 5).join(", ")}`
      : "모두 교체됨"
  );

  // --- 11. 서비스명이 폼 label에 없을 것 ---
  const formLabelRegex = /<label[^>]*>([\s\S]*?)<\/label>/gi;
  const formLabels: string[] = [];
  let labelMatch: RegExpExecArray | null;
  while ((labelMatch = formLabelRegex.exec(finalHtml)) !== null) {
    formLabels.push(labelMatch[1]);
  }
  const serviceInFormLabel = SERVICE_NAMES.some((svc) =>
    formLabels.some((label) => label.includes(svc))
  );
  check(
    "폼 label에 서비스명 없음",
    !serviceInFormLabel,
    serviceInFormLabel
      ? `서비스명 발견: ${formLabels.filter((l) => SERVICE_NAMES.some((s) => l.includes(s))).join(", ")}`
      : "정상"
  );

  // --- 12. 폼 이름 라벨 확인 ---
  check("폼 이름 라벨 = 이름", finalHtml.includes("이름"));

  // --- 13. 블로그 카드 제목 실제 텍스트 ---
  const hasBlogTitle = finalHtml.includes("에버유의원") && finalHtml.includes("의원");
  const noBlogPlaceholder = !finalHtml.includes("[BLOG_TITLE_") && !finalHtml.includes("{{BLOG_TITLE_");
  check("블로그 카드 제목 실제 텍스트", hasBlogTitle && noBlogPlaceholder);

  // --- 14. 서비스명 포함 확인 ---
  const serviceDescs: string[] = [];
  for (const svcName of SERVICE_NAMES) {
    if (finalHtml.includes(svcName)) {
      serviceDescs.push(svcName);
    }
  }
  check("서비스명 5개 중 3개 이상 포함", serviceDescs.length >= 3, `${serviceDescs.length}개 포함`);

  // --- 15. 주소 포함 ---
  check("주소 포함", finalHtml.includes("논현로") || finalHtml.includes("강남구"));

  // --- 16. 이미지 URL 고유성 ---
  const serviceImgMatches = finalHtml.match(/data-img-slot="service"[^>]*src="([^"]*)"/gi) || [];
  const serviceUrls: string[] = [];
  for (const m of serviceImgMatches) {
    const srcMatch = m.match(/src="([^"]*)"/);
    if (srcMatch) serviceUrls.push(srcMatch[1]);
  }
  const serviceDivMatches = finalHtml.match(/data-img-slot="service"[^>]*url\('([^']*)'\)/gi) || [];
  for (const m of serviceDivMatches) {
    const urlMatch = m.match(/url\('([^']*)'\)/);
    if (urlMatch) serviceUrls.push(urlMatch[1]);
  }
  const serviceUniqueUrls = new Set(serviceUrls);
  check(
    "서비스 이미지 URL 모두 고유",
    serviceUrls.length <= 1 || serviceUniqueUrls.size === serviceUrls.length,
    `총 ${serviceUrls.length}개 중 고유 ${serviceUniqueUrls.size}개`
  );

  // --- 17. 갤러리 이미지 URL 고유성 ---
  const galleryImgMatches = finalHtml.match(/data-img-slot="gallery"[^>]*src="([^"]*)"/gi) || [];
  const galleryUrls: string[] = [];
  for (const m of galleryImgMatches) {
    const srcMatch = m.match(/src="([^"]*)"/);
    if (srcMatch) galleryUrls.push(srcMatch[1]);
  }
  const galleryDivMatches = finalHtml.match(/data-img-slot="gallery"[^>]*url\('([^']*)'\)/gi) || [];
  for (const m of galleryDivMatches) {
    const urlMatch = m.match(/url\('([^']*)'\)/);
    if (urlMatch) galleryUrls.push(urlMatch[1]);
  }
  const galleryUniqueUrls = new Set(galleryUrls);
  check(
    "갤러리 이미지 URL 모두 고유",
    galleryUrls.length <= 1 || galleryUniqueUrls.size === galleryUrls.length,
    `총 ${galleryUrls.length}개 중 고유 ${galleryUniqueUrls.size}개`
  );

  // --- 18. brand colors in tailwind.config ---
  check(
    "tailwind.config에 brand 색상",
    finalHtml.includes("brand:") || finalHtml.includes("brand-primary") || finalHtml.includes("'primary'"),
    "tailwind.config에 brand 색상 정의"
  );

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== 결과: ${pass} PASS / ${fail} FAIL (총 ${totalTime}초) ===`);

  // 저장
  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "20260320_에버유의원_tailwind_screenshot_to_code.html");
  fs.writeFileSync(outputPath, finalHtml, "utf-8");
  console.log(`\n📄 결과: ${outputPath}`);

  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("💥 치명적 오류:", e);
  process.exit(1);
});
