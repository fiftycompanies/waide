/**
 * persona-compat.ts
 * 기존 flat BrandPersona(v1) ↔ EnhancedBrandPersona(v2) 변환 유틸
 *
 * - normalizePersona(): DB에서 읽은 raw → EnhancedBrandPersona 정규화
 * - getPersonaForPipeline(): Enhanced → flat 필드 역변환 (content-pipeline-v2 등 소비용)
 * - syncFlatFromEnhanced(): ai_inferred/owner_input 값을 flat 필드에 동기화
 */

import type {
  BrandPersona,
  EnhancedBrandPersona,
  AiInferred,
  OwnerInput,
} from "@/lib/actions/persona-actions";

// ═══════════════════════════════════════════
// normalizePersona: raw JSONB → EnhancedBrandPersona
// ═══════════════════════════════════════════

export function normalizePersona(
  raw: Record<string, unknown> | null | undefined
): EnhancedBrandPersona {
  if (!raw) return { persona_version: 2, confirmation_status: "pending" };

  // 이미 v2면 그대로 반환
  if (raw.persona_version === 2) {
    return raw as unknown as EnhancedBrandPersona;
  }

  // v1 flat → v2 매핑 (CMO agent 출력 키 호환)
  const flat = raw as Record<string, unknown>;

  const aiInferred: AiInferred = {
    target_customer: {
      primary:
        (flat.primary_target as string) ||
        (flat.target_customer as string) ||
        (flat.target_audience as string) ||
        "",
      secondary: (flat.secondary_target as string) || "",
      pain_points: Array.isArray(flat.target_needs)
        ? (flat.target_needs as string[])
        : [],
      search_intent: "",
      confirmed: false,
    },
    tone: {
      style: (flat.tone as string) || "",
      personality: (flat.tone as string) || "",
      example_phrases: [],
      confirmed: false,
    },
    usp: {
      points: Array.isArray(flat.strengths)
        ? (flat.strengths as string[])
        : [],
      from_reviews: Array.isArray(flat.usp) ? (flat.usp as string[]) : [],
      confirmed: false,
    },
    content_direction: {
      angles: Array.isArray(flat.content_angles)
        ? (flat.content_angles as string[])
        : [],
      types: [],
      frequency: "",
      confirmed: false,
    },
    price_position: {
      position: (flat.competitor_position as string) || "",
      comparison: (flat.differentiation as string) || "",
      confirmed: false,
    },
  };

  return {
    // 기존 flat 필드 전부 보존
    ...flat,
    // 새 구조
    ai_inferred: aiInferred,
    persona_version: 2,
    confirmation_status: "pending",
  } as EnhancedBrandPersona;
}

// ═══════════════════════════════════════════
// getPersonaForPipeline: Enhanced → flat 필드 (기존 파이프라인 소비용)
// ═══════════════════════════════════════════

export interface PipelinePersona {
  one_liner: string;
  positioning: string;
  primary_target: string;
  strengths: string[];
  tone: string;
  content_angles: string[];
  avoid_angles: string[];
  brand_story: string;
  forbidden_content: string;
  awards: string[];
  usp_details: string[];
  pain_points: string[];
  price_position: string;
}

export function getPersonaForPipeline(
  persona: EnhancedBrandPersona | Record<string, unknown> | null | undefined
): PipelinePersona {
  if (!persona) {
    return {
      one_liner: "",
      positioning: "",
      primary_target: "",
      strengths: [],
      tone: "",
      content_angles: [],
      avoid_angles: [],
      brand_story: "",
      forbidden_content: "",
      awards: [],
      usp_details: [],
      pain_points: [],
      price_position: "",
    };
  }

  const p = persona as EnhancedBrandPersona;

  return {
    one_liner: p.one_liner || "",
    positioning: p.positioning || "",
    primary_target:
      p.ai_inferred?.target_customer?.primary ||
      p.primary_target ||
      p.target_customer ||
      p.target_audience ||
      "",
    strengths:
      p.ai_inferred?.usp?.points ||
      (Array.isArray(p.strengths) ? p.strengths : []),
    tone:
      p.ai_inferred?.tone?.style ||
      (typeof p.tone === "string" ? p.tone : "") ||
      (p.tone && typeof p.tone === "object" ? ((p.tone as Record<string, unknown>).style as string) || "" : "") ||
      "",
    content_angles:
      p.ai_inferred?.content_direction?.angles ||
      (Array.isArray(p.content_angles) ? p.content_angles : []),
    avoid_angles: Array.isArray(p.avoid_angles) ? p.avoid_angles : [],
    brand_story: p.owner_input?.brand_story || "",
    forbidden_content: p.owner_input?.forbidden_content || "",
    awards: p.owner_input?.awards_certifications || [],
    usp_details: p.ai_inferred?.usp?.points || [],
    pain_points: p.ai_inferred?.target_customer?.pain_points || [],
    price_position: p.ai_inferred?.price_position?.position || "",
  };
}

// ═══════════════════════════════════════════
// syncFlatFromEnhanced: ai_inferred/owner_input → flat 필드 동기화
// ═══════════════════════════════════════════

export function syncFlatFromEnhanced(
  persona: EnhancedBrandPersona
): EnhancedBrandPersona {
  const updated = { ...persona };

  // ai_inferred → flat 동기화
  if (updated.ai_inferred?.target_customer?.primary) {
    updated.target_audience = updated.ai_inferred.target_customer.primary;
    updated.primary_target = updated.ai_inferred.target_customer.primary;
    updated.target_customer = updated.ai_inferred.target_customer.primary;
  }
  if (updated.ai_inferred?.tone?.style) {
    updated.tone = updated.ai_inferred.tone.style;
  }
  if (updated.ai_inferred?.usp?.points && updated.ai_inferred.usp.points.length > 0) {
    updated.strengths = updated.ai_inferred.usp.points;
  }
  if (
    updated.ai_inferred?.content_direction?.angles &&
    updated.ai_inferred.content_direction.angles.length > 0
  ) {
    updated.content_angles = updated.ai_inferred.content_direction.angles;
  }
  if (updated.ai_inferred?.price_position?.position) {
    updated.positioning = updated.positioning || updated.ai_inferred.price_position.position;
  }
  if (updated.ai_inferred?.target_customer?.pain_points && updated.ai_inferred.target_customer.pain_points.length > 0) {
    updated.target_needs = updated.ai_inferred.target_customer.pain_points;
  }

  // owner_input.forbidden_content → avoid_angles에 병합
  if (updated.owner_input?.forbidden_content) {
    const existing = Array.isArray(updated.avoid_angles)
      ? updated.avoid_angles
      : [];
    const forbidden = updated.owner_input.forbidden_content;
    if (!existing.includes(forbidden)) {
      updated.avoid_angles = [...existing, forbidden];
    }
  }

  return updated;
}
