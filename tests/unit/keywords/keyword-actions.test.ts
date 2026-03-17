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

describe("keyword-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // ── Helper: mock chain builder ─────────────────────────────────────────
  function mockChain(resolvedValue: unknown) {
    const chain: Record<string, unknown> = {};
    const methods = ["select", "eq", "neq", "or", "lte", "gte", "lt", "gt", "in", "order", "limit", "range", "maybeSingle", "single", "not", "filter", "insert", "update", "delete", "upsert"];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(resolvedValue));
    return chain;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TC1: getKeywords returns list with pagination
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: getKeywords returns keyword list", async () => {
    const keywords = [
      { id: "k1", keyword: "강남 맛집", sub_keyword: null, platform: "naver", monthly_search_total: 5000, monthly_search_pc: 3000, monthly_search_mo: 2000, competition_level: "high", competition_index: null, priority_score: 85, current_rank_naver: 3, current_rank_google: null, current_rank_naver_pc: 3, current_rank_naver_mo: 5, rank_change_pc: null, rank_change_mo: null, last_tracked_at: null, status: "active", client_id: "c1", source: null, metadata: null, created_at: "2026-03-01", clients: { name: "TestBrand" } },
      { id: "k2", keyword: "홍대 카페", sub_keyword: null, platform: "naver", monthly_search_total: 3000, monthly_search_pc: 1500, monthly_search_mo: 1500, competition_level: "medium", competition_index: null, priority_score: 70, current_rank_naver: null, current_rank_google: null, current_rank_naver_pc: null, current_rank_naver_mo: null, rank_change_pc: null, rank_change_mo: null, last_tracked_at: null, status: "active", client_id: "c1", source: null, metadata: null, created_at: "2026-03-02", clients: { name: "TestBrand" } },
    ];

    const chain = mockChain({ data: keywords, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { getKeywords } = await import("@/lib/actions/keyword-actions");
    const result = await getKeywords(null);

    expect(result).toHaveLength(2);
    expect(result[0].keyword).toBe("강남 맛집");
    expect(result[0].client_name).toBe("TestBrand");
    expect(result[1].keyword).toBe("홍대 카페");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: updateKeywordStatus changes status correctly
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: updateKeywordStatus changes status", async () => {
    const chain = mockChain({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { updateKeywordStatus } = await import("@/lib/actions/keyword-actions");
    const result = await updateKeywordStatus("k1", "paused");

    expect(result).toEqual({ success: true });
    expect(chain.update).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "k1");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: Status transition validation (active -> paused OK, archived -> active OK)
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: status transitions are accepted", async () => {
    const chain = mockChain({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { updateKeywordStatus } = await import("@/lib/actions/keyword-actions");

    // active -> paused
    const r1 = await updateKeywordStatus("k1", "paused");
    expect(r1.success).toBe(true);

    // archived -> active (reactivation)
    const r2 = await updateKeywordStatus("k2", "active");
    expect(r2.success).toBe(true);

    // paused -> archived
    const r3 = await updateKeywordStatus("k3", "archived");
    expect(r3.success).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC4: getKeywords filters by clientId
  // ─────────────────────────────────────────────────────────────────────────
  test("TC4: getKeywords filters by clientId when provided", async () => {
    const keywords = [
      { id: "k1", keyword: "강남 맛집", sub_keyword: null, platform: "naver", monthly_search_total: 5000, monthly_search_pc: 3000, monthly_search_mo: 2000, competition_level: "high", competition_index: null, priority_score: 85, current_rank_naver: null, current_rank_google: null, current_rank_naver_pc: null, current_rank_naver_mo: null, rank_change_pc: null, rank_change_mo: null, last_tracked_at: null, status: "active", client_id: "c1", source: null, metadata: null, created_at: "2026-03-01", clients: { name: "Brand1" } },
    ];

    const eqFn = vi.fn().mockImplementation((_col: string, _val: string) => {
      // Return the chain for further chaining
      return chain;
    });
    const chain = mockChain({ data: keywords, error: null });
    chain.eq = eqFn;

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { getKeywords } = await import("@/lib/actions/keyword-actions");
    const result = await getKeywords("c1");

    expect(result).toHaveLength(1);
    expect(result[0].client_id).toBe("c1");
    // eq should have been called with "client_id", "c1" at some point
    expect(eqFn).toHaveBeenCalledWith("client_id", "c1");
  });
});
