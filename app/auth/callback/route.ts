/**
 * /auth/callback — OAuth + 이메일 인증 콜백 처리
 * Google/Kakao OAuth, 비밀번호 재설정, 초대 수락 후 Supabase가 여기로 리다이렉트.
 * code → session 교환 후:
 *   - type=recovery/invite → /auth/reset-password (비밀번호 설정)
 *   - 그 외 → /dashboard (role 무관, middleware가 처리)
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[Auth Callback] Code exchange error:", error.message);
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  // ── 비밀번호 재설정 / 초대 수락 → 비밀번호 설정 페이지 ──────────────
  if (type === "recovery" || type === "invite") {
    return NextResponse.redirect(new URL("/auth/reset-password", origin));
  }

  // ── 일반 로그인 → /dashboard (middleware가 role 분기 처리) ──────────
  return NextResponse.redirect(new URL(next, origin));
}
