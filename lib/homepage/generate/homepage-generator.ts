import type { SupabaseClient } from "@supabase/supabase-js";
import { scrapeWebsite, type ScrapedContent } from "@/lib/services/scraper";
import { getBrandAnalysis, type BrandAnalysisRow } from "@/lib/actions/analysis-brand-actions";
import { injectBlogMenu } from "./blog-injector";
import { DeployManager, VercelClient } from "@/lib/homepage/deploy";
import { HomepagePublisher } from "@/lib/homepage/publishing";
import { crawlMultipleHomepages } from "./homepage-crawler";
import type { CrawlResult } from "./homepage-crawl-types";
import { getPersonaForPipeline } from "@/lib/utils/persona-compat";

// ── Types ───────────────────────────────────────────────────────────────────

export interface GenerateInput {
  clientId: string;
  referenceUrls: string[];
  /** @deprecated referenceUrls 사용 권장 */
  referenceUrl?: string;
  brandHomepageUrl?: string;
}

export type GenerateStep =
  | "reference_crawl"
  | "brand_data_load"
  | "brand_homepage_crawl"
  | "content_generate"
  | "blog_inject"
  | "deploy"
  | "db_save"
  | "done";

export interface GenerateProgress {
  step: GenerateStep;
  message: string;
  percent: number;
}

export interface GenerateResult {
  projectId: string;
  deploymentUrl: string;
  subdomain: string;
  blogEnabled: boolean;
}

// ── Generator ───────────────────────────────────────────────────────────────

export class HomepageGenerator {
  private anthropicApiKey: string;

