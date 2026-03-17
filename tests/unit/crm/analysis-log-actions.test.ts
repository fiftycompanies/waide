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

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: vi.fn().mockReturnValue("mock-uuid-1234"),
});

import { createAdminClient } from "@/lib/supabase/service";

describe("analysis-log-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function mockChain(resolvedValue: unknown) {
    const chain: Record<string, unknown> = {};
    const methods = ["select", "eq", "neq", "or", "lte", "gte", "lt", "gt", "in", "order", "limit", "range", "maybeSingle", "single", "not", "filter", "insert", "update", "delete", "upsert", "is"];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(resolvedValue));
    return chain;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TC1: getAnalysisLogs returns paginated list
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: getAnalysisLogs returns paginated list", async () => {
    const rows = [
      {
        id: "a1",
        status: "completed",
        lead_status: "new",
        sales_ref: "SA01",
        client_id: null,
        marketing_score: 65,
        contact_name: "Kim",
        contact_phone: "010-1234",
        notes: [{ id: "n1", text: "test note" }],
        basic_info: { name: "TestPlace", category: "카페" },
        created_at: "2026-03-01",
        analyzed_at: "2026-03-01",
        last_activity_at: "2026-03-10",
        view_count: 5,
      },
    ];

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // brand_analyses main query
        return mockChain({ data: rows, count: 1, error: null });
      }
      if (callCount === 2) {
        // sales_agents lookup
        return mockChain({ data: [{ ref_code: "SA01", name: "Agent Kim" }], error: null });
      }
      if (callCount === 3) {
        // consultation_requests
        return mockChain({ data: [], error: null });
      }
      if (callCount === 4) {
        // clients lookup
        return mockChain({ data: [], error: null });
      }
      return mockChain({ data: [], error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { getAnalysisLogs } = await import("@/lib/actions/analysis-log-actions");
    const result = await getAnalysisLogs({ page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.data[0].place_name).toBe("TestPlace");
    expect(result.data[0].sales_agent_name).toBe("Agent Kim");
    expect(result.data[0].notes_count).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: updateLeadStatus transitions correctly
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: updateLeadStatus transitions from new to contacted", async () => {
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // select existing notes
        return mockChain({ data: { notes: [] }, error: null });
      }
      // update
      return mockChain({ data: null, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { updateLeadStatus } = await import("@/lib/actions/analysis-log-actions");

    // Valid transition: new -> contacted
    const result = await updateLeadStatus("a1", "contacted");
    expect(result.success).toBe(true);
  });

  test("TC2b: updateLeadStatus rejects invalid status", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(mockChain({ data: null, error: null })),
    });

    const { updateLeadStatus } = await import("@/lib/actions/analysis-log-actions");

    // Invalid status
    const result = await updateLeadStatus("a1", "invalid_status");
    expect(result.success).toBe(false);
  });

  test("TC2c: updateLeadStatus valid transitions", async () => {
    const validStatuses = ["new", "contacted", "consulting", "contracted", "active", "churned"];

    for (const status of validStatuses) {
      vi.clearAllMocks();
      let callCount = 0;
      const mockFrom = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockChain({ data: { notes: [] }, error: null });
        return mockChain({ data: null, error: null });
      });
      (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const { updateLeadStatus } = await import("@/lib/actions/analysis-log-actions");
      const result = await updateLeadStatus("a1", status);
      expect(result.success).toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: addAnalysisNote appends to JSONB notes
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: addAnalysisNote appends to existing JSONB notes", async () => {
    const existingNotes = [
      { id: "old-note", type: "comment", author: "Admin", text: "Old note", created_at: "2026-03-01" },
    ];

    let callCount = 0;
    const updateChain = mockChain({ data: null, error: null });
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // select existing notes
        return mockChain({ data: { notes: existingNotes }, error: null });
      }
      return updateChain;
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { addAnalysisNote } = await import("@/lib/actions/analysis-log-actions");
    const result = await addAnalysisNote("a1", "Agent Kim", "New note");

    expect(result.success).toBe(true);
    // The update should prepend the new note to existing notes
    const updateCall = (updateChain.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateCall[0].notes).toHaveLength(2);
    expect(updateCall[0].notes[0].text).toBe("New note");
    expect(updateCall[0].notes[0].author).toBe("Agent Kim");
    expect(updateCall[0].notes[1].text).toBe("Old note");
  });

  test("TC3b: addAnalysisNote rejects empty text", async () => {
    const { addAnalysisNote } = await import("@/lib/actions/analysis-log-actions");
    const result = await addAnalysisNote("a1", "Admin", "   ");
    expect(result.success).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC4: assignSalesAgent links agent to analysis
  // ─────────────────────────────────────────────────────────────────────────
  test("TC4: assignSalesAgent updates sales_ref and adds system note", async () => {
    let callCount = 0;
    const updateChain = mockChain({ data: null, error: null });
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // sales_agents name lookup
        return mockChain({ data: { name: "Agent Kim" }, error: null });
      }
      if (callCount === 2) {
        // existing notes
        return mockChain({ data: { notes: [] }, error: null });
      }
      return updateChain;
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { assignSalesAgent } = await import("@/lib/actions/analysis-log-actions");
    const result = await assignSalesAgent("a1", "SA01");

    expect(result.success).toBe(true);

    const updateCall = (updateChain.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateCall[0].sales_ref).toBe("SA01");
    expect(updateCall[0].notes).toHaveLength(1);
    expect(updateCall[0].notes[0].type).toBe("system");
    expect(updateCall[0].notes[0].text).toContain("영업사원 배정");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC5: getAnalysisStats returns aggregate counts
  // ─────────────────────────────────────────────────────────────────────────
  test("TC5: getAnalysisStats returns stats", async () => {
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // all completed analyses
        return mockChain({
          data: [
            { lead_status: "new", sales_ref: "SA01" },
            { lead_status: "contacted", sales_ref: "SA01" },
            { lead_status: "consulting", sales_ref: "SA02" },
            { lead_status: "contracted", sales_ref: null },
          ],
          error: null,
        });
      }
      if (callCount === 2) {
        // recent count
        return mockChain({ count: 3 });
      }
      if (callCount === 3) {
        // consultation count
        return mockChain({ count: 2 });
      }
      if (callCount === 4) {
        // sales agents
        return mockChain({ data: [{ ref_code: "SA01", name: "Kim" }, { ref_code: "SA02", name: "Lee" }], error: null });
      }
      return mockChain({ data: [], error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { getAnalysisStats } = await import("@/lib/actions/analysis-log-actions");
    const result = await getAnalysisStats();

    expect(result.total).toBe(4);
    expect(result.byStatus).toHaveProperty("new");
    expect(result.byStatus.new).toBe(1);
    expect(result.byStatus.contacted).toBe(1);
    expect(result.recentCount).toBe(3);
    expect(result.consultationRate).toBeTypeOf("number");
    expect(result.bySalesAgent.length).toBeGreaterThanOrEqual(1);
  });
});
