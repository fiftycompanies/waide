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
vi.mock("@/lib/naver-suggest-collector", () => ({
  collectNaverSuggestions: vi.fn().mockResolvedValue({ autocomplete: [], relatedSearches: [] }),
  extractPlaceFeatureKeywords: vi.fn().mockReturnValue([]),
}));
vi.mock("@/lib/actions/question-actions", () => ({
  generateQuestions: vi.fn().mockResolvedValue({ success: true, count: 5 }),
}));

import { createAdminClient } from "@/lib/supabase/service";

describe("keyword-expansion-actions", () => {
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

  // ─────────────────────────────────────────────────────────────────────────
  // TC1: approveSuggestedKeyword changes status to active
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: approveSuggestedKeyword changes status to active", async () => {
    // First call: select client_id -> returns keyword with client_id
    const selectChain = mockChain({ data: { client_id: "c1" }, error: null });
    // Second call: update -> success
    const updateChain = mockChain({ data: null, error: null });

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return updateChain;
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { approveSuggestedKeyword } = await import("@/lib/actions/keyword-expansion-actions");
    const result = await approveSuggestedKeyword("k1");

    expect(result).toEqual({ success: true });
    // Should have queried keywords table for client_id, then updated status
    expect(mockFrom).toHaveBeenCalledWith("keywords");
    expect(updateChain.update).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: rejectSuggestedKeyword changes status to archived
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: rejectSuggestedKeyword changes status to archived", async () => {
    const chain = mockChain({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { rejectSuggestedKeyword } = await import("@/lib/actions/keyword-expansion-actions");
    const result = await rejectSuggestedKeyword("k1");

    expect(result).toEqual({ success: true });
    expect(chain.update).toHaveBeenCalled();
    // The update should set status to "archived"
    const updateCall = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateCall[0]).toMatchObject({
      status: "archived",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: bulkApproveSuggestedKeywords handles multiple
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: bulkApproveSuggestedKeywords approves multiple keywords", async () => {
    const chain = mockChain({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { bulkApproveSuggestedKeywords } = await import("@/lib/actions/keyword-expansion-actions");
    const result = await bulkApproveSuggestedKeywords(["k1", "k2", "k3"]);

    expect(result.success).toBe(true);
    expect(result.approved).toBe(3);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC4: expandNicheKeywords returns AI suggestions
  // ─────────────────────────────────────────────────────────────────────────
  test("TC4: expandNicheKeywords returns result with insert/skip counts", async () => {
    // Mock the agent-runner module
    vi.doMock("@/lib/agent-runner", () => ({
      runAgent: vi.fn().mockResolvedValue({
        success: true,
        data: {
          niche_keywords: [
            { keyword: "강남역 브런치 카페", search_intent: "recommendation", source: "autocomplete" },
            { keyword: "강남 데이트 맛집", search_intent: "recommendation", source: "related" },
            { keyword: "", search_intent: "", source: "" }, // empty — should be skipped
          ],
        },
      }),
    }));

    // First call: collectNaverSuggestions → already mocked at top
    // DB calls: existing check (maybeSingle) → returns null (not existing), then insert
    let fromCallCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      // Calls for existing keyword check (maybeSingle)
      if (fromCallCount <= 2) {
        return mockChain({ data: null, error: null }); // no existing
      }
      // Insert calls
      return mockChain({ data: null, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { expandNicheKeywords } = await import("@/lib/actions/keyword-expansion-actions");
    const result = await expandNicheKeywords({
      clientId: "c1",
      mainKeywords: ["강남 맛집"],
    });

    expect(result.success).toBe(true);
    expect(result.inserted).toBeTypeOf("number");
    expect(result.skipped).toBeTypeOf("number");
    // The empty keyword should be skipped
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });
});
