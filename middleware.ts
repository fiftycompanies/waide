/**
 * middleware.ts — 듀얼 인증 라우트 가드
 * 1) 어드민 세션 (기존 HMAC) — /ops, /dashboard 등
 * 2) Supabase Auth (신규) — /portal
 * Edge Runtime 호환 (Web Crypto API 사용)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const COOKIE_NAME = "admin_session";
const SECRET =
  process.env.ADMIN_SESSION_SECRET || "ai-marketer-dev-secret-2026";

// ── 어드민 전용 보호 라우트 (기존) ──
const ADMIN_PROTECTED_ROUTES = [
  "/dashboard",
  "/brands",
  "/campaigns",
  "/analytics",
  "/onboarding",
  "/settings",
  "/ops",
  "/keywords",
  "/blog-accounts",
  "/sources",
];

// ── 포털 보호 라우트 (신규) ──
const PORTAL_ROUTES = ["/portal"];

// ── 인증 관련 ──
const AUTH_ROUTES = ["/login", "/signup"];

// ── 퍼블릭 (인증 불필요) ──
const PUBLIC_ROUTES = ["/analysis", "/api/analyze", "/api/consultation", "/api/cron", "/invite"];

// ── Edge Runtime 호환 HMAC-SHA256 검증 (기존 유지) ──────────────────────
async function isValidAdminSession(token: string): Promise<boolean> {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return false;

    const encoded = token.slice(0, dotIdx);
    const sigFromToken = token.slice(dotIdx + 1);

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedBuf = await crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(encoded)
    );

    // ArrayBuffer → base64url
    const expectedB64 = btoa(
      String.fromCharCode(...new Uint8Array(expectedBuf))
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    if (sigFromToken !== expectedB64) return false;

    // Payload 만료 확인 (base64url → JSON)
    const padded =
      encoded.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (encoded.length % 4)) % 4);
    const data = JSON.parse(atob(padded));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

// ── Supabase Auth 세션 확인 (Edge Runtime 호환) ──────────────────────
async function getSupabaseUser(request: NextRequest, response: NextResponse) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next();

  const isAdminProtected = ADMIN_PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isPortal = PORTAL_ROUTES.some((r) => pathname.startsWith(r));
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // ─── 1. 퍼블릭 라우트 → 통과 ─────────────────────────────
  if (isPublic) {
    return response;
  }

  // ─── 2. 포털 라우트 → Supabase Auth 필수 ──────────────────
  if (isPortal) {
    const supabaseUser = await getSupabaseUser(request, response);

    if (!supabaseUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      url.searchParams.set("mode", "customer");
      return NextResponse.redirect(url);
    }

    // Supabase Auth 쿠키 갱신을 위해 response 반환
    return response;
  }

  // ─── 3. 어드민 보호 라우트 → HMAC 세션 체크 ────────────────
  if (isAdminProtected) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const isValid = token ? await isValidAdminSession(token) : false;

    if (!isValid) {
      // Supabase Auth로 폴백 — 어드민 역할 사용자도 /ops 접근 가능
      const supabaseUser = await getSupabaseUser(request, response);
      if (supabaseUser) {
        // Supabase Auth 인증됨 → 통과 (역할 체크는 페이지 레벨에서)
        return response;
      }

      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    return response;
  }

  // ─── 4. 인증 페이지 (로그인/회원가입) ────────────────────────
  if (isAuth) {
    // 어드민 세션 있으면 → /dashboard
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const isAdminValid = token ? await isValidAdminSession(token) : false;

    if (isAdminValid) {
      const redirectTo = request.nextUrl.searchParams.get("redirect") || "/dashboard";
      const url = request.nextUrl.clone();
      // 어드민 세션으로는 /portal 접근 불가 → /dashboard로 보냄 (루프 방지)
      const target = redirectTo.startsWith("/portal") ? "/dashboard" : redirectTo;
      url.pathname = target.startsWith("/") ? target : "/dashboard";
      url.searchParams.delete("redirect");
      url.searchParams.delete("mode");
      return NextResponse.redirect(url);
    }

    // Supabase Auth 세션 있으면 → /portal
    // 단, error 파라미터가 있으면 리디렉트 하지 않음 (루프 방지: portal→login→portal)
    const hasError = request.nextUrl.searchParams.has("error");
    if (!hasError) {
      const supabaseUser = await getSupabaseUser(request, response);
      if (supabaseUser) {
        const redirectTo = request.nextUrl.searchParams.get("redirect");
        const url = request.nextUrl.clone();
        // Supabase Auth 사용자는 어드민 라우트 접근 불가 → /portal로 보냄 (루프 방지)
        const isAdminRedirect = redirectTo && ADMIN_PROTECTED_ROUTES.some((r) => redirectTo.startsWith(r));
        if (redirectTo && redirectTo.startsWith("/") && !isAdminRedirect) {
          url.pathname = redirectTo;
        } else {
          url.pathname = "/portal";
        }
        url.searchParams.delete("redirect");
        url.searchParams.delete("mode");
        return NextResponse.redirect(url);
      }
    }

    return response;
  }

  // ─── 5. 루트 페이지 ──────────────────────────────────────
  if (pathname === "/") {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const isAdminValid = token ? await isValidAdminSession(token) : false;

    if (isAdminValid) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Supabase Auth가 있으면 포털로
    const supabaseUser = await getSupabaseUser(request, response);
    if (supabaseUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
