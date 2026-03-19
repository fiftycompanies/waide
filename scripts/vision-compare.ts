/**
 * Vision AI 비교 테스트
 * 생성된 HTML을 Playwright로 렌더링 → 스크린샷 → Vision AI로 rest-clinic.com과 비교
 *
 * 사용법: npx tsx scripts/vision-compare.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../apps/web/.env.local") });

const REFERENCE_URL = "https://www.rest-clinic.com/";
const GENERATED_HTML_PATH = path.resolve(__dirname, "../output/20260319_everyu_homepage.html");

async function captureScreenshots() {
  // Playwright 동적 import
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  const outputDir = path.resolve(__dirname, "../output");

  // 1. 레퍼런스 사이트 스크린샷
  console.log("📸 레퍼런스 사이트 스크린샷 캡처 중...");
  const refPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await refPage.goto(REFERENCE_URL, { waitUntil: "networkidle", timeout: 30000 });
  await refPage.waitForTimeout(2000);
  // 전체 높이를 가져오되 8000px 제한
  const refHeight = await refPage.evaluate(() => Math.min(document.body.scrollHeight, 7000));
  const refScreenshot = await refPage.screenshot({ clip: { x: 0, y: 0, width: 1440, height: refHeight }, type: "jpeg", quality: 80 });
  const refPath = path.join(outputDir, "reference_screenshot.jpg");
  fs.writeFileSync(refPath, refScreenshot);
  console.log(`✅ 레퍼런스 스크린샷 저장: ${refPath} (${Math.round(refScreenshot.length / 1024)}KB)`);

  // 2. 생성된 HTML 스크린샷
  console.log("📸 생성된 HTML 스크린샷 캡처 중...");
  const genPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const htmlContent = fs.readFileSync(GENERATED_HTML_PATH, "utf-8");
  await genPage.setContent(htmlContent, { waitUntil: "networkidle", timeout: 30000 });
  await genPage.waitForTimeout(2000);
  const genHeight = await genPage.evaluate(() => Math.min(document.body.scrollHeight, 7000));
  const genScreenshot = await genPage.screenshot({ clip: { x: 0, y: 0, width: 1440, height: genHeight }, type: "jpeg", quality: 80 });
  const genPath = path.join(outputDir, "generated_screenshot.jpg");
  fs.writeFileSync(genPath, genScreenshot);
  console.log(`✅ 생성 HTML 스크린샷 저장: ${genPath} (${Math.round(genScreenshot.length / 1024)}KB)`);

  await browser.close();

  return {
    referenceBase64: refScreenshot.toString("base64"),
    generatedBase64: genScreenshot.toString("base64"),
  };
}

async function compareWithVisionAI(refBase64: string, genBase64: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수 없음");

  console.log("\n🤖 Vision AI로 두 스크린샷 비교 분석 중...");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "첫 번째 이미지는 레퍼런스 홈페이지(rest-clinic.com)의 스크린샷이고, 두 번째 이미지는 AI가 생성한 홈페이지의 스크린샷입니다.",
            },
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: refBase64 },
            },
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: genBase64 },
            },
            {
              type: "text",
              text: `두 홈페이지 디자인을 시각적으로 비교 분석해주세요.

다음 항목별로 0~100점을 매기세요:
1. 색상 일치도: 배경색, 주색, 보조색이 얼마나 유사한가
2. 레이아웃 유사도: 섹션 구조, 그리드/컬럼 배치, 간격이 유사한가
3. 디자인 톤: 전체적인 분위기 (럭셔리/미니멀/모던 등)가 유사한가
4. 이미지 사용: 레퍼런스처럼 실제 이미지를 사용하고 있는가 (이모지나 그라데이션 대체가 아닌)
5. 타이포그래피: 폰트 크기 비율, 스타일, 계층이 유사한가
6. 전문성: 의료 업종에 맞는 전문적인 느낌인가

특히 다음 문제가 해결되었는지 확인:
- 이전 문제: 파란-핑크 그라데이션 → 화이트 배경으로 수정되었는가?
- 이전 문제: 이모지(🏥💉) 대신 실제 이미지를 사용하고 있는가?
- 이전 문제: 글래스모피즘 효과 → 전문적 의료 디자인인가?
- 이전 문제: 제네릭 SaaS 템플릿 → 레퍼런스와 유사한 의료 홈페이지인가?

JSON 형식으로 응답:
{
  "colorMatch": 0-100,
  "layoutSimilarity": 0-100,
  "designTone": 0-100,
  "imageUsage": 0-100,
  "typography": 0-100,
  "professionalism": 0-100,
  "overallScore": 0-100,
  "referenceDescription": "레퍼런스 사이트의 주요 특징 2-3문장",
  "generatedDescription": "생성된 사이트의 주요 특징 2-3문장",
  "issuesFixed": {
    "noGradientBackground": true/false,
    "noEmoji": true/false,
    "noGlassmorphism": true/false,
    "notGenericSaaS": true/false,
    "realImagesUsed": true/false
  },
  "summary": "종합 평가 2-3문장",
  "improvements": ["개선점 1", "개선점 2", "개선점 3"]
}`,
            },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Vision API 실패 (${resp.status}): ${errBody.slice(0, 300)}`);
  }

  const data = (await resp.json()) as { content: Array<{ type: string; text?: string }> };
  const text = data.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");

  return text;
}

async function main() {
  console.log("=" .repeat(70));
  console.log("🔍 홈페이지 Vision AI 비교 테스트");
  console.log("=" .repeat(70));

  if (!fs.existsSync(GENERATED_HTML_PATH)) {
    throw new Error(`생성된 HTML 없음: ${GENERATED_HTML_PATH}\n먼저 npx tsx scripts/test-homepage-e2e.ts 실행 필요`);
  }

  // HTML 기본 검증
  const html = fs.readFileSync(GENERATED_HTML_PATH, "utf-8");
  console.log(`\n📄 생성된 HTML: ${Math.round(html.length / 1024)}KB`);

  const unsplashCount = (html.match(/images\.unsplash\.com/g) || []).length;
  const gradientCount = (html.match(/linear-gradient/gi) || []).length;
  const emojiCount = (html.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;

  console.log(`   Unsplash 이미지: ${unsplashCount}개`);
  console.log(`   linear-gradient: ${gradientCount}개`);
  console.log(`   이모지: ${emojiCount}개`);

  // 스크린샷 캡처
  const { referenceBase64, generatedBase64 } = await captureScreenshots();

  // Vision AI 비교
  const result = await compareWithVisionAI(referenceBase64, generatedBase64);

  // JSON 파싱 + 출력
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const comparison = JSON.parse(jsonMatch[0]);

    console.log("\n" + "=" .repeat(70));
    console.log("📊 Vision AI 비교 결과");
    console.log("=" .repeat(70));
    console.log(`   색상 일치도:    ${comparison.colorMatch}/100`);
    console.log(`   레이아웃 유사도: ${comparison.layoutSimilarity}/100`);
    console.log(`   디자인 톤:      ${comparison.designTone}/100`);
    console.log(`   이미지 사용:    ${comparison.imageUsage}/100`);
    console.log(`   타이포그래피:   ${comparison.typography}/100`);
    console.log(`   전문성:        ${comparison.professionalism}/100`);
    console.log(`   ─────────────────────────────`);
    console.log(`   📈 종합 점수:   ${comparison.overallScore}/100`);

    console.log(`\n📋 레퍼런스: ${comparison.referenceDescription}`);
    console.log(`📋 생성물:  ${comparison.generatedDescription}`);

    console.log(`\n✅ 이전 문제 해결 여부:`);
    const issues = comparison.issuesFixed;
    console.log(`   그라데이션 배경 제거: ${issues.noGradientBackground ? "✅ 해결" : "❌ 미해결"}`);
    console.log(`   이모지 제거:         ${issues.noEmoji ? "✅ 해결" : "❌ 미해결"}`);
    console.log(`   글래스모피즘 제거:    ${issues.noGlassmorphism ? "✅ 해결" : "❌ 미해결"}`);
    console.log(`   SaaS 템플릿 탈피:    ${issues.notGenericSaaS ? "✅ 해결" : "❌ 미해결"}`);
    console.log(`   실제 이미지 사용:    ${issues.realImagesUsed ? "✅ 해결" : "❌ 미해결"}`);

    console.log(`\n📝 종합 평가: ${comparison.summary}`);

    if (comparison.improvements?.length) {
      console.log(`\n🔧 개선점:`);
      comparison.improvements.forEach((imp: string, i: number) => console.log(`   ${i + 1}. ${imp}`));
    }

    // 결과 JSON 저장
    const outputDir = path.resolve(__dirname, "../output");
    const reportPath = path.join(outputDir, "20260319_vision_comparison.json");
    fs.writeFileSync(reportPath, JSON.stringify({
      testDate: new Date().toISOString(),
      referenceUrl: REFERENCE_URL,
      htmlStats: { unsplashCount, gradientCount, emojiCount, htmlSize: html.length },
      comparison,
    }, null, 2), "utf-8");
    console.log(`\n📋 비교 리포트 저장: ${reportPath}`);
  } else {
    console.log("\n⚠️ JSON 파싱 실패, 원본 텍스트:");
    console.log(result);
  }
}

main().catch((err) => {
  console.error("\n❌ 비교 테스트 실패:", err.message);
  process.exit(1);
});
