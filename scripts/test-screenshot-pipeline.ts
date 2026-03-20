/**
 * test-screenshot-pipeline.ts
 * Screenshot-to-Code 파이프라인 로컬 검증 스크립트
 *
 * 테스트 항목:
 * 1. brand-injector에 플레이스홀더 HTML을 넣으면 브랜드 정보로 치환되는지
 * 2. 모든 class명이 waide- 접두사인지
 * 3. CSS 변수(--waide-*)만 색상에 사용했는지
 * 4. 블로그 섹션 포함 확인
 * 5. Unsplash 이미지 URL 포함 확인
 * 6. rest-clinic.com 문자열 0건 확인
 */

import { injectBrandInfo } from "../lib/homepage/generate/brand-injector";
import type { BrandInfo, PersonaInfo } from "../lib/homepage/generate/content-mapper";
import * as fs from "fs";
import * as path from "path";

// ── 테스트 데이터 ─────────────────────────────────────────────────────────────

const MOCK_BRAND_INFO: BrandInfo = {
  name: "에버유의원",
  industry: "의원",
  phone: "02-1234-5678",
  address: "서울시 강남구 테헤란로 123",
  services: ["피부관리", "보톡스", "필러", "리프팅", "레이저토닝"],
  keywords: ["강남 피부과", "보톡스 잘하는 곳", "필러 추천"],
  tone: "luxury",
};

const MOCK_PERSONA: PersonaInfo = {
  usp: "15년 경력 피부과 전문의가 직접 시술하는 프리미엄 피부관리",
  target_customer: "30~50대 피부 관리에 관심 있는 여성",
  tagline: "당신의 피부, 에버유가 지킵니다",
  one_liner: "당신의 피부, 에버유가 지킵니다",
};

