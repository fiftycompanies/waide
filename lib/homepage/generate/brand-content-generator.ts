/**
 * brand-content-generator.ts
 * 브랜드 데이터를 기반으로 템플릿 슬롯에 주입할 콘텐츠를 생성한다.
 *
 * 동작 방식:
 * 1. 공통 슬롯 (BRAND_NAME, PHONE 등) → 룰 기반 즉시 생성
 * 2. 이미지 슬롯 (HERO_IMG, SERVICE_IMG 등) → Unsplash 업종별 매핑
 * 3. 템플릿 전용 슬롯 (ROOM_*, REVIEW_*, PORTFOLIO_*) → Claude API 창작
 *
 * 기존 코드 변경 없음. 신규 파일.
 */

import type { BrandInfo, PersonaInfo } from "./content-mapper";
import { getUnsplashImages, type UnsplashImageSet } from "./unsplash-images";

// ── 출력 타입 ──────────────────────────────────────────────────────────────────

export type TemplateSlotContent = Record<string, string>;

// ── 템플릿 이름 ────────────────────────────────────────────────────────────────

export type TemplateName = "dark-luxury" | "warm-natural" | "light-clean";

export const TEMPLATE_NAMES: TemplateName[] = [
  "dark-luxury",
  "warm-natural",
  "light-clean",
];

export const TEMPLATE_LABELS: Record<TemplateName, string> = {
  "dark-luxury": "다크 럭셔리 (의료/뷰티)",
  "warm-natural": "웜 내추럴 (숙박/캠핑)",
  "light-clean": "라이트 클린 (카페/인테리어)",
};

// ── 업종 → 추천 템플릿 ────────────────────────────────────────────────────────

const INDUSTRY_TEMPLATE_MAP: Record<string, TemplateName> = {
  "의료": "dark-luxury",
  "피부과": "dark-luxury",
  "의원": "dark-luxury",
  "클리닉": "dark-luxury",
  "치과": "dark-luxury",
  "병원": "dark-luxury",
  "뷰티": "dark-luxury",
  "헤어": "dark-luxury",
  "미용": "dark-luxury",
  "에스테틱": "dark-luxury",
  "숙박": "warm-natural",
  "호텔": "warm-natural",
  "펜션": "warm-natural",
  "리조트": "warm-natural",
  "글램핑": "warm-natural",
  "게스트하우스": "warm-natural",
  "카페": "light-clean",
  "인테리어": "light-clean",
  "도배": "light-clean",
  "리모델링": "light-clean",
  "음식점": "light-clean",
  "요식업": "light-clean",
  "레스토랑": "light-clean",
};

export function getRecommendedTemplate(industry: string): TemplateName {
  if (INDUSTRY_TEMPLATE_MAP[industry]) {
    return INDUSTRY_TEMPLATE_MAP[industry];
  }
  for (const [keyword, tmpl] of Object.entries(INDUSTRY_TEMPLATE_MAP)) {
    if (industry.includes(keyword)) return tmpl;
  }
  return "dark-luxury"; // 기본값
}

// ── 업종 → 액센트 컬러 (light-clean 전용) ─────────────────────────────────────

const ACCENT_COLORS: Record<string, string> = {
  "카페": "#8B6914",
  "인테리어": "#2563eb",
  "도배": "#2563eb",
  "리모델링": "#374151",
  "음식점": "#dc2626",
  "요식업": "#dc2626",
  "레스토랑": "#b91c1c",
  "베이커리": "#d97706",
  "default": "#2563eb",
};

function getAccentColor(industry: string): string {
  if (ACCENT_COLORS[industry]) return ACCENT_COLORS[industry];
  for (const [keyword, color] of Object.entries(ACCENT_COLORS)) {
    if (industry.includes(keyword)) return color;
  }
  return ACCENT_COLORS["default"];
}

// ── 메인 함수 ──────────────────────────────────────────────────────────────────

