/**
 * extract-layout-skeleton.ts
 * 레퍼런스 사이트의 CSS 레이아웃 구조만 추출하여 클린 스켈레톤 HTML 생성
 *
 * - computedStyle 기반 인라인 CSS 보존 (Tailwind 대체 없음)
 * - 텍스트 → {{HEADING_N}}, {{TEXT_N}} 슬롯
 * - 이미지 → data-img-slot 교체
 * - 외부 리소스(script, stylesheet) 제거
 *
 * 사용법:
 *   npx tsx scripts/extract-layout-skeleton.ts [referenceUrl]
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

// ── 설정 ─────────────────────────────────────────────────────────────────────

const DEFAULT_URL = "https://www.rest-clinic.com";

const LAYOUT_PROPS = [
  "display",
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "width",
  "height",
  "max-width",
  "min-height",
  "flex-direction",
  "flex-wrap",
  "align-items",
  "justify-content",
  "grid-template-columns",
  "grid-template-rows",
  "gap",
  "padding",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "margin",
  "margin-top",
  "margin-bottom",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-align",
  "border-radius",
  "overflow",
  "z-index",
  "opacity",
  "background-color",
  "color",
  "border",
  "border-bottom",
  "box-shadow",
  "transition",
  "transform",
];

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function extractSkeleton(url: string) {
  console.log(`\n🔍 스켈레톤 추출 시작: ${url}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "ko-KR",
      timezoneId: "Asia/Seoul",
      viewport: { width: 1440, height: 900 },
    });

    const page = await context.newPage();

    // networkidle 시도 → 실패 시 load + 대기 폴백 (reference-cloner.ts 패턴)
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 40000 });
    } catch {
      console.log("  ⚠️  networkidle 실패, load 폴백 시도");
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(3000);
    }

    // 렌더링 완료 대기
    await page.waitForTimeout(2000);

    // 풀 페이지 높이 측정
    const fullHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`  📐 페이지 높이: ${fullHeight}px`);

    // ── 스크린샷 캡처 (비교용) ──────────────────────────────────────────────
    const screenshotPath = path.resolve(__dirname, "skeleton-reference.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  📸 레퍼런스 스크린샷: ${screenshotPath}`);

    // ── 스켈레톤 추출 (page.evaluate 내) ────────────────────────────────────
    const skeleton = await page.evaluate((layoutProps: string[]) => {
      // 기본값 맵 (이 값이면 굳이 인라인할 필요 없음)
      const DEFAULTS: Record<string, Set<string>> = {
        display: new Set(["inline", "block"]),
        position: new Set(["static"]),
        top: new Set(["auto", "0px"]),
        left: new Set(["auto", "0px"]),
        right: new Set(["auto"]),
        bottom: new Set(["auto"]),
        width: new Set(["auto"]),
        height: new Set(["auto"]),
        "max-width": new Set(["none"]),
        "min-height": new Set(["0px", "auto"]),
        "flex-direction": new Set(["row"]),
        "flex-wrap": new Set(["nowrap"]),
        "align-items": new Set(["normal", "stretch"]),
        "justify-content": new Set(["normal", "flex-start"]),
        "grid-template-columns": new Set(["none"]),
        "grid-template-rows": new Set(["none"]),
        gap: new Set(["normal", "0px"]),
        padding: new Set(["0px"]),
        "padding-top": new Set(["0px"]),
        "padding-bottom": new Set(["0px"]),
        "padding-left": new Set(["0px"]),
        "padding-right": new Set(["0px"]),
        margin: new Set(["0px"]),
        "margin-top": new Set(["0px"]),
        "margin-bottom": new Set(["0px"]),
        "font-size": new Set(["16px"]),
        "font-weight": new Set(["400", "normal"]),
        "line-height": new Set(["normal"]),
        "letter-spacing": new Set(["normal", "0px"]),
        "text-align": new Set(["start", "left"]),
        "border-radius": new Set(["0px"]),
        overflow: new Set(["visible"]),
        "z-index": new Set(["auto"]),
        opacity: new Set(["1"]),
        "background-color": new Set([
          "rgba(0, 0, 0, 0)",
          "transparent",
        ]),
        color: new Set([]),
        border: new Set(["0px none rgb(0, 0, 0)", "none"]),
        "border-bottom": new Set(["0px none rgb(0, 0, 0)", "none"]),
        "box-shadow": new Set(["none"]),
        transition: new Set(["none", "all 0s ease 0s"]),
        transform: new Set(["none"]),
      };

      // 1. 모든 요소에 computedStyle 인라인 적용
      const allElements = document.querySelectorAll("*");
      allElements.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        // script, style, meta, link 등은 스킵
        const tag = el.tagName.toLowerCase();
        if (
          ["script", "style", "meta", "link", "head", "title", "base", "noscript"].includes(tag)
        )
          return;

        const computed = window.getComputedStyle(el);
        const styles: string[] = [];

        layoutProps.forEach((prop) => {
          const val = computed.getPropertyValue(prop);
          if (!val) return;
          const defaults = DEFAULTS[prop];
          if (defaults && defaults.has(val)) return;
          styles.push(`${prop}:${val}`);
        });

        if (styles.length) {
          el.style.cssText = styles.join(";");
        }
      });

      // 2. 텍스트 노드 → 슬롯 교체
      let headingCount = 0;
      let paraCount = 0;
      let navCount = 0;
      let btnCount = 0;

      // 네비게이션 메뉴 아이템
      document.querySelectorAll("nav a, nav li, header a").forEach((el) => {
        if (el.children.length === 0 && el.textContent?.trim()) {
          navCount++;
          el.textContent = `{{NAV_${navCount}}}`;
        }
      });

      // 헤딩
      document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
        if (el.textContent?.trim()) {
          headingCount++;
          el.textContent = `{{HEADING_${headingCount}}}`;
        }
      });

      // 버튼/CTA
      document.querySelectorAll("button, a.btn, [class*='btn'], [class*='cta'], [role='button']").forEach((el) => {
        if (el.children.length === 0 && el.textContent?.trim()) {
          // 이미 NAV 슬롯이면 스킵
          if (el.textContent.startsWith("{{NAV_")) return;
          btnCount++;
          el.textContent = `{{CTA_${btnCount}}}`;
        }
      });

      // 일반 텍스트 (p, li, span, a, td, dd, dt, label)
      document
        .querySelectorAll("p, li, span, a, td, dd, dt, label, figcaption, blockquote, address")
        .forEach((el) => {
          if (el.children.length === 0 && el.textContent?.trim()) {
            // 이미 슬롯이면 스킵
            if (el.textContent.startsWith("{{")) return;
            paraCount++;
            el.textContent = `{{TEXT_${paraCount}}}`;
          }
        });

      // 3. 이미지 → data-img-slot
      let imgCount = 0;
      document.querySelectorAll("img").forEach((el) => {
        imgCount++;
        el.removeAttribute("src");
        el.removeAttribute("srcset");
        el.removeAttribute("data-src");
        el.removeAttribute("data-srcset");
        el.removeAttribute("loading");
        el.setAttribute("data-img-slot", `img_${imgCount}`);
        el.setAttribute("alt", `image slot ${imgCount}`);
        // 이미지 크기 유지용 스타일 보존 (width/height가 이미 인라인됨)
      });

      // 4. background-image 제거 → data-bg-slot
      let bgCount = 0;
      document.querySelectorAll("*").forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const bgImg = window.getComputedStyle(el).backgroundImage;
        if (bgImg && bgImg !== "none") {
          bgCount++;
          el.setAttribute("data-bg-slot", `bg_${bgCount}`);
          // background-image만 제거, background-color 등은 유지
          el.style.backgroundImage = "none";
        }
      });

      // 5. 외부 리소스 제거
      document.querySelectorAll("script").forEach((el) => el.remove());
      document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());
      document.querySelectorAll('link[rel="preload"]').forEach((el) => el.remove());
      document.querySelectorAll('link[rel="prefetch"]').forEach((el) => el.remove());
      document.querySelectorAll('link[rel="preconnect"]').forEach((el) => el.remove());
      document.querySelectorAll('link[rel="dns-prefetch"]').forEach((el) => el.remove());
      document.querySelectorAll("noscript").forEach((el) => el.remove());
      document.querySelectorAll("iframe").forEach((el) => el.remove());

      // <link rel="icon"> 등은 유지 (파비콘)
      // <style> 인라인 태그는 제거 (computedStyle로 이미 인라인됨)
      document.querySelectorAll("style").forEach((el) => el.remove());

      // 6. 링크 무력화
      document.querySelectorAll("[href]").forEach((el) => {
        const href = el.getAttribute("href") || "";
        if (href.startsWith("tel:") || href.startsWith("mailto:")) return;
        if (href.startsWith("#")) return;
        el.setAttribute("href", "#");
      });

      // 7. 불필요 속성 제거
      document.querySelectorAll("*").forEach((el) => {
        // 클래스 속성 제거 (computedStyle로 이미 인라인됨)
        el.removeAttribute("class");
        // data-* 커스텀 속성 제거 (우리가 설정한 것 제외)
        const attrs = Array.from(el.attributes);
        attrs.forEach((attr) => {
          if (
            attr.name.startsWith("data-") &&
            attr.name !== "data-img-slot" &&
            attr.name !== "data-bg-slot"
          ) {
            el.removeAttribute(attr.name);
          }
        });
        // onclick 등 이벤트 핸들러 제거
        attrs.forEach((attr) => {
          if (attr.name.startsWith("on")) {
            el.removeAttribute(attr.name);
          }
        });
      });

      // 8. 통계 수집
      const stats = {
        headings: headingCount,
        navItems: navCount,
        texts: paraCount,
        buttons: btnCount,
        images: imgCount,
        bgSlots: bgCount,
        totalElements: allElements.length,
      };

      return {
        html: document.documentElement.outerHTML,
        stats,
      };
    }, LAYOUT_PROPS);

    await context.close();
    await browser.close();

    // ── 후처리 ─────────────────────────────────────────────────────────────────
    let finalHtml = skeleton.html;

    // page.evaluate에서 누락된 잔여 script 태그 제거
    finalHtml = finalHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    finalHtml = finalHtml.replace(/<script[^>]*\/>/gi, "");

    // form action 무력화 (외부 URL 제거)
    finalHtml = finalHtml.replace(
      /action=["']https?:\/\/[^"']*["']/gi,
      'action="#"'
    );

    // hidden input에 남은 외부 URL 제거
    finalHtml = finalHtml.replace(
      /value=["']https?:\/\/[^"']*["']/gi,
      'value=""'
    );

    // 나머지 src="http..." 잔여 (이미지 외) 제거
    finalHtml = finalHtml.replace(
      /<[^>]+\ssrc=["']https?:\/\/[^"']*\.(js|css)[^"']*["'][^>]*>/gi,
      ""
    );

    // <head> 끝에 reset + Tailwind CDN 추가
    finalHtml = finalHtml.replace(
      "</head>",
      `  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* 스켈레톤 보조 스타일 */
    [data-img-slot] {
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 12px;
      min-height: 100px;
    }
    [data-img-slot]::after {
      content: attr(data-img-slot);
    }
    [data-bg-slot] {
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%) !important;
    }
  </style>
