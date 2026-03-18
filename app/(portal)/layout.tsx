import { redirect } from "next/navigation";

/**
 * Portal layout — 포털 완전 제거 (Phase AUTH-1 + UI-2)
 * 모든 /portal/* 요청을 /dashboard로 리다이렉트.
 * middleware에서도 리다이렉트하지만, 혹시 도달 시 이중 방어.
 *
 * ★ 핵심 원칙: 모든 역할(admin/client 모두) → /dashboard 단일 진입
 *   역할별 view/CRUD 권한은 UI 컴포넌트 레벨에서 분기
 */
export default function PortalLayout() {
  redirect("/dashboard");
}
