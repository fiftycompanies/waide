"use server";

import { createAdminClient } from "@/lib/supabase/service";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ClientPortfolio {
  id: string;
  brand_name: string;
  client_type: string;
  onboarding_status: string | null;
  last_portal_login: string | null;
  created_at: string;
  // subscription
  plan_name: string | null;
  mrr: number;
  subscription_status: string | null;
  expires_at: string | null;
  // analysis
  marketing_score: number | null;
  score_change: number | null;
  prev_score: number | null;
  keyword_top10: number;
  // content
  content_this_month: number;
  // sales
  sales_agent_name: string | null;
  sales_agent_id: string | null;
  // at risk
  at_risk: boolean;
  risk_reasons: string[];
}

export interface ClientPortfolioFilters {
  status?: string;
  salesAgentId?: string;
  sortBy?: "score" | "mrr" | "name" | "expires_at";
  search?: string;
}

export interface ClientPortfolioData {
  clients: ClientPortfolio[];
  counts: {
    all: number;
    active: number;
    onboarding: number;
    atRisk: number;
    churned: number;
  };
}

// ── At Risk ────────────────────────────────────────────────────────────────

function detectAtRisk(client: {
  score_change: number | null;
  last_portal_login: string | null;
  expires_at: string | null;
}): { atRisk: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (client.score_change !== null && client.score_change <= -15) {
    reasons.push(`점수 ${Math.abs(client.score_change)}점 하락`);
  }

  if (client.last_portal_login) {
    const days = Math.floor(
      (Date.now() - new Date(client.last_portal_login).getTime()) / 86400000,
    );
    if (days >= 30) reasons.push(`${days}일 미접속`);
  }

  if (client.expires_at) {
    const days = Math.floor(
      (new Date(client.expires_at).getTime() - Date.now()) / 86400000,
    );
    if (days <= 30 && days > 0) reasons.push(`만료 D-${days}`);
  }

  return { atRisk: reasons.length > 0, reasons };
}

// ── Main ───────────────────────────────────────────────────────────────────

