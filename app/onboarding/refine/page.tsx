import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/service";
import { OnboardingRefineClient } from "@/components/onboarding/onboarding-refine-client";
import { normalizePersona } from "@/lib/utils/persona-compat";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ analysis_id?: string }>;
}

export default async function OnboardingRefinePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // 이미 client_id가 있으면 역할에 맞는 페이지로
  if (user.client_id) {
    const isAdmin = user.role === "super_admin" || user.role === "admin" || user.role === "sales" || user.role === "viewer";
    redirect(isAdmin ? "/dashboard" : "/portal");
  }

  const params = await searchParams;
  const analysisId = params.analysis_id;

  if (!analysisId) {
    redirect("/");
  }

  // 분석 데이터 조회
  const db = createAdminClient();
  const { data: analysis } = await db
    .from("brand_analyses")
    .select("*")
    .eq("id", analysisId)
    .single();

  if (!analysis || analysis.status !== "completed") {
    redirect("/");
  }

  const bi = (analysis.basic_info ?? {}) as Record<string, unknown>;
  const ka = (analysis.keyword_analysis ?? {}) as Record<string, unknown>;
  const ra = (analysis.review_analysis ?? {}) as Record<string, unknown>;
  const ar = (analysis.analysis_result ?? {}) as Record<string, unknown>;

  // 키워드 프리필
  const refinedKws = (analysis.refined_keywords as string[]) || [];
  const mainKws = [
    ka.main_keyword as string,
    ka.secondary_keyword as string,
    ka.tertiary_keyword as string,
  ].filter(Boolean);
  const prefillKeywords = refinedKws.length > 0 ? refinedKws : mainKws.slice(0, 5);

  const sellingPoints = (ra.selling_points as string[]) || [];

  const summaryData = {
    name: (bi.name as string) || "",
    category: (bi.category as string) || "",
    region: (bi.region as string) || "",
    score: (analysis.marketing_score as number) || 0,
    address: (bi.address as string) || "",
  };

  const prefillData = {
    keywords: prefillKeywords,
    strengths: (analysis.refined_strengths as string) || sellingPoints.join(", "),
    appeal: (analysis.refined_appeal as string) || "",
    target: (analysis.refined_target as string) || "",
  };

  // AI 추론 페르소나 데이터 추출 (analysis_result.brand_persona → normalizePersona)
  const rawPersona = (ar.brand_persona as Record<string, unknown>) || {};
  const enhancedPersona = normalizePersona(rawPersona);

  // ai_inferred 프리필 데이터 구성
  const aiInferredPrefill = {
    target_customer: {
      primary: enhancedPersona.ai_inferred?.target_customer?.primary
        || enhancedPersona.primary_target
        || enhancedPersona.target_customer
        || enhancedPersona.target_audience
        || (analysis.refined_target as string)
        || "",
      secondary: enhancedPersona.ai_inferred?.target_customer?.secondary || "",
      pain_points: enhancedPersona.ai_inferred?.target_customer?.pain_points || [],
      search_intent: enhancedPersona.ai_inferred?.target_customer?.search_intent || "",
    },
    tone: {
      style: enhancedPersona.ai_inferred?.tone?.style || enhancedPersona.tone || "",
      personality: enhancedPersona.ai_inferred?.tone?.personality || "",
      example_phrases: enhancedPersona.ai_inferred?.tone?.example_phrases || [],
    },
    usp: {
      points: enhancedPersona.ai_inferred?.usp?.points
        || (Array.isArray(enhancedPersona.strengths) ? enhancedPersona.strengths : []),
      from_reviews: enhancedPersona.ai_inferred?.usp?.from_reviews
        || sellingPoints,
    },
    content_direction: {
      angles: enhancedPersona.ai_inferred?.content_direction?.angles
        || (Array.isArray(enhancedPersona.content_angles) ? enhancedPersona.content_angles : []),
      types: enhancedPersona.ai_inferred?.content_direction?.types || [],
      frequency: enhancedPersona.ai_inferred?.content_direction?.frequency || "",
    },
    price_position: {
      position: enhancedPersona.ai_inferred?.price_position?.position || "",
      comparison: enhancedPersona.ai_inferred?.price_position?.comparison || "",
    },
  };

  return (
    <OnboardingRefineClient
      analysisId={analysisId}
      userId={user.id}
      summary={summaryData}
      prefill={prefillData}
      aiInferredPrefill={aiInferredPrefill}
    />
  );
}