</head>`
    );

    // doctype 보장
    if (!finalHtml.startsWith("<!DOCTYPE") && !finalHtml.startsWith("<!doctype")) {
      finalHtml = "<!DOCTYPE html>\n" + finalHtml;
    }

    // ── 출력 ──────────────────────────────────────────────────────────────────
    const outDir = path.resolve(__dirname);
    const outPath = path.join(outDir, "skeleton-output.html");
    fs.writeFileSync(outPath, finalHtml, "utf-8");

    const fileSizeKB = (finalHtml.length / 1024).toFixed(1);

    // 외부 이미지 URL 잔여 체크
    const externalImgUrls = (
      finalHtml.match(/src=["']https?:\/\/[^"']+/g) || []
    ).filter(
      (u) =>
        !u.includes("cdn.tailwindcss.com") &&
        !u.includes("fonts.googleapis.com")
    );

    console.log("\n═══════════════════════════════════════════════════");
    console.log("  ✅ 스켈레톤 생성 완료");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  📄 출력 파일: ${outPath}`);
    console.log(`  📏 파일 크기: ${fileSizeKB}KB`);
    console.log(`  🏗️  전체 요소: ${skeleton.stats.totalElements}개`);
    console.log("───────────────────────────────────────────────────");
    console.log(`  🔤 헤딩 슬롯: ${skeleton.stats.headings}개`);
    console.log(`  🧭 네비 슬롯: ${skeleton.stats.navItems}개`);
    console.log(`  📝 텍스트 슬롯: ${skeleton.stats.texts}개`);
    console.log(`  🔘 버튼 슬롯: ${skeleton.stats.buttons}개`);
    console.log(`  🖼️  이미지 슬롯: ${skeleton.stats.images}개`);
    console.log(`  🎨 배경 슬롯: ${skeleton.stats.bgSlots}개`);
    console.log("───────────────────────────────────────────────────");
    console.log(
      `  🔗 외부 이미지 URL 잔여: ${externalImgUrls.length}건${
        externalImgUrls.length > 0
          ? `\n     ${externalImgUrls.slice(0, 5).map((u) => u.slice(0, 80)).join("\n     ")}`
          : ""
      }`
    );
    console.log("═══════════════════════════════════════════════════\n");

    if (externalImgUrls.length > 0) {
      console.log("  ⚠️  외부 이미지 URL이 남아있습니다. 수동 확인 필요.");
    }
  } catch (error) {
    await browser.close();
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ 스켈레톤 추출 실패: ${msg}`);
    process.exit(1);
  }
}

// ── 실행 ─────────────────────────────────────────────────────────────────────

const targetUrl = process.argv[2] || DEFAULT_URL;
extractSkeleton(targetUrl).catch((err) => {
  console.error("\n💥 예기치 못한 에러:", err);
  process.exit(1);
});
