/**
 * middleware.ts — 어드민 세션 기반 라우트 가드
 * Edge Runtime 호환 (Web Crypto API 사용)
 */
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "admin_session";
const SECRET =
  process.env.ADMIN_SESSION_SECRET || "ai-marketer-dev-secret-2026";

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
];
const AUTH_ROUTES = ["/login"];
const PUBLIC_ROUTES = ["/analysis", "/api/analyze", "/api/consultation"];

// ── Edge Runtime 호환 HMAC-SHA256 검증 ──────────────────────
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // 퍼블릭 라우트는 인증 체크 없이 바로 통과
  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isValid = token ? await isValidAdminSession(token) : false;

  // 보호된 라우트 → 어드민 세션 없으면 /login
  if (isProtected && !isValid) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 로그인 페이지 → 이미 인증된 경우 /dashboard
  if (isAuth && isValid) {
    const redirectTo = request.nextUrl.searchParams.get("redirect") || "/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = redirectTo.startsWith("/") ? redirectTo : "/dashboard";
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  // 루트 페이지 → 인증된 경우 /dashboard
  if (pathname === "/" && isValid) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
