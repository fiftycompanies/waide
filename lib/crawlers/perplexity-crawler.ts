/**
 * perplexity-crawler.ts
 * Phase 4+5: Perplexity API 기반 LLM 크롤링
 *
 * PERPLEXITY_API_KEY 없으면 graceful skip
 */

export interface LLMAnswer {
  response_text: string;
  sources: string[];
  crawl_method: "api" | "playwright";
}

export async function crawlPerplexity(question: string): Promise<LLMAnswer | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.log("[Perplexity] PERPLEXITY_API_KEY not set, skipping");
    return null;
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [{ role: "user", content: question }],
        return_citations: true,
      }),
    });

    if (!response.ok) {
      console.error("[Perplexity] API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];

    return {
      response_text: text,
      sources: citations,
      crawl_method: "api",
    };
  } catch (error) {
    console.error("[Perplexity] crawl error:", error);
    return null;
  }
}
