import { describe, test, expect, vi } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  COOKIE_NAME,
  MAX_AGE,
  type AdminPayload,
} from "@/lib/auth/admin-session";

// Mock dependencies that admin-session.ts imports
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  isAdminRole: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));

describe("lib/auth/admin-session", () => {
  const testPayload: AdminPayload = {
    id: "user-123",
    username: "testadmin",
    role: "admin",
    displayName: "Test Admin",
  };

  // ── TC1: 토큰 생성 후 검증 성공 ──
  test("createSessionToken creates a token that verifySessionToken validates", () => {
    const token = createSessionToken(testPayload);

    // 토큰 형식: base64url.hmacSig
    expect(token).toContain(".");
    const parts = token.split(".");
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);

    const result = verifySessionToken(token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(testPayload.id);
    expect(result!.username).toBe(testPayload.username);
    expect(result!.role).toBe(testPayload.role);
    expect(result!.displayName).toBe(testPayload.displayName);
  });

  // ── TC2: 만료된 토큰은 null 반환 ──
  test("verifySessionToken returns null for expired token", () => {
    // 과거 시점으로 토큰 생성을 흉내내기 위해 Date.now()를 mock
    const realDateNow = Date.now;

    // 토큰 생성 시점: 8일 전 (MAX_AGE=7일이므로 만료됨)
    const eightDaysAgo = realDateNow() - (MAX_AGE + 86400) * 1000;
    Date.now = vi.fn(() => eightDaysAgo);
    const token = createSessionToken(testPayload);

    // 검증 시점: 현재
    Date.now = realDateNow;
    const result = verifySessionToken(token);
    expect(result).toBeNull();
  });

  // ── TC3: 변조된 시그니처는 null 반환 ──
  test("verifySessionToken returns null for tampered signature", () => {
    const token = createSessionToken(testPayload);
    const [encoded] = token.split(".");

    // 시그니처를 다른 값으로 변조
    const tamperedToken = `${encoded}.tampered_signature_value`;
    const result = verifySessionToken(tamperedToken);
    expect(result).toBeNull();
  });

  // ── TC4: 점(dot)이 없는 토큰은 null 반환 ──
  test("verifySessionToken returns null for malformed token without dot", () => {
    const result = verifySessionToken("no-dot-in-this-token");
    expect(result).toBeNull();
  });

  // ── TC5: 잘못된 base64 페이로드는 null 반환 ──
  test("verifySessionToken returns null for token with invalid base64 payload", () => {
    // 올바른 HMAC을 위해 임의의 인코딩된 값 사용 (JSON 파싱 실패할 것)
    const invalidPayload = "not-valid-base64-!!!";
    const token = `${invalidPayload}.somesig`;
    const result = verifySessionToken(token);
    expect(result).toBeNull();
  });

  // ── 상수 검증 ──
  test("COOKIE_NAME and MAX_AGE are correct", () => {
    expect(COOKIE_NAME).toBe("admin_session");
    expect(MAX_AGE).toBe(604800); // 7일 = 60*60*24*7
  });
});
