"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// ── 키워드 매트릭스 (인라인 — 핵심 키워드만 포함) ─────────────────────────

const CORE_KEYWORDS = [
  "인테리어",
  "인테리어 업체",
  "인테리어 비용",
  "인테리어 견적",
  "인테리어 추천",
];

const BUILDING_TYPE_KEYWORDS = [
  "아파트 인테리어",
  "빌라 인테리어",
  "오피스텔 인테리어",
  "리모델링",
  "올수리",
];

const INFO_BLOG_KEYWORDS = [
  { suffix: "인테리어 비용", type: "정보성", format: "비용 분석표" },
  { suffix: "인테리어 트렌드", type: "정보성", format: "트렌드 리포트" },
  { suffix: "인테리어 순서", type: "정보성", format: "단계별 가이드" },
  { suffix: "인테리어 업체 고르는 방법", type: "정보성", format: "체크리스트" },
  { suffix: "인테리어 견적 비교", type: "정보성", format: "비교표" },
  { suffix: "평수별 인테리어 비용", type: "정보성", format: "비용 분석표" },
  { suffix: "인테리어 주의사항", type: "정보성", format: "리스트" },
  { suffix: "인테리어 자재 추천", type: "정보성", format: "추천 리스트" },
];

const REVIEW_BLOG_KEYWORDS = [
  { suffix: "인테리어 후기", type: "후기성", format: "시공 후기" },
  { suffix: "아파트 인테리어 후기", type: "후기성", format: "Before/After" },
  { suffix: "인테리어 견적 후기", type: "후기성", format: "견적 공개" },
  { suffix: "인테리어 시공 사례", type: "후기성", format: "시공 사례" },
  { suffix: "리모델링 후기", type: "후기성", format: "리모델링 사례" },
  { suffix: "인테리어 업체 후기", type: "후기성", format: "업체 리뷰" },
];

const AEO_KEYWORDS = [
  { suffix: "인테리어 비용 얼마", type: "AEO", format: "Q&A" },
  { suffix: "인테리어 업체 어떻게 고르나요", type: "AEO", format: "체크리스트" },
  { suffix: "인테리어 기간 얼마나 걸리나요", type: "AEO", format: "Q&A" },
  { suffix: "인테리어 견적 받는 방법", type: "AEO", format: "단계별 가이드" },
];

// ── 키워드 생성 함수 ────────────────────────────────────────────────────────

interface GeneratedKeyword {
  keyword: string;
  source: "homepage_seo" | "blog_target";
  priority: "critical" | "high" | "medium" | "low";
  is_primary: boolean;
  metadata: {
    blog_type?: string;
    content_format?: string;
    region?: string;
    auto_generated: boolean;
  };
}

function buildKeywords(regions: string[], serviceTypes: string[]): GeneratedKeyword[] {
  const keywords: GeneratedKeyword[] = [];
  let isFirstPrimary = true;

  for (const region of regions) {
    // 1. 홈페이지 SEO 키워드 (메타태그, JSON-LD용)
    for (const core of CORE_KEYWORDS) {
      const kw = `${region} ${core}`;
      keywords.push({
        keyword: kw,
        source: "homepage_seo",
        priority: core === "인테리어" ? "critical" : "high",
        is_primary: isFirstPrimary && core === "인테리어",
        metadata: { region, auto_generated: true },
      });
      if (isFirstPrimary && core === "인테리어") isFirstPrimary = false;
    }

    // 건물유형 키워드
    for (const bt of BUILDING_TYPE_KEYWORDS) {
      // 서비스 타입과 매치되는 것만
      const matchesService = serviceTypes.some((st) =>
        bt.includes(st.replace(" 인테리어", "")) || st.includes(bt.replace(" 인테리어", "")),
      );
      if (matchesService || serviceTypes.length === 0) {
        keywords.push({
          keyword: `${region} ${bt}`,
          source: "homepage_seo",
          priority: "high",
          is_primary: false,
          metadata: { region, auto_generated: true },
        });
      }
    }

    // 2. 정보성 블로그 키워드
    for (const info of INFO_BLOG_KEYWORDS) {
      keywords.push({
        keyword: `${region} ${info.suffix}`,
        source: "blog_target",
        priority: "high",
        is_primary: false,
        metadata: {
          blog_type: info.type,
          content_format: info.format,
          region,
          auto_generated: true,
        },
      });
    }

    // 3. 후기성 블로그 키워드
    for (const review of REVIEW_BLOG_KEYWORDS) {
      keywords.push({
        keyword: `${region} ${review.suffix}`,
        source: "blog_target",
        priority: "high",
        is_primary: false,
        metadata: {
          blog_type: review.type,
          content_format: review.format,
          region,
          auto_generated: true,
        },
      });
    }
  }

  // 4. AEO 키워드 (지역 무관, 대표 지역만)
  if (regions.length > 0) {
    for (const aeo of AEO_KEYWORDS) {
      keywords.push({
        keyword: `${regions[0]} ${aeo.suffix}`,
        source: "blog_target",
        priority: "medium",
        is_primary: false,
        metadata: {
          blog_type: aeo.type,
          content_format: aeo.format,
          region: regions[0],
          auto_generated: true,
        },
      });
    }

    // 지역 무관 AEO 키워드
    keywords.push({
      keyword: "인테리어 업체 어떻게 고르나요",
      source: "blog_target",
      priority: "medium",
      is_primary: false,
      metadata: { blog_type: "AEO", content_format: "체크리스트", auto_generated: true },
    });
    keywords.push({
      keyword: "인테리어 셀프 vs 업체 비교",
      source: "blog_target",
      priority: "medium",
      is_primary: false,
      metadata: { blog_type: "AEO", content_format: "비교표", auto_generated: true },
    });
  }

  return keywords;
}

