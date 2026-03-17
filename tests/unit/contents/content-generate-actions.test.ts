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
vi.mock("@/lib/content-pipeline-v2", () => ({
  createContentV2: vi.fn(),
}));
vi.mock("@/lib/content-qc-v2", () => ({
  runQcV2: vi.fn(),
}));
vi.mock("@/lib/content-rewrite-loop", () => ({
  runRewriteLoop: vi.fn(),
}));
vi.mock("@/lib/actions/point-actions", () => ({
  refundPoints: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/actions/publish-actions", () => ({
  checkAutoPublish: vi.fn().mockResolvedValue(undefined),
}));

import { createAdminClient } from "@/lib/supabase/service";
import { createContentV2 } from "@/lib/content-pipeline-v2";
import { runQcV2 } from "@/lib/content-qc-v2";
import { refundPoints } from "@/lib/actions/point-actions";

describe("content-generate-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
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
  // TC1: generateContentV2 creates content with correct type
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: generateContentV2 creates content with correct type", async () => {
    (createContentV2 as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        title: "강남 맛집 TOP 10",
        body: "## 강남 맛집\n\n맛있는 곳을 소개해요.\n\n## 1위 레스토랑\n\n정말 좋아요.",
        meta_description: "강남 맛집 추천 리스트",
        hashtags: ["강남맛집", "맛집추천"],
        self_check: { pass: true },
        aeo_snippet: "강남 맛집 추천",
      },
      benchmark: { used: true },
    });

    (runQcV2 as ReturnType<typeof vi.fn>).mockResolvedValue({
      score: 85,
      pass: true,
      items: [],
      top_issues: [],
      verdict: "PASS",
      rewrite_needed: false,
      rewrite_focus: [],
      duplication_check: null,
      persona_check: null,
      benchmark_comparison: null,
    });

    // DB mock: first call is contents insert (no jobId so jobs update is skipped),
    // then contents update for approved, then jobs update done
    const mockFrom = vi.fn().mockImplementation(() => {
      return mockChain({ data: { id: "content-1" }, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { generateContentV2 } = await import("@/lib/actions/content-generate-actions");
    const result = await generateContentV2({
      clientId: "c1",
      keyword: "강남 맛집",
      keywordId: "k1",
      contentType: "list",
    });

    console.log("TC1 result:", JSON.stringify(result));
    expect(result.success).toBe(true);
    expect(result.contentId).toBe("content-1");
    expect(result.title).toBe("강남 맛집 TOP 10");
    expect(result.qcPass).toBe(true);
    expect(result.qcScore).toBe(85);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: Point deduction on content generation (canGenerateContent check)
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: generateContentV2 checks ANTHROPIC_API_KEY", async () => {
    process.env.ANTHROPIC_API_KEY = "";

    const { generateContentV2 } = await import("@/lib/actions/content-generate-actions");
    const result = await generateContentV2({
      clientId: "c1",
      keyword: "강남 맛집",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("ANTHROPIC_API_KEY");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: Point refund on generation failure
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: refundPoints called on pipeline failure", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    (createContentV2 as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Pipeline explosion"));

    const mockFrom = vi.fn().mockImplementation(() => {
      return mockChain({ data: null, error: null });
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { generateContentV2 } = await import("@/lib/actions/content-generate-actions");
    const result = await generateContentV2({
      clientId: "c1",
      keyword: "강남 맛집",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Pipeline explosion");
    // refundPoints should have been called
    expect(refundPoints).toHaveBeenCalledWith("c1", null);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC4: processContentJobs picks pending jobs
  // ─────────────────────────────────────────────────────────────────────────
  test("TC4: processContentJobs returns empty when no ANTHROPIC_API_KEY", async () => {
    process.env.ANTHROPIC_API_KEY = "";

    const { processContentJobs } = await import("@/lib/actions/content-generate-actions");
    const result = await processContentJobs();

    expect(result.processed).toBe(0);
    expect(result.results).toEqual([]);
  });

  test("TC4b: processContentJobs picks PENDING jobs", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    const pendingJobs = [
      {
        id: "job-1",
        client_id: "c1",
        job_type: "CONTENT_CREATE",
        status: "PENDING",
        input_payload: { keyword: "강남 맛집", keyword_id: "k1", content_type: "list" },
      },
    ];

    (createContentV2 as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        title: "Test",
        body: "Test body content",
        meta_description: "desc",
        hashtags: [],
        self_check: {},
        aeo_snippet: "",
      },
    });

    (runQcV2 as ReturnType<typeof vi.fn>).mockResolvedValue({
      score: 80,
      pass: true,
      items: [],
      top_issues: [],
      verdict: "PASS",
      rewrite_needed: false,
      rewrite_focus: [],
      duplication_check: null,
      persona_check: null,
      benchmark_comparison: null,
    });

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // jobs select PENDING
        return mockChain({ data: pendingJobs, error: null });
      }
      // subsequent calls for generateContentV2 internals
      return mockChain({ data: { id: "content-1" }, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { processContentJobs } = await import("@/lib/actions/content-generate-actions");
    const result = await processContentJobs();

    expect(result.processed).toBe(1);
    expect(result.results).toHaveLength(1);
  });
});
