/**
 * 크롤러 스크린샷 캡처 검증 테스트
 * npx tsx scripts/test-crawler-screenshot.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../apps/web/.env.local") });

async function main() {
  const { crawlHomepageDesign } = await import("../lib/homepage/generate/homepage-crawler");

  const url = "https://www.rest-clinic.com/";
  console.log(`🔍 크롤링 시작: ${url}`);
  console.log("   (networkidle 대기 중... 최대 40초)\n");

  const start = Date.now();
  const result = await crawlHomepageDesign(url);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (!result.success || !result.data) {
    console.error(`❌ 크롤링 실패 (${elapsed}s): ${result.error}`);
    process.exit(1);
  }

  const d = result.data;
  console.log(`✅ 크롤링 완료 (${elapsed}s)`);
  console.log(`   방법: ${d.crawlMethod}`);
  console.log(`   스크린샷: ${d.screenshotBase64 ? `${Math.round(d.screenshotBase64.length / 1024)}KB` : "없음"}`);
  console.log(`   primaryColor: ${d.design.colorPalette.primary}`);
  console.log(`   secondaryColor: ${d.design.colorPalette.secondary}`);
  console.log(`   backgroundColor: ${d.design.colorPalette.background}`);
  console.log(`   textColor: ${d.design.colorPalette.textColor}`);
  console.log(`   headingFont: ${d.design.fonts.heading}`);
  console.log(`   bodyFont: ${d.design.fonts.body}`);
  console.log(`   designStyle: ${d.design.designStyle}`);
  console.log(`   섹션 수: ${d.layout.sections.length}`);
  d.layout.sections.forEach((s, i) => console.log(`     ${i + 1}. ${s.type}: ${s.headingText || "(무제)"}`));

  // 스크린샷 파일 저장
  if (d.screenshotBase64) {
    const outputDir = path.resolve(__dirname, "../output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const ssPath = path.join(outputDir, "crawler_screenshot.jpg");
    fs.writeFileSync(ssPath, Buffer.from(d.screenshotBase64, "base64"));
    console.log(`\n📸 스크린샷 저장: ${ssPath}`);
  }

  // 검증
  console.log("\n── 검증 ──");
  const checks = [
    { name: "스크린샷 생성", pass: !!d.screenshotBase64 },
    { name: "primaryColor가 어두운 계열 (#1 또는 #2 시작)", pass: /^#[12]/.test(d.design.colorPalette.primary || "") },
    { name: "섹션 3개 이상 감지", pass: d.layout.sections.length >= 3 },
  ];
  checks.forEach((c) => console.log(`   ${c.pass ? "✅" : "❌"} ${c.name}`));

  const allPass = checks.every((c) => c.pass);
  console.log(`\n${allPass ? "🎉 전체 통과" : "⚠️ 일부 실패"}`);
}

main().catch((err) => {
  console.error("❌ 테스트 실패:", err.message);
  process.exit(1);
});
