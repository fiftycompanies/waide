/**
 * mention-detector.ts
 * Phase 4+5: Mention Detection — LLM 기반 + 문자열 매칭 fallback
 *
 * 실행 순서:
 * 1. detectMentionsLLM() 시도
 * 2. 성공 → Mention[] 반환
 * 3. LLM 실패 → detectMentionByString() fallback
 * 4. fallback 성공 → Mention[] 반환 (confidence: 0.5)
 * 5. 둘 다 실패 → 빈 배열 (미언급)
 */

import { loadPromptTemplate, fillPromptTemplate } from "@/lib/prompt-loader";

export interface DetectedMention {
  brand: string;
  is_target: boolean;
  position: number | null;
  context: string | null;
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
}

/**
 * LLM 기반 멘션 추출 (메인)
 */
export async function detectMentionsLLM(
  responseText: string,
  brandName: string,
  brandAliases: string[]
): Promise<DetectedMention[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  try {
    const template = await loadPromptTemplate("mention_detection");
    const prompt = fillPromptTemplate(template, {
      response_text: responseText.substring(0, 4000),
      brand_name: brandName,
      brand_aliases: brandAliases.join(", ") || "없음",
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("[MentionDetector] LLM API error:", response.status);
      return [];
    }

    const data = await response.json();
    const text = data.content?.find((b: { type: string }) => b.type === "text")?.text || "[]";

    // JSON 파싱 (코드 블록 처리)
    const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) return [];

    return parsed.map((m: {
      brand?: string;
      is_target?: boolean;
      position?: number | null;
      context?: string | null;
      sentiment?: string;
    }) => ({
      brand: m.brand || "unknown",
      is_target: m.is_target ?? false,
      position: m.position ?? null,
      context: m.context ?? null,
      sentiment: (m.sentiment as "positive" | "neutral" | "negative") || "neutral",
      confidence: 1.0,
    }));
  } catch (error) {
    console.error("[MentionDetector] LLM detection error:", error);
    return [];
  }
}

/**
 * 문자열 매칭 fallback
 */
export function detectMentionByString(
  text: string,
  brandName: string,
  aliases: string[]
): DetectedMention | null {
  const allNames = [brandName, ...aliases].filter(Boolean);

  for (const name of allNames) {
    const lowerText = text.toLowerCase();
    const lowerName = name.toLowerCase();
    const idx = lowerText.indexOf(lowerName);

    if (idx !== -1) {
      const contextStart = Math.max(0, idx - 30);
      const contextEnd = Math.min(text.length, idx + name.length + 30);
      const context = text.substring(contextStart, contextEnd);

      return {
        brand: brandName,
        is_target: true,
        position: null, // 문자열 매칭으로는 순서 판단 불가
        context,
        sentiment: "neutral", // 문자열 매칭으로는 감성 판단 불가
        confidence: 0.5,
      };
    }
  }

  return null;
}

/**
 * 통합 멘션 감지 — LLM 우선, 문자열 매칭 fallback
 */
export async function detectMentions(
  responseText: string,
  brandName: string,
  brandAliases: string[]
): Promise<DetectedMention[]> {
  // 1. LLM 기반 추출 시도
  const llmMentions = await detectMentionsLLM(responseText, brandName, brandAliases);

  if (llmMentions.length > 0) {
    return llmMentions;
  }

  // 2. LLM 결과 없음 → 문자열 매칭 fallback
  const stringMatch = detectMentionByString(responseText, brandName, brandAliases);

  if (stringMatch) {
    return [stringMatch];
  }

  // 3. 둘 다 실패 → 미언급
  return [];
}
