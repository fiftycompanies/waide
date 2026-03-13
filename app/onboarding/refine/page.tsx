import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/service";
import { OnboardingRefineClient } from "@/components/onboarding/onboarding-refine-client";

interface PageProps {
  searchParams: Promise<{ analysis_id?: string }>;
}

export default async function OnboardingRefinePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // 이미 client_id가 있으면 대시보드로
  if (user.client_id) redirect("/dashboard");

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

  return (
    <OnboardingRefineClient
      analysisId={analysisId}
      userId={user.id}
      summary={summaryData}
      prefill={prefillData}
    />
  );
}
