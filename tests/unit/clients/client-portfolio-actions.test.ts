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

describe("client-portfolio-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function mockChain(resolvedValue: unknown) {
    const chain: Record<string, unknown> = {};
    const methods = ["select", "eq", "neq", "or", "lte", "gte", "lt", "gt", "in", "order", "limit", "range", "maybeSingle", "single", "not", "filter", "insert", "update", "delete", "upsert"];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(resolvedValue));
    return chain;
  }

  function setupPortfolioMocks(overrides: Record<string, unknown> = {}) {
    const defaults = {
      clients: [
        { id: "c1", brand_name: "Active Brand", client_type: "company", onboarding_status: "completed", last_portal_login: new Date().toISOString(), assigned_sales_agent_id: "sa1", created_at: "2026-01-01" },
        { id: "c2", brand_name: "Onboarding Brand", client_type: "brand", onboarding_status: "in_progress", last_portal_login: null, assigned_sales_agent_id: null, created_at: "2026-02-01" },
        { id: "c3", brand_name: "Churned Brand", client_type: "shop", onboarding_status: "completed", last_portal_login: "2025-12-01", assigned_sales_agent_id: null, created_at: "2025-06-01" },
      ],
      subscriptions: [
        { client_id: "c1", mrr: 500000, status: "active", expires_at: "2026-12-31", products: { name: "Pro" } },
        { client_id: "c3", mrr: 0, status: "cancelled", expires_at: "2025-12-31", products: { name: "Basic" } },
      ],
      analyses: [
        { client_id: "c1", marketing_score: 75, keyword_rankings: [{ rank: 3 }, { rank: 8 }], created_at: "2026-03-10" },
        { client_id: "c1", marketing_score: 60, keyword_rankings: [], created_at: "2026-02-10" },
      ],
      contentCounts: [
        { client_id: "c1" }, { client_id: "c1" }, { client_id: "c1" },
      ],
      salesAgents: [{ id: "sa1", name: "Agent Kim" }],
    };
    const dataset = { ...defaults, ...overrides };

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: dataset.clients, error: null });
      if (callCount === 2) return mockChain({ data: dataset.subscriptions, error: null });
      if (callCount === 3) return mockChain({ data: dataset.analyses, error: null });
      if (callCount === 4) return mockChain({ data: dataset.contentCounts, error: null });
      if (callCount === 5) return mockChain({ data: dataset.salesAgents, error: null });
      return mockChain({ data: [], error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
    return mockFrom;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TC1: getClientPortfolio returns card list with filters
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: getClientPortfolio returns client cards", async () => {
    setupPortfolioMocks();

    const { getClientPortfolio } = await import("@/lib/actions/client-portfolio-actions");
    const result = await getClientPortfolio();

    expect(result.clients).toBeDefined();
    expect(result.clients.length).toBeGreaterThan(0);
    expect(result.counts).toBeDefined();
    expect(result.counts.all).toBe(3);

    const activeBrand = result.clients.find((c) => c.id === "c1");
    expect(activeBrand).toBeDefined();
    expect(activeBrand!.brand_name).toBe("Active Brand");
    expect(activeBrand!.mrr).toBe(500000);
    expect(activeBrand!.sales_agent_name).toBe("Agent Kim");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: getClientDetail returns 10-tab data
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: getClientDetail returns comprehensive client data", async () => {
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // client
        return mockChain({
          data: {
            id: "c1", name: "Brand A", client_type: "company",
            onboarding_status: "completed", onboarding_checklist: [],
            last_portal_login: "2026-03-10", website_url: "https://example.com",
            created_at: "2026-01-01", assigned_sales_agent_id: "sa1",
            contact_name: "Kim", contact_email: "kim@test.com", contact_phone: "010-1234",
            brand_persona: { tone: "friendly" }, persona_updated_at: "2026-03-01",
          },
          error: null,
        });
      }
      if (callCount === 2) {
        // subscription
        return mockChain({ data: { id: "s1", mrr: 500000, status: "active", started_at: "2026-01-01", expires_at: "2026-12-31", payment_method: "card", notes: null, created_at: "2026-01-01", products: { name: "Pro" } }, error: null });
      }
      if (callCount === 3) {
        // analyses (2 for score delta)
        return mockChain({ data: [
          { marketing_score: 75, score_breakdown: {}, keyword_rankings: [{ keyword: "맛집", rank: 3, change: -1 }], created_at: "2026-03-10" },
          { marketing_score: 60, score_breakdown: {}, keyword_rankings: [], created_at: "2026-02-10" },
        ], error: null });
      }
      if (callCount === 4) return mockChain({ count: 5 }); // published
      if (callCount === 5) return mockChain({ count: 3 }); // draft
      if (callCount === 6) return mockChain({ count: 1 }); // scheduled
      if (callCount === 7) {
        // sales agent
        return mockChain({ data: { name: "Agent Kim", phone: "010-5678" }, error: null });
      }
      if (callCount === 8) return mockChain({ data: [], error: null }); // recent contents
      if (callCount === 9) return mockChain({ data: [], error: null }); // recent analyses
      return mockChain({ data: [], error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { getClientDetail } = await import("@/lib/actions/client-portfolio-actions");
    const result = await getClientDetail("c1");

    expect(result).not.toBeNull();
    expect(result!.brand_name).toBe("Brand A");
    expect(result!.subscription).not.toBeNull();
    expect(result!.subscription!.mrr).toBe(500000);
    expect(result!.marketing_score).toBe(75);
    expect(result!.content_published).toBe(5);
    expect(result!.content_draft).toBe(3);
    expect(result!.sales_agent_name).toBe("Agent Kim");
    expect(result!.brand_persona).toMatchObject({ tone: "friendly" });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: updateOnboardingChecklist updates JSONB
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: updateOnboardingChecklist updates checklist and status", async () => {
    const chain = mockChain({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { updateOnboardingChecklist } = await import("@/lib/actions/client-portfolio-actions");

    const checklist = [
      { key: "analysis", label: "분석 완료", done: true, done_at: "2026-03-01" },
      { key: "keywords", label: "키워드 등록", done: true, done_at: "2026-03-02" },
      { key: "persona", label: "페르소나 설정", done: true, done_at: "2026-03-03" },
    ];

    const result = await updateOnboardingChecklist("c1", checklist);
    expect(result.success).toBe(true);

    // Should set onboarding_status to "completed" when all done
    const updateCall = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateCall[0].onboarding_checklist).toEqual(checklist);
    expect(updateCall[0].onboarding_status).toBe("completed");
  });

  test("TC3b: updateOnboardingChecklist sets in_progress when not all done", async () => {
    const chain = mockChain({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { updateOnboardingChecklist } = await import("@/lib/actions/client-portfolio-actions");

    const checklist = [
      { key: "analysis", label: "분석 완료", done: true },
      { key: "keywords", label: "키워드 등록", done: false },
    ];

    const result = await updateOnboardingChecklist("c1", checklist);
    expect(result.success).toBe(true);

    const updateCall = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateCall[0].onboarding_status).toBe("in_progress");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC4: Filter by status (active/inactive/churned)
  // ─────────────────────────────────────────────────────────────────────────
  test("TC4: filter by status=active excludes churned and at-risk", async () => {
    setupPortfolioMocks();

    const { getClientPortfolio } = await import("@/lib/actions/client-portfolio-actions");
    const result = await getClientPortfolio({ status: "active" });

    // Only active subscription + not at-risk
    for (const c of result.clients) {
      expect(c.subscription_status).toBe("active");
      expect(c.at_risk).toBe(false);
    }
  });

  test("TC4b: filter by status=churned returns only cancelled", async () => {
    setupPortfolioMocks();

    const { getClientPortfolio } = await import("@/lib/actions/client-portfolio-actions");
    const result = await getClientPortfolio({ status: "churned" });

    for (const c of result.clients) {
      expect(c.subscription_status).toBe("cancelled");
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC5: Filter by onboarding_status
  // ─────────────────────────────────────────────────────────────────────────
  test("TC5: filter by status=onboarding returns non-completed clients", async () => {
    setupPortfolioMocks();

    const { getClientPortfolio } = await import("@/lib/actions/client-portfolio-actions");
    const result = await getClientPortfolio({ status: "onboarding" });

    for (const c of result.clients) {
      expect(c.onboarding_status).not.toBe("completed");
      expect(c.onboarding_status).toBeTruthy();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC6: Search by brand name
  // ─────────────────────────────────────────────────────────────────────────
  test("TC6: search filters by brand name (case-insensitive)", async () => {
    setupPortfolioMocks();

    const { getClientPortfolio } = await import("@/lib/actions/client-portfolio-actions");
    const result = await getClientPortfolio({ search: "active" });

    // Should find "Active Brand"
    expect(result.clients.some((c) => c.brand_name.includes("Active"))).toBe(true);
    // Should NOT include "Churned Brand"
    expect(result.clients.some((c) => c.brand_name.includes("Churned"))).toBe(false);
  });

  test("TC6b: search is case-insensitive", async () => {
    setupPortfolioMocks();

    const { getClientPortfolio } = await import("@/lib/actions/client-portfolio-actions");
    const result = await getClientPortfolio({ search: "ACTIVE" });

    expect(result.clients.some((c) => c.brand_name.toLowerCase().includes("active"))).toBe(true);
  });
});
