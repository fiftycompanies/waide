/**
 * test-screenshot-e2e.ts
 * Screenshot-to-Code E2E 테스트
 *
 * rest-clinic.com 스크린샷 → Vision AI → HTML 생성 → 브랜드 주입
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

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY 환경변수가 필요합니다.");
    process.exit(1);
  }

  const startTime = Date.now();
  console.log("=== Screenshot-to-Code E2E 테스트 ===\n");

  // Step 1: 스크린샷 캡처
  console.log("📸 Step 1: 스크린샷 캡처 중...");
  const t1 = Date.now();
  const screenshots = await captureScreenshots(REFERENCE_URL);
  console.log(`   ✅ 완료 (${((Date.now() - t1) / 1000).toFixed(1)}초)`);
  console.log(`   top: ${Math.round(screenshots.top.length / 1024)}KB base64`);
  console.log(`   middle: ${screenshots.middle ? Math.round(screenshots.middle.length / 1024) + "KB base64" : "없음"}`);

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

  // Step 3: Vision AI HTML 생성
  console.log("\n🤖 Step 3: Vision AI HTML 생성 중 (2회 호출)...");
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

  // 검증
  console.log("\n=== 검증 ===\n");
  let pass = 0;
  let fail = 0;

  function check(name: string, condition: boolean, detail?: string) {
    if (condition) { console.log(`✅ ${name}${detail ? ` (${detail})` : ""}`); pass++; }
    else { console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`); fail++; }
  }

  // --- 기본 검증 ---
  check("rest-clinic.com 문자열 없음", !finalHtml.includes("rest-clinic.com"));

  const classMatches = finalHtml.match(/class="([^"]*)"/g) || [];
  const nonWaideClasses = classMatches.filter((m) => {
    const classes = m.replace(/class="/, "").replace(/"/, "").split(/\s+/);
    return classes.some((c) => c !== "" && !c.startsWith("waide-"));
  });
  check("모든 class명 waide- 접두사", nonWaideClasses.length === 0, `비준수: ${nonWaideClasses.length}개`);

  check("CSS 변수 --waide-* 사용", finalHtml.includes("--waide-primary") && finalHtml.includes("--waide-accent"));
  check("블로그 섹션 포함", finalHtml.includes("waide-blog"));

  const unsplashCount = (finalHtml.match(/images\.unsplash\.com/g) || []).length;
  check("Unsplash 이미지 포함", unsplashCount >= 3, `${unsplashCount}개`);

  check("에버유의원 브랜드명 포함", finalHtml.includes("에버유의원"));
  check("전화번호 포함", finalHtml.includes("02-555-7890"));
  check("서비스명 포함", finalHtml.includes("피부관리"));

  // --- Task 1: body 중간에 <head> 태그 없음 ---
  const bodyMatch = finalHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : "";
  const headInBody = /<head[^>]*>/i.test(bodyContent);
  check("body 내 <head> 태그 없음", !headInBody);

  // --- Task 2: 레퍼런스 원본 텍스트 유출 없음 ---
  const hasRest = finalHtml.includes("REST") || finalHtml.includes("레스트") || finalHtml.includes("SKIN NEEDS REST");
  check("레퍼런스 원본 텍스트 없음 (REST/레스트)", !hasRest);

  // --- Task 4: 서비스 이미지 URL 모두 다름 ---
  const serviceImgMatches = finalHtml.match(/data-img-slot="service"[^>]*src="([^"]*)"/gi) || [];
  const serviceUrls: string[] = [];
  for (const m of serviceImgMatches) {
    const srcMatch = m.match(/src="([^"]*)"/);
    if (srcMatch) serviceUrls.push(srcMatch[1]);
  }
  // div 형태 서비스 이미지도 체크
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

  // --- Task 4: 갤러리 이미지 URL 모두 다름 ---
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

  // --- Task 3: 서비스 설명 각기 다른 내용 ---
  const serviceDescs: string[] = [];
  for (let i = 1; i <= 5; i++) {
    // 생성된 설명 텍스트를 찾기 위해 서비스명 기반 패턴 체크
    const svcName = BRAND_INFO.services[i - 1];
    if (svcName && finalHtml.includes(svcName)) {
      serviceDescs.push(svcName);
    }
  }
  check("서비스명 5개 중 3개 이상 포함", serviceDescs.length >= 3, `${serviceDescs.length}개 포함`);

  // --- 브랜드 정보 주입 완전성 ---
  check("주소 포함", finalHtml.includes("논현로") || finalHtml.includes("강남구"));

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== 결과: ${pass} PASS / ${fail} FAIL (총 ${totalTime}초) ===`);

  // 저장
  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "20260320_에버유의원_screenshot_to_code.html");
  fs.writeFileSync(outputPath, finalHtml, "utf-8");
  console.log(`\n📄 결과: ${outputPath}`);

  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("💥 치명적 오류:", e);
  process.exit(1);
});
