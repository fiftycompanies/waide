/**
 * template-types.ts
 * 템플릿 관련 타입/상수 정의 (클라이언트 + 서버 공용)
 *
 * 서버 전용 코드(API 호출, fs 등)를 포함하지 않아
 * 클라이언트 컴포넌트에서 안전하게 import 가능.
 */

export type TemplateName = "dark-luxury" | "warm-natural" | "light-clean" | "3d-glamping";

export const TEMPLATE_NAMES: TemplateName[] = [
  "dark-luxury",
  "warm-natural",
  "light-clean",
  "3d-glamping",
];

export const TEMPLATE_LABELS: Record<TemplateName, string> = {
  "dark-luxury": "다크 럭셔리 (의료/뷰티)",
  "warm-natural": "웜 내추럴 (숙박/캠핑)",
  "light-clean": "라이트 클린 (카페/인테리어)",
  "3d-glamping": "3D 글램핑 (글램핑/캠핑)",
};

export const TEMPLATE_DESCRIPTIONS: Record<TemplateName, string> = {
  "dark-luxury": "고급스러운 다크 톤의 의료·뷰티 전문 디자인",
  "warm-natural": "따뜻한 자연 톤의 숙박·캠핑 디자인",
  "light-clean": "깔끔한 화이트 톤의 카페·인테리어 디자인",
  "3d-glamping": "몰입감 있는 3D 인터랙티브 글램핑·캠핑 디자인",
};

export const TEMPLATE_BG_COLORS: Record<TemplateName, string> = {
  "dark-luxury": "#1a1a1a",
  "warm-natural": "#fefcf9",
  "light-clean": "#ffffff",
  "3d-glamping": "#050510",
};

export type TemplateSlotContent = Record<string, string>;
