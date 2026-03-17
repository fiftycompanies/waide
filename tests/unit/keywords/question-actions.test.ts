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
vi.mock("@/lib/actions/point-actions", () => ({
  spendPoints: vi.fn().mockResolvedValue({ success: true }),
  canGenerateContent: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock("@/lib/prompt-loader", () => ({
  loadPromptTemplate: vi.fn().mockResolvedValue("Generate questions for {{keyword}} in {{category}} at {{location}}"),
  fillPromptTemplate: vi.fn().mockImplementation((tmpl: string, vars: Record<string, string>) => {
    let result = tmpl;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    }
    return result;
  }),
}));

import { createAdminClient } from "@/lib/supabase/service";

// Mock global fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("question-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockFetch.mockReset();
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
  // TC1: generateQuestions from 3 sources (llm/paa/naver)
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: generateQuestions generates questions from 3 sources", async () => {
    // Set required env vars for the 3 source functions
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.SERPER_API_KEY = "test-serper-key";

    // Mock fetch by URL pattern — order-independent (LLM has async loadPromptTemplate
    // so PAA/Naver fetch calls happen BEFORE LLM fetch)
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("anthropic.com")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: '[{"question":"강남 맛집 추천 어디?","intent":"recommendation"},{"question":"강남역 근처 데이트 식당은?","intent":"recommendation"}]' }],
          }),
        });
      }
      if (typeof url === "string" && url.includes("serper.dev")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            peopleAlsoAsk: [
              { question: "강남에서 맛있는 곳은?" },
              { question: "강남 점심 추천은?" },
            ],
          }),
        });
      }
      if (typeof url === "string" && url.includes("naver.com")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [["강남 맛집 추천"], ["강남 맛집 순위"]],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });

    // DB mocks
    let fromCallCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // keyword lookup
        return mockChain({ data: { keyword: "강남 맛집", metadata: {} }, error: null });
      }
      if (fromCallCount === 2) {
        // client lookup
        return mockChain({ data: { name: "TestBrand", brand_persona: { category: "음식점", region: "강남" } }, error: null });
      }
      if (fromCallCount === 3) {
        // existing count
        return mockChain({ count: 0 });
      }
      // Insert
      return mockChain({ data: null, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { generateQuestions } = await import("@/lib/actions/question-actions");
    const result = await generateQuestions("k1", "c1");

    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: addManualQuestion with source='manual'
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: addManualQuestion inserts with source=manual", async () => {
    // Mock Claude for intent detection (optional, may fail gracefully)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: "recommendation" }],
      }),
    });

    const insertChain = mockChain({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(insertChain),
    });

    const { addManualQuestion } = await import("@/lib/actions/question-actions");
    const result = await addManualQuestion("k1", "c1", "강남에서 제일 맛있는 곳은?");

    expect(result).toEqual({ success: true });
    expect(insertChain.insert).toHaveBeenCalled();

    const insertCall = (insertChain.insert as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(insertCall[0]).toMatchObject({
      keyword_id: "k1",
      client_id: "c1",
      source: "manual",
      question: "강남에서 제일 맛있는 곳은?",
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: deleteQuestion
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: deleteQuestion removes question without content_id", async () => {
    // First call: check content_id
    const selectChain = mockChain({ data: { content_id: null }, error: null });
    // Second call: delete
    const deleteChain = mockChain({ data: null, error: null });

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return deleteChain;
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { deleteQuestion } = await import("@/lib/actions/question-actions");
    const result = await deleteQuestion("q1");

    expect(result).toEqual({ success: true });
    expect(deleteChain.delete).toHaveBeenCalled();
  });

  test("TC3b: deleteQuestion rejects when content_id is linked", async () => {
    const selectChain = mockChain({ data: { content_id: "content-123" }, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(selectChain),
    });

    const { deleteQuestion } = await import("@/lib/actions/question-actions");
    const result = await deleteQuestion("q1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("콘텐츠가 연결된 질문은 삭제할 수 없습니다");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC4: getQuestions with filters (keyword, source)
  // ─────────────────────────────────────────────────────────────────────────
  test("TC4: getQuestions applies keyword and source filters", async () => {
    const questionsData = [
      { id: "q1", keyword_id: "k1", client_id: "c1", question: "강남 맛집?", intent: "recommendation", source: "llm", language: "ko", is_selected: false, content_id: null, created_at: "2026-03-01" },
    ];

    // queries: questions, keywords, contents (content_ids empty → skipped)
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return mockChain({ data: questionsData, error: null });
      }
      if (callCount === 2) {
        return mockChain({ data: [{ id: "k1", keyword: "강남 맛집" }], error: null });
      }
      return mockChain({ data: [], error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { getQuestions } = await import("@/lib/actions/question-actions");
    const result = await getQuestions("c1", { keywordId: "k1", source: "llm" });

    expect(result).toHaveLength(1);
    expect(result[0].keyword_text).toBe("강남 맛집");
    expect(result[0].source).toBe("llm");
  });
});
