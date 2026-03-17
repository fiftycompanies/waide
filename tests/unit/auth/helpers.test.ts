import { describe, test, expect, vi, beforeEach } from "vitest";
import type { UserRole } from "@/lib/auth";

// Mock Supabase modules before importing auth module
const mockGetUser = vi.fn();
const mockSelectSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSelectSingle,
        })),
      })),
    })),
  })),
}));

// Import after mocks are set up
import {
  hasRole,
  isAdmin,
  isClient,
  isSales,
  isAdminRole,
  isClientRole,
  getEffectiveClientId,
} from "@/lib/auth";

describe("lib/auth helpers", () => {
  // ── TC1: hasRole - 역할이 포함되면 true ──
  test("hasRole returns true when userRole is in requiredRoles", () => {
    expect(hasRole("admin", ["super_admin", "admin"])).toBe(true);
    expect(hasRole("sales", ["sales", "viewer"])).toBe(true);
    expect(hasRole("client_owner", ["client_owner", "client_member"])).toBe(true);
  });

  // ── TC2: hasRole - 역할이 미포함이면 false ──
  test("hasRole returns false when userRole is not in requiredRoles", () => {
    expect(hasRole("viewer", ["super_admin", "admin"])).toBe(false);
    expect(hasRole("client_member", ["admin", "sales"])).toBe(false);
    expect(hasRole("sales", ["client_owner"])).toBe(false);
  });

  // ── TC3: isAdmin - super_admin과 admin만 true ──
  test("isAdmin returns true only for super_admin and admin", () => {
    expect(isAdmin("super_admin")).toBe(true);
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("sales")).toBe(false);
    expect(isAdmin("viewer")).toBe(false);
    expect(isAdmin("client_owner")).toBe(false);
    expect(isAdmin("client_member")).toBe(false);
  });

  // ── TC4: isClient - client_owner와 client_member만 true ──
  test("isClient returns true only for client_owner and client_member", () => {
    expect(isClient("client_owner")).toBe(true);
    expect(isClient("client_member")).toBe(true);
    expect(isClient("super_admin")).toBe(false);
    expect(isClient("admin")).toBe(false);
    expect(isClient("sales")).toBe(false);
    expect(isClient("viewer")).toBe(false);
  });

  // ── TC5: isSales - sales만 true ──
  test("isSales returns true only for sales role", () => {
    expect(isSales("sales")).toBe(true);
    expect(isSales("super_admin")).toBe(false);
    expect(isSales("admin")).toBe(false);
    expect(isSales("viewer")).toBe(false);
    expect(isSales("client_owner")).toBe(false);
    expect(isSales("client_member")).toBe(false);
  });

  // ── TC6: isAdminRole / isClientRole ──
  test("isAdminRole returns true for super_admin/admin/sales/viewer, isClientRole for client roles", () => {
    // isAdminRole: 어드민 영역 접근 가능 역할
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("sales")).toBe(true);
    expect(isAdminRole("viewer")).toBe(true);
    expect(isAdminRole("client_owner")).toBe(false);
    expect(isAdminRole("client_member")).toBe(false);

    // isClientRole: 고객 포털 접근 역할
    expect(isClientRole("client_owner")).toBe(true);
    expect(isClientRole("client_member")).toBe(true);
    expect(isClientRole("super_admin")).toBe(false);
    expect(isClientRole("admin")).toBe(false);
    expect(isClientRole("sales")).toBe(false);
    expect(isClientRole("viewer")).toBe(false);
  });

  // ── TC7: getEffectiveClientId - 미로그인 시 null 반환 ──
  describe("getEffectiveClientId", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("returns null when user is not authenticated", async () => {
      // Supabase getUser가 null 반환 → getCurrentUser() = null → getEffectiveClientId = null
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getEffectiveClientId("some-client-id");
      expect(result).toBeNull();
    });
  });
});
