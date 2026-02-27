"use server";

import { createAdminClient } from "@/lib/supabase/service";

// ── 포털 대시보드 데이터 ──────────────────────────────────────────────────

export async function getPortalDashboard(clientId: string) {
  const db = createAdminClient();

  // 최신 분석 결과
  const { data: latestAnalysis } = await db
    .from("brand_analyses")
    .select("id, marketing_score, basic_info, keyword_rankings, content_strategy, analyzed_at, seo_audit")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 발행 콘텐츠 수
  const { count: contentCount } = await db
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("publish_status", "published");

  // 이번 달 발행 수
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { count: monthlyContentCount } = await db
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .gte("published_at", monthStart.toISOString());

  // 구독 정보
  const { data: subscription } = await db
    .from("subscriptions")
    .select("*, products(name, slug, features)")
    .eq("client_id", clientId)
    .in("status", ["active", "trial"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 담당 영업사원
  const { data: client } = await db
    .from("clients")
    .select("brand_name:name, assigned_sales_agent_id")
    .eq("id", clientId)
    .single();

  let salesAgent = null;
  if (client?.assigned_sales_agent_id) {
    const { data: agent } = await db
      .from("sales_agents")
      .select("name, phone, email")
      .eq("id", client.assigned_sales_agent_id)
      .single();
    salesAgent = agent;
  }

  return {
    latestAnalysis,
    contentCount: contentCount || 0,
    monthlyContentCount: monthlyContentCount || 0,
    subscription,
    salesAgent,
    brandName: client?.brand_name || "",
  };
}

// ── 키워드 순위 데이터 ──────────────────────────────────────────────────

export async function getPortalKeywords(clientId: string) {
  const db = createAdminClient();

  // 최신 분석의 keyword_rankings
  const { data: latestAnalysis } = await db
    .from("brand_analyses")
    .select("keyword_rankings, keyword_analysis, analyzed_at")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 키워드 순위 이력 (keyword_visibility)
  const { data: visibilityData } = await db
    .from("keyword_visibility")
    .select("keyword, rank, visibility_score, checked_at")
    .eq("client_id", clientId)
    .order("checked_at", { ascending: false })
    .limit(100);

  return {
    keywordRankings: latestAnalysis?.keyword_rankings || [],
    keywordAnalysis: latestAnalysis?.keyword_analysis || null,
    analyzedAt: latestAnalysis?.analyzed_at || null,
    visibilityHistory: visibilityData || [],
  };
}

// ── 콘텐츠 목록 ──────────────────────────────────────────────────────────

export async function getPortalContents(clientId: string) {
  const db = createAdminClient();

  const { data: contents } = await db
    .from("contents")
    .select("id, title, keyword, publish_status, published_at, platform, qc_score, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50);

  return contents || [];
}

// ── 리포트 데이터 ──────────────────────────────────────────────────────────

export async function getPortalReport(clientId: string) {
  const db = createAdminClient();

  // 최근 3개 분석의 마케팅 점수 (추이)
  const { data: analyses } = await db
    .from("brand_analyses")
    .select("id, marketing_score, analyzed_at, content_strategy")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("analyzed_at", { ascending: false })
    .limit(3);

  // 콘텐츠 발행 이력
  const { data: contents } = await db
    .from("contents")
    .select("id, title, keyword, publish_status, published_at, qc_score")
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .order("published_at", { ascending: false })
    .limit(10);

  return {
    analyses: analyses || [],
    contents: contents || [],
  };
}

// ── 포털 사용자 설정 데이터 ──────────────────────────────────────────────

export async function getPortalSettings(userId: string, clientId: string) {
  const db = createAdminClient();

  const { data: user } = await db
    .from("users")
    .select("id, email, name, phone, role, created_at")
    .eq("id", userId)
    .single();

  const { data: subscription } = await db
    .from("subscriptions")
    .select("*, products(name, features)")
    .eq("client_id", clientId)
    .in("status", ["active", "trial"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: client } = await db
    .from("clients")
    .select("assigned_sales_agent_id")
    .eq("id", clientId)
    .single();

  let salesAgent = null;
  if (client?.assigned_sales_agent_id) {
    const { data: agent } = await db
      .from("sales_agents")
      .select("name, phone, email")
      .eq("id", client.assigned_sales_agent_id)
      .single();
    salesAgent = agent;
  }

  return {
    user,
    subscription,
    salesAgent,
  };
}
