import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyCronAuth } from "@/lib/scheduler";

// Mock Supabase service and error-log-actions (scheduler imports them)
vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/actions/error-log-actions", () => ({
  logError: vi.fn().mockResolvedValue(undefined),
}));

describe("lib/scheduler - verifyCronAuth", () => {
  const originalEnv = process.env.CRON_SECRET;

  afterEach(() => {
    // 원래 환경변수 복원
    if (originalEnv !== undefined) {
      process.env.CRON_SECRET = originalEnv;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  // ── TC1: 유효한 Bearer 토큰이면 true ──
  test("returns true when authorization header matches CRON_SECRET", () => {
    process.env.CRON_SECRET = "my-secret-token";

    const request = new Request("https://example.com/api/cron/serp", {
      headers: { authorization: "Bearer my-secret-token" },
    });

    expect(verifyCronAuth(request)).toBe(true);
  });

  // ── TC2: 잘못된 토큰이면 false ──
  test("returns false when authorization header has wrong token", () => {
    process.env.CRON_SECRET = "my-secret-token";

    const request = new Request("https://example.com/api/cron/serp", {
      headers: { authorization: "Bearer wrong-token" },
    });

    expect(verifyCronAuth(request)).toBe(false);
  });

  // ── TC3: CRON_SECRET 미설정이면 true (개발 모드) ──
  test("returns true when CRON_SECRET is not set (dev mode)", () => {
    delete process.env.CRON_SECRET;

    const request = new Request("https://example.com/api/cron/serp");

    expect(verifyCronAuth(request)).toBe(true);
  });

  // ── TC4: authorization 헤더 없으면 false ──
  test("returns false when authorization header is missing", () => {
    process.env.CRON_SECRET = "my-secret-token";

    const request = new Request("https://example.com/api/cron/serp");
    // 헤더 없음

    expect(verifyCronAuth(request)).toBe(false);
  });

  // ── TC5: Bearer 접두어 없이 토큰만 보내면 false ──
  test("returns false when authorization header has wrong format (no Bearer prefix)", () => {
    process.env.CRON_SECRET = "my-secret-token";

    const request = new Request("https://example.com/api/cron/serp", {
      headers: { authorization: "my-secret-token" },
    });

    expect(verifyCronAuth(request)).toBe(false);
  });
});
