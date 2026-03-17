import { describe, test, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/agent-runner", () => ({
  runAgent: vi.fn(),
}));

vi.mock("@/lib/content-qc-v2", () => ({
  runQcV2: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/service";
import { runAgent } from "@/lib/agent-runner";
import { runQcV2 } from "@/lib/content-qc-v2";
import type { QcResult } from "@/lib/content-qc-v2";
import { runRewriteLoop } from "@/lib/content-rewrite-loop";

// ── Helpers ──────────────────────────────────────────────────────────────

function mockQuery(finalResult: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "from", "select", "insert", "update", "delete",
    "eq", "neq", "in", "is", "gte", "lte", "not",
    "order", "limit", "range", "maybeSingle", "single",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult);
  chain.single = vi.fn().mockResolvedValue(finalResult);
  return chain;
}

function makeQcResult(overrides: Partial<QcResult> = {}): QcResult {
  return {
    score: 55,
    pass: false,
    items: [],
    duplication_check: null,
    persona_check: null,
    benchmark_comparison: null,
    top_issues: ["글자수 부족", "키워드 밀도 미달"],
    verdict: "FAIL: 70점 미만",
    rewrite_needed: true,
    rewrite_focus: ["글자수 늘리기", "키워드 추가"],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("content-rewrite-loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default DB mock
    const fromFn = vi.fn().mockImplementation(() => {
      const q = mockQuery({ data: { brand_persona: { tone: "친근한" }, metadata: {} } });
      q.update = vi.fn().mockReturnValue(q);
      return q;
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });
  });

  // ── TC1: Rewrite loop retries up to 2 times when QC fails ──
  test("TC1: QC 실패 시 최대 2회 재작성 시도", async () => {
    // Always return FAIL from QC
    const failQc = makeQcResult({ score: 55, pass: false });
    (runQcV2 as ReturnType<typeof vi.fn>).mockResolvedValue(failQc);

    // COPYWRITER agent always returns rewritten content
    (runAgent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        title: "Rewritten Title",
        body: "Rewritten body content here with more words to improve quality.",
        changes: ["글자수 증가"],
      },
      raw: "",
      usage: { inputTokens: 100, outputTokens: 200, costUsd: 0.01 },
    });

    const result = await runRewriteLoop({
      contentId: "content-001",
      clientId: "client-001",
      originalTitle: "Original Title",
      originalBody: "Short body",
      metaDescription: "meta desc",
      keyword: "테스트 키워드",
      qcResult: failQc,
    });

    // MAX_RETRIES = 2 → should attempt rewrite exactly 2 times
    expect(runAgent).toHaveBeenCalledTimes(2);
    expect(runQcV2).toHaveBeenCalledTimes(2);
    expect(result.retries).toBe(2);
    // Still failing after 2 retries
    expect(result.finalQc.pass).toBe(false);
  });

  // ── TC2: Rewrite loop stops on QC pass ──
  test("TC2: QC 통과 시 즉시 중단", async () => {
    const failQc = makeQcResult({ score: 55, pass: false });
    const passQc = makeQcResult({ score: 85, pass: true, rewrite_needed: false, verdict: "PASS" });

    // First QC re-check: PASS
    (runQcV2 as ReturnType<typeof vi.fn>).mockResolvedValueOnce(passQc);

    // COPYWRITER agent returns improved content
    (runAgent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        title: "Improved Title",
        body: "A much longer and better body content with keywords and proper structure...",
        changes: ["키워드 밀도 개선"],
      },
      raw: "",
      usage: { inputTokens: 100, outputTokens: 200, costUsd: 0.01 },
    });

    const result = await runRewriteLoop({
      contentId: "content-002",
      clientId: "client-001",
      originalTitle: "Original Title",
      originalBody: "Decent body but not passing QC",
      metaDescription: "meta desc",
      keyword: "테스트 키워드",
      qcResult: failQc,
    });

    // Only 1 rewrite attempt because QC passed on first retry
    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(runQcV2).toHaveBeenCalledTimes(1);
    expect(result.retries).toBe(1);
    expect(result.finalQc.pass).toBe(true);
    expect(result.finalQc.score).toBe(85);
    expect(result.finalContent.title).toBe("Improved Title");
  });
});
