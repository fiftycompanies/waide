import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/service";

describe("dashboard-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Helper: build a chainable mock DB ──────────────────────────────────
  function buildMockDb(overrides: Record<string, unknown> = {}) {
    // Default dataset
    const defaults = {
      activeSubs: {
        data: [
          { mrr: 500000, client_id: "c1", started_at: "2026-01-15", cancelled_at: null, expires_at: "2026-12-31" },
          { mrr: 250000, client_id: "c2", started_at: "2026-03-05", cancelled_at: null, expires_at: "2026-06-30" },
        ],
        error: null,
      },
      lastMonthSubs: {
        data: [{ mrr: 400000 }, { mrr: 200000 }],
        error: null,
      },
      cancelledThisMonth: { count: 1 },
      cancelledLastMonth: { count: 0 },
      clients: {
        data: [
          { id: "c1", brand_name: "BrandA", last_portal_login: null, assigned_sales_agent_id: "sa1", onboarding_status: "completed" },
          { id: "c2", brand_name: "BrandB", last_portal_login: "2026-03-10", assigned_sales_agent_id: null, onboarding_status: "in_progress" },
        ],
        error: null,
      },
      analyses: {
        data: [
          { client_id: "c1", marketing_score: 72, created_at: "2026-03-10" },
          { client_id: "c1", marketing_score: 65, created_at: "2026-02-10" },
          { client_id: "c2", marketing_score: 55, created_at: "2026-03-08" },
        ],
        error: null,
      },
      churnedCount: { count: 1 },
      salesAgents: { data: [{ id: "sa1", name: "Agent Kim" }], error: null },
      contentThisMonth: { count: 12 },
    };

    const dataset = { ...defaults, ...overrides };
    let callIndex = 0;

    // The function chains different calls in sequence. We track via from() table name.
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      const builder = createQueryBuilder(table, dataset);
      return builder;
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
    return mockFrom;
  }

  /**
   * Create a deeply chainable query builder that resolves based on the table name.
   * This handles select, eq, neq, or, lte, gte, lt, in, order, limit, maybeSingle, single, range, etc.
   */
  function createQueryBuilder(table: string, dataset: Record<string, unknown>) {
    // Track calls per table to differentiate multiple queries to the same table
    if (!tableCallCounts[table]) tableCallCounts[table] = 0;
    tableCallCounts[table]++;

    const resolveData = () => {
      switch (table) {
        case "subscriptions": {
          const callNum = tableCallCounts["subscriptions"];
          if (callNum === 1) return dataset.activeSubs;
          if (callNum === 2) return dataset.lastMonthSubs;
          if (callNum === 3) return dataset.cancelledThisMonth;
          if (callNum === 4) return dataset.cancelledLastMonth;
          if (callNum === 5) return dataset.churnedCount;
          return { data: [], error: null };
        }
        case "clients":
          return dataset.clients;
        case "brand_analyses":
          return dataset.analyses;
        case "sales_agents":
          return dataset.salesAgents;
        case "contents":
          return dataset.contentThisMonth;
        default:
          return { data: [], error: null };
      }
    };

    // Build a thenable chainable proxy
    const chain: Record<string, unknown> = {};
    const methods = ["select", "eq", "neq", "or", "lte", "gte", "lt", "gt", "in", "order", "limit", "range", "maybeSingle", "single", "not", "is", "filter"];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    // Make it thenable to resolve like a promise
    chain.then = (resolve: (val: unknown) => unknown) => {
      return Promise.resolve(resolve(resolveData()));
    };
    return chain;
  }

  let tableCallCounts: Record<string, number> = {};

  beforeEach(() => {
    tableCallCounts = {};
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC1: getBusinessDashboardData returns KPI data (MRR, customer count, churn rate)
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: getBusinessDashboardData returns KPI data", async () => {
    buildMockDb();

    const { getBusinessDashboardData } = await import("@/lib/actions/dashboard-actions");
    const result = await getBusinessDashboardData();

    // Check KPI structure
    expect(result).toHaveProperty("kpi");
    expect(result.kpi).toHaveProperty("mrr");
    expect(result.kpi).toHaveProperty("activeClients");
    expect(result.kpi).toHaveProperty("churnRate");
    expect(result.kpi).toHaveProperty("avgScore");
    expect(result.kpi).toHaveProperty("mrrDelta");
    expect(result.kpi).toHaveProperty("churnRateDelta");
    expect(result.kpi).toHaveProperty("avgScoreDelta");

    // Structure checks
    expect(result).toHaveProperty("statusDistribution");
    expect(result).toHaveProperty("goals");
    expect(result).toHaveProperty("atRiskClients");
    expect(result).toHaveProperty("salesPerformance");

    expect(result.kpi.mrr).toBeTypeOf("number");
    expect(result.kpi.activeClients).toBeTypeOf("number");
    expect(result.kpi.churnRate).toBeTypeOf("number");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: Returns default values when no data
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: returns default values when no data", async () => {
    buildMockDb({
      activeSubs: { data: [], error: null },
      lastMonthSubs: { data: [], error: null },
      cancelledThisMonth: { count: 0 },
      cancelledLastMonth: { count: 0 },
      clients: { data: [], error: null },
      analyses: { data: [], error: null },
      churnedCount: { count: 0 },
      salesAgents: { data: [], error: null },
      contentThisMonth: { count: 0 },
    });

    const { getBusinessDashboardData } = await import("@/lib/actions/dashboard-actions");
    const result = await getBusinessDashboardData();

    expect(result.kpi.mrr).toBe(0);
    expect(result.kpi.activeClients).toBe(0);
    expect(result.kpi.newClients).toBe(0);
    expect(result.kpi.churnRate).toBe(0);
    expect(result.kpi.avgScore).toBe(0);
    expect(result.statusDistribution.active).toBe(0);
    expect(result.statusDistribution.churned).toBe(0);
    expect(result.atRiskClients).toHaveLength(0);
    expect(result.salesPerformance).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: At-risk detection (score drop >= 15, no login >= 30 days)
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: computeAtRiskReasons detects score drop >= 15 and no login >= 30 days", async () => {
    // We test the computeAtRiskReasons logic indirectly through getBusinessDashboardData
    // by providing a client with a 20-point score drop and a last_portal_login > 30 days ago
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 86400000).toISOString();

    buildMockDb({
      activeSubs: {
        data: [
          { mrr: 300000, client_id: "c1", started_at: "2026-01-01", cancelled_at: null, expires_at: "2026-12-31" },
        ],
        error: null,
      },
      clients: {
        data: [
          { id: "c1", brand_name: "RiskyBrand", last_portal_login: thirtyFiveDaysAgo, assigned_sales_agent_id: null, onboarding_status: "completed" },
        ],
        error: null,
      },
      analyses: {
        data: [
          { client_id: "c1", marketing_score: 50, created_at: "2026-03-10" },
          { client_id: "c1", marketing_score: 70, created_at: "2026-02-10" }, // score drop = -20
        ],
        error: null,
      },
      salesAgents: { data: [], error: null },
    });

    const { getBusinessDashboardData } = await import("@/lib/actions/dashboard-actions");
    const result = await getBusinessDashboardData();

    // Should have at least 1 at-risk client
    expect(result.atRiskClients.length).toBeGreaterThanOrEqual(1);

    const riskyClient = result.atRiskClients.find((c) => c.id === "c1");
    if (riskyClient) {
      // Should have reasons for score drop and no login
      expect(riskyClient.reasons.length).toBeGreaterThanOrEqual(2);
      expect(riskyClient.reasons.some((r) => r.includes("하락"))).toBe(true);
      expect(riskyClient.reasons.some((r) => r.includes("미접속"))).toBe(true);
      // severity should be "high" because there are 2+ reasons
      expect(riskyClient.severity).toBe("high");
    }
  });
});
