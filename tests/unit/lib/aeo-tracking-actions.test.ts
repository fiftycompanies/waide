import { describe, test, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/crawlers", () => ({
  crawlLLM: vi.fn(),
  MODEL_WEIGHTS: {
    chatgpt: 1.0,
    perplexity: 0.8,
    gemini: 0.7,
    claude: 0.5,
  },
  MODEL_RATE_LIMITS: {
    perplexity: 2000,
    claude: 1000,
    chatgpt: 10000,
    gemini: 10000,
  },
}));

vi.mock("@/lib/crawlers/mention-detector", () => ({
  detectMentions: vi.fn().mockResolvedValue([]),
}));

import { createAdminClient } from "@/lib/supabase/service";
import { crawlLLM } from "@/lib/crawlers";
import { detectMentions } from "@/lib/crawlers/mention-detector";
import {
  calculateAEOScore,
  runAEOTracking,
  getAEODashboardData,
} from "@/lib/actions/aeo-tracking-actions";

// ── Helpers ──────────────────────────────────────────────────────────────

function mockQuery(finalResult: { data?: unknown; error?: unknown; count?: number }) {
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
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(finalResult));
  // Default select to return chain so .select("id", { count, head }) also works
  chain.select = vi.fn().mockReturnValue(chain);
  return chain;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("aeo-tracking-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── TC1: calculateAEOScore formula validation ──
  test("TC1: calculateAEOScore — 모델 가중치 x 위치 가중치 공식 검증", async () => {
    const clientId = "client-aeo-01";
    const periodStart = "2026-03-10";
    const periodEnd = "2026-03-10";

    // Scenario: 2 answers
    // Answer1: chatgpt (weight=1.0), mentioned at position 1 (posWeight=1.0)
    // Answer2: perplexity (weight=0.8), mentioned at position 2 (posWeight=0.7)
    //
    // Formula: score = sum(model_w * pos_w) / sum(model_w) * 100
    //   = (1.0*1.0 + 0.8*0.7) / (1.0+0.8) * 100
    //   = (1.0 + 0.56) / 1.8 * 100
    //   = 1.56/1.8 * 100
    //   = 86.666... => rounded to 86.7

    const answers = [
      { id: "ans-1", question_id: "q-1", ai_model: "chatgpt", created_at: "2026-03-10T10:00:00" },
      { id: "ans-2", question_id: "q-1", ai_model: "perplexity", created_at: "2026-03-10T10:01:00" },
    ];

    const mentions = [
      { answer_id: "ans-1", position: 1, confidence: 0.95 },
      { answer_id: "ans-2", position: 2, confidence: 0.85 },
    ];

    const questions = [
      { id: "q-1", keyword_id: "kw-1" },
    ];

    const keywords = [
      { id: "kw-1", keyword: "강남 맛집" },
    ];

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "llm_answers") {
        return mockQuery({ data: answers });
      }
      if (table === "mentions") {
        return mockQuery({ data: mentions });
      }
      if (table === "questions") {
        return mockQuery({ data: questions });
      }
      if (table === "keywords") {
        return mockQuery({ data: keywords });
      }
      if (table === "aeo_scores") {
        // previous scores (none) + insert
        const q = mockQuery({ data: [] });
        q.insert = vi.fn().mockReturnValue({
          then: vi.fn((cb: (v: unknown) => void) => cb({ error: null })),
        });
        return q;
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await calculateAEOScore(clientId, periodStart, periodEnd);

    expect(result).not.toBeNull();
    expect(result!.overall_score).toBe(86.7);
    expect(result!.mention_count).toBe(2);
    expect(result!.total_queries).toBe(2);
  });

  // ── TC2: limitQuestionsByKeyword round-robin selection ──
  test("TC2: limitQuestionsByKeyword — 키워드별 라운드 로빈 선택", async () => {
    // We test this indirectly through runAEOTracking behavior.
    // Given 6 questions from 2 keywords, limit=4 → should pick 2 from each.
    const clientId = "client-aeo-02";

    const questionsFixture = [
      { id: "q1", question: "Q1-K1", keyword_id: "kw-A" },
      { id: "q2", question: "Q2-K1", keyword_id: "kw-A" },
      { id: "q3", question: "Q3-K1", keyword_id: "kw-A" },
      { id: "q4", question: "Q4-K2", keyword_id: "kw-B" },
      { id: "q5", question: "Q5-K2", keyword_id: "kw-B" },
      { id: "q6", question: "Q6-K2", keyword_id: "kw-B" },
    ];

    const trackedQuestionIds: string[] = [];

    (crawlLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
      response_text: "Some answer text",
      sources: [],
      crawl_method: "api",
    });

    (detectMentions as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "aeo_tracking_settings") {
        // max_questions_per_client_per_day = 4
        return mockQuery({
          data: [
            { setting_key: "max_questions_per_client_per_day", setting_value: "4" },
            { setting_key: "enabled_ai_models", setting_value: '["perplexity"]' },
            { setting_key: "repeat_count", setting_value: "1" },
            { setting_key: "cron_enabled", setting_value: "false" },
            { setting_key: "playwright_enabled", setting_value: "false" },
          ],
        });
      }
      if (table === "clients") {
        return mockQuery({ data: { name: "Test Brand", brand_persona: {} } });
      }
      if (table === "questions") {
        return mockQuery({ data: questionsFixture });
      }
      if (table === "llm_answers") {
        const q = mockQuery({ data: [] });
        q.insert = vi.fn().mockImplementation((payload: { question_id?: string }) => {
          if (payload.question_id) trackedQuestionIds.push(payload.question_id);
          const innerQ = mockQuery({ data: { id: `ans-${Math.random()}` } });
          return innerQ;
        });
        // Also handle select queries for calculateAEOScore
        return q;
      }
      if (table === "mentions") {
        const q = mockQuery({ data: [] });
        q.insert = vi.fn().mockReturnValue({ error: null });
        return q;
      }
      if (table === "aeo_scores") {
        const q = mockQuery({ data: [] });
        q.insert = vi.fn().mockReturnValue({
          then: vi.fn((cb: (v: unknown) => void) => cb({ error: null })),
        });
        return q;
      }
      if (table === "keywords") {
        return mockQuery({ data: [] });
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await runAEOTracking(clientId);

    // crawlLLM should be called exactly 4 times (4 questions x 1 model x 1 repeat)
    expect(crawlLLM).toHaveBeenCalledTimes(4);

    // Verify round-robin: calls should alternate between kw-A and kw-B
    const callArgs = (crawlLLM as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0] as string
    );
    // First round: Q1-K1 (kw-A), Q4-K2 (kw-B)
    // Second round: Q2-K1 (kw-A), Q5-K2 (kw-B)
    expect(callArgs).toContain("Q1-K1");
    expect(callArgs).toContain("Q4-K2");
    expect(callArgs).toContain("Q2-K1");
    expect(callArgs).toContain("Q5-K2");
    // Q3-K1 and Q6-K2 should NOT be included (only 4 out of 6)
    expect(callArgs).not.toContain("Q3-K1");
    expect(callArgs).not.toContain("Q6-K2");
  });

  // ── TC3: runAEOTracking processes questions x models ──
  test("TC3: runAEOTracking — 질문 x 모델 x repeat 처리", async () => {
    const clientId = "client-aeo-03";

    (crawlLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
      response_text: "Answer with brand mention",
      sources: ["https://example.com"],
      crawl_method: "api",
    });

    (detectMentions as ReturnType<typeof vi.fn>).mockResolvedValue([
      { brand: "TestBrand", is_target: true, position: 1, context: "ctx", sentiment: "positive", confidence: 0.9 },
    ]);

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "aeo_tracking_settings") {
        return mockQuery({
          data: [
            { setting_key: "max_questions_per_client_per_day", setting_value: "10" },
            { setting_key: "enabled_ai_models", setting_value: '["perplexity","claude"]' },
            { setting_key: "repeat_count", setting_value: "2" },
            { setting_key: "cron_enabled", setting_value: "false" },
            { setting_key: "playwright_enabled", setting_value: "false" },
          ],
        });
      }
      if (table === "clients") {
        return mockQuery({ data: { name: "TestBrand", brand_persona: { aliases: [] } } });
      }
      if (table === "questions") {
        return mockQuery({ data: [{ id: "q-1", question: "Test question?", keyword_id: "kw-1" }] });
      }
      if (table === "llm_answers") {
        const q = mockQuery({ data: { id: "ans-new" } });
        q.insert = vi.fn().mockReturnValue(q);
        return q;
      }
      if (table === "mentions") {
        const q = mockQuery({ data: [] });
        q.insert = vi.fn().mockReturnValue({ error: null });
        return q;
      }
      if (table === "aeo_scores") {
        const q = mockQuery({ data: [] });
        q.insert = vi.fn().mockReturnValue({
          then: vi.fn((cb: (v: unknown) => void) => cb({ error: null })),
        });
        return q;
      }
      if (table === "keywords") {
        return mockQuery({ data: [] });
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await runAEOTracking(clientId);

    expect(result.success).toBe(true);
    // 1 question x 2 models x 2 repeats = 4 crawl calls
    expect(crawlLLM).toHaveBeenCalledTimes(4);
    // tracked should be 4 (all successful)
    expect(result.tracked).toBe(4);
    // mentioned should be 4 (each crawl produces 1 target mention)
    expect(result.mentioned).toBe(4);
  });

  // ── TC4: getAEODashboardData returns score and trends ──
  test("TC4: getAEODashboardData — 점수, 트렌드, 모델별 데이터 반환", async () => {
    const clientId = "client-aeo-04";

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "aeo_scores") {
        const q = mockQuery({ data: [] });
        // First call (latest score): returns score 75.5
        // Second call (previous score): returns score 70.0
        let callCount = 0;
        q.select = vi.fn().mockReturnValue(q);
        q.eq = vi.fn().mockReturnValue(q);
        q.is = vi.fn().mockReturnValue(q);
        q.gte = vi.fn().mockReturnValue(q);
        q.lte = vi.fn().mockReturnValue(q);
        q.order = vi.fn().mockReturnValue(q);
        q.limit = vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return { ...q, data: [{ score: 75.5, period_start: "2026-03-10", details: {} }] };
          }
          return { ...q, data: [] };
        });
        q.range = vi.fn().mockImplementation(() => {
          return { ...q, data: [{ score: 70.0 }] };
        });
        return q;
      }
      if (table === "llm_answers") {
        return mockQuery({
          data: [
            { ai_model: "perplexity" },
            { ai_model: "perplexity" },
            { ai_model: "claude" },
          ],
        });
      }
      if (table === "mentions") {
        return mockQuery({ data: [] });
      }
      if (table === "questions") {
        return mockQuery({ data: [] });
      }
      if (table === "keywords") {
        return mockQuery({ data: [] });
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await getAEODashboardData(clientId);

    // Should return the structure
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("trend");
    expect(result).toHaveProperty("byModel");
    expect(result).toHaveProperty("recentMentions");
    expect(result).toHaveProperty("unmatchedQuestions");
    // byModel should have counts
    expect(result.byModel).toHaveProperty("perplexity");
    expect(result.byModel.perplexity).toBe(2);
    expect(result.byModel.claude).toBe(1);
  });
});
