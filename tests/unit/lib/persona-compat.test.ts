import { describe, it, expect } from "vitest";
import {
  normalizePersona,
  getPersonaForPipeline,
  syncFlatFromEnhanced,
} from "@/lib/utils/persona-compat";
import type { EnhancedBrandPersona } from "@/lib/actions/persona-actions";

describe("persona-compat", () => {
  // ── normalizePersona ──

  describe("normalizePersona", () => {
    it("null/undefined → 기본 v2 객체 반환", () => {
      const result = normalizePersona(null);
      expect(result.persona_version).toBe(2);
      expect(result.confirmation_status).toBe("pending");
    });

    it("이미 v2면 그대로 반환", () => {
      const v2: Record<string, unknown> = {
        persona_version: 2,
        one_liner: "테스트 브랜드",
        ai_inferred: {
          target_customer: { primary: "20대 커플" },
        },
      };
      const result = normalizePersona(v2);
      expect(result.one_liner).toBe("테스트 브랜드");
      expect(result.ai_inferred?.target_customer?.primary).toBe("20대 커플");
    });

    it("v1 flat → v2 변환: target_audience → ai_inferred.target_customer.primary", () => {
      const v1 = {
        one_liner: "캠핏 글램핑",
        target_audience: "30대 직장인",
        tone: "친근하고 따뜻한",
        strengths: ["넓은 공간", "깨끗한 시설"],
        content_angles: ["글램핑 추천", "커플 데이트"],
      };
      const result = normalizePersona(v1);
      expect(result.persona_version).toBe(2);
      expect(result.ai_inferred?.target_customer?.primary).toBe("30대 직장인");
      expect(result.ai_inferred?.tone?.style).toBe("친근하고 따뜻한");
      expect(result.ai_inferred?.usp?.points).toEqual(["넓은 공간", "깨끗한 시설"]);
      expect(result.ai_inferred?.content_direction?.angles).toEqual(["글램핑 추천", "커플 데이트"]);
      // flat 필드 보존
      expect(result.one_liner).toBe("캠핏 글램핑");
      expect(result.tone).toBe("친근하고 따뜻한");
    });

    it("v1 flat: primary_target 우선 매핑", () => {
      const v1 = {
        primary_target: "20대 커플",
        target_audience: "30대 직장인", // primary_target이 우선
      };
      const result = normalizePersona(v1);
      expect(result.ai_inferred?.target_customer?.primary).toBe("20대 커플");
    });

    it("v1 flat: confirmed = false", () => {
      const v1 = { tone: "전문적인" };
      const result = normalizePersona(v1);
      expect(result.ai_inferred?.tone?.confirmed).toBe(false);
      expect(result.ai_inferred?.target_customer?.confirmed).toBe(false);
    });
  });

  // ── getPersonaForPipeline ──

  describe("getPersonaForPipeline", () => {
    it("null → 기본값 반환", () => {
      const result = getPersonaForPipeline(null);
      expect(result.one_liner).toBe("");
      expect(result.tone).toBe("친근한");
      expect(result.strengths).toEqual([]);
    });

    it("v2 Enhanced → flat 변환", () => {
      const enhanced: EnhancedBrandPersona = {
        one_liner: "캠핏 글램핑",
        positioning: "프리미엄 글램핑",
        ai_inferred: {
          target_customer: {
            primary: "30대 커플",
            pain_points: ["비용", "접근성"],
          },
          tone: { style: "감성적인" },
          usp: { points: ["넓은 공간", "자연 속 힐링"] },
          content_direction: { angles: ["글램핑 추천"] },
          price_position: { position: "중상위" },
        },
        owner_input: {
          brand_story: "10년 경력의 호텔리어",
          forbidden_content: "가격 할인 언급 금지",
          awards_certifications: ["2024 우수 숙박"],
        },
        persona_version: 2,
      };
      const result = getPersonaForPipeline(enhanced);
      expect(result.one_liner).toBe("캠핏 글램핑");
      expect(result.primary_target).toBe("30대 커플");
      expect(result.tone).toBe("감성적인");
      expect(result.strengths).toEqual(["넓은 공간", "자연 속 힐링"]);
      expect(result.content_angles).toEqual(["글램핑 추천"]);
      expect(result.brand_story).toBe("10년 경력의 호텔리어");
      expect(result.forbidden_content).toBe("가격 할인 언급 금지");
      expect(result.awards).toEqual(["2024 우수 숙박"]);
      expect(result.pain_points).toEqual(["비용", "접근성"]);
      expect(result.price_position).toBe("중상위");
    });

    it("v1 flat → pipeline flat (ai_inferred 없이도 동작)", () => {
      const v1: Record<string, unknown> = {
        one_liner: "테스트",
        primary_target: "20대",
        tone: "밝은",
        strengths: ["맛있는 음식"],
        content_angles: ["맛집 추천"],
        avoid_angles: ["가격 비교"],
      };
      const result = getPersonaForPipeline(v1);
      expect(result.primary_target).toBe("20대");
      expect(result.tone).toBe("밝은");
      expect(result.strengths).toEqual(["맛있는 음식"]);
      expect(result.avoid_angles).toEqual(["가격 비교"]);
    });
  });

  // ── syncFlatFromEnhanced ──

  describe("syncFlatFromEnhanced", () => {
    it("ai_inferred.target_customer.primary → flat target 필드들 동기화", () => {
      const persona: EnhancedBrandPersona = {
        ai_inferred: {
          target_customer: { primary: "30대 커플" },
        },
        persona_version: 2,
      };
      const result = syncFlatFromEnhanced(persona);
      expect(result.target_audience).toBe("30대 커플");
      expect(result.primary_target).toBe("30대 커플");
      expect(result.target_customer).toBe("30대 커플");
    });

    it("ai_inferred.tone.style → flat tone 동기화", () => {
      const persona: EnhancedBrandPersona = {
        ai_inferred: {
          tone: { style: "전문적이고 신뢰감 있는" },
        },
        persona_version: 2,
      };
      const result = syncFlatFromEnhanced(persona);
      expect(result.tone).toBe("전문적이고 신뢰감 있는");
    });

    it("ai_inferred.usp.points → flat strengths 동기화", () => {
      const persona: EnhancedBrandPersona = {
        ai_inferred: {
          usp: { points: ["넓은 공간", "깨끗한 시설", "친절한 서비스"] },
        },
        persona_version: 2,
      };
      const result = syncFlatFromEnhanced(persona);
      expect(result.strengths).toEqual(["넓은 공간", "깨끗한 시설", "친절한 서비스"]);
    });

    it("owner_input.forbidden_content → avoid_angles에 병합 (중복 방지)", () => {
      const persona: EnhancedBrandPersona = {
        avoid_angles: ["가격 비교"],
        owner_input: {
          forbidden_content: "할인 언급 금지",
        },
        persona_version: 2,
      };
      const result = syncFlatFromEnhanced(persona);
      expect(result.avoid_angles).toContain("가격 비교");
      expect(result.avoid_angles).toContain("할인 언급 금지");
      expect(result.avoid_angles?.length).toBe(2);
    });

    it("owner_input.forbidden_content 이미 avoid_angles에 있으면 중복 추가 안함", () => {
      const persona: EnhancedBrandPersona = {
        avoid_angles: ["할인 언급 금지"],
        owner_input: {
          forbidden_content: "할인 언급 금지",
        },
        persona_version: 2,
      };
      const result = syncFlatFromEnhanced(persona);
      expect(result.avoid_angles?.filter((a) => a === "할인 언급 금지").length).toBe(1);
    });

    it("빈 ai_inferred면 flat 필드 변경 안함", () => {
      const persona: EnhancedBrandPersona = {
        tone: "기존 톤",
        strengths: ["기존 강점"],
        persona_version: 2,
      };
      const result = syncFlatFromEnhanced(persona);
      expect(result.tone).toBe("기존 톤");
      expect(result.strengths).toEqual(["기존 강점"]);
    });
  });

  // ── 하위 호환 통합 ──

  describe("하위 호환 통합", () => {
    it("v1 → normalizePersona → getPersonaForPipeline = 기존 값 보존", () => {
      const v1 = {
        one_liner: "카페 브랜드",
        positioning: "프리미엄 카페",
        primary_target: "20대 여성",
        tone: "감성적인",
        strengths: ["분위기", "커피 맛"],
        content_angles: ["카페 추천"],
        avoid_angles: ["프랜차이즈 비교"],
      };
      const normalized = normalizePersona(v1);
      const pipeline = getPersonaForPipeline(normalized);

      expect(pipeline.one_liner).toBe("카페 브랜드");
      expect(pipeline.positioning).toBe("프리미엄 카페");
      expect(pipeline.primary_target).toBe("20대 여성");
      expect(pipeline.tone).toBe("감성적인");
      expect(pipeline.strengths).toEqual(["분위기", "커피 맛"]);
      expect(pipeline.content_angles).toEqual(["카페 추천"]);
      expect(pipeline.avoid_angles).toEqual(["프랜차이즈 비교"]);
    });

    it("v2 → syncFlatFromEnhanced → getPersonaForPipeline = ai_inferred 값 반영", () => {
      const v2: EnhancedBrandPersona = {
        one_liner: "글램핑 브랜드",
        ai_inferred: {
          target_customer: { primary: "신혼부부", pain_points: ["비용 걱정"] },
          tone: { style: "로맨틱한" },
          usp: { points: ["프라이빗 독채"] },
          content_direction: { angles: ["허니문 글램핑"] },
          price_position: { position: "프리미엄" },
        },
        owner_input: {
          brand_story: "자연과 함께",
          forbidden_content: "가격 노출 금지",
          awards_certifications: ["2025 우수숙박"],
        },
        persona_version: 2,
      };
      const synced = syncFlatFromEnhanced(v2);
      const pipeline = getPersonaForPipeline(synced);

      expect(pipeline.primary_target).toBe("신혼부부");
      expect(pipeline.tone).toBe("로맨틱한");
      expect(pipeline.strengths).toEqual(["프라이빗 독채"]);
      expect(pipeline.content_angles).toEqual(["허니문 글램핑"]);
      expect(pipeline.brand_story).toBe("자연과 함께");
      expect(pipeline.forbidden_content).toBe("가격 노출 금지");
      expect(pipeline.awards).toEqual(["2025 우수숙박"]);
      expect(pipeline.price_position).toBe("프리미엄");
      // flat 동기화도 확인
      expect(synced.tone).toBe("로맨틱한");
      expect(synced.target_audience).toBe("신혼부부");
    });
  });
});
