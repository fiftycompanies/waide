import { redirect } from "next/navigation";

/**
 * Portal layout — DEPRECATED (UI-2: 포털 완전 제거)
 * 모든 /portal/* 요청을 /dashboard로 리다이렉트.
 * middleware에서도 리다이렉트하지만, 혹시 도달 시 이중 방어.
 */
export default function PortalLayout() {
  redirect("/dashboard");
}