export async function getClientPortfolio(
  filters?: ClientPortfolioFilters,
): Promise<ClientPortfolioData> {
  const db = createAdminClient();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 1. Load clients
  const { data: clients } = await db
    .from("clients")
    .select("id, brand_name:name, client_type, onboarding_status, last_portal_login, assigned_sales_agent_id, created_at")
    .order("created_at", { ascending: false });

  if (!clients || clients.length === 0) {
    return { clients: [], counts: { all: 0, active: 0, onboarding: 0, atRisk: 0, churned: 0 } };
  }

  const clientIds = clients.map((c) => c.id);

  // 2. Subscriptions
  const { data: subs } = await db
    .from("subscriptions")
    .select("client_id, mrr, status, expires_at, products(name)")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  const subMap: Record<string, { plan_name: string | null; mrr: number; status: string; expires_at: string | null }> = {};
  for (const s of subs || []) {
    if (s.client_id && !subMap[s.client_id]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prod = s.products as any;
      subMap[s.client_id] = {
        plan_name: prod?.name ?? null,
        mrr: s.mrr || 0,
        status: s.status,
        expires_at: s.expires_at,
      };
    }
  }

  // 3. Analyses (latest 2 per client for score delta)
  const { data: analyses } = await db
    .from("brand_analyses")
    .select("client_id, marketing_score, keyword_rankings, created_at")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  const scoreMap: Record<string, { score: number | null; prev: number | null; top10: number }> = {};
  for (const a of analyses || []) {
    if (!a.client_id) continue;
    if (!scoreMap[a.client_id]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rankings = (a.keyword_rankings as any[]) || [];
      const top10 = rankings.filter((r) => r.rank && r.rank <= 10).length;
      scoreMap[a.client_id] = { score: a.marketing_score, prev: null, top10 };
    } else if (scoreMap[a.client_id].prev === null) {
      scoreMap[a.client_id].prev = a.marketing_score;
    }
  }

  // 4. Content this month count per client
  const { data: contentCounts } = await db
    .from("contents")
    .select("client_id")
    .in("client_id", clientIds)
    .eq("publish_status", "published")
    .gte("created_at", thisMonthStart);

  const contentMap: Record<string, number> = {};
  for (const c of contentCounts || []) {
    if (c.client_id) contentMap[c.client_id] = (contentMap[c.client_id] || 0) + 1;
  }

  // 5. Sales agents
  const { data: salesAgents } = await db.from("sales_agents").select("id, name");
  const agentMap: Record<string, string> = {};
  for (const sa of salesAgents || []) agentMap[sa.id] = sa.name;

  // 6. Build portfolio
  let portfolio: ClientPortfolio[] = clients.map((c) => {
    const sub = subMap[c.id];
    const sc = scoreMap[c.id];
    const scoreChange = sc?.score != null && sc.prev != null ? sc.score - sc.prev : null;

    const { atRisk, reasons } = detectAtRisk({
      score_change: scoreChange,
      last_portal_login: c.last_portal_login,
      expires_at: sub?.expires_at ?? null,
    });

    return {
      id: c.id,
      brand_name: c.brand_name || "알 수 없음",
      client_type: c.client_type,
      onboarding_status: c.onboarding_status,
      last_portal_login: c.last_portal_login,
      created_at: c.created_at,
      plan_name: sub?.plan_name ?? null,
      mrr: sub?.mrr ?? 0,
      subscription_status: sub?.status ?? null,
      expires_at: sub?.expires_at ?? null,
      marketing_score: sc?.score ?? null,
      score_change: scoreChange,
      prev_score: sc?.prev ?? null,
      keyword_top10: sc?.top10 ?? 0,
      content_this_month: contentMap[c.id] || 0,
      sales_agent_name: c.assigned_sales_agent_id ? agentMap[c.assigned_sales_agent_id] ?? null : null,
      sales_agent_id: c.assigned_sales_agent_id,
      at_risk: atRisk,
      risk_reasons: reasons,
    };
  });

  // Counts
  const counts = {
    all: portfolio.length,
    active: portfolio.filter((c) => c.subscription_status === "active" && !c.at_risk).length,
    onboarding: portfolio.filter((c) => c.onboarding_status && c.onboarding_status !== "completed").length,
    atRisk: portfolio.filter((c) => c.at_risk).length,
    churned: portfolio.filter((c) => c.subscription_status === "cancelled").length,
  };

  // Filters
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    portfolio = portfolio.filter((c) => c.brand_name.toLowerCase().includes(q));
  }
  if (filters?.salesAgentId) {
    portfolio = portfolio.filter((c) => c.sales_agent_id === filters.salesAgentId);
  }
  if (filters?.status) {
    switch (filters.status) {
      case "active":
        portfolio = portfolio.filter((c) => c.subscription_status === "active" && !c.at_risk);
        break;
      case "onboarding":
        portfolio = portfolio.filter((c) => c.onboarding_status && c.onboarding_status !== "completed");
        break;
      case "atRisk":
        portfolio = portfolio.filter((c) => c.at_risk);
        break;
      case "churned":
        portfolio = portfolio.filter((c) => c.subscription_status === "cancelled");
        break;
    }
  }

  // Sort
  switch (filters?.sortBy) {
    case "score":
      portfolio.sort((a, b) => (b.marketing_score ?? 0) - (a.marketing_score ?? 0));
      break;
    case "mrr":
      portfolio.sort((a, b) => b.mrr - a.mrr);
      break;
    case "name":
      portfolio.sort((a, b) => a.brand_name.localeCompare(b.brand_name));
      break;
    case "expires_at":
      portfolio.sort((a, b) => {
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      });
      break;
    default:
      // default: at-risk first, then by score
      portfolio.sort((a, b) => {
        if (a.at_risk && !b.at_risk) return -1;
        if (!a.at_risk && b.at_risk) return 1;
        return (b.marketing_score ?? 0) - (a.marketing_score ?? 0);
      });
  }

  return { clients: portfolio, counts };
}

// ── Client Detail ──────────────────────────────────────────────────────────

export interface ClientDetail {
  // basic
  id: string;
  brand_name: string;
  client_type: string;
  onboarding_status: string | null;
  onboarding_checklist: { key: string; label: string; done: boolean; done_at?: string }[];
  last_portal_login: string | null;
  website_url: string | null;
  created_at: string;
  // subscription
  subscription: {
    id: string;
    plan_name: string | null;
    mrr: number;
    status: string;
    started_at: string;
    expires_at: string | null;
    payment_method: string | null;
    notes: unknown;
  } | null;
  // analysis
  marketing_score: number | null;
  score_breakdown: Record<string, { score: number; max: number }>;
  top_keywords: { keyword: string; rank: number | null; change: number | null }[];
  // content summary
  content_published: number;
  content_draft: number;
  content_scheduled: number;
  // sales agent
  sales_agent_name: string | null;
  sales_agent_phone: string | null;
  // contact
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  // at risk
  at_risk: boolean;
  risk_reasons: string[];
  // recent activity
  recent_activities: { date: string; description: string; type: string }[];
  // brand persona
  brand_persona: Record<string, unknown> | null;
  persona_updated_at: string | null;
}

