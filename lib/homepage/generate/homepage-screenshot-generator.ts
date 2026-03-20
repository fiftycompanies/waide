/**
 * homepage-screenshot-generator.ts
 * Screenshot-to-Code 방식 홈페이지 생성 오케스트레이터
 *
 * 패러다임: "레퍼런스 URL의 HTML에는 절대 접근하지 않는다.
 *           스크린샷만 인풋. 코드는 Vision AI가 100% 새로 생성."
 *
 * 파이프라인:
 * 1. captureScreenshots()         → 스크린샷만 캡처 (HTML 파싱 없음)
 * 2. extractDesignTokensFromScreenshot() → 디자인 토큰 추출 (색상/폰트)
 * 3. generateHtmlFromScreenshots() → Vision AI가 새 HTML 100% 생성
 * 4. injectBrandInfo()            → 플레이스홀더 → 브랜드 실제 정보
 * 5. Vercel 배포                  → 기존 파이프라인 재사용
 *
 * ⚠️ 기존 코드 무변경: 이 파일은 신규 파일.
 * 기존 HomepageGenerator, HomepageComponentGenerator는 그대로 유지.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrandAnalysis, type BrandAnalysisRow } from "@/lib/actions/analysis-brand-actions";
import { injectBlogMenu } from "./blog-injector";
import { DeployManager, VercelClient } from "@/lib/homepage/deploy";
import { HomepagePublisher } from "@/lib/homepage/publishing";
import { getPersonaForPipeline } from "@/lib/utils/persona-compat";

// 새 파이프라인 모듈
import { captureScreenshots } from "./screenshot-crawler";
import {
  generateHtmlFromScreenshots,
  extractDesignTokensFromScreenshot,
} from "./vision-to-html";
import { injectBrandInfo } from "./brand-injector";

// 타입 재사용
import type { BrandInfo, PersonaInfo } from "./content-mapper";
import type {
  GenerateInput,
  GenerateStep,
  GenerateProgress,
  GenerateResult,
} from "./homepage-generator";

// ── Generator ───────────────────────────────────────────────────────────────

export class HomepageScreenshotGenerator {
  private anthropicApiKey: string;

  constructor(
    private supabase: SupabaseClient,
    private onProgress?: (progress: GenerateProgress) => void
  ) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
    }
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

    // ── Step 1: 스크린샷 캡처 (HTML 파싱 없음) ────────────────────────────────
    this.emit("reference_crawl", "레퍼런스 사이트 스크린샷을 캡처하고 있습니다...", 10);

    let screenshotSet;
    try {
      screenshotSet = await captureScreenshots(referenceUrls[0]);
      console.log(`[ScreenshotGenerator] 스크린샷 캡처 완료: ${screenshotSet.url}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "알 수 없는 오류";
      console.error(`[ScreenshotGenerator] 스크린샷 캡처 실패: ${msg}`);

      try {
        await this.supabase.from("homepage_projects").insert({
          client_id: input.clientId,
          project_name: "스크린샷 캡처 실패",
          template_id: "screenshot-to-code",
          status: "build_failed",
          theme_config: {
            error: `스크린샷 캡처 실패: ${msg}`,
            referenceUrls,
          },
          seo_config: {},
        });
      } catch {
        // 저장 실패 무시
      }

      throw new Error(
        `스크린샷 캡처 실패. URL을 확인하거나 다른 레퍼런스를 시도하세요. (${msg})`
      );
    }

    // ── Step 2: 디자인 토큰 추출 ────────────────────────────────────────────
    this.emit("reference_crawl", "디자인 토큰을 분석하고 있습니다...", 20);

    const tokens = await extractDesignTokensFromScreenshot(
      screenshotSet.top,
      this.anthropicApiKey
    );
    console.log(`[ScreenshotGenerator] 디자인 토큰 추출: primary=${tokens.primaryColor}, accent=${tokens.accentColor}`);

    // ── Step 3: 브랜드 데이터 로딩 ──────────────────────────────────────────
    this.emit("brand_data_load", "브랜드 분석 자료를 불러오고 있습니다...", 30);
    const brandAnalysis = await getBrandAnalysis(input.clientId);
    const brandInfo = await this.loadBrandInfo(input.clientId);

    const clientName = (brandInfo.name as string) || (brandInfo.company_name as string) || "업체";
    const industry = this.resolveIndustry(brandInfo, brandAnalysis);
    const persona = brandInfo.persona as Record<string, unknown> | null;

    const mappedBrandInfo: BrandInfo = {
      name: clientName,
      industry,
      phone: (brandInfo.contact_phone as string) || (brandInfo.phone as string) || null,
      address: (brandInfo.address as string) || null,
      services: this.extractServices(persona, brandAnalysis),
      keywords: this.extractKeywords(persona, brandAnalysis),
      tone: (persona?.tone as string) || null,
    };

    const mappedPersona: PersonaInfo = {
      usp: (persona?.usp as string) || null,
      target_customer: (persona?.target_customer as string) || null,
      tagline: (persona?.one_liner as string) || null,
      one_liner: (persona?.one_liner as string) || null,
    };

    // ── Step 4: Vision AI가 새 HTML 생성 ─────────────────────────────────────
    this.emit("content_generate", "AI가 레퍼런스 디자인을 재현하고 있습니다...", 40);

    const rawHtml = await generateHtmlFromScreenshots({
      screenshots: screenshotSet,
      tokens,
      apiKey: this.anthropicApiKey,
    });

    console.log(`[ScreenshotGenerator] Vision HTML 생성 완료: ${Math.round(rawHtml.length / 1024)}KB`);

    // ── Step 5: 브랜드 정보 주입 ──────────────────────────────────────────────
    this.emit("content_generate", "브랜드 정보와 이미지를 적용하고 있습니다...", 55);

    const finalHtml = injectBrandInfo(rawHtml, mappedBrandInfo, mappedPersona, industry);

    const seoTitle = mappedPersona.tagline
      ? `${clientName} | ${mappedPersona.tagline}`
      : `${clientName} | ${industry} 전문`;
    const seoDescription = mappedPersona.usp || `${clientName} - ${industry} 전문 서비스`;

    console.log(`[ScreenshotGenerator] 브랜드 주입 완료: ${Math.round(finalHtml.length / 1024)}KB`);

    // ── Step 6: 프로젝트 생성 + DB 저장 ──────────────────────────────────────
    this.emit("db_save", "프로젝트를 생성하고 있습니다...", 60);

    const projectName = `${clientName} 홈페이지`;

    const { data, error } = await this.supabase
      .from("homepage_projects")
      .insert({
        client_id: input.clientId,
        project_name: projectName,
        template_id: "screenshot-to-code",
        status: "building",
        theme_config: {
          pipeline: "screenshot-to-code",
          referenceUrls,
          designTokens: tokens,
          generated_html: finalHtml,
        },
        seo_config: {
          title: seoTitle,
          description: seoDescription,
        },
        blog_config: {
          blog_enabled: false,
          posts_per_month: 8,
          info_review_ratio: "5:3",
        },
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`프로젝트 저장 실패: ${error?.message || "unknown"}`);
    }

    const projectId = data.id;

    // ── Step 7: 블로그 메뉴 삽입 ──────────────────────────────────────────────
    this.emit("blog_inject", "블로그 메뉴를 설정하고 있습니다...", 70);
    await injectBlogMenu(this.supabase, projectId);

    // ── Step 8: Vercel 배포 ───────────────────────────────────────────────────
    this.emit("deploy", "홈페이지를 배포하고 있습니다...", 80);
    const deployResult = await this.deployProject(projectId);

    // ── Step 9: 홈페이지 블로그 플랫폼 등록 ────────────────────────────────────
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

  // ── 브랜드 데이터 로드 ──────────────────────────────────────────────────────

  private async loadBrandInfo(clientId: string): Promise<Record<string, unknown>> {
    const { data: client } = await this.supabase
      .from("clients")
      .select("name, company_name, website_url, industry, contact_phone, contact_email, brand_persona, address")
      .eq("id", clientId)
      .single();

    if (!client) return {};

    const persona = client.brand_persona
      ? getPersonaForPipeline(client.brand_persona as Record<string, unknown>)
      : null;

    return { ...client, persona };
  }

  // ── 서비스 목록 추출 ───────────────────────────────────────────────────────

  private extractServices(
    persona: Record<string, unknown> | null,
    analysis: BrandAnalysisRow | null
  ): string[] {
    if (persona?.services) {
      if (Array.isArray(persona.services)) return persona.services as string[];
      if (typeof persona.services === "string") return [persona.services];
    }

    if (analysis?.content_strategy) {
      const cs = analysis.content_strategy as Record<string, unknown>;
      const ba = (cs.brand_analysis ?? {}) as Record<string, unknown>;
      const services = ba.services as string[] | undefined;
      if (services?.length) return services;
    }

    return [];
  }

  // ── 키워드 목록 추출 ───────────────────────────────────────────────────────

  private extractKeywords(
    persona: Record<string, unknown> | null,
    analysis: BrandAnalysisRow | null
  ): string[] {
    if (persona?.keywords) {
      if (Array.isArray(persona.keywords)) return persona.keywords as string[];
      if (typeof persona.keywords === "string") return [persona.keywords];
    }

    if (analysis?.keyword_analysis) {
      const ka = analysis.keyword_analysis as Record<string, unknown>;
      const keywords = ka.keywords as Array<{ keyword: string }> | undefined;
      if (keywords?.length) return keywords.map((k) => k.keyword);
    }

    return [];
  }

  // ── 업종 결정 ──────────────────────────────────────────────────────────────

  private resolveIndustry(
    brandInfo: Record<string, unknown>,
    analysis: BrandAnalysisRow | null
  ): string {
    if (brandInfo.industry && typeof brandInfo.industry === "string") {
      return brandInfo.industry;
    }
    if (analysis?.basic_info) {
      const bi = analysis.basic_info as Record<string, unknown>;
      if (bi.category && typeof bi.category === "string") return bi.category;
    }
    const name = (brandInfo.name as string) || (brandInfo.company_name as string) || "";
    const hints: Record<string, string> = {
      "의원": "의원", "클리닉": "클리닉", "치과": "치과", "피부과": "피부과",
      "병원": "병원", "카페": "카페", "음식점": "음식점", "호텔": "호텔",
      "펜션": "펜션", "헤어": "헤어", "미용": "미용", "인테리어": "인테리어", "도배": "도배",
    };
    for (const [key, ind] of Object.entries(hints)) {
      if (name.includes(key)) return ind;
    }
    return "서비스";
  }

  // ── 배포 ──────────────────────────────────────────────────────────────────

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
