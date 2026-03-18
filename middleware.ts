/**
 * middleware.ts — Supabase Auth 단일 인증 라우트 가드
 * Phase AUTH-1 + UI-2: 포털 제거 → /dashboard 단일화
 *
 * ★ 핵심 원칙: 모든 인증된 사용자(admin/client 모두) → /dashboard 단일 진입
 *   역할별 view/CRUD 권한은 UI 컴포넌트 레벨에서 분기 (middleware에서 역할별 라우트 분리 금지)
 *
 * 분기 로직:
 *   PUBLIC     → 통과
 *   AUTH       → 이미 로그인 시 /dashboard 리다이렉트
 *   PROTECTED  → Supabase Auth + 유효 role 필수 (ALL_VALID_ROLES)
 *   /portal/*  → /dashboard (또는 동등 어드민 경로)로 리다이렉트
 *   /          → 로그인 상태면 /dashboard 리다이렉트
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ── 보호 라우트 (모든 인증된 역할 접근 가능) ─────────────────────────────
const PROTECTED_ROUTES = [
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
  "/contents",
  "/publish",
  "/clients",
  "/accounts",
  "/brand-analysis",
  "/homepage",
];

// ── 포털 라우트 → /dashboard로 리다이렉트 (포털 완전 제거) ───────────────
const PORTAL_ROUTES = ["/portal"];

// ── 인증 관련 라우트 ────────────────────────────────────────────────────
const AUTH_ROUTES = ["/login", "/signup"];

// ── 퍼블릭 (인증 불필요) ────────────────────────────────────────────────
const PUBLIC_ROUTES = [
  "/analysis",
  "/api/analyze",
  "/api/consultation",
  "/api/cron",
  "/api/homepage",
  "/invite",
  "/auth",
  "/api/auth",
];

// ── 전체 유효 역할 (어드민 + 고객 모두 /dashboard 접근 가능) ─────────────
const ALL_VALID_ROLES = ["super_admin", "admin", "sales", "viewer", "client_owner", "client_member"];

// ── Supabase users 테이블 역할 조회 (service role, Edge 호환) ────────────
async function getSupabaseUserRole(authUserId: string): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !serviceKey) return null;

    const supabaseAdmin = createServerClient(supabaseUrl, serviceKey, {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    });

    const { data } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("auth_id", authUserId)
      .single();

    return data?.role ?? null;
  } catch {
    return null;
  }
}

// ── Supabase Auth 세션 확인 (Edge Runtime 호환) ─────────────────────────
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

/* ═══════════════════════════════════════════════════════════════════════════
 * DEPRECATED: HMAC-SHA256 세션 검증 (Phase AUTH-1 이전 코드)
 * 기존 admin_users 테이블의 username 로그인이 완전 폐지될 때까지 폴백용 유지.
 * 신규 인증은 모두 Supabase Auth로 처리.
 * ═══════════════════════════════════════════════════════════════════════════ */
const HMAC_COOKIE_NAME = "admin_session";
const HMAC_SECRET =
  process.env.ADMIN_SESSION_SECRET || "ai-marketer-dev-secret-2026";

async function isValidAdminSession(token: string): Promise<boolean> {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return false;
    const encoded = token.slice(0, dotIdx);
    const sigFromToken = token.slice(dotIdx + 1);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(HMAC_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const expectedBuf = await crypto.subtle.sign("HMAC", key, enc.encode(encoded));
    const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expectedBuf)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    if (sigFromToken !== expectedB64) return false;
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (encoded.length % 4)) % 4);
    const data = JSON.parse(atob(padded));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
/* ═══════════════════════════ END DEPRECATED ══════════════════════════════ */