export async function getClientDetail(clientId: string): Promise<ClientDetail | null> {
  const db = createAdminClient();

  // Client
  const { data: client } = await db
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) return null;

  // Subscription
  const { data: sub } = await db
    .from("subscriptions")
    .select("*, products(name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Latest analysis
  const { data: analyses } = await db
    .from("brand_analyses")
    .select("marketing_score, score_breakdown, keyword_rankings, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(2);

  const latestAnalysis = analyses?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const breakdown = (latestAnalysis?.score_breakdown as Record<string, any>) || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rankings = (latestAnalysis?.keyword_rankings as any[]) || [];
  const topKeywords = rankings
    .filter((r) => r.rank != null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
    .map((r) => ({
      keyword: r.keyword || "",
      rank: r.rank,
      change: r.change ?? null,
    }));

  // Content counts
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count: published } = await db
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("publish_status", "published")
    .gte("created_at", thisMonthStart);

  const { count: draft } = await db
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .in("publish_status", ["draft", "review"]);

  const { count: scheduled } = await db
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("publish_status", "approved");

  // Sales agent
  let salesAgentName: string | null = null;
  let salesAgentPhone: string | null = null;
  if (client.assigned_sales_agent_id) {
    const { data: sa } = await db
      .from("sales_agents")
      .select("name, phone")
      .eq("id", client.assigned_sales_agent_id)
      .single();
    salesAgentName = sa?.name ?? null;
    salesAgentPhone = sa?.phone ?? null;
  }

  // Recent activities (contents + analyses)
  const recentActivities: { date: string; description: string; type: string }[] = [];

  const { data: recentContents } = await db
    .from("contents")
    .select("title, created_at, publish_status")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(5);

  for (const c of recentContents || []) {
    recentActivities.push({
      date: c.created_at,
      description: `${c.publish_status === "published" ? "블로그 발행" : "콘텐츠 작성"} "${c.title}"`,
      type: "content",
    });
  }

  const { data: recentAnalyses } = await db
    .from("brand_analyses")
    .select("marketing_score, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(3);

  for (const a of recentAnalyses || []) {
    recentActivities.push({
      date: a.created_at,
      description: `마케팅 분석 완료 (${a.marketing_score ?? "?"}점)`,
      type: "analysis",
    });
  }

  recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // At risk
  const scoreChange = analyses && analyses.length >= 2
    ? (analyses[0].marketing_score ?? 0) - (analyses[1].marketing_score ?? 0)
    : null;

  const { atRisk, reasons } = detectAtRisk({
    score_change: scoreChange,
    last_portal_login: client.last_portal_login,
    expires_at: sub?.expires_at ?? null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prod = sub?.products as any;

  return {
    id: client.id,
    brand_name: client.name || "알 수 없음",
    client_type: client.client_type,
    onboarding_status: client.onboarding_status ?? null,
    onboarding_checklist: (client.onboarding_checklist as ClientDetail["onboarding_checklist"]) || [],
    last_portal_login: client.last_portal_login,
    website_url: client.website_url ?? null,
    created_at: client.created_at,
    subscription: sub
      ? {
          id: sub.id,
          plan_name: prod?.name ?? null,
          mrr: sub.mrr || 0,
          status: sub.status,
          started_at: sub.started_at ?? sub.created_at,
          expires_at: sub.expires_at,
          payment_method: sub.payment_method ?? null,
          notes: sub.notes,
        }
      : null,
    marketing_score: latestAnalysis?.marketing_score ?? null,
    score_breakdown: breakdown,
    top_keywords: topKeywords,
    content_published: published || 0,
    content_draft: draft || 0,
    content_scheduled: scheduled || 0,
    sales_agent_name: salesAgentName,
    sales_agent_phone: salesAgentPhone,
    contact_name: client.contact_name ?? null,
    contact_email: client.contact_email ?? null,
    contact_phone: client.contact_phone ?? null,
    at_risk: atRisk,
    risk_reasons: reasons,
    recent_activities: recentActivities.slice(0, 10),
    brand_persona: (client.brand_persona as Record<string, unknown>) || null,
    persona_updated_at: client.persona_updated_at ?? null,
  };
}

// ── Onboarding checklist update ────────────────────────────────────────────

export async function updateOnboardingChecklist(
  clientId: string,
  checklist: { key: string; label: string; done: boolean; done_at?: string }[],
) {
  const db = createAdminClient();

  const allDone = checklist.every((c) => c.done);

  const { error } = await db
    .from("clients")
    .update({
      onboarding_checklist: checklist,
      onboarding_status: allDone ? "completed" : "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}
