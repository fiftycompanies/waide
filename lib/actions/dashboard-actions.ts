"use server";

import { createAdminClient } from "@/lib/supabase/service";

// ── Types ──────────────────────────────────────────────────────────────────

export interface BusinessKpi {
  mrr: number;
  mrrDelta: number; // vs 전월 %
  activeClients: number;
  newClients: number;
  churnRate: number;
  churnRateDelta: number; // vs 전월 %p
  avgScore: number;
  avgScoreDelta: number; // vs 전월 점수 차이
}

export interface ClientStatusDistribution {
  active: number;
  onboarding: number;
  atRisk: number;
  churned: number;
}

export interface MonthlyGoal {
  label: string;
  current: number;
  target: number;
}

export interface AtRiskClient {
  id: string;
  brand_name: string;
  score: number | null;
  prev_score: number | null;
  score_change: number | null;
  last_portal_login: string | null;
  expires_at: string | null;
  days_until_expiry: number | null;
  mrr: number;
  sales_agent_name: string | null;
  reasons: string[];
  severity: "high" | "medium";
}

export interface SalesPerformance {
  id: string;
  name: string;
  total_clients: number;
  active_clients: number;
  new_contracts: number;
  mrr_contribution: number;
  at_risk: number;
}

export interface BusinessDashboardData {
  kpi: BusinessKpi;
  statusDistribution: ClientStatusDistribution;
  goals: MonthlyGoal[];
  atRiskClients: AtRiskClient[];
  salesPerformance: SalesPerformance[];
}

// ── At Risk 판별 ───────────────────────────────────────────────────────────

function computeAtRiskReasons(client: {
  score_change: number | null;
  last_portal_login: string | null;
  expires_at: string | null;
  keyword_decline: boolean;
}): { reasons: string[]; severity: "high" | "medium" } {
  const reasons: string[] = [];

  if (client.score_change !== null && client.score_change <= -15) {
    reasons.push(`마케팅 점수 ${Math.abs(client.score_change)}점 하락`);
  }

  if (client.last_portal_login) {
    const days = Math.floor(
      (Date.now() - new Date(client.last_portal_login).getTime()) / 86400000,
    );
    if (days >= 30) reasons.push(`포털 ${days}일 미접속`);
  }

  if (client.expires_at) {
    const days = Math.floor(
      (new Date(client.expires_at).getTime() - Date.now()) / 86400000,
    );
    if (days <= 30 && days > 0) reasons.push(`계약만료 D-${days}`);
    if (days <= 0) reasons.push("계약 만료됨");
  }

  if (client.keyword_decline) {
    reasons.push("키워드 순위 대폭 하락");
  }

  const severity = reasons.length >= 2 ? "high" : "medium";
  return { reasons, severity };
}

// ── Main Dashboard Data ────────────────────────────────────────────────────

