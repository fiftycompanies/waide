import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/agent-runner", () => ({
  runAgent: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/service";
import { runAgent } from "@/lib/agent-runner";

describe("content-qc-v2", () => {
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

  function setupDbMocks() {
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // client brand_persona
        return mockChain({ data: { brand_persona: { tone: "해요체", avoid_angles: [] } }, error: null });
      }
      if (callCount === 2) {
        // content_benchmarks
        return mockChain({ data: null, error: null }); // no benchmark
      }
      if (callCount === 3) {
        // previous contents
        return mockChain({ data: [], error: null });
      }
      if (callCount === 4) {
        // existing metadata select
        return mockChain({ data: { metadata: {} }, error: null });
      }
      // metadata update
      return mockChain({ data: null, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
    return mockFrom;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TC1: Perfect content scores 100, QC PASS
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: perfect content scores 100 and passes QC", async () => {
    setupDbMocks();

    (runAgent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        score: 100,
        pass: true,
        items: [
          { name: "글자수", score: 15, maxScore: 15, detail: "2800자 (기준 2000자 이상)", status: "pass" },
          { name: "해요체", score: 10, maxScore: 10, detail: "95% 해요체 사용", status: "pass" },
          { name: "키워드SEO", score: 15, maxScore: 15, detail: "키워드 밀도 2.5%", status: "pass" },
          { name: "H2구조", score: 10, maxScore: 10, detail: "H2 5개 사용", status: "pass" },
          { name: "이미지", score: 10, maxScore: 10, detail: "이미지 안내 3개", status: "pass" },
          { name: "금지표현", score: 10, maxScore: 10, detail: "금지 표현 없음", status: "pass" },
          { name: "AEO최적화", score: 15, maxScore: 15, detail: "AEO 스니펫 포함", status: "pass" },
          { name: "자연스러움", score: 10, maxScore: 10, detail: "자연스러운 흐름", status: "pass" },
          { name: "메타디스크립션", score: 5, maxScore: 5, detail: "적절한 길이", status: "pass" },
        ],
        top_issues: [],
        verdict: "완벽한 콘텐츠입니다.",
        rewrite_needed: false,
        rewrite_focus: [],
        duplication_check: null,
        persona_check: null,
        benchmark_comparison: null,
      },
    });

    const { runQcV2 } = await import("@/lib/content-qc-v2");
    const result = await runQcV2({
      contentId: "content-1",
      clientId: "c1",
      title: "강남 맛집 TOP 10 추천",
      body: "## 강남 맛집 TOP 10\n\n강남에서 맛있는 곳을 소개해요.\n\n".repeat(50),
      metaDescription: "강남 맛집 추천 리스트입니다.",
      keyword: "강남 맛집",
    });

    expect(result.score).toBe(100);
    expect(result.pass).toBe(true);
    expect(result.top_issues).toHaveLength(0);
    expect(result.rewrite_needed).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: Content below 70 points is QC FAIL
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: content below 70 points fails QC", async () => {
    setupDbMocks();

    (runAgent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        score: 55,
        pass: false,
        items: [
          { name: "글자수", score: 5, maxScore: 15, detail: "800자 (기준 미달)", status: "fail" },
          { name: "해요체", score: 8, maxScore: 10, detail: "70% 해요체", status: "warn" },
          { name: "키워드SEO", score: 7, maxScore: 15, detail: "키워드 밀도 0.5%", status: "fail" },
          { name: "H2구조", score: 5, maxScore: 10, detail: "H2 2개", status: "warn" },
          { name: "이미지", score: 5, maxScore: 10, detail: "이미지 안내 1개", status: "warn" },
          { name: "금지표현", score: 10, maxScore: 10, detail: "OK", status: "pass" },
          { name: "AEO최적화", score: 5, maxScore: 15, detail: "AEO 부족", status: "fail" },
          { name: "자연스러움", score: 7, maxScore: 10, detail: "약간 부자연스러움", status: "warn" },
          { name: "메타디스크립션", score: 3, maxScore: 5, detail: "너무 짧음", status: "warn" },
        ],
        top_issues: ["글자수 부족", "키워드 밀도 낮음", "AEO 최적화 미흡"],
        verdict: "글자수와 키워드 밀도를 개선해야 합니다.",
        rewrite_needed: true,
        rewrite_focus: ["글자수", "키워드SEO", "AEO최적화"],
        duplication_check: null,
        persona_check: null,
        benchmark_comparison: null,
      },
    });

    const { runQcV2 } = await import("@/lib/content-qc-v2");
    const result = await runQcV2({
      contentId: "content-2",
      clientId: "c1",
      title: "테스트",
      body: "짧은 본문이에요.",
      keyword: "강남 맛집",
    });

    expect(result.score).toBe(55);
    expect(result.pass).toBe(false);
    expect(result.rewrite_needed).toBe(true);
    expect(result.top_issues.length).toBeGreaterThan(0);
    expect(result.rewrite_focus.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: 해요체 < 60% is automatic FAIL regardless of score
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: 해요체 below 60% triggers automatic FAIL", async () => {
    setupDbMocks();

    // Even with a total score of 75 (above 70), 해요체 < 60% should cause FAIL
    (runAgent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        score: 75,
        pass: false, // The QC agent itself should flag this as fail
        items: [
          { name: "글자수", score: 15, maxScore: 15, detail: "OK", status: "pass" },
          { name: "해요체", score: 3, maxScore: 10, detail: "40% 해요체 (60% 미만 → 자동 FAIL)", status: "fail" },
          { name: "키워드SEO", score: 12, maxScore: 15, detail: "OK", status: "pass" },
          { name: "H2구조", score: 10, maxScore: 10, detail: "OK", status: "pass" },
          { name: "이미지", score: 8, maxScore: 10, detail: "OK", status: "pass" },
          { name: "금지표현", score: 10, maxScore: 10, detail: "OK", status: "pass" },
          { name: "AEO최적화", score: 10, maxScore: 15, detail: "OK", status: "pass" },
          { name: "자연스러움", score: 5, maxScore: 10, detail: "OK", status: "pass" },
          { name: "메타디스크립션", score: 2, maxScore: 5, detail: "OK", status: "pass" },
        ],
        critical_issues: ["해요체 비율 40% (60% 미만 자동 FAIL)"],
        verdict: "해요체 비율이 60% 미만이므로 자동 FAIL입니다.",
        rewrite_needed: true,
        rewrite_focus: ["해요체"],
        duplication_check: null,
        persona_check: null,
        benchmark_comparison: null,
      },
    });

    const { runQcV2 } = await import("@/lib/content-qc-v2");
    const result = await runQcV2({
      contentId: "content-3",
      clientId: "c1",
      title: "해요체 미달 콘텐츠",
      body: "이것은 테스트입니다. 블로그 포스트를 작성한다. 맛집을 소개한다.",
      keyword: "강남 맛집",
    });

    // Even though score is 75 (above 70), pass should be false due to 해요체
    expect(result.pass).toBe(false);
    expect(result.rewrite_needed).toBe(true);
    // top_issues should reference 해요체
    expect(result.top_issues.some((i) => i.includes("해요체"))).toBe(true);
  });
});
