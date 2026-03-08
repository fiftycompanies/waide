/**
 * claude-crawler.ts
 * Phase 4+5: Claude API 기반 LLM 크롤링
 *
 * 기존 ANTHROPIC_API_KEY 사용
 * 일반 사용자 질문으로 Claude에게 질문 → 답변 수집
 */

import type { LLMAnswer } from "./perplexity-crawler";

export async function crawlClaude(question: string): Promise<LLMAnswer | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("[Claude Crawler] ANTHROPIC_API_KEY not set, skipping");
    return null;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!response.ok) {
      console.error("[Claude Crawler] API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text =
      data.content?.find((b: { type: string }) => b.type === "text")?.text || "";

    return {
      response_text: text,
      sources: [], // Claude API에는 인용 없음
      crawl_method: "api",
    };
  } catch (error) {
    console.error("[Claude Crawler] crawl error:", error);
    return null;
  }
}