export async function getBusinessDashboardData(): Promise<BusinessDashboardData> {
  const db = createAdminClient();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  // 1. MRR — active subscriptions
  const { data: activeSubs } = await db
    .from("subscriptions")
    .select("mrr, client_id, started_at, cancelled_at, expires_at")
    .eq("status", "active");
  const currentMrr = (activeSubs || []).reduce((s, r) => s + (r.mrr || 0), 0);

  // Last month MRR estimate (subs that were active last month)
  const { data: lastMonthSubs } = await db
    .from("subscriptions")
    .select("mrr")
    .or(`status.eq.active,cancelled_at.gte.${thisMonthStart}`)
    .lte("started_at", lastMonthEnd);
  const lastMrr = (lastMonthSubs || []).reduce((s, r) => s + (r.mrr || 0), 0);
  const mrrDelta = lastMrr > 0 ? ((currentMrr - lastMrr) / lastMrr) * 100 : 0;

  // 2. Active clients
  const activeClientIds = new Set((activeSubs || []).map((s) => s.client_id));
  const activeClients = activeClientIds.size;

  // New clients this month
  const newClients = (activeSubs || []).filter(
    (s) => s.started_at && s.started_at >= thisMonthStart,
  ).length;

  // 3. Churn rate
  const { count: cancelledThisMonth } = await db
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "cancelled")
    .gte("cancelled_at", thisMonthStart);

  const { count: cancelledLastMonth } = await db
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "cancelled")
    .gte("cancelled_at", lastMonthStart)
    .lt("cancelled_at", thisMonthStart);

  const lastMonthActive = (lastMonthSubs || []).length || 1;
  const churnRate = lastMonthActive > 0 ? ((cancelledThisMonth || 0) / lastMonthActive) * 100 : 0;
  const prevChurnRate = lastMonthActive > 0 ? ((cancelledLastMonth || 0) / lastMonthActive) * 100 : 0;

  // 4. Avg marketing score
  const { data: clients } = await db
    .from("clients")
    .select("id, brand_name:name, last_portal_login, assigned_sales_agent_id, onboarding_status");

  const clientIds = (clients || []).map((c) => c.id);

  // latest analysis per client
  let avgScore = 0;
  let avgScoreDelta = 0;
  const clientScoreMap: Record<string, { score: number | null; prev_score: number | null }> = {};

  if (clientIds.length > 0) {
    const { data: analyses } = await db
      .from("brand_analyses")
      .select("client_id, marketing_score, created_at")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false });

    const latestByClient: Record<string, number[]> = {};
    for (const a of analyses || []) {
      if (!a.client_id || a.marketing_score == null) continue;
      if (!latestByClient[a.client_id]) latestByClient[a.client_id] = [];
      if (latestByClient[a.client_id].length < 2) {
        latestByClient[a.client_id].push(a.marketing_score);
      }
    }

    const scores: number[] = [];
    const deltas: number[] = [];
    for (const cid of Object.keys(latestByClient)) {
      const arr = latestByClient[cid];
      const latest = arr[0];
      const prev = arr[1] ?? null;
      scores.push(latest);
      clientScoreMap[cid] = { score: latest, prev_score: prev };
      if (prev != null) deltas.push(latest - prev);
    }
    avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    avgScoreDelta = deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : 0;
  }

  // 5. Status distribution
  const onboardingCount = (clients || []).filter(
    (c) => c.onboarding_status && c.onboarding_status !== "completed",
  ).length;

  const { count: churnedCount } = await db
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "cancelled");

  // At risk detection
  const atRiskClients: AtRiskClient[] = [];
  const subsMap: Record<string, { mrr: number; expires_at: string | null }> = {};
  for (const s of activeSubs || []) {
    if (s.client_id) subsMap[s.client_id] = { mrr: s.mrr || 0, expires_at: s.expires_at };
  }

  // Sales agents lookup
  const { data: salesAgents } = await db.from("sales_agents").select("id, name");
  const agentMap: Record<string, string> = {};
  for (const sa of salesAgents || []) agentMap[sa.id] = sa.name;

  for (const c of clients || []) {
    if (!activeClientIds.has(c.id)) continue;
    const scoreData = clientScoreMap[c.id];
    const sub = subsMap[c.id];
    const scoreChange = scoreData?.prev_score != null && scoreData.score != null
      ? scoreData.score - scoreData.prev_score
      : null;

    const { reasons, severity } = computeAtRiskReasons({
      score_change: scoreChange,
      last_portal_login: c.last_portal_login,
      expires_at: sub?.expires_at ?? null,
      keyword_decline: false,
    });

    if (reasons.length > 0) {
      const daysUntil = sub?.expires_at
        ? Math.floor((new Date(sub.expires_at).getTime() - Date.now()) / 86400000)
        : null;

      atRiskClients.push({
        id: c.id,
        brand_name: c.brand_name || "알 수 없음",
        score: scoreData?.score ?? null,
        prev_score: scoreData?.prev_score ?? null,
        score_change: scoreChange,
        last_portal_login: c.last_portal_login,
        expires_at: sub?.expires_at ?? null,
        days_until_expiry: daysUntil,
        mrr: sub?.mrr ?? 0,
        sales_agent_name: c.assigned_sales_agent_id
          ? agentMap[c.assigned_sales_agent_id] ?? null
          : null,
        reasons,
        severity,
      });
    }
  }
  atRiskClients.sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));

  // 6. Goals
  const { count: contentThisMonth } = await db
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("publish_status", "published")
    .gte("created_at", thisMonthStart);

  const goals: MonthlyGoal[] = [
    { label: "신규 계약", current: newClients, target: 8 },
    { label: "콘텐츠 발행", current: contentThisMonth || 0, target: 60 },
    { label: "평균 점수 향상", current: avgScoreDelta > 0 ? avgScoreDelta : 0, target: 10 },
  ];

  // 7. Sales performance
  const salesPerformance: SalesPerformance[] = [];
  for (const sa of salesAgents || []) {
    const assignedClients = (clients || []).filter(
      (c) => c.assigned_sales_agent_id === sa.id,
    );
    const assignedIds = assignedClients.map((c) => c.id);
    const saActiveCount = assignedIds.filter((id) => activeClientIds.has(id)).length;
    const saNewCount = (activeSubs || []).filter(
      (s) => assignedIds.includes(s.client_id) && s.started_at && s.started_at >= thisMonthStart,
    ).length;
    const saMrr = (activeSubs || [])
      .filter((s) => assignedIds.includes(s.client_id))
      .reduce((sum, s) => sum + (s.mrr || 0), 0);
    const saAtRisk = atRiskClients.filter((r) => assignedIds.includes(r.id)).length;

    if (assignedClients.length > 0) {
      salesPerformance.push({
        id: sa.id,
        name: sa.name,
        total_clients: assignedClients.length,
        active_clients: saActiveCount,
        new_contracts: saNewCount,
        mrr_contribution: saMrr,
        at_risk: saAtRisk,
      });
    }
  }
  salesPerformance.sort((a, b) => b.mrr_contribution - a.mrr_contribution);

  return {
    kpi: {
      mrr: currentMrr,
      mrrDelta,
      activeClients,
      newClients,
      churnRate: Math.round(churnRate * 10) / 10,
      churnRateDelta: Math.round((churnRate - prevChurnRate) * 10) / 10,
      avgScore,
      avgScoreDelta,
    },
    statusDistribution: {
      active: activeClients - atRiskClients.length,
      onboarding: onboardingCount,
      atRisk: atRiskClients.length,
      churned: churnedCount || 0,
    },
    goals,
    atRiskClients,
    salesPerformance,
  };
}