/**
 * 브랜드 정보 + 페르소나 + 업종 → 템플릿 슬롯 콘텐츠 생성
 *
 * @param brandInfo   브랜드 기본 정보
 * @param persona     AI 페르소나 정보
 * @param templateName 템플릿 이름
 * @param industry    업종명
 * @param apiKey      Anthropic API Key
 * @returns 슬롯명→값 매핑
 */
export async function generateBrandContent(
  brandInfo: BrandInfo,
  persona: PersonaInfo,
  templateName: TemplateName,
  industry: string,
  apiKey: string,
): Promise<TemplateSlotContent> {
  // 1. 공통 텍스트 슬롯 (룰 기반)
  const commonSlots = buildCommonSlots(brandInfo, persona);

  // 2. 이미지 슬롯 (Unsplash)
  const images = getUnsplashImages(industry);
  const imageSlots = buildImageSlots(images);

  // 3. 템플릿 전용 슬롯 (Claude API)
  let templateSlots: TemplateSlotContent = {};

  if (templateName === "warm-natural") {
    templateSlots = await generateWarmNaturalSlots(brandInfo, persona, industry, apiKey);
  } else if (templateName === "light-clean") {
    templateSlots = {
      ACCENT_COLOR: getAccentColor(industry),
      ...await generateLightCleanSlots(brandInfo, persona, industry, apiKey),
    };
  }
  // dark-luxury: 공통 슬롯만으로 충분

  return { ...commonSlots, ...imageSlots, ...templateSlots };
}

// ── 공통 텍스트 슬롯 (룰 기반, AI 호출 없음) ─────────────────────────────────

function buildCommonSlots(
  brandInfo: BrandInfo,
  persona: PersonaInfo,
): TemplateSlotContent {
  const name = brandInfo.name;
  const tagline =
    persona.tagline ||
    persona.one_liner ||
    `${name} - ${brandInfo.industry} 전문`;
  const subtitle =
    persona.usp ||
    `${name}의 전문적인 ${brandInfo.industry} 서비스를 경험하세요.`;
  const phone = brandInfo.phone || "02-000-0000";
  const address = brandInfo.address || "";
  const hours = "Mon – Sat  10:00 – 19:00";
  const services =
    brandInfo.services.length > 0
      ? brandInfo.services
      : ["서비스 1", "서비스 2", "서비스 3"];

  const slots: TemplateSlotContent = {
    BRAND_NAME: name,
    TAGLINE: tagline,
    SUBTITLE: subtitle,
    ABOUT_DESC: subtitle,
    PHONE: phone,
    ADDRESS: address,
    HOURS: hours,
    CTA_TEXT: "상담 예약하기",
    COPYRIGHT: `© 2026 ${name}. All rights reserved. Powered by Waide.`,
  };

  // 서비스 1~6
  for (let i = 0; i < 6; i++) {
    const svc = services[i] || services[i % services.length] || `서비스 ${i + 1}`;
    slots[`SERVICE_${i + 1}`] = svc;
    slots[`SERVICE_DESC_${i + 1}`] = generateServiceDescription(name, svc, i);
  }

  return slots;
}

// ── 이미지 슬롯 (Unsplash CDN) ────────────────────────────────────────────────

function buildImageSlots(images: UnsplashImageSet): TemplateSlotContent {
  const slots: TemplateSlotContent = {};

  // 히어로
  slots.HERO_IMG = images.hero[0] || "";

  // 소개
  slots.ABOUT_IMG = images.about[0] || "";

  // 서비스 이미지 (3개 순환)
  for (let i = 0; i < 3; i++) {
    slots[`SERVICE_IMG_${i + 1}`] = images.section[i % images.section.length] || "";
  }

  // 갤러리 이미지 (6개)
  for (let i = 0; i < 6; i++) {
    slots[`GALLERY_IMG_${i + 1}`] = images.gallery[i % images.gallery.length] || "";
  }

  // 룸 이미지 (warm-natural, 3개 — section 이미지 재활용)
  for (let i = 0; i < 3; i++) {
    slots[`ROOM_IMG_${i + 1}`] = images.section[(i + 3) % images.section.length] || "";
  }

  // 포트폴리오 이미지 (light-clean, 4개 — gallery 이미지 재활용)
  for (let i = 0; i < 4; i++) {
    slots[`PORTFOLIO_IMG_${i + 1}`] = images.gallery[i % images.gallery.length] || "";
  }

  // 블로그 이미지
  for (let i = 0; i < 3; i++) {
    slots[`BLOG_IMG_${i + 1}`] = images.blog[i % images.blog.length] || "";
  }

  return slots;
}