  constructor(
    private supabase: SupabaseClient,
    private onProgress?: (progress: GenerateProgress) => void
  ) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
    }
    // Vercel 환경변수 끝의 개행문자 제거
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY.trim();
  }

  private emit(step: GenerateStep, message: string, percent: number) {
    this.onProgress?.({ step, message, percent });
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    // referenceUrls 정규화 (하위 호환)
    const referenceUrls = input.referenceUrls?.length
      ? input.referenceUrls
      : input.referenceUrl
        ? [input.referenceUrl]
        : [];

    if (referenceUrls.length === 0) {
      throw new Error("레퍼런스 URL이 최소 1개 필요합니다.");
    }

    // Step 1: 레퍼런스 디자인 크롤링
    this.emit("reference_crawl", `레퍼런스 홈페이지를 크롤링하고 있습니다... (${referenceUrls.length}개)`, 10);
    let crawlResult: CrawlResult;
    try {
      crawlResult = await crawlMultipleHomepages(referenceUrls);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      throw new Error(`레퍼런스 홈페이지 크롤링 실패 — ${msg}`);
    }

    if (crawlResult.errors.length > 0) {
      console.warn(
        `[HomepageGenerator] 일부 레퍼런스 크롤링 실패:`,
        crawlResult.errors
      );
    }

    // Step 2: 브랜드 데이터 로딩
    this.emit("brand_data_load", "브랜드 분석 자료를 불러오고 있습니다...", 25);
    const brandAnalysis = await getBrandAnalysis(input.clientId);
    const brandInfo = await this.loadBrandInfo(input.clientId);

    // Step 3: 브랜드 홈페이지 크롤링 (선택)
    let brandHomepageContent: ScrapedContent | null = null;
    if (input.brandHomepageUrl) {
      this.emit("brand_homepage_crawl", "브랜드 기존 홈페이지를 크롤링하고 있습니다...", 35);
      try {
        brandHomepageContent = await scrapeWebsite(input.brandHomepageUrl);
      } catch {
        // 브랜드 홈페이지 크롤링 실패는 스킵
        console.warn("[HomepageGenerator] 브랜드 홈페이지 크롤링 실패, 스킵합니다.");
      }
    }

    // Step 4: 콘텐츠 생성 (OpenAI)
    this.emit("content_generate", "AI가 홈페이지 콘텐츠를 생성하고 있습니다...", 45);
    const generatedContent = await this.generateContentWithDesign(
      crawlResult,
      brandAnalysis,
      brandInfo,
      brandHomepageContent
    );

    // Step 5: 프로젝트 생성 + DB 저장
    this.emit("db_save", "프로젝트를 생성하고 있습니다...", 60);
    const projectId = await this.saveProject(input, generatedContent, crawlResult, referenceUrls, brandInfo);

    // Step 6: 블로그 메뉴 강제 삽입
    this.emit("blog_inject", "블로그 메뉴를 설정하고 있습니다...", 70);
    await injectBlogMenu(this.supabase, projectId);

    // Step 7: Vercel 배포
    this.emit("deploy", "홈페이지를 배포하고 있습니다...", 80);
    const deployResult = await this.deployProject(projectId);

    // Step 8: 홈페이지 블로그 플랫폼 등록
    this.emit("db_save", "블로그 플랫폼을 등록하고 있습니다...", 90);
    const publisher = new HomepagePublisher(this.supabase);
    await publisher.registerHomepagePlatform(
      input.clientId,
      projectId,
      deployResult.subdomain
    );

    this.emit("done", "홈페이지 생성이 완료되었습니다!", 100);

    return {
      projectId,
      deploymentUrl: deployResult.deploymentUrl,
      subdomain: deployResult.subdomain,
      blogEnabled: true,
    };
  }

  private async loadBrandInfo(clientId: string): Promise<Record<string, unknown>> {
    const { data: client } = await this.supabase
      .from("clients")
      .select("name, company_name, website_url, industry, phone, address, brand_persona")
      .eq("id", clientId)
      .single();

    if (!client) return {};

    // getPersonaForPipeline()으로 flat 변환 (v1/v2 호환 — 프로젝트 정책 준수)
    const persona = client.brand_persona
      ? getPersonaForPipeline(client.brand_persona as Record<string, unknown>)
      : null;

    return {
      ...client,
      persona,
    };
  }

  private async generateContentWithDesign(
    crawlResult: CrawlResult,
    brandAnalysis: BrandAnalysisRow | null,
    brandInfo: Record<string, unknown>,
    brandHomepageContent: ScrapedContent | null
  ): Promise<GeneratedHomepageContent> {
    const brandName = (brandInfo.name as string) || (brandInfo.company_name as string) || "업체";
    const industry = (brandInfo.industry as string) || "인테리어";
    const merged = crawlResult.merged;

    // 브랜드 분석 데이터 요약
    const analysisContext = brandAnalysis
      ? this.summarizeBrandAnalysis(brandAnalysis)
      : "브랜드 분석 자료 없음";

    // 브랜드 기존 홈페이지 컨텍스트
    const brandHomepageContext = brandHomepageContent
      ? `\n\n[브랜드 기존 홈페이지 정보]\n${brandHomepageContent.fullText}`
      : "";

    // 레퍼런스 텍스트 콘텐츠
    const referenceTextsBlock = merged.referenceTexts
      .map((t, i) => `--- 레퍼런스 ${i + 1} ---\n${t}`)
      .join("\n\n");

    const prompt = `당신은 인테리어 업체 전문 홈페이지를 만드는 웹 디자이너입니다.

아래 레퍼런스 홈페이지의 구조와 디자인 패턴을 참고하여, "${brandName}" 업체의 홈페이지 콘텐츠를 생성해주세요.

[레퍼런스 홈페이지 디자인 분석 (${crawlResult.analyses.length}개 사이트)]
- 색상 팔레트: 주색 ${merged.primaryColor}, 보조색 ${merged.secondaryColor}, 강조 ${merged.accentColor || "없음"}
- 배경색: ${merged.backgroundColor}, 텍스트색: ${merged.textColor}
- 폰트: 제목=${merged.headingFont || "기본"}, 본문=${merged.bodyFont || "기본"}
- 디자인 스타일: ${merged.designStyle}
- 레이아웃 구조: ${merged.sectionOrder.join(" → ")}
- 네비게이션: ${merged.suggestedNavigation.map((n) => n.label).join(", ") || "없음"}

[레퍼런스 텍스트 콘텐츠]
${referenceTextsBlock}

[브랜드 정보]
- 업체명: ${brandName}
- 업종: ${industry}
- 웹사이트: ${(brandInfo.website_url as string) || "없음"}
- 연락처: ${(brandInfo.phone as string) || "없음"}
- 주소: ${(brandInfo.address as string) || "없음"}

[브랜드 분석 자료]
${analysisContext}
${brandHomepageContext}

다음 JSON 형식으로 "${brandName}" 업체의 홈페이지 콘텐츠를 생성해주세요:
{
  "heroTitle": "메인 히어로 타이틀 (업체명 ${brandName} 포함)",
  "heroSubtitle": "메인 히어로 서브타이틀",
  "aboutTitle": "회사 소개 타이틀",
  "aboutDescription": "회사 소개 내용 (3-4문장)",
  "services": [
    { "title": "서비스명", "description": "설명" }
  ],
  "whyChooseUs": [
    { "title": "강점", "description": "설명" }
  ],
  "ctaText": "CTA 문구",
  "seoTitle": "SEO 타이틀 (60자 이내, ${brandName} 포함)",
  "seoDescription": "SEO 디스크립션 (160자 이내)",
  "primaryColor": "#HEX코드 (레퍼런스 색상 참고, 브랜드에 어울리게 조정)",
  "secondaryColor": "#HEX코드"${this.buildExtraFieldsPrompt(merged.sectionOrder)}
}

중요:
- 반드시 유효한 JSON만 출력하세요. 다른 텍스트는 포함하지 마세요.
- 업체명은 반드시 "${brandName}"을 사용하세요. 레퍼런스에 나오는 다른 업체명을 사용하지 마세요.
- 색상은 레퍼런스 디자인 분석의 색상 팔레트를 참고하되, 브랜드 특성에 맞게 조정하세요.
- 레이아웃 구조는 레퍼런스의 섹션 구성을 참고하세요.`;

    let responseText: string;
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
      }

      const data = await resp.json();
      responseText = data.content?.[0]?.text || "";
    } catch (apiError) {
      const msg = apiError instanceof Error ? apiError.message : String(apiError);
      throw new Error(`Claude API 호출 실패: ${msg}`);
    }

    if (!responseText) throw new Error("AI 콘텐츠 생성 실패: 응답 없음");

    // JSON 블록 추출 (```json ... ``` 감싸기 대응)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI 콘텐츠 파싱 실패: JSON을 찾을 수 없음");

    try {
      return JSON.parse(jsonMatch[0]) as GeneratedHomepageContent;
    } catch {
      throw new Error("AI 콘텐츠 파싱 실패: 유효하지 않은 JSON");
    }
  }

  private buildExtraFieldsPrompt(sectionOrder: string[]): string {
    const requestedSections = sectionOrder || [];
    let extra = "";
    if (requestedSections.includes("testimonials")) {
      extra += `,\n  "testimonials": [{"text": "고객 후기 내용", "author": "고객명"}]  // 3개 생성`;
    }
    if (requestedSections.includes("faq")) {
      extra += `,\n  "faqItems": [{"question": "자주 묻는 질문", "answer": "답변"}]  // 3-5개 생성`;
    }
    if (requestedSections.includes("stats")) {
      extra += `,\n  "stats": [{"number": "숫자+", "label": "라벨"}]  // 3-4개 생성`;
    }
    return extra;
  }

  private summarizeBrandAnalysis(analysis: BrandAnalysisRow): string {
    const parts: string[] = [];

    if (analysis.basic_info) {
      const bi = analysis.basic_info as Record<string, unknown>;
      parts.push(`업체: ${bi.name || "알 수 없음"}, 카테고리: ${bi.category || "알 수 없음"}`);
      if (bi.homepage_url) parts.push(`홈페이지: ${bi.homepage_url}`);
    }

    if (analysis.content_strategy) {
      const cs = analysis.content_strategy as Record<string, unknown>;
      const ba = (cs.brand_analysis ?? {}) as Record<string, unknown>;
      const usp = ba.usp as string[];
      if (usp?.length) parts.push(`USP: ${usp.join(", ")}`);
      const tone = ba.tone as Record<string, unknown>;
      if (tone?.style) parts.push(`톤: ${tone.style}`);
    }

    if (analysis.marketing_score) {
      parts.push(`마케팅 점수: ${analysis.marketing_score}점`);
    }

    return parts.join("\n") || "분석 데이터 없음";
  }

  private async saveProject(
    input: GenerateInput,
    content: GeneratedHomepageContent,
    crawlResult: CrawlResult,
    referenceUrls: string[],
    brandInfo: Record<string, unknown>
  ): Promise<string> {
    const merged = crawlResult.merged;

    // 색상: AI 출력 우선 → 크롤링 결과 폴백
    const primaryColor = content.primaryColor || merged.primaryColor || "#2563eb";
    const secondaryColor = content.secondaryColor || merged.secondaryColor || "#64748b";

    // 크롤러 섹션 + 최소 필수 섹션 보장 (크롤러가 hero+contact만 감지해도 about/services/cta 자동 추가)
    const sectionOrder = ensureMinimumSections(merged.sectionOrder || []);

    // 브랜드명 기반 프로젝트명 — AI가 레퍼런스 텍스트에서 임의 회사명을 가져오는 버그 방지
    const clientName = (brandInfo.name as string) || (brandInfo.company_name as string) || "업체";
    const projectName = `${clientName} 홈페이지`;

    const { data, error } = await this.supabase
      .from("homepage_projects")
      .insert({
        client_id: input.clientId,
        project_name: projectName,
        template_id: "modern-minimal",
        status: "building",
        theme_config: {
          primaryColor,
          secondaryColor,
          accentColor: merged.accentColor || null,
          backgroundColor: merged.backgroundColor || "#ffffff",
          textColor: merged.textColor || "#111827",
          headingFont: merged.headingFont || null,
          bodyFont: merged.bodyFont || null,
          designStyle: merged.designStyle || "modern",
          navigation: buildNavigationFromSections(sectionOrder),
          hero: {
            title: content.heroTitle,
            subtitle: content.heroSubtitle,
          },
          about: {
            title: content.aboutTitle,
            description: content.aboutDescription,
          },
          services: content.services,
          whyChooseUs: content.whyChooseUs,
          ctaText: content.ctaText,
          testimonials: content.testimonials || [],
          faqItems: content.faqItems || [],
          stats: content.stats || [],
          referenceUrls,
          sectionOrder,
          heroImageCandidates: merged.heroImageCandidates.slice(0, 5),
          portfolioImages: crawlResult.analyses
            .flatMap((a) => a.images.sectionImages)
            .slice(0, 6),
        },
        seo_config: {
          title: content.seoTitle,
          description: content.seoDescription,
        },
        blog_config: {
          blog_enabled: false, // blog_injector에서 true로 변경
          posts_per_month: 8,
          info_review_ratio: "5:3",
        },
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`프로젝트 저장 실패: ${error?.message || "unknown"}`);
    }

    return data.id;
  }

  private async deployProject(projectId: string): Promise<{
    deploymentUrl: string;
    subdomain: string;
  }> {
    const vercel = new VercelClient({
      token: process.env.VERCEL_TOKEN!,
      teamId: process.env.VERCEL_TEAM_ID!,
    });
    const manager = new DeployManager(vercel, this.supabase);
    const result = await manager.deployProject(projectId);

    // status를 live로 업데이트
    await this.supabase
      .from("homepage_projects")
      .update({ status: "live" })
      .eq("id", projectId);

    return {
      deploymentUrl: result.deploymentUrl,
      subdomain: result.subdomain,
    };
  }
}

