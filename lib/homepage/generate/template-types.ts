/**
 * template-types.ts
 * 템플릿 관련 타입/상수 정의 (클라이언트 + 서버 공용)
 *
 * 서버 전용 코드(API 호출, fs 등)를 포함하지 않아
 * 클라이언트 컴포넌트에서 안전하게 import 가능.
 */

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

export type TemplateSlotContent = Record<string, string>;