// ── warm-natural 전용 슬롯 (Claude API) ──────────────────────────────────────

async function generateWarmNaturalSlots(
  brandInfo: BrandInfo,
  persona: PersonaInfo,
  industry: string,
  apiKey: string,
): Promise<TemplateSlotContent> {
  const name = brandInfo.name;
  const services = brandInfo.services.length > 0 ? brandInfo.services : ["스탠다드", "디럭스", "프리미엄"];

  const prompt = `당신은 ${industry} 홈페이지 카피라이터입니다.
"${name}" 브랜드의 홈페이지에 넣을 콘텐츠를 생성하세요.
서비스 목록: ${services.join(", ")}
USP: ${persona.usp || "없음"}
한줄소개: ${persona.one_liner || "없음"}

아래 JSON 형식으로만 응답하세요. 다른 텍스트 금지:
{
  "ROOM_1": "객실/공간 이름 1 (예: 포레스트 스위트)",
  "ROOM_DESC_1": "객실 설명 1 (30자 이내)",
  "ROOM_PRICE_1": "가격 (예: ₩180,000~)",
  "ROOM_2": "객실/공간 이름 2",
  "ROOM_DESC_2": "객실 설명 2 (30자 이내)",
  "ROOM_PRICE_2": "가격",
  "ROOM_3": "객실/공간 이름 3",
  "ROOM_DESC_3": "객실 설명 3 (30자 이내)",
  "ROOM_PRICE_3": "가격",
  "REVIEW_1": "고객 후기 1 (50자 내외, 자연스럽게)",
  "REVIEWER_1": "작성자 이름 (예: 김민준)",
  "REVIEW_2": "고객 후기 2",
  "REVIEWER_2": "작성자 이름",
  "REVIEW_3": "고객 후기 3",
  "REVIEWER_3": "작성자 이름"
}`;

  try {
    const result = await callClaudeApi(apiKey, prompt);
    return result;
  } catch (error) {
    console.warn("[BrandContentGenerator] warm-natural Claude API 실패, 폴백 사용:", error);
    return buildWarmNaturalFallback(name, services);
  }
}

function buildWarmNaturalFallback(name: string, services: string[]): TemplateSlotContent {
  return {
    ROOM_1: services[0] || "스탠다드",
    ROOM_DESC_1: `${name}의 아늑한 공간에서 편안한 휴식을 경험하세요.`,
    ROOM_PRICE_1: "₩150,000~",
    ROOM_2: services[1] || "디럭스",
    ROOM_DESC_2: `넓은 공간과 프리미엄 어메니티로 특별한 하루를 선사합니다.`,
    ROOM_PRICE_2: "₩220,000~",
    ROOM_3: services[2] || "프리미엄",
    ROOM_DESC_3: `최고급 인테리어와 전용 테라스로 완벽한 프라이버시를 보장합니다.`,
    ROOM_PRICE_3: "₩350,000~",
    REVIEW_1: "자연 속에서의 힐링이 필요할 때 꼭 다시 오고 싶은 곳이에요.",
    REVIEWER_1: "김민준",
    REVIEW_2: "시설도 깔끔하고 직원분들 친절함이 정말 인상적이었습니다.",
    REVIEWER_2: "이서연",
    REVIEW_3: "아이들과 함께 왔는데 가족 모두 만족한 여행이었어요!",
    REVIEWER_3: "박지호",
  };
}

