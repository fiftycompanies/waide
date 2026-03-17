/**
 * middleware.test.ts
 * 미들웨어 라우트 분류 로직 테스트 (8 TC)
 *
 * 실제 middleware() 함수는 NextRequest/NextResponse에 의존하므로 테스트하지 않는다.
 * 대신 라우트 배열과 startsWith 패턴 매칭 로직만 순수 함수로 검증한다.
 */
import { describe, test, expect } from "vitest";

// ── middleware.ts에서 가져온 라우트 배열 (인라인 정의) ──────────────────────

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
  "/contents",
  "/publish",
  "/clients",
  "/accounts",
  "/brand-analysis",
];

const PORTAL_ROUTES = ["/portal"];

const AUTH_ROUTES = ["/login", "/signup"];

const PUBLIC_ROUTES = [
  "/analysis",
  "/api/analyze",
  "/api/consultation",
  "/api/cron",
  "/invite",
  "/auth",
  "/api/auth",
];

// ── 라우트 분류 헬퍼 (middleware.ts의 로직 재현) ──────────────────────────

function classifyRoute(pathname: string) {
  const isAdminProtected = ADMIN_PROTECTED_ROUTES.some((r) =>
    pathname.startsWith(r)
  );
  const isPortal = PORTAL_ROUTES.some((r) => pathname.startsWith(r));
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  if (isPublic) return "public";
  if (isPortal) return "portal";
  if (isAdminProtected) return "admin_protected";
  if (isAuth) return "auth";
  return "unmatched";
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("ADMIN_PROTECTED_ROUTES pattern matching", () => {
  test("matches all expected admin routes", () => {
    const adminPaths = [
      "/dashboard",
      "/dashboard/sub",
      "/brands",
      "/ops/clients",
      "/ops/revenue",
      "/keywords",
      "/keywords/123",
      "/contents",
      "/contents/abc/publish",
      "/publish",
      "/settings/agents",
      "/analytics",
      "/blog-accounts",
      "/sources",
      "/clients/detail",
      "/accounts",
      "/brand-analysis",
    ];

    adminPaths.forEach((path) => {
      expect(classifyRoute(path)).toBe("admin_protected");
    });
  });

  test("does not match non-admin routes", () => {
    const nonAdminPaths = ["/", "/login", "/signup", "/analysis/123", "/api/cron/serp"];
    nonAdminPaths.forEach((path) => {
      expect(classifyRoute(path)).not.toBe("admin_protected");
    });
  });
});

describe("PUBLIC_ROUTES pattern matching", () => {
  test("matches all expected public routes", () => {
    const publicPaths = [
      "/analysis",
      "/analysis/abc-123",
      "/analysis/abc-123/loading",
      "/api/analyze",
      "/api/analyze/123",
      "/api/consultation",
      "/api/cron",
      "/api/cron/serp",
      "/api/cron/aeo",
      "/api/cron/monthly-report",
      "/invite",
      "/invite/token-abc",
      "/auth",
      "/auth/callback",
      "/api/auth",
      "/api/auth/tistory/callback",
    ];

    publicPaths.forEach((path) => {
      expect(classifyRoute(path)).toBe("public");
    });
  });

  test("does not match protected routes", () => {
    const nonPublicPaths = ["/dashboard", "/ops/settings", "/keywords"];
    nonPublicPaths.forEach((path) => {
      expect(classifyRoute(path)).not.toBe("public");
    });
  });
});

describe("AUTH_ROUTES pattern matching", () => {
  test("matches login and signup", () => {
    expect(classifyRoute("/login")).toBe("auth");
    expect(classifyRoute("/signup")).toBe("auth");
  });

  test("does not match non-auth routes", () => {
    expect(classifyRoute("/dashboard")).not.toBe("auth");
    expect(classifyRoute("/")).not.toBe("auth");
    expect(classifyRoute("/analysis")).not.toBe("auth");
  });
});

describe("PORTAL route redirect logic", () => {
  test("/portal routes are classified as portal (to be redirected)", () => {
    const portalPaths = [
      "/portal",
      "/portal/",
      "/portal/keywords",
      "/portal/contents",
      "/portal/reports",
      "/portal/settings",
    ];

    portalPaths.forEach((path) => {
      expect(classifyRoute(path)).toBe("portal");
    });
  });

  test("portal redirect path transformation", () => {
    // Simulates middleware's portal redirect logic:
    // /portal or /portal/ -> /dashboard
    // /portal/X -> /X
    function getPortalRedirect(pathname: string): string {
      if (pathname === "/portal" || pathname === "/portal/") {
        return "/dashboard";
      }
      return pathname.replace(/^\/portal/, "");
    }

    expect(getPortalRedirect("/portal")).toBe("/dashboard");
    expect(getPortalRedirect("/portal/")).toBe("/dashboard");
    expect(getPortalRedirect("/portal/keywords")).toBe("/keywords");
    expect(getPortalRedirect("/portal/contents")).toBe("/contents");
    expect(getPortalRedirect("/portal/reports")).toBe("/reports");
    expect(getPortalRedirect("/portal/settings")).toBe("/settings");
  });
});

describe("root / redirect logic", () => {
  test("root path is unmatched (falls through to auth check logic)", () => {
    // / is not public, not portal, not admin_protected, not auth
    // In middleware, the root path has its own special handling (section 5)
    expect(classifyRoute("/")).toBe("unmatched");
  });

  test("all roles redirect to /dashboard from root", () => {
    // Simulates middleware's getRedirectByRole(): all roles -> /dashboard
    function getRedirectByRole(_role: string | null): string {
      return "/dashboard";
    }

    expect(getRedirectByRole("super_admin")).toBe("/dashboard");
    expect(getRedirectByRole("admin")).toBe("/dashboard");
    expect(getRedirectByRole("sales")).toBe("/dashboard");
    expect(getRedirectByRole("client_owner")).toBe("/dashboard");
    expect(getRedirectByRole("client_member")).toBe("/dashboard");
    expect(getRedirectByRole(null)).toBe("/dashboard");
  });
});
