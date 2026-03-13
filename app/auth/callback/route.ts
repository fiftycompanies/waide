/**
 * /auth/callback — OAuth 콜백 처리
 * Google/Kakao OAuth 인증 후 Supabase가 여기로 리다이렉트.
 * code → session 교환 후 users.role 조회 → 적절한 페이지로 분기.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/portal";

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

  // role 조회 → 어드민 역할이면 /dashboard, 고객이면 /portal
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // service key로 users 테이블 역할 조회
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (serviceKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const adminDb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: dbUser } = await adminDb
        .from("users")
        .select("role, client_id")
        .eq("auth_id", user.id)
        .single();

      if (dbUser) {
        const adminRoles = ["super_admin", "admin", "sales", "viewer"];
        if (adminRoles.includes(dbUser.role)) {
          return NextResponse.redirect(new URL("/dashboard", origin));
        }
      }
    }
  }

  // 기본: 고객 포털로
  return NextResponse.redirect(new URL(next, origin));
}