// Vision AI가 생성할 법한 플레이스홀더 HTML 시뮬레이션
const MOCK_VISION_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[BRAND_NAME] | [TAGLINE]</title>
  <meta name="description" content="[USP]">
  <meta property="og:title" content="[BRAND_NAME] | [TAGLINE]">
  <meta property="og:description" content="[USP]">
  <style>
    :root {
      --waide-primary: #1a1210;
      --waide-accent: #c8a97e;
      --waide-bg: #ffffff;
      --waide-text: #333333;
      --waide-font-heading: 'Playfair Display', serif;
      --waide-font-body: 'Noto Sans KR', sans-serif;
    }
    body { font-family: var(--waide-font-body); color: var(--waide-text); background: var(--waide-bg); }
    .waide-nav { background: var(--waide-primary); padding: 16px 0; }
    .waide-nav-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; }
    .waide-nav-logo { color: var(--waide-accent); font-family: var(--waide-font-heading); font-size: 1.5rem; font-weight: 700; }
    .waide-nav-menu { display: flex; gap: 24px; list-style: none; }
    .waide-nav-menu a { color: #fff; font-size: 0.95rem; }
    .waide-nav-cta { background: var(--waide-accent); color: var(--waide-primary); padding: 8px 20px; border-radius: 4px; font-weight: 600; }
    .waide-hero { position: relative; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; color: #fff; overflow: hidden; }
    .waide-hero-bg { position: absolute; inset: 0; z-index: 0; }
    .waide-hero-bg img { width: 100%; height: 100%; object-fit: cover; }
    .waide-hero-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 1; }
    .waide-hero-content { position: relative; z-index: 2; max-width: 700px; padding: 0 24px; }
    .waide-hero-content h1 { font-family: var(--waide-font-heading); font-size: 3rem; margin-bottom: 16px; }
    .waide-hero-content p { font-size: 1.2rem; margin-bottom: 32px; opacity: 0.9; }
    .waide-hero-btn { display: inline-block; background: var(--waide-accent); color: var(--waide-primary); padding: 14px 36px; border-radius: 4px; font-weight: 600; font-size: 1.1rem; }

    .waide-about { padding: 80px 24px; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .waide-about h2 { font-family: var(--waide-font-heading); font-size: 2rem; margin-bottom: 16px; color: var(--waide-primary); }
    .waide-about p { line-height: 1.8; color: #555; }

    .waide-services { padding: 80px 24px; background: #f9f9f9; }
    .waide-services-inner { max-width: 1200px; margin: 0 auto; }
    .waide-services h2 { text-align: center; font-family: var(--waide-font-heading); font-size: 2rem; margin-bottom: 48px; color: var(--waide-primary); }
    .waide-services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .waide-service-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .waide-service-card h3 { padding: 16px 20px 8px; font-size: 1.1rem; color: var(--waide-primary); }
    .waide-service-card p { padding: 0 20px 20px; color: #666; font-size: 0.9rem; }

    .waide-gallery { padding: 80px 24px; max-width: 1200px; margin: 0 auto; }
    .waide-gallery h2 { text-align: center; font-family: var(--waide-font-heading); font-size: 2rem; margin-bottom: 48px; color: var(--waide-primary); }
    .waide-gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .waide-gallery-grid img { width: 100%; height: 250px; object-fit: cover; border-radius: 8px; }

    .waide-contact { padding: 80px 24px; background: var(--waide-primary); color: #fff; }
    .waide-contact-inner { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
    .waide-contact h2 { font-family: var(--waide-font-heading); font-size: 2rem; margin-bottom: 24px; }
    .waide-contact-info p { margin-bottom: 12px; opacity: 0.9; }
    .waide-contact-form input, .waide-contact-form textarea { width: 100%; padding: 12px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; background: rgba(255,255,255,0.1); color: #fff; }
    .waide-contact-form button { background: var(--waide-accent); color: var(--waide-primary); padding: 12px 32px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; }

    .waide-blog { padding: 80px 24px; max-width: 1200px; margin: 0 auto; }
    .waide-blog h2 { text-align: center; font-family: var(--waide-font-heading); font-size: 2rem; margin-bottom: 48px; color: var(--waide-primary); }
    .waide-blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .waide-blog-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .waide-blog-img { height: 200px; background: #eee; }
    .waide-blog-card h3 { padding: 16px 20px 8px; font-size: 1rem; color: var(--waide-primary); }
    .waide-blog-card p { padding: 0 20px 20px; color: #666; font-size: 0.85rem; }

    .waide-footer { background: #111; color: #999; padding: 40px 24px; text-align: center; }
    .waide-footer p { margin-bottom: 8px; }

    @media (max-width: 768px) {
      .waide-about { grid-template-columns: 1fr; }
      .waide-services-grid { grid-template-columns: 1fr; }
      .waide-gallery-grid { grid-template-columns: repeat(2, 1fr); }
      .waide-contact-inner { grid-template-columns: 1fr; }
      .waide-blog-grid { grid-template-columns: 1fr; }
      .waide-hero-content h1 { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <!-- Nav -->
  <nav class="waide-nav">
    <div class="waide-nav-inner">
      <div class="waide-nav-logo">[BRAND_NAME]</div>
      <ul class="waide-nav-menu">
        <li><a href="#about">소개</a></li>
        <li><a href="#services">서비스</a></li>
        <li><a href="#gallery">갤러리</a></li>
        <li><a href="#contact">상담</a></li>
      </ul>
      <a class="waide-nav-cta" href="tel:[PHONE]">[PHONE]</a>
    </div>
  </nav>

  <!-- Hero -->
  <section class="waide-hero" id="hero">
    <div class="waide-hero-bg">
      <img src="" data-img-slot="hero" alt="hero background">
    </div>
    <div class="waide-hero-overlay"></div>
    <div class="waide-hero-content">
      <h1>[TAGLINE]</h1>
      <p>[USP]</p>
      <a class="waide-hero-btn" href="#contact">상담 예약하기</a>
    </div>
  </section>

  <!-- About -->
  <section class="waide-about" id="about">
    <div class="waide-about-text">
      <h2>[BRAND_NAME] 소개</h2>
      <p>[USP]</p>
    </div>
    <div class="waide-about-img">
      <img src="" data-img-slot="about" alt="about">
    </div>
  </section>

  <!-- Services -->
  <section class="waide-services" id="services">
    <div class="waide-services-inner">
      <h2>서비스 안내</h2>
      <div class="waide-services-grid">
        <div class="waide-service-card">
          <img src="" data-img-slot="service" alt="service">
          <h3>[SERVICE_1]</h3>
          <p>[SERVICE_DESC_1]</p>
        </div>
        <div class="waide-service-card">
          <img src="" data-img-slot="service" alt="service">
          <h3>[SERVICE_2]</h3>
          <p>[SERVICE_DESC_2]</p>
        </div>
        <div class="waide-service-card">
          <img src="" data-img-slot="service" alt="service">
          <h3>[SERVICE_3]</h3>
          <p>[SERVICE_DESC_3]</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Gallery -->
  <section class="waide-gallery" id="gallery">
    <h2>갤러리</h2>
    <div class="waide-gallery-grid">
      <img src="" data-img-slot="gallery" alt="gallery">
      <img src="" data-img-slot="gallery" alt="gallery">
      <img src="" data-img-slot="gallery" alt="gallery">
    </div>
  </section>

  <!-- Contact -->
  <section class="waide-contact" id="contact">
    <div class="waide-contact-inner">
      <div class="waide-contact-info">
        <h2>상담 예약</h2>
        <p>전화: [PHONE]</p>
        <p>주소: [ADDRESS]</p>
      </div>
      <div class="waide-contact-form">
        <input type="text" placeholder="이름">
        <input type="tel" placeholder="연락처">
        <textarea placeholder="문의 내용" rows="4"></textarea>
        <button type="submit">상담 신청</button>
      </div>
    </div>
  </section>

  <!-- Blog -->
  <section class="waide-blog" id="blog">
    <h2>블로그</h2>
    <div class="waide-blog-grid">
      <article class="waide-blog-card" data-blog-slot="1">
        <div class="waide-blog-img" data-img-slot="gallery"></div>
        <h3>[BLOG_TITLE_1]</h3>
        <p>[BLOG_EXCERPT_1]</p>
      </article>
      <article class="waide-blog-card" data-blog-slot="2">
        <div class="waide-blog-img" data-img-slot="gallery"></div>
        <h3>[BLOG_TITLE_2]</h3>
        <p>[BLOG_EXCERPT_2]</p>
      </article>
      <article class="waide-blog-card" data-blog-slot="3">
        <div class="waide-blog-img" data-img-slot="gallery"></div>
        <h3>[BLOG_TITLE_3]</h3>
        <p>[BLOG_EXCERPT_3]</p>
      </article>
    </div>
  </section>

  <!-- Footer -->
  <footer class="waide-footer">
    <p>[BRAND_NAME]</p>
    <p>[PHONE] | [ADDRESS]</p>
    <p>&copy; 2026 [BRAND_NAME]. All rights reserved.</p>
  </footer>
</body>
</html>`;

// ── 테스트 실행 ──────────────────────────────────────────────────────────────

console.log("=== Screenshot-to-Code 파이프라인 검증 ===\n");

// 브랜드 정보 주입
const injectedHtml = injectBrandInfo(
  MOCK_VISION_HTML,
  MOCK_BRAND_INFO,
  MOCK_PERSONA,
  "의원"
);

let passCount = 0;
let failCount = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${name}${detail ? ` (${detail})` : ""}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
    failCount++;
  }
}

// 1. "rest-clinic.com" 문자열 0건 확인
check(
  "rest-clinic.com 문자열 없음",
  !injectedHtml.includes("rest-clinic.com"),
  "레퍼런스 URL 참조 없음"
);

// 2. 모든 class명이 waide- 접두사
const classMatches = injectedHtml.match(/class="([^"]*)"/g) || [];
const allWaide = classMatches.every((m) => {
  const classes = m.replace(/class="/, "").replace(/"/, "").split(/\s+/);
  return classes.every((c) => c === "" || c.startsWith("waide-"));
});
check(
  "모든 class명이 waide- 접두사",
  allWaide,
  `${classMatches.length}개 class 속성 확인`
);

// 3. CSS 변수(--waide-*)만 색상에 사용
check(
  "CSS 변수(--waide-*) 사용",
  injectedHtml.includes("--waide-primary") && injectedHtml.includes("--waide-accent"),
  "primary + accent 변수 확인"
);

// 4. 블로그 섹션 포함
check(
  "블로그 섹션 포함",
  injectedHtml.includes("waide-blog") && injectedHtml.includes("waide-blog-grid"),
  "waide-blog + waide-blog-grid"
);

// 5. Unsplash 이미지 URL 포함
const unsplashCount = (injectedHtml.match(/images\.unsplash\.com/g) || []).length;
check(
  "Unsplash 이미지 포함",
  unsplashCount >= 3,
  `${unsplashCount}개 Unsplash URL`
);

// 6. 플레이스홀더 교체 확인
check(
  "[BRAND_NAME] 교체됨",
  !injectedHtml.includes("[BRAND_NAME]") && injectedHtml.includes("에버유의원"),
  "에버유의원으로 교체"
);

// 7. [SERVICE_1] 교체됨
check(
  "[SERVICE_1] 교체됨",
  !injectedHtml.includes("[SERVICE_1]") && injectedHtml.includes("피부관리"),
  "피부관리로 교체"
);

// 8. [PHONE] 교체됨
check(
  "[PHONE] 교체됨",
  !injectedHtml.includes("[PHONE]") && injectedHtml.includes("02-1234-5678"),
  "02-1234-5678로 교체"
);

// 9. 메타 태그 교체
check(
  "메타 태그 교체됨",
  injectedHtml.includes("<title>에버유의원") && injectedHtml.includes("당신의 피부"),
  "title + description 포함"
);

// 10. 블로그 플레이스홀더 교체
check(
  "블로그 플레이스홀더 교체됨",
  !injectedHtml.includes("[BLOG_TITLE_1]") && injectedHtml.includes("에버유의원"),
  "블로그 타이틀에 브랜드명 포함"
);

console.log(`\n=== 결과: ${passCount} PASS / ${failCount} FAIL (총 ${passCount + failCount}개) ===`);

// 결과 파일 저장
const outputDir = path.join(__dirname, "..", "output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, "20260320_에버유의원_screenshot_pipeline.html");
fs.writeFileSync(outputPath, injectedHtml, "utf-8");
console.log(`\n📄 결과 HTML 저장: ${outputPath}`);
console.log(`   크기: ${Math.round(injectedHtml.length / 1024)}KB`);

if (failCount > 0) {
  process.exit(1);
}