// ── 클라이언트 역할 ─────────────────────────────────────────────────────────
const CLIENT_ROLES = ["client_owner", "client_member"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const response = NextResponse.next();

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isPortal = PORTAL_ROUTES.some((r) => pathname.startsWith(r));
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // ─── 0. 클라이언트의 홈페이지 mutation API 차단 ──────────────
  if (
    pathname.startsWith("/api/homepage") &&
    method !== "GET" &&
    isPublic
  ) {
    const supabaseUser = await getSupabaseUser(request, response);
    if (supabaseUser) {
      const role = await getSupabaseUserRole(supabaseUser.id);
      if (role && CLIENT_ROLES.includes(role)) {
        return NextResponse.json(
          { error: "권한이 없습니다." },
          { status: 403 }
        );
      }
    }
  }

  // ─── 1. 퍼블릭 라우트 → 통과 ─────────────────────────────────
  if (isPublic) {
    return response;
  }

  // ─── 2. 포털 라우트 → /dashboard (또는 동등 경로)로 리다이렉트 ──
  //     포털 완전 제거 — 모든 /portal/* 경로를 어드민 경로로 전환
  if (isPortal) {
    const url = request.nextUrl.clone();
    if (pathname === "/portal" || pathname === "/portal/") {
      url.pathname = "/dashboard";
    } else {
      // /portal/keywords → /keywords, /portal/contents → /contents 등
      url.pathname = pathname.replace(/^\/portal/, "");
    }
    return NextResponse.redirect(url);
  }

  // ─── 3. 보호 라우트 (모든 유효 역할 접근 가능) ─────────────────
  if (isProtected) {
    // 3-A. Supabase Auth 체크 (기본)
    const supabaseUser = await getSupabaseUser(request, response);
    if (supabaseUser) {
      const role = await getSupabaseUserRole(supabaseUser.id);
      // 유효 역할이면 통과 (admin + client 모두)
      if (role && ALL_VALID_ROLES.includes(role)) {
        return response;
      }
      // role 없음 또는 유효하지 않음 → fail-closed (/login)
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }

    // 3-B. HMAC 폴백 (DEPRECATED — 기존 admin_users 사용자 전환 완료 전까지 유지)
    const hmacToken = request.cookies.get(HMAC_COOKIE_NAME)?.value;
    if (hmacToken && await isValidAdminSession(hmacToken)) {
      return response;
    }

    // 미인증 → /login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ─── 4. 인증 페이지 (로그인/회원가입) ─────────────────────────
  if (isAuth) {
    const hasError = request.nextUrl.searchParams.has("error");

    // HMAC 폴백 (DEPRECATED)
    const hmacToken = request.cookies.get(HMAC_COOKIE_NAME)?.value;
    const isHmacValid = hmacToken ? await isValidAdminSession(hmacToken) : false;
    if (isHmacValid) {
      const redirectTo = request.nextUrl.searchParams.get("redirect") || "/dashboard";
      const url = request.nextUrl.clone();
      const target = redirectTo.startsWith("/portal") ? "/dashboard" : redirectTo;
      url.pathname = target.startsWith("/") ? target : "/dashboard";
      url.searchParams.delete("redirect");
      url.searchParams.delete("mode");
      return NextResponse.redirect(url);
    }

    // Supabase Auth 체크
    if (!hasError) {
      const supabaseUser = await getSupabaseUser(request, response);
      if (supabaseUser) {
        const redirectTo = request.nextUrl.searchParams.get("redirect");
        const url = request.nextUrl.clone();

        if (redirectTo && redirectTo.startsWith("/")) {
          // /portal/* redirect → 어드민 동등 경로로 변환
          if (redirectTo.startsWith("/portal")) {
            url.pathname = redirectTo === "/portal" ? "/dashboard" : redirectTo.replace(/^\/portal/, "");
          } else {
            url.pathname = redirectTo;
          }
        } else {
          url.pathname = "/dashboard";
        }
        url.searchParams.delete("redirect");
        url.searchParams.delete("mode");
        return NextResponse.redirect(url);
      }
    }

    return response;
  }

  // ─── 5. 루트 페이지 (/) ───────────────────────────────────────
  if (pathname === "/") {
    // HMAC 폴백 (DEPRECATED)
    const hmacToken = request.cookies.get(HMAC_COOKIE_NAME)?.value;
    if (hmacToken && await isValidAdminSession(hmacToken)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Supabase Auth
    const supabaseUser = await getSupabaseUser(request, response);
    if (supabaseUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
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
