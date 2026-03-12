/**
 * crawlers/index.ts
 * Phase 4+5: LLM 크롤러 통합 모듈
 *
 * 모델별 크롤링 함수 라우팅
 */

import type { LLMAnswer } from "./perplexity-crawler";
import { crawlPerplexity } from "./perplexity-crawler";
import { crawlClaude } from "./claude-crawler";

export type { LLMAnswer };
export { crawlPerplexity, crawlClaude };

// 모델별 rate limit 간격 (ms)
export const MODEL_RATE_LIMITS: Record<string, number> = {
  perplexity: 2000,
  claude: 1000,
  chatgpt: 10000,
  gemini: 10000,
};

// AI 모델별 score 가중치
export const MODEL_WEIGHTS: Record<string, number> = {
  chatgpt: 1.0,
  perplexity: 0.8,
  gemini: 0.7,
  claude: 0.5,
};

/**
 * 모델명으로 적절한 크롤러 호출
 */
export async function crawlLLM(
  question: string,
  model: string,
  playwrightEnabled: boolean = false
): Promise<LLMAnswer | null> {
  switch (model) {
    case "perplexity":
      return crawlPerplexity(question);

    case "claude":
      return crawlClaude(question);

    case "chatgpt": {
      if (!playwrightEnabled) {
        console.log("[crawlLLM] ChatGPT requires playwright, but playwright_enabled=false");
        return null;
      }
      // Dynamic import — playwright 미설치 시 graceful skip
      try {
        const { crawlChatGPT } = await import("./chatgpt-crawler");
        return crawlChatGPT(question);
      } catch {
        console.log("[crawlLLM] ChatGPT crawler import failed, skipping");
        return null;
      }
    }

    case "gemini": {
      if (!playwrightEnabled) {
        console.log("[crawlLLM] Gemini requires playwright, but playwright_enabled=false");
        return null;
      }
      try {
        const { crawlGemini } = await import("./gemini-crawler");
        return crawlGemini(question);
      } catch {
        console.log("[crawlLLM] Gemini crawler import failed, skipping");
        return null;
      }
    }

    default:
      console.error(`[crawlLLM] Unknown model: ${model}`);
      return null;
  }
}
