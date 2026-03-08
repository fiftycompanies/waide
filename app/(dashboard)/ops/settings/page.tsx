import { redirect } from "next/navigation";

/**
 * /ops/settings → /settings 리다이렉트
 * API 설정 페이지는 /settings 아래로 통합됨
 */
export default function OpsSettingsRedirect() {
  redirect("/settings");
}
