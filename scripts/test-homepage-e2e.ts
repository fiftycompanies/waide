/**
 * E2E 테스트: 에버유 의원 홈페이지 생성 파이프라인
 *
 * 사용법: npx tsx scripts/test-homepage-e2e.ts
 *
 * 1. DB에서 에버유 의원 client 조회
 * 2. 레퍼런스 URL(rest-clinic.com) 크롤링
 * 3. Vision AI 구조 분석
 * 4. AI 콘텐츠 생성
 * 5. Reference Clone HTML 생성
 * 6. 결과를 로컬 파일 + DB에 저장
 * 7. 생성된 HTML과 레퍼런스 사이트를 Vision AI로 비교
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// .env.local 로딩
dotenv.config({ path: path.resolve(__dirname, "../apps/web/.env.local") });

import { createClient } from "@supabase/supabase-js";

const REFERENCE_URL = "https://www.rest-clinic.com/";

// ── Supabase 클라이언트 생성 ──────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE 환경변수 없음");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── 에버유 의원 client 조회 ────────────────────────────────────────────────

async function findEveryuClient(supabase: ReturnType<typeof getSupabase>) {
  // 이름에 '에버유' 포함된 클라이언트 검색
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, company_name, industry, contact_phone, contact_email, website_url, brand_persona")
    .or("name.ilike.%에버유%,company_name.ilike.%에버유%");

  if (error) throw new Error(`클라이언트 조회 실패: ${error.message}`);
  if (!data || data.length === 0) {
    // 에버유가 없으면 모든 클라이언트 목록 출력
    const { data: all } = await supabase
      .from("clients")
      .select("id, name, company_name")
      .limit(20);
    console.log("❌ '에버유' 클라이언트를 찾을 수 없습니다.");
    console.log("📋 현재 등록된 클라이언트 목록:");
    all?.forEach((c) => console.log(`  - ${c.name || c.company_name} (${c.id})`));
    throw new Error("에버유 의원 클라이언트 없음");
  }

  const client = data[0];
  console.log(`✅ 에버유 의원 발견: ${client.name} (${client.id})`);
  console.log(`   업종: ${client.industry}, 전화: ${client.contact_phone}`);
  return client;
}

// ── 기존 homepage_project 확인 ─────────────────────────────────────────────

async function checkExistingProject(
  supabase: ReturnType<typeof getSupabase>,
  clientId: string
) {
  const { data } = await supabase
    .from("homepage_projects")
    .select("id, project_name, status, subdomain, created_at, theme_config")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (data && data.length > 0) {
    console.log(`\n📂 기존 홈페이지 프로젝트 ${data.length}개:`);
    data.forEach((p) => {
      const hasHtml = !!(p.theme_config as Record<string, unknown>)?.generated_html;
      console.log(`  - ${p.project_name} [${p.status}] ${p.subdomain || "미배포"} | HTML: ${hasHtml ? "있음" : "없음"}`);
    });
  }
  return data;
}

// ── 메인 파이프라인 ─────────────────────────────────────────────────────────

async function main() {
  console.log("=" .repeat(70));
  console.log("🏥 에버유 의원 홈페이지 E2E 테스트");
  console.log(`📎 레퍼런스: ${REFERENCE_URL}`);
  console.log("=" .repeat(70));

  // 환경변수 체크
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수 없음");
  console.log("🔑 ANTHROPIC_API_KEY: ...${apiKey.slice(-6)}");

  const supabase = getSupabase();

  // Step 1: 에버유 의원 클라이언트 조회
  console.log("\n── Step 1: 클라이언트 조회 ──");
  const client = await findEveryuClient(supabase);

  // 기존 프로젝트 확인
  await checkExistingProject(supabase, client.id);

  // Step 2: 레퍼런스 크롤링
  console.log("\n── Step 2: 레퍼런스 크롤링 ──");
  const { crawlMultipleHomepages } = await import("../lib/homepage/generate/homepage-crawler");
  const crawlResult = await crawlMultipleHomepages([REFERENCE_URL]);
  console.log(`✅ 크롤링 완료: ${crawlResult.analyses.length}개 사이트`);
  console.log(`   색상: primary=${crawlResult.merged.primaryColor}, secondary=${crawlResult.merged.secondaryColor}`);
  console.log(`   폰트: heading=${crawlResult.merged.headingFont}, body=${crawlResult.merged.bodyFont}`);
  console.log(`   스타일: ${crawlResult.merged.designStyle}`);
  console.log(`   섹션순서: [${crawlResult.merged.sectionOrder?.join(", ")}]`);

  const firstScreenshot = crawlResult.analyses.find((a) => a.screenshotBase64)?.screenshotBase64;
  console.log(`   스크린샷: ${firstScreenshot ? `${Math.round(firstScreenshot.length / 1024)}KB` : "없음"}`);

  // Step 3: Vision 구조 분석
  console.log("\n── Step 3: Vision AI 구조 분석 ──");
  const { analyzeReferenceScreenshot, buildStructureFromCrawlData } = await import(
    "../lib/homepage/generate/vision-analyzer"
  );

  let referenceStructure;
  if (firstScreenshot) {
    try {
      referenceStructure = await analyzeReferenceScreenshot(
        firstScreenshot,
        crawlResult.merged,
        apiKey
      );
      console.log(`✅ Vision 분석 완료: ${referenceStructure.sections.length}개 섹션`);
      referenceStructure.sections.forEach((s: { type: string; layout: string; colorScheme: string }, i: number) => {
        console.log(`   ${i + 1}. ${s.type} [${s.layout}] (${s.colorScheme})`);
      });
      console.log(`   디자인 톤: ${referenceStructure.globalStyle.designTone}`);
      console.log(`   Primary: ${referenceStructure.globalStyle.primaryColor}`);
    } catch (e) {
      console.warn(`⚠️ Vision 분석 실패, 크롤링 데이터로 폴백: ${(e as Error).message}`);
      referenceStructure = buildStructureFromCrawlData(crawlResult.merged);
    }
  } else {
    console.log("⚠️ 스크린샷 없음, 크롤링 데이터로 구조 생성");
    referenceStructure = buildStructureFromCrawlData(crawlResult.merged);
  }

  // Step 4: AI 콘텐츠 생성
  console.log("\n── Step 4: AI 콘텐츠 생성 ──");

  const brandName = client.name || client.company_name || "에버유 의원";
  const industry = client.industry || "의원";
  const merged = crawlResult.merged;

  // persona 데이터
  let personaContext = "";
  if (client.brand_persona) {
    const { getPersonaForPipeline } = await import("../lib/utils/persona-compat");
    const persona = getPersonaForPipeline(client.brand_persona as Record<string, unknown>);
    if (persona) {
      personaContext = `\n\n[브랜드 페르소나]
- 포지셔닝: ${persona.positioning || "없음"}
- 톤: ${persona.tone || "없음"}
- USP: ${persona.usp_details || "없음"}
- 강점: ${(persona.strengths as string[])?.join(", ") || "없음"}`;
    }
  }

  const contentPrompt = `당신은 ${industry} 전문 홈페이지를 만드는 웹 디자이너입니다.

아래 브랜드 정보를 바탕으로 홈페이지 콘텐츠를 JSON 형식으로 생성하세요.

[브랜드 정보]
- 이름: ${brandName}
- 업종: ${industry}
- 전화: ${client.contact_phone || "없음"}
${personaContext}

[레퍼런스 디자인 스타일]
- 디자인 스타일: ${merged.designStyle}
- 메인 색상: ${merged.primaryColor}
- 보조 색상: ${merged.secondaryColor}

아래 JSON 형식으로만 응답하세요:
{
  "heroTitle": "메인 헤드라인 (한국어, 15자 내외)",
  "heroSubtitle": "서브 헤드라인 (30자 내외)",
  "aboutTitle": "소개 섹션 타이틀",
  "aboutDescription": "소개 설명 (3-4문장)",
  "services": [{"title": "서비스명", "description": "설명 1-2문장"}],
  "whyChooseUs": [{"title": "강점", "description": "설명 1-2문장"}],
  "ctaText": "CTA 버튼 텍스트",
  "seoTitle": "SEO 타이틀 (60자 내외)",
  "seoDescription": "메타 설명 (160자 내외)",
  "primaryColor": "${merged.primaryColor || "#2563eb"}",
  "secondaryColor": "${merged.secondaryColor || "#f8fafc"}",
  "testimonials": [{"text": "후기 내용", "author": "고객명"}],
  "faqItems": [{"question": "질문", "answer": "답변"}],
  "stats": [{"number": "숫자+", "label": "라벨"}]
}`;

  // 직접 fetch 사용 (외부 SDK 불필요)
  const contentResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: contentPrompt }],
    }),
  });

  if (!contentResponse.ok) {
    const errorBody = await contentResponse.text();
    throw new Error(`Claude API 실패 (${contentResponse.status}): ${errorBody}`);
  }

  const contentResult = await contentResponse.json() as { content: Array<{ type: string; text?: string }> };
  const contentText = contentResult.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");

  // JSON 추출
  const jsonMatch = contentText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI 콘텐츠 생성 실패: JSON 파싱 불가");
  const generatedContent = JSON.parse(jsonMatch[0]);
  console.log(`✅ 콘텐츠 생성 완료`);
  console.log(`   Hero: "${generatedContent.heroTitle}"`);
  console.log(`   서비스: ${generatedContent.services?.length || 0}개`);
  console.log(`   후기: ${generatedContent.testimonials?.length || 0}개`);
  console.log(`   FAQ: ${generatedContent.faqItems?.length || 0}개`);

  // Step 5: Reference Clone HTML 생성
  console.log("\n── Step 5: HTML 생성 (Reference Clone) ──");
  const { generateReferenceCloneHtml } = await import("../lib/homepage/generate/reference-cloner");

  const brandContent = {
    brandName,
    industry,
    phone: client.contact_phone || null,
    address: null,
    websiteUrl: client.website_url || null,
    heroTitle: generatedContent.heroTitle,
    heroSubtitle: generatedContent.heroSubtitle,
    aboutTitle: generatedContent.aboutTitle,
    aboutDescription: generatedContent.aboutDescription,
    services: generatedContent.services || [],
    whyChooseUs: generatedContent.whyChooseUs || [],
    ctaText: generatedContent.ctaText || "문의하기",
    seoTitle: generatedContent.seoTitle,
    seoDescription: generatedContent.seoDescription,
    testimonials: generatedContent.testimonials,
    faqItems: generatedContent.faqItems,
    stats: generatedContent.stats,
  };

  const generatedHtml = await generateReferenceCloneHtml(
    referenceStructure,
    brandContent,
    apiKey
  );
  console.log(`✅ HTML 생성 완료: ${Math.round(generatedHtml.length / 1024)}KB`);

  // Step 6: 로컬 파일 저장
  const outputDir = path.resolve(__dirname, "../output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const htmlPath = path.join(outputDir, "20260319_everyu_homepage.html");
  fs.writeFileSync(htmlPath, generatedHtml, "utf-8");
  console.log(`📄 HTML 저장: ${htmlPath}`);

  // Step 7: DB에 theme_config.generated_html 저장
  console.log("\n── Step 6: DB 저장 ──");
  const projectName = `${brandName} 홈페이지`;
  const now = new Date().toISOString();

  // 기존 프로젝트가 있으면 업데이트, 없으면 생성
  const { data: existingProjects } = await supabase
    .from("homepage_projects")
    .select("id")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1);

  let projectId: string;
  if (existingProjects && existingProjects.length > 0) {
    projectId = existingProjects[0].id;
    const { error: updateError } = await supabase
      .from("homepage_projects")
      .update({
        theme_config: {
          generated_html: generatedHtml,
          primaryColor: generatedContent.primaryColor,
          secondaryColor: generatedContent.secondaryColor,
          designStyle: merged.designStyle,
          sectionOrder: merged.sectionOrder,
          referenceUrls: [REFERENCE_URL],
        },
        updated_at: now,
      })
      .eq("id", projectId);
    if (updateError) {
      console.error(`⚠️ DB 업데이트 실패: ${updateError.message}`);
    } else {
      console.log(`✅ 기존 프로젝트 업데이트: ${projectId}`);
    }
  } else {
    const { data: newProject, error: insertError } = await supabase
      .from("homepage_projects")
      .insert({
        client_id: client.id,
        project_name: projectName,
        status: "draft",
        theme_config: {
          generated_html: generatedHtml,
          primaryColor: generatedContent.primaryColor,
          secondaryColor: generatedContent.secondaryColor,
          designStyle: merged.designStyle,
          sectionOrder: merged.sectionOrder,
          referenceUrls: [REFERENCE_URL],
        },
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error(`⚠️ DB INSERT 실패: ${insertError.message}`);
      projectId = "local-only";
    } else {
      projectId = newProject!.id;
      console.log(`✅ 새 프로젝트 생성: ${projectId}`);
    }
  }

  // Step 8: Vision AI 비교 검증
  console.log("\n── Step 7: Vision AI 비교 검증 ──");
  console.log("레퍼런스 사이트와 생성된 HTML의 디자인 유사도를 분석합니다...");

  // 레퍼런스 스크린샷 + 생성 HTML 스크린샷을 Vision으로 비교
  const comparisonPrompt = `두 웹사이트 디자인의 유사도를 분석해주세요.

[레퍼런스 사이트 크롤링 분석 결과]
- URL: ${REFERENCE_URL}
- 디자인 스타일: ${merged.designStyle}
- Primary Color: ${merged.primaryColor}
- Secondary Color: ${merged.secondaryColor}
- 폰트: heading=${merged.headingFont}, body=${merged.bodyFont}
- 섹션 순서: [${merged.sectionOrder?.join(", ")}]
- Border Radius: ${(merged as unknown as Record<string, unknown>).borderRadius ?? "unknown"}px

[생성된 HTML 분석]
- 브랜드: ${brandName}
- HTML 크기: ${Math.round(generatedHtml.length / 1024)}KB
- Hero: "${generatedContent.heroTitle}"
- 서비스 수: ${generatedContent.services?.length || 0}
- 후기 수: ${generatedContent.testimonials?.length || 0}
- FAQ 수: ${generatedContent.faqItems?.length || 0}
- 사용된 Primary Color: ${generatedContent.primaryColor}

${firstScreenshot ? "[레퍼런스 스크린샷이 Vision 분석에 사용됨]" : "[스크린샷 없이 크롤링 데이터만 사용]"}

Vision 분석 결과:
- 감지된 섹션: ${referenceStructure.sections.length}개
- 디자인 톤: ${referenceStructure.globalStyle.designTone}
- Primary Color: ${referenceStructure.globalStyle.primaryColor}
- 네비게이션: ${referenceStructure.navStyle?.position || "unknown"}

다음 항목별로 0~100점 점수를 매기고 종합 평가해주세요:
1. 색상 일치도 (레퍼런스 색상 vs 생성 색상)
2. 레이아웃 구조 유사도 (섹션 순서, 배치)
3. 디자인 톤 일치도 (모던/미니멀/럭셔리 등)
4. 콘텐츠 완성도 (서비스/후기/FAQ 등 섹션 충실도)
5. 브랜드 적합성 (업종에 맞는 콘텐츠인지)

JSON 형식으로 응답:
{
  "colorMatch": 0-100,
  "layoutMatch": 0-100,
  "designToneMatch": 0-100,
  "contentCompleteness": 0-100,
  "brandFit": 0-100,
  "overallScore": 0-100,
  "summary": "한줄 요약",
  "improvements": ["개선점 1", "개선점 2"]
}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageContent: any[] = firstScreenshot
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: firstScreenshot,
          },
        },
        { type: "text", text: comparisonPrompt },
      ]
    : [{ type: "text", text: comparisonPrompt }];

  const comparisonResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: messageContent }],
    }),
  });

  if (!comparisonResponse.ok) {
    const errorBody = await comparisonResponse.text();
    console.warn(`⚠️ Vision AI 비교 API 실패 (${comparisonResponse.status}): ${errorBody.slice(0, 200)}`);
  }

  const comparisonResult = comparisonResponse.ok
    ? (await comparisonResponse.json()) as { content: Array<{ type: string; text?: string }> }
    : null;

  const comparisonText = comparisonResult
    ? comparisonResult.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("")
    : "";

  const comparisonJsonMatch = comparisonText.match(/\{[\s\S]*\}/);
  if (comparisonJsonMatch) {
    const comparison = JSON.parse(comparisonJsonMatch[0]);
    console.log("\n📊 Vision AI 비교 결과:");
    console.log(`   색상 일치도:    ${comparison.colorMatch}/100`);
    console.log(`   레이아웃 유사도: ${comparison.layoutMatch}/100`);
    console.log(`   디자인 톤 일치: ${comparison.designToneMatch}/100`);
    console.log(`   콘텐츠 완성도:  ${comparison.contentCompleteness}/100`);
    console.log(`   브랜드 적합성:  ${comparison.brandFit}/100`);
    console.log(`   ─────────────────────────────`);
    console.log(`   📈 종합 점수:   ${comparison.overallScore}/100`);
    console.log(`   📝 요약: ${comparison.summary}`);
    if (comparison.improvements?.length) {
      console.log(`   🔧 개선점:`);
      comparison.improvements.forEach((imp: string) => console.log(`      - ${imp}`));
    }

    // 비교 결과 파일 저장
    const reportPath = path.join(outputDir, "20260319_everyu_qa_report.json");
    fs.writeFileSync(reportPath, JSON.stringify({
      testDate: now,
      referenceUrl: REFERENCE_URL,
      clientId: client.id,
      clientName: brandName,
      projectId,
      htmlSize: generatedHtml.length,
      visionAnalysis: {
        sectionsDetected: referenceStructure.sections.length,
        designTone: referenceStructure.globalStyle.designTone,
        primaryColor: referenceStructure.globalStyle.primaryColor,
      },
      comparison,
      generatedContent: {
        heroTitle: generatedContent.heroTitle,
        servicesCount: generatedContent.services?.length,
        testimonialsCount: generatedContent.testimonials?.length,
        faqCount: generatedContent.faqItems?.length,
      },
    }, null, 2), "utf-8");
    console.log(`\n📋 QA 리포트 저장: ${reportPath}`);
  } else {
    console.log("⚠️ 비교 결과 JSON 파싱 실패");
    console.log(comparisonText);
  }

  // 최종 요약
  console.log("\n" + "=" .repeat(70));
  console.log("🎉 E2E 테스트 완료");
  console.log("=" .repeat(70));
  console.log(`📄 생성된 HTML: ${htmlPath}`);
  console.log(`🔗 프로젝트 ID: ${projectId}`);
  console.log(`📊 레퍼런스 URL: ${REFERENCE_URL}`);
  console.log(`\n⚠️ VERCEL_TOKEN 미설정으로 배포 단계 스킵`);
  console.log(`   프로덕션에서 배포하려면:`);
  console.log(`   1. 어드민 → 홈페이지 관리 → 에버유 의원 선택 → 배포`);
  console.log(`   2. 또는 VERCEL_TOKEN/VERCEL_TEAM_ID 설정 후 재실행`);
}

main().catch((err) => {
  console.error("\n❌ E2E 테스트 실패:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