// ── Section Order Helper ─────────────────────────────────────────────────────

/** 크롤러가 감지한 섹션이 부족해도 최소 필수 섹션은 항상 포함 */
const MINIMUM_SECTIONS = ["hero", "about", "services", "cta", "contact"];

function ensureMinimumSections(crawled: string[]): string[] {
  const result = [...crawled];
  for (const section of MINIMUM_SECTIONS) {
    if (!result.includes(section)) {
      // 최소 섹션 배열 기준으로 적절한 위치에 삽입
      const minIdx = MINIMUM_SECTIONS.indexOf(section);
      let insertAt = result.length;
      for (let i = minIdx - 1; i >= 0; i--) {
        const prevIdx = result.indexOf(MINIMUM_SECTIONS[i]);
        if (prevIdx !== -1) {
          insertAt = prevIdx + 1;
          break;
        }
      }
      result.splice(insertAt, 0, section);
    }
  }
  return result;
}

// ── Navigation Helper ────────────────────────────────────────────────────────

function buildNavigationFromSections(sectionOrder: string[]): Array<{ label: string; path: string }> {
  const NAV_MAP: Record<string, { label: string; path: string }> = {
    hero: { label: "홈", path: "/" },
    about: { label: "소개", path: "#about" },
    services: { label: "서비스", path: "#services" },
    portfolio: { label: "포트폴리오", path: "#portfolio" },
    testimonials: { label: "고객후기", path: "#testimonials" },
    faq: { label: "FAQ", path: "#faq" },
    contact: { label: "문의", path: "#contact" },
  };

  const nav = (sectionOrder || [])
    .filter((s) => NAV_MAP[s])
    .map((s) => NAV_MAP[s]);

  return nav.length > 0
    ? nav
    : [
        { label: "홈", path: "/" },
        { label: "소개", path: "#about" },
        { label: "서비스", path: "#services" },
        { label: "문의", path: "#contact" },
      ];
}

// ── Generated Content Type ──────────────────────────────────────────────────

interface GeneratedHomepageContent {
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutDescription: string;
  services: Array<{ title: string; description: string }>;
  whyChooseUs: Array<{ title: string; description: string }>;
  ctaText: string;
  seoTitle: string;
  seoDescription: string;
  primaryColor: string;
  secondaryColor: string;
  testimonials?: Array<{ text: string; author: string }>;
  faqItems?: Array<{ question: string; answer: string }>;
  stats?: Array<{ number: string; label: string }>;
  portfolioTitle?: string;
}
