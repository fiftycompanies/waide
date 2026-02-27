"use server";

import { createAdminClient } from "@/lib/supabase/service";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RevenueKpi {
  mrr: number;
  arr: number;
  newMrr: number;
  churnedMrr: number;
}

export interface PlanDistribution {
  plan_name: string;
  count: number;
  mrr: number;
}

export interface MrrTrendPoint {
  month: string; // "2026-02"
  mrr: number;
  newMrr: number;
  churnedMrr: number;
}

export interface RevenueChange {
  date: string;
  client_name: string;
  type: "new" | "upgrade" | "churn";
  amount: number;
  plan_name: string | null;
}

export interface RevenueData {
  kpi: RevenueKpi;
  planDistribution: PlanDistribution[];
  mrrTrend: MrrTrendPoint[];
  recentChanges: RevenueChange[];
}

// ── Main ───────────────────────────────────────────────────────────────────

export async function getRevenueData(): Promise<RevenueData> {
  const db = createAdminClient();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 1. Active subs → MRR
  const { data: activeSubs } = await db
    .from("subscriptions")
    .select("id, client_id, mrr, status, started_at, cancelled_at, product_id, products(name), created_at")
    .eq("status", "active");

  const mrr = (activeSubs || []).reduce((s, r) => s + (r.mrr || 0), 0);
  const arr = mrr * 12;

  // New MRR this month
  const newMrr = (activeSubs || [])
    .filter((s) => s.started_at && s.started_at >= thisMonthStart)
    .reduce((s, r) => s + (r.mrr || 0), 0);

  // Churned MRR this month
  const { data: cancelledSubs } = await db
    .from("subscriptions")
    .select("mrr, cancelled_at, client_id, products(name)")
    .eq("status", "cancelled")
    .gte("cancelled_at", thisMonthStart);

  const churnedMrr = (cancelledSubs || []).reduce((s, r) => s + (r.mrr || 0), 0);

  // 2. Plan distribution
  const planMap: Record<string, { count: number; mrr: number }> = {};
  for (const s of activeSubs || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prod = s.products as any;
    const name = prod?.name || "미지정";
    if (!planMap[name]) planMap[name] = { count: 0, mrr: 0 };
    planMap[name].count++;
    planMap[name].mrr += s.mrr || 0;
  }
  const planDistribution: PlanDistribution[] = Object.entries(planMap)
    .map(([plan_name, v]) => ({ plan_name, ...v }))
    .sort((a, b) => b.mrr - a.mrr);

  // 3. MRR trend (last 6 months approximation)
  const mrrTrend: MrrTrendPoint[] = [];
  const { data: allSubs } = await db
    .from("subscriptions")
    .select("mrr, status, started_at, cancelled_at, created_at")
    .order("started_at", { ascending: true });

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const monthStartStr = monthDate.toISOString();
    const monthEndStr = monthEnd.toISOString();

    let monthMrr = 0;
    let monthNew = 0;
    let monthChurn = 0;

    for (const s of allSubs || []) {
      const started = s.started_at || s.created_at;
      const cancelled = s.cancelled_at;

      // Was active during this month?
      if (started && started <= monthEndStr) {
        if (!cancelled || cancelled >= monthStartStr) {
          monthMrr += s.mrr || 0;
        }
      }
      // New this month
      if (started && started >= monthStartStr && started <= monthEndStr) {
        monthNew += s.mrr || 0;
      }
      // Churned this month
      if (cancelled && cancelled >= monthStartStr && cancelled <= monthEndStr) {
        monthChurn += s.mrr || 0;
      }
    }

    mrrTrend.push({ month: monthKey, mrr: monthMrr, newMrr: monthNew, churnedMrr: monthChurn });
  }

  // 4. Recent changes
  const recentChanges: RevenueChange[] = [];

  // Client name lookup
  const clientIds = new Set<string>();
  for (const s of activeSubs || []) if (s.client_id) clientIds.add(s.client_id);
  for (const s of cancelledSubs || []) if (s.client_id) clientIds.add(s.client_id);

  const { data: clientsList } = await db
    .from("clients")
    .select("id, brand_name")
    .in("id", Array.from(clientIds));
  const clientMap: Record<string, string> = {};
  for (const c of clientsList || []) clientMap[c.id] = c.brand_name || "알 수 없음";

  // New contracts this month
  for (const s of activeSubs || []) {
    if (s.started_at && s.started_at >= thisMonthStart) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prod = s.products as any;
      recentChanges.push({
        date: s.started_at,
        client_name: clientMap[s.client_id] || "알 수 없음",
        type: "new",
        amount: s.mrr || 0,
        plan_name: prod?.name ?? null,
      });
    }
  }

  // Cancelled this month
  for (const s of cancelledSubs || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prod = s.products as any;
    recentChanges.push({
      date: s.cancelled_at,
      client_name: clientMap[s.client_id] || "알 수 없음",
      type: "churn",
      amount: s.mrr || 0,
      plan_name: prod?.name ?? null,
    });
  }

  recentChanges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    kpi: { mrr, arr, newMrr, churnedMrr },
    planDistribution,
    mrrTrend,
    recentChanges: recentChanges.slice(0, 10),
  };
}
