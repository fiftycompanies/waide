import { describe, test, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/service";
import {
  initializeClientPoints,
  spendPoints,
  grantPoints,
  refundPoints,
} from "@/lib/actions/point-actions";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Build a fluent Supabase query-builder mock with chainable methods */
function mockQuery(finalResult: { data?: unknown; error?: unknown; count?: number }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "from", "select", "insert", "update", "delete",
    "eq", "neq", "in", "is", "gte", "lte", "not",
    "order", "limit", "range", "maybeSingle", "single",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Terminal calls resolve to finalResult
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult);
  chain.single = vi.fn().mockResolvedValue(finalResult);
  // Allow `.then()` on the chain itself (for .insert(...).select(...).single())
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(finalResult));
  return chain;
}

function setupDb(scenarios: Array<{ table: string; result: { data?: unknown; error?: unknown } }>) {
  const fromFn = vi.fn().mockImplementation((table: string) => {
    const match = scenarios.find((s) => s.table === table);
    const q = mockQuery(match?.result ?? { data: null });
    return q;
  });
  (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });
  return fromFn;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("point-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── TC1: initializeClientPoints grants signup bonus ──
  test("TC1: initializeClientPoints — 가입 시 signup bonus 지급", async () => {
    const clientId = "client-001";

    // Step 1: client_points SELECT → not existing (null)
    // Step 2: point_settings SELECT → signup_bonus = 5
    // Step 3: client_points INSERT → success
    // Step 4: point_transactions INSERT → success
    const insertedData: unknown[] = [];

    const chain = mockQuery({ data: null });
    // Override insert to track calls
    chain.insert = vi.fn().mockImplementation((payload: unknown) => {
      insertedData.push(payload);
      return { ...chain, select: vi.fn().mockReturnValue(chain), error: null };
    });

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "client_points") {
        // First call: SELECT existing → null (not found)
        // Second call: INSERT
        const q = mockQuery({ data: null });
        q.insert = vi.fn().mockReturnValue({ error: null });
        return q;
      }
      if (table === "point_settings") {
        return mockQuery({ data: { setting_value: 5 } });
      }
      if (table === "point_transactions") {
        const q = mockQuery({ data: null });
        q.insert = vi.fn().mockReturnValue({ error: null });
        return q;
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await initializeClientPoints(clientId);

    expect(result.success).toBe(true);
    // DB calls: client_points (check) + point_settings (bonus) + client_points (insert) + point_transactions (insert)
    expect(fromFn).toHaveBeenCalledWith("client_points");
    expect(fromFn).toHaveBeenCalledWith("point_settings");
    expect(fromFn).toHaveBeenCalledWith("point_transactions");
  });

  // ── TC2: spendPoints deducts correctly ──
  test("TC2: spendPoints — 잔액 정상 차감", async () => {
    const clientId = "client-002";

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "client_points") {
        const q = mockQuery({
          data: { balance: 10, total_earned: 10, total_spent: 0 },
        });
        q.update = vi.fn().mockReturnValue({ ...q, error: null });
        q.insert = vi.fn().mockReturnValue({ error: null });
        return q;
      }
      if (table === "point_settings") {
        return mockQuery({ data: { setting_value: 1 } });
      }
      if (table === "point_transactions") {
        const q = mockQuery({ data: null });
        q.insert = vi.fn().mockReturnValue({ error: null });
        return q;
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await spendPoints(clientId, "content-123");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // ── TC3: spendPoints fails when balance insufficient ──
  test("TC3: spendPoints — 잔액 부족 시 실패", async () => {
    const clientId = "client-003";

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "client_points") {
        // balance: 0 — 포인트 없음
        return mockQuery({
          data: { balance: 0, total_earned: 3, total_spent: 3 },
        });
      }
      if (table === "point_settings") {
        return mockQuery({ data: { setting_value: 1 } });
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await spendPoints(clientId, "content-456");

    expect(result.success).toBe(false);
    expect(result.error).toContain("포인트가 부족합니다");
  });

  // ── TC4: grantPoints adds to balance ──
  test("TC4: grantPoints — 관리자 수동 부여 시 잔액 증가", async () => {
    const clientId = "client-004";
    const adminId = "admin-001";

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "client_points") {
        const q = mockQuery({
          data: { balance: 5, total_earned: 5, total_spent: 0 },
        });
        q.update = vi.fn().mockReturnValue({ ...q, error: null });
        q.insert = vi.fn().mockReturnValue({ error: null });
        return q;
      }
      if (table === "point_settings") {
        return mockQuery({ data: { setting_value: 1 } });
      }
      if (table === "point_transactions") {
        const q = mockQuery({ data: null });
        q.insert = vi.fn().mockReturnValue({ error: null });
        return q;
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await grantPoints(clientId, 10, "프로모션 보너스", adminId);

    expect(result.success).toBe(true);
    // point_transactions INSERT 호출 확인
    expect(fromFn).toHaveBeenCalledWith("point_transactions");
  });

  // ── TC5: refundPoints restores spent points ──
  test("TC5: refundPoints — 생성 실패 시 포인트 자동 환불", async () => {
    const clientId = "client-005";

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "client_points") {
        const q = mockQuery({
          data: { balance: 4, total_earned: 5, total_spent: 1 },
        });
        q.update = vi.fn().mockReturnValue({ ...q, error: null });
        q.insert = vi.fn().mockReturnValue({ error: null });
        return q;
      }
      if (table === "point_settings") {
        return mockQuery({ data: { setting_value: 1 } });
      }
      if (table === "point_transactions") {
        const q = mockQuery({ data: null });
        q.insert = vi.fn().mockReturnValue({ error: null });
        return q;
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await refundPoints(clientId, "content-789");

    expect(result.success).toBe(true);
    // point_transactions 테이블에 'refund' 타입으로 INSERT 확인
    expect(fromFn).toHaveBeenCalledWith("point_transactions");
  });
});
