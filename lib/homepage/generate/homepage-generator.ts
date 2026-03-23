/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
/**
 * homepage-generator.ts
 * 홈페이지 생성 오케스트레이터
 *
 * 패러다임: "생성 금지, 복제 후 교체만"
 * 1. cloneReference()   → 레퍼런스 HTML 완전 복제
 * 2. buildReplacementMap() → AI가 텍스트 교체 맵 생성
 * 3. replaceImages()    → 이미지를 Unsplash로 교체
 * 4. applyPatches()     → 텍스트·이미지·메타 일괄 교체
 * 5. Vercel 배포        → 기존 파이프라인 그대로 사용
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrandAnalysis, type BrandAnalysisRow } from "@/lib/actions/analysis-brand-actions";
import { injectBlogMenu } from "./blog-injector";
import { DeployManager, VercelClient } from "@/lib/homepage/deploy";
import { HomepagePublisher } from "@/lib/homepage/publishing";
import { getPersonaForPipeline } from "@/lib/utils/persona-compat";

// 신규 파이프라인 모듈
import { cloneReference } from "./reference-cloner";
import { buildReplacementMap, type BrandInfo, type PersonaInfo } from "./content-mapper";
import { replaceImages } from "./image-replacer";
import { applyPatches } from "./html-patcher";

// 템플릿 기반 파이프라인 모듈
import { generateBrandContent } from "./brand-content-generator";
import type { TemplateName } from "./template-types";
import { injectToTemplate } from "./brand-injector";
import * as fs from "fs";
import * as path from "path";

// ── Types ───────────────────────────────────────────────────────────────────

export interface GenerateInput {
  clientId: string;
  referenceUrls: string[];
  /** @deprecated referenceUrls 사용 권장 */
  referenceUrl?: string;
  brandHomepageUrl?: string;
  /** 템플릿 기반 생성 시 사용 (dark-luxury, warm-natural, light-clean) */
  templateName?: TemplateName;
  /** 생성 방식 선택: template(기본) | screenshot-to-code | dom-clone */
  generationMethod?: "template" | "screenshot-to-code" | "dom-clone";
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

    // ── Step 1: 레퍼런스 사이트 DOM 완전 복제 ─────────────────────────────────
    this.emit("reference_crawl", `레퍼런스 사이트를 복제하고 있습니다...`, 10);
    let clonedHtml: string;
    let baseUrl: string;

    try {
      const cloneResult = await cloneReference(referenceUrls[0]);
      clonedHtml = cloneResult.html;
      baseUrl = cloneResult.baseUrl;
      console.log(`[HomepageGenerator] DOM 복제 완료: ${Math.round(clonedHtml.length / 1024)}KB`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "알 수 없는 오류";
      console.error(`[HomepageGenerator] 레퍼런스 복제 실패: ${msg}`);

      // 크롤링 실패 시 프로젝트에 실패 상태 저장 (품질 보장 불가 → 폴백 금지)
      try {
        await this.supabase
          .from("homepage_projects")
          .insert({
            client_id: input.clientId,
            project_name: "복제 실패",
            template_id: "clone",
            status: "build_failed",
            theme_config: {
              error: `레퍼런스 사이트 크롤링 실패: ${msg}`,
              referenceUrls,
            },
            seo_config: {},
          });
      } catch {
        // 저장 실패 무시
      }

      throw new Error(
        `레퍼런스 사이트 크롤링 실패. URL을 확인하거나 다른 레퍼런스를 시도하세요. (${msg})`
      );
    }

    // ── Step 2: 브랜드 데이터 로딩 ────────────────────────────────────────────
    this.emit("brand_data_load", "브랜드 분석 자료를 불러오고 있습니다...", 25);
    const brandAnalysis = await getBrandAnalysis(input.clientId);
    const brandInfo = await this.loadBrandInfo(input.clientId);

    const clientName = (brandInfo.name as string) || (brandInfo.company_name as string) || "업체";
    const industry = this.resolveIndustry(brandInfo, brandAnalysis);
    const persona = brandInfo.persona as Record<string, unknown> | null;

    // BrandInfo 구성
    const mappedBrandInfo: BrandInfo = {
      name: clientName,
      industry,
      phone: (brandInfo.contact_phone as string) || (brandInfo.phone as string) || null,
      address: (brandInfo.address as string) || null,
      services: this.extractServices(persona, brandAnalysis),
      keywords: this.extractKeywords(persona, brandAnalysis),
      tone: (persona?.tone as string) || null,
    };

    // PersonaInfo 구성
    const mappedPersona: PersonaInfo = {
      usp: (persona?.usp as string) || null,
      target_customer: (persona?.target_customer as string) || null,
      tagline: (persona?.one_liner as string) || null,
      one_liner: (persona?.one_liner as string) || null,
    };

    // ── Step 3: AI 콘텐츠 교체 맵 생성 ──────────────────────────────────────
    this.emit("content_generate", "AI가 콘텐츠 교체를 분석하고 있습니다...", 40);
    const textReplacements = await buildReplacementMap(
      clonedHtml,
      mappedBrandInfo,
      mappedPersona,
      this.anthropicApiKey
    );

    // ── Step 4: 이미지 교체 맵 생성 ─────────────────────────────────────────
    this.emit("content_generate", "이미지를 교체하고 있습니다...", 50);
    const imageMap = replaceImages(clonedHtml, clientName, industry);

    // ── Step 5: 패치 적용 (텍스트 + 이미지 + 메타) ─────────────────────────
    this.emit("content_generate", "HTML을 최종 조합하고 있습니다...", 55);
    const seoTitle = `${clientName} | ${mappedPersona.tagline || industry + " 전문"}`;
    const seoDescription = mappedPersona.usp || `${clientName} - ${industry} 전문 서비스`;

    const patchResult = applyPatches(
      clonedHtml,
      textReplacements,
      imageMap,
      clientName,
      seoTitle,
      seoDescription
    );

    const generatedHtml = patchResult.html;
    console.log(
      `[HomepageGenerator] 패치 완료: 텍스트 ${patchResult.textReplacements}, 이미지 ${patchResult.imageReplacements}, 메타 ${patchResult.metaReplacements}`
    );

    // ── Step 6: 프로젝트 생성 + DB 저장 ────────────────────────────────────
    this.emit("db_save", "프로젝트를 생성하고 있습니다...", 60);
    const projectId = await this.saveProject(
      input,
      referenceUrls,
      brandInfo,
      generatedHtml,
      baseUrl,
      patchResult,
      seoTitle,
      seoDescription
    );

    // ── Step 7: 블로그 메뉴 삽입 ──────────────────────────────────────────
    this.emit("blog_inject", "블로그 메뉴를 설정하고 있습니다...", 70);
    await injectBlogMenu(this.supabase, projectId);

    // ── Step 8: Vercel 배포 ───────────────────────────────────────────────
    this.emit("deploy", "홈페이지를 배포하고 있습니다...", 80);
    const deployResult = await this.deployProject(projectId);

    // ── Step 9: 홈페이지 블로그 플랫폼 등록 ───────────────────────────────
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
    // persona에서 서비스 추출
    if (persona?.services) {
      if (Array.isArray(persona.services)) return persona.services as string[];
      if (typeof persona.services === "string") return [persona.services];
    }

    // analysis에서 서비스 추출
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

  // ── 업종 결정 ─────────────────────────────────────────────────────────────

  private resolveIndustry(brandInfo: Record<string, unknown>, analysis: BrandAnalysisRow | null): string {
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

  // ── 프로젝트 저장 ─────────────────────────────────────────────────────────

  private async saveProject(
    input: GenerateInput,
    referenceUrls: string[],
    brandInfo: Record<string, unknown>,
    generatedHtml: string,
    baseUrl: string,
    patchResult: { textReplacements: number; imageReplacements: number; metaReplacements: number },
    seoTitle: string,
    seoDescription: string
  ): Promise<string> {
    const clientName = (brandInfo.name as string) || (brandInfo.company_name as string) || "업체";
    const projectName = `${clientName} 홈페이지`;

    const { data, error } = await this.supabase
      .from("homepage_projects")
      .insert({
        client_id: input.clientId,
        project_name: projectName,
        template_id: "clone",
        status: "building",
        theme_config: {
          pipeline: "dom-clone",
          referenceUrls,
          referenceBaseUrl: baseUrl,
          patchStats: patchResult,
          generated_html: generatedHtml,
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

    return data.id;
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

  // ── 템플릿 기반 홈페이지 생성 ─────────────────────────────────────────────

  /**
   * 사전 제작 HTML 템플릿에 브랜드 데이터를 주입하여 홈페이지를 생성한다.
   * 기존 DOM 복제 방식(generate)과 독립적으로 동작.
   *
   * 파이프라인:
   * 1. 브랜드 데이터 로드
   * 2. 템플릿 HTML 파일 읽기
   * 3. Claude API → 슬롯 콘텐츠 생성
   * 4. 슬롯 주입
   * 5. DB 저장 + 블로그 메뉴 + 배포
   */
  async generateFromTemplate(input: GenerateInput): Promise<GenerateResult> {
    const templateName = input.templateName;
    if (!templateName) {
      throw new Error("templateName이 필요합니다.");
    }

    // ── Step 1: 템플릿 HTML 로드 ──────────────────────────────────────────
    this.emit("reference_crawl", `${templateName} 템플릿을 로드하고 있습니다...`, 10);

    const templatePath = path.join(
      process.cwd(),
      "lib",
      "homepage",
      "templates",
      `${templateName}.html`
    );

    let templateHtml: string;
    try {
      templateHtml = fs.readFileSync(templatePath, "utf-8");
      console.log(`[HomepageGenerator] 템플릿 로드 완료: ${templateName} (${Math.round(templateHtml.length / 1024)}KB)`);
    } catch {
      throw new Error(`템플릿 파일을 찾을 수 없습니다: ${templateName}.html`);
    }

    // ── Step 2: 브랜드 데이터 로딩 ────────────────────────────────────────
    this.emit("brand_data_load", "브랜드 분석 자료를 불러오고 있습니다...", 25);
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

    // ── Step 3: 슬롯 콘텐츠 생성 (Claude API) ────────────────────────────
    this.emit("content_generate", "AI가 홈페이지 콘텐츠를 생성하고 있습니다...", 40);
    const slotContent = await generateBrandContent(
      mappedBrandInfo,
      mappedPersona,
      templateName,
      industry,
      this.anthropicApiKey,
    );

    console.log(`[HomepageGenerator] 슬롯 콘텐츠 생성 완료: ${Object.keys(slotContent).length}개 슬롯`);

    // ── Step 4: 템플릿에 슬롯 주입 ───────────────────────────────────────
    this.emit("content_generate", "템플릿에 콘텐츠를 주입하고 있습니다...", 55);
    const generatedHtml = injectToTemplate(
      templateHtml,
      slotContent,
      mappedBrandInfo,
      mappedPersona,
    );

    console.log(`[HomepageGenerator] 템플릿 주입 완료: ${Math.round(generatedHtml.length / 1024)}KB`);

    // ── Step 5: 프로젝트 생성 + DB 저장 ──────────────────────────────────
    this.emit("db_save", "프로젝트를 생성하고 있습니다...", 60);
    const projectName = `${clientName} 홈페이지`;
    const seoTitle = `${clientName} | ${mappedPersona.tagline || industry + " 전문"}`;
    const seoDescription = mappedPersona.usp || `${clientName} - ${industry} 전문 서비스`;

    const { data, error } = await this.supabase
      .from("homepage_projects")
      .insert({
        client_id: input.clientId,
        project_name: projectName,
        template_id: templateName,
        status: "building",
        theme_config: {
          pipeline: "template-injection",
          templateName,
          slotCount: Object.keys(slotContent).length,
          generated_html: generatedHtml,
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

    // ── Step 6: 블로그 메뉴 삽입 ────────────────────────────────────────
    this.emit("blog_inject", "블로그 메뉴를 설정하고 있습니다...", 70);
    await injectBlogMenu(this.supabase, projectId);

    // ── Step 7: Vercel 배포 ─────────────────────────────────────────────
    this.emit("deploy", "홈페이지를 배포하고 있습니다...", 80);
    const deployResult = await this.deployProject(projectId);

    // ── Step 8: 홈페이지 블로그 플랫폼 등록 ─────────────────────────────
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
}
