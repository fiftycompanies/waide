/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
/**
 * content-mapper.ts
 * 복제된 HTML을 분석하여 "어떤 텍스트를 무엇으로 바꿀지" 교체 맵 생성
 *
 * AI의 역할: "생성"이 아니라 "어떤 텍스트를 무엇으로 바꿀지 판단"
 */

import * as cheerio from "cheerio";
import type { AnyNode, Text as DomText, Element as DomElement } from "domhandler";

// ── 입력 타입 ──────────────────────────────────────────────────────────────────

export interface BrandInfo {
  name: string;
  industry: string;
  phone: string | null;
  address: string | null;
  services: string[];
  keywords: string[];
  tone: string | null;
}

export interface PersonaInfo {
  usp: string | null;
  target_customer: string | null;
  tagline: string | null;
  one_liner: string | null;
}

// ── 출력 타입 ──────────────────────────────────────────────────────────────────

export interface TextReplacement {
  original: string;
  replacement: string;
}

// ── 텍스트 추출 ────────────────────────────────────────────────────────────────

/** HTML에서 의미 있는 텍스트 노드만 추출 (CSS·JS 제외) */
export function extractTextsFromHtml(html: string): string[] {
  const $ = cheerio.load(html);

  // 제외 대상 태그
  const SKIP_TAGS = new Set([
    "script", "style", "noscript", "iframe", "svg", "code", "pre",
  ]);

  const texts: string[] = [];
  const seen = new Set<string>();

  function walk(node: AnyNode) {
    if (node.type === "text") {
      const text = (node as DomText).data?.trim();
      if (text && text.length >= 2 && text.length <= 500 && !seen.has(text)) {
        // 순수 숫자, 특수문자만 있는 텍스트 제외
        if (/[가-힣a-zA-Z]/.test(text)) {
          seen.add(text);
          texts.push(text);
        }
      }
      return;
    }

    if (node.type === "tag") {
      const el = node as DomElement;
      if (SKIP_TAGS.has(el.tagName?.toLowerCase())) return;

      for (const child of el.children || []) {
        walk(child);
      }
    }
  }

  // body만 순회 (head 영역 제외)
  const body = $("body")[0];
  if (body) {
    for (const child of body.children || []) {
      walk(child);
    }
  }

  return texts;
}

// ── Claude API로 교체 맵 생성 ─────────────────────────────────────────────────

export async function buildReplacementMap(
  clonedHtml: string,
  brandInfo: BrandInfo,
  persona: PersonaInfo,
  apiKey: string
): Promise<TextReplacement[]> {
  const extractedTexts = extractTextsFromHtml(clonedHtml);

  if (extractedTexts.length === 0) {
    console.warn("[ContentMapper] 추출된 텍스트 없음");
    return [];
  }

  // 텍스트가 너무 많으면 잘라서 전송 (토큰 제한)
  const maxTexts = 200;
  const textsToSend = extractedTexts.slice(0, maxTexts);

  console.log(`[ContentMapper] 추출된 텍스트 ${extractedTexts.length}개 (전송: ${textsToSend.length}개)`);

  const brandInfoJson = JSON.stringify({
    name: brandInfo.name,
    industry: brandInfo.industry,
    phone: brandInfo.phone,
    address: brandInfo.address,
    services: brandInfo.services,
    keywords: brandInfo.keywords,
    tone: brandInfo.tone,
    usp: persona.usp,
    target_customer: persona.target_customer,
    tagline: persona.tagline,
    one_liner: persona.one_liner,
  }, null, 2);

  const prompt = `아래는 레퍼런스 사이트에서 추출한 텍스트 목록이다.
각 텍스트를 [브랜드 정보]에 맞게 교체할 내용을 JSON으로만 반환하라.

규칙:
- 레퍼런스 텍스트의 길이·스타일·형식을 최대한 유지
- 레퍼런스 브랜드명 → "${brandInfo.name}"으로 교체
- 서비스명 → [브랜드 정보]의 services에서 매칭 (없으면 업종에 맞게 적절히 변환)
- 연락처 → "${brandInfo.phone || "연락처 없음"}"
- 주소 → "${brandInfo.address || "주소 없음"}"
- 슬로건/설명 → USP/tagline/one_liner 활용하여 적절히 교체
- 업종과 무관한 텍스트(저작권·면책·개인정보처리방침 등)는 교체하지 않음 → skip
- 네비게이션 메뉴 텍스트(홈, 소개, 서비스 등 일반적인 단어)는 교체하지 않음 → skip
- 숫자 통계("4000+", "300개" 등)는 적절히 교체하되 형식 유지
- 원본 텍스트가 한국어면 한국어로, 영어면 영어로 교체
- 교체가 불필요한 텍스트는 아예 포함하지 말 것 (skip)

[레퍼런스 텍스트 목록]
${textsToSend.map((t, i) => `${i + 1}. "${t}"`).join("\n")}

[브랜드 정보]
${brandInfoJson}

반드시 아래 JSON 형식으로만 응답하라. 다른 텍스트 금지:
{ "replacements": [
  { "original": "원본 텍스트 (정확히 일치해야 함)", "replacement": "교체할 텍스트" }
]}`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`ContentMapper API 실패 (${resp.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await resp.json();
  const responseText: string = data.content?.[0]?.text || "";

  if (!responseText) {
    throw new Error("ContentMapper: AI 응답 비어있음");
  }

  // JSON 파싱
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("ContentMapper: JSON을 찾을 수 없음");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { replacements: TextReplacement[] };
    const replacements = (parsed.replacements || []).filter(
      (r) => r.original && r.replacement && r.original !== r.replacement
    );

    console.log(`[ContentMapper] 교체 맵 생성 완료: ${replacements.length}건`);
    return replacements;
  } catch {
    throw new Error("ContentMapper: JSON 파싱 실패");
  }
}