// ── 서버 액션: 홈페이지 키워드 자동 생성 ────────────────────────────────────

export async function generateHomepageKeywords(
  projectId: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
  const db = createAdminClient();

  // 1. 프로젝트 → 클라이언트 정보 가져오기
  const { data: project } = await db
    .from("homepage_projects")
    .select("client_id")
    .eq("id", projectId)
    .single();

  if (!project) return { success: false, error: "프로젝트를 찾을 수 없습니다" };

  // 2. 자료에서 서비스 지역/유형 가져오기
  const { data: material } = await db
    .from("homepage_materials")
    .select("service_regions, service_types")
    .eq("project_id", projectId)
    .maybeSingle();

  // brand_persona에서도 가져오기 (fallback)
  const { data: client } = await db
    .from("clients")
    .select("brand_persona")
    .eq("id", project.client_id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persona = (client?.brand_persona as any) || {};
  const interiorProfile = persona.interior_profile || {};

  const regions: string[] =
    material?.service_regions?.length > 0
      ? material.service_regions
      : interiorProfile.service_regions || [];

  const serviceTypes: string[] =
    material?.service_types?.length > 0
      ? material.service_types
      : interiorProfile.service_types || [];

  if (regions.length === 0) {
    return { success: false, error: "서비스 지역이 설정되지 않았습니다. 자료 수집에서 지역을 입력해주세요." };
  }

  // 3. 기존 키워드 중 auto_generated 삭제 (재생성 시 중복 방지)
  await db
    .from("keywords")
    .delete()
    .eq("client_id", project.client_id)
    .or("source.eq.homepage_seo,source.eq.blog_target")
    .filter("metadata->>auto_generated", "eq", "true");

  // 4. 키워드 매트릭스 기반 생성
  const generatedKeywords = buildKeywords(regions, serviceTypes);

  // 5. 중복 제거
  const uniqueMap = new Map<string, GeneratedKeyword>();
  for (const kw of generatedKeywords) {
    if (!uniqueMap.has(kw.keyword)) {
      uniqueMap.set(kw.keyword, kw);
    }
  }
  const uniqueKeywords = Array.from(uniqueMap.values());

  // 6. DB INSERT (배치)
  const batchSize = 50;
  let insertCount = 0;

  for (let i = 0; i < uniqueKeywords.length; i += batchSize) {
    const batch = uniqueKeywords.slice(i, i + batchSize).map((kw) => ({
      client_id: project.client_id,
      keyword: kw.keyword,
      source: kw.source,
      priority: kw.priority,
      status: "active",
      is_primary: kw.is_primary,
      metadata: kw.metadata,
    }));

    const { error } = await db.from("keywords").insert(batch);
    if (error) {
      console.error("[homepage-keyword-actions] batch insert error:", error);
    } else {
      insertCount += batch.length;
    }
  }

  // 7. brand_persona에 interior_profile 업데이트
  if (material && client) {
    const updatedPersona = {
      ...persona,
      interior_profile: {
        ...interiorProfile,
        service_regions: regions,
        service_types: serviceTypes,
      },
    };

    await db
      .from("clients")
      .update({ brand_persona: updatedPersona })
      .eq("id", project.client_id);
  }

  revalidatePath(`/homepage/${projectId}`);
  revalidatePath("/keywords");

  return { success: true, count: insertCount };
}

// ── 키워드 통계 조회 ────────────────────────────────────────────────────────

export interface HomepageKeywordStats {
  total: number;
  seo_count: number;
  blog_target_count: number;
  info_count: number;
  review_count: number;
  aeo_count: number;
  regions: string[];
}

export async function getHomepageKeywordStats(
  clientId: string,
): Promise<HomepageKeywordStats> {
  const db = createAdminClient();

  const { data: keywords } = await db
    .from("keywords")
    .select("source, metadata")
    .eq("client_id", clientId)
    .in("source", ["homepage_seo", "blog_target"]);

  if (!keywords || keywords.length === 0) {
    return { total: 0, seo_count: 0, blog_target_count: 0, info_count: 0, review_count: 0, aeo_count: 0, regions: [] };
  }

  const regionSet = new Set<string>();

  let seo = 0, blog = 0, info = 0, review = 0, aeo = 0;

  for (const kw of keywords) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (kw.metadata as any) || {};

    if (kw.source === "homepage_seo") seo++;
    if (kw.source === "blog_target") blog++;
    if (meta.blog_type === "정보성") info++;
    if (meta.blog_type === "후기성") review++;
    if (meta.blog_type === "AEO") aeo++;
    if (meta.region) regionSet.add(meta.region);
  }

  return {
    total: keywords.length,
    seo_count: seo,
    blog_target_count: blog,
    info_count: info,
    review_count: review,
    aeo_count: aeo,
    regions: Array.from(regionSet),
  };
}