// ── light-clean 전용 슬롯 (Claude API) ───────────────────────────────────────

async function generateLightCleanSlots(
  brandInfo: BrandInfo,
  persona: PersonaInfo,
  industry: string,
  apiKey: string,
): Promise<TemplateSlotContent> {
  const name = brandInfo.name;
  const services = brandInfo.services.length > 0 ? brandInfo.services : ["시공", "디자인", "컨설팅"];

  const prompt = `당신은 ${industry} 홈페이지 카피라이터입니다.
"${name}" 브랜드의 포트폴리오 섹션 콘텐츠를 생성하세요.
서비스 목록: ${services.join(", ")}
USP: ${persona.usp || "없음"}
한줄소개: ${persona.one_liner || "없음"}

아래 JSON 형식으로만 응답하세요. 다른 텍스트 금지:
{
  "PORTFOLIO_1": "포트폴리오 제목 1 (예: 청담동 모던 주거)",
  "PORTFOLIO_DESC_1": "간단 설명 (20자 이내)",
  "PORTFOLIO_2": "포트폴리오 제목 2",
  "PORTFOLIO_DESC_2": "간단 설명",
  "PORTFOLIO_3": "포트폴리오 제목 3",
  "PORTFOLIO_DESC_3": "간단 설명",
  "PORTFOLIO_4": "포트폴리오 제목 4",
  "PORTFOLIO_DESC_4": "간단 설명"
}`;

  try {
    const result = await callClaudeApi(apiKey, prompt);
    return result;
  } catch (error) {
    console.warn("[BrandContentGenerator] light-clean Claude API 실패, 폴백 사용:", error);
    return buildLightCleanFallback(name);
  }
}

function buildLightCleanFallback(name: string): TemplateSlotContent {
  return {
    PORTFOLIO_1: `${name} 대표 프로젝트`,
    PORTFOLIO_DESC_1: "모던 미니멀 디자인",
    PORTFOLIO_2: "프리미엄 리뉴얼",
    PORTFOLIO_DESC_2: "공간 재해석 프로젝트",
    PORTFOLIO_3: "감각적 인테리어",
    PORTFOLIO_DESC_3: "트렌디한 공간 연출",
    PORTFOLIO_4: "시그니처 디자인",
    PORTFOLIO_DESC_4: "브랜드 아이덴티티 구현",
  };
}

// ── Claude API 호출 ─────────────────────────────────────────────────────────

async function callClaudeApi(
  apiKey: string,
  prompt: string,
): Promise<TemplateSlotContent> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`BrandContentGenerator API 실패 (${resp.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text: string = data.content?.[0]?.text || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("BrandContentGenerator: JSON을 찾을 수 없음");
  }

  return JSON.parse(jsonMatch[0]) as TemplateSlotContent;
}

// ── 서비스 설명 생성 (룰 기반) ──────────────────────────────────────────────

function generateServiceDescription(
  brandName: string,
  serviceName: string,
  index: number,
): string {
  const templates = [
    `${brandName}만의 차별화된 ${serviceName} 프로그램으로 최상의 결과를 경험하세요.`,
    `전문가의 체계적인 상담과 맞춤 ${serviceName}으로 최적의 솔루션을 제공합니다.`,
    `최신 장비와 풍부한 경험을 바탕으로 안전하고 효과적인 ${serviceName}을 시행합니다.`,
    `${brandName}의 ${serviceName}은 1:1 맞춤 플랜으로 진행되어 높은 만족도를 자랑합니다.`,
    `검증된 기술력과 노하우로 ${serviceName} 분야에서 신뢰받는 결과를 만들어 갑니다.`,
    `${brandName}이 제안하는 ${serviceName}은 트렌드와 실용성을 겸비한 솔루션입니다.`,
  ];
  return templates[index % templates.length];
}
