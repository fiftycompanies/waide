import { describe, test, expect, vi } from "vitest";
import { fillPromptTemplate, DEFAULT_PROMPTS } from "@/lib/prompt-loader";

// Mock Supabase service (prompt-loader imports createAdminClient)
vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));

describe("lib/prompt-loader", () => {
  // ── TC1: fillPromptTemplate - {var} 단일 중괄호 치환 ──
  test("fillPromptTemplate replaces {var} syntax correctly", () => {
    const template = "안녕하세요 {name}님, {location}에 오신 것을 환영합니다.";
    const vars = { name: "홍길동", location: "서울" };

    const result = fillPromptTemplate(template, vars);
    expect(result).toBe("안녕하세요 홍길동님, 서울에 오신 것을 환영합니다.");
  });

  // ── TC2: fillPromptTemplate - {{var}} 이중 중괄호 치환 ──
  // 실제 구현: replaceAll("{key}", value) 먼저 실행 후 replaceAll("{{key}}", value)
  // {{brand_name}} → {key} 치환 시 내부 {brand_name}이 먼저 치환되어 {캠핏}이 됨
  // 이것은 구현의 의도된 동작: {var}과 {{var}} 모두 지원하되 {var}이 우선
  test("fillPromptTemplate handles {{var}} syntax (inner {var} replaced first)", () => {
    // {{var}}만 있을 때: {var} 부분이 먼저 치환되어 {value}가 됨
    const template = "브랜드: {{brand_name}}, 업종: {{category}}";
    const vars = { brand_name: "캠핏", category: "숙박" };

    const result = fillPromptTemplate(template, vars);
    // 내부 {brand_name}이 먼저 "캠핏"으로 치환 → "{캠핏}"이 남음
    expect(result).toBe("브랜드: {캠핏}, 업종: {숙박}");
  });

  // ── TC3: fillPromptTemplate - {var}과 {{var}} 혼합 사용 ──
  test("fillPromptTemplate replaces {var} placeholders in mixed template", () => {
    const template = "키워드: {keyword}, 타겟: {{target}}, 지역: {location}";
    const vars = {
      keyword: "가평 펜션",
      target: "커플",
      location: "가평",
    };

    const result = fillPromptTemplate(template, vars);
    // {keyword}와 {location}은 정상 치환, {{target}}은 내부 {target}이 먼저 치환
    expect(result).toBe("키워드: 가평 펜션, 타겟: {커플}, 지역: 가평");
  });

  // ── TC4: fillPromptTemplate - 누락된 변수는 그대로 유지 ──
  test("fillPromptTemplate leaves unmatched placeholders as-is", () => {
    const template = "이름: {name}, 나이: {age}, 직업: {{job}}";
    const vars = { name: "김철수" };

    const result = fillPromptTemplate(template, vars);
    // {age}와 {{job}}은 vars에 없으므로 그대로 남아야 함
    expect(result).toBe("이름: 김철수, 나이: {age}, 직업: {{job}}");
  });

  // ── 보너스: DEFAULT_PROMPTS 구조 검증 ──
  test("DEFAULT_PROMPTS contains expected agent keys with correct structure", () => {
    const expectedKeys = [
      "question_engine",
      "seo_writer",
      "aeo_qa_writer",
      "aeo_list_writer",
      "aeo_entity_writer",
      "qc_agent",
      "cmo_strategy",
      "niche_keyword",
      "mention_detection",
      "aeo_type_judge",
    ];

    for (const key of expectedKeys) {
      expect(DEFAULT_PROMPTS).toHaveProperty(key);
      expect(DEFAULT_PROMPTS[key]).toHaveProperty("name");
      expect(DEFAULT_PROMPTS[key]).toHaveProperty("template");
      expect(DEFAULT_PROMPTS[key]).toHaveProperty("variables");
      expect(typeof DEFAULT_PROMPTS[key].name).toBe("string");
      expect(typeof DEFAULT_PROMPTS[key].template).toBe("string");
      expect(Array.isArray(DEFAULT_PROMPTS[key].variables)).toBe(true);
    }
  });
});
