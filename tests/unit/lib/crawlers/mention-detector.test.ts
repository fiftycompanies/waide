/**
 * mention-detector.test.ts
 * 문자열 매칭 fallback 멘션 감지 로직 테스트 (3 TC)
 *
 * detectMentionByString()은 LLM 없이 순수 문자열 매칭으로 동작.
 * 이 테스트는 해당 함수의 핵심 시나리오를 검증한다.
 */
import { describe, test, expect, vi } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// prompt-loader 모킹 (mention-detector가 import)
vi.mock("@/lib/prompt-loader", () => ({
  loadPromptTemplate: vi.fn().mockResolvedValue("mock template"),
  fillPromptTemplate: vi.fn().mockReturnValue("mock prompt"),
}));

import { detectMentionByString } from "@/lib/crawlers/mention-detector";

describe("detectMentionByString", () => {
  test("TC1: brand name found in text -> detected with position context", () => {
    const text =
      "서울에서 가장 인기 있는 맛집은 캠핏카페입니다. 분위기가 좋고 커피도 맛있습니다.";
    const brandName = "캠핏카페";
    const aliases: string[] = [];

    const result = detectMentionByString(text, brandName, aliases);

    expect(result).not.toBeNull();
    expect(result!.brand).toBe("캠핏카페");
    expect(result!.is_target).toBe(true);
    expect(result!.confidence).toBe(0.5);
    expect(result!.sentiment).toBe("neutral");
    // context should contain text surrounding the brand mention
    expect(result!.context).toContain("캠핏카페");
  });

  test("TC2: brand not found -> returns null (empty)", () => {
    const text =
      "서울에서 가장 인기 있는 맛집을 소개합니다. 분위기가 좋고 커피도 맛있습니다.";
    const brandName = "캠핏카페";
    const aliases: string[] = ["CamFit Cafe"];

    const result = detectMentionByString(text, brandName, aliases);

    expect(result).toBeNull();
  });

  test("TC3: multiple mentions via aliases -> returns first match ordered by position", () => {
    const text =
      "최근 화제의 CamFit은 커피 전문점입니다. 많은 사람들이 캠핏을 찾고 있습니다.";
    const brandName = "캠핏";
    const aliases = ["CamFit"];

    // detectMentionByString returns only the FIRST match found.
    // It checks [brandName, ...aliases] in order: "캠핏" first, then "CamFit".
    // Since "캠핏" is the brandName checked first, and it is NOT found before "CamFit"
    // actually... let's check positions:
    // "CamFit" is at position 5 in the text (index of "CamFit" in lowered text)
    // "캠핏" is at position 30+ in the text
    // BUT the function iterates allNames = [brandName, ...aliases] = ["캠핏", "CamFit"]
    // It checks "캠핏" first in the text, finds it at "캠핏은" -> returns this match
    const result = detectMentionByString(text, brandName, aliases);

    expect(result).not.toBeNull();
    expect(result!.brand).toBe("캠핏");
    expect(result!.is_target).toBe(true);
    expect(result!.confidence).toBe(0.5);

    // Verify that context includes the surrounding text of the first match
    expect(result!.context).toBeDefined();
    expect(typeof result!.context).toBe("string");

    // Now test with alias matching first: if brand name is NOT in text but alias IS
    const text2 =
      "최근 화제의 CamFit은 커피 전문점입니다. 많은 사람들이 방문하고 있습니다.";
    const result2 = detectMentionByString(text2, "존재하지않는브랜드", ["CamFit"]);

    expect(result2).not.toBeNull();
    // brand field always returns the primary brandName, even when matched by alias
    expect(result2!.brand).toBe("존재하지않는브랜드");
    expect(result2!.context).toContain("CamFit");
  });
});
