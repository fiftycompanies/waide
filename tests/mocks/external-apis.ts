/**
 * 외부 API 모킹 (Naver, Claude, Perplexity, Slack, Resend)
 */
import { vi } from "vitest";

// ── Naver API 모킹 ──────────────────────────────────────

export const mockNaverSearchResponse = {
  items: [
    { title: "테스트 블로그 글", link: "https://blog.naver.com/test", description: "테스트 설명" },
    { title: "테스트 블로그 글 2", link: "https://blog.naver.com/test2", description: "테스트 설명 2" },
  ],
  total: 2,
  start: 1,
  display: 2,
};

export const mockNaverAdApiResponse = {
  keywordList: [
    { relKeyword: "강남 맛집", monthlyPcQcCnt: 5000, monthlyMobileQcCnt: 15000, compIdx: "중간" },
    { relKeyword: "홍대 카페", monthlyPcQcCnt: 3000, monthlyMobileQcCnt: 12000, compIdx: "높음" },
  ],
};

// ── Claude API 모킹 ──────────────────────────────────────

export const mockClaudeResponse = {
  content: [
    {
      type: "text",
      text: JSON.stringify({ result: "테스트 결과" }),
    },
  ],
  model: "claude-haiku-4-5-20251001",
  usage: { input_tokens: 100, output_tokens: 200 },
};

// ── Perplexity API 모킹 ─────────────────────────────────

export const mockPerplexityResponse = {
  choices: [
    {
      message: {
        content: "테스트 AI 응답입니다. 강남 맛집을 추천합니다.",
      },
    },
  ],
  citations: ["https://example.com/source1"],
};

// ── Slack Webhook 모킹 ──────────────────────────────────

export const mockSlackWebhook = vi.fn().mockResolvedValue({ ok: true });

// ── Resend API 모킹 ─────────────────────────────────────

export const mockResendSend = vi.fn().mockResolvedValue({ id: "test-email-id" });

// ── 전역 fetch 모킹 헬퍼 ────────────────────────────────

export function mockFetchResponse(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers({ "content-type": "application/json" }),
  });
}

export function mockFetchError(message = "Network Error") {
  return vi.fn().mockRejectedValue(new Error(message));
}

// 여러 URL 기반 fetch 모킹
export function mockFetchByUrl(urlResponses: Record<string, { body: unknown; status?: number }>) {
  return vi.fn().mockImplementation((url: string) => {
    for (const [pattern, response] of Object.entries(urlResponses)) {
      if (url.includes(pattern)) {
        const status = response.status ?? 200;
        return Promise.resolve({
          ok: status >= 200 && status < 300,
          status,
          json: () => Promise.resolve(response.body),
          text: () => Promise.resolve(JSON.stringify(response.body)),
          headers: new Headers({ "content-type": "application/json" }),
        });
      }
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Not Found" }),
      text: () => Promise.resolve("Not Found"),
      headers: new Headers(),
    });
  });
}
