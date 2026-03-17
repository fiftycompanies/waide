import { describe, test, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/auth/admin-session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue({
    id: "admin-001",
    username: "admin",
    role: "super_admin",
  }),
}));

vi.mock("@/lib/slack/error-notification", () => ({
  sendErrorSlackNotification: vi.fn().mockResolvedValue(undefined),
}));

import { createAdminClient } from "@/lib/supabase/service";
import {
  logError,
  getErrorLogs,
  updateErrorStatus,
  getErrorStats,
} from "@/lib/actions/error-log-actions";

// ── Helpers ──────────────────────────────────────────────────────────────

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
  // Make chain awaitable (thenable) — getErrorLogs does `const { data, error } = await query`
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(finalResult));
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult);
  chain.single = vi.fn().mockResolvedValue(finalResult);
  // Support count queries
  if ("count" in finalResult) {
    chain.select = vi.fn().mockReturnValue({ ...chain, count: finalResult.count });
  }
  return chain;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("error-log-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── TC1: logError creates error_logs record ──
  test("TC1: logError — error_logs 레코드 생성", async () => {
    const insertPayload: Record<string, unknown>[] = [];

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "error_logs") {
        const q = mockQuery({ data: { id: "err-001" } });
        q.insert = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          insertPayload.push(payload);
          return q;
        });
        return q;
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await logError({
      errorMessage: "TypeError: Cannot read property 'x' of undefined",
      errorStack: "at Component (/app/page.tsx:10:5)",
      errorType: "client",
      pageUrl: "/portal",
      userId: "user-001",
      userEmail: "test@example.com",
      userRole: "client_owner",
      clientId: "client-001",
    });

    expect(result.success).toBe(true);
    expect(result.errorId).toBe("err-001");
    expect(fromFn).toHaveBeenCalledWith("error_logs");
    // Verify the insert was called with correct data
    expect(insertPayload.length).toBeGreaterThan(0);
    expect(insertPayload[0]).toMatchObject({
      error_message: "TypeError: Cannot read property 'x' of undefined",
      error_type: "client",
      status: "new",
      user_id: "user-001",
    });
  });

  // ── TC2: getErrorLogs returns filtered list ──
  test("TC2: getErrorLogs — 필터링된 에러 로그 목록 반환", async () => {
    const mockLogs = [
      {
        id: "err-001",
        error_message: "Server Error",
        error_type: "server",
        status: "new",
        created_at: "2026-03-17T10:00:00",
      },
      {
        id: "err-002",
        error_message: "API Error",
        error_type: "api",
        status: "new",
        created_at: "2026-03-17T11:00:00",
      },
    ];

    const eqCalls: string[] = [];

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "error_logs") {
        const q = mockQuery({ data: mockLogs });
        q.eq = vi.fn().mockImplementation((col: string, val: string) => {
          eqCalls.push(`${col}=${val}`);
          return q;
        });
        return q;
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const result = await getErrorLogs({ status: "new", errorType: "server" });

    expect(result).toHaveLength(2);
    expect(result[0].error_message).toBe("Server Error");
    // Filters should be applied
    expect(eqCalls).toContain("status=new");
    expect(eqCalls).toContain("error_type=server");
  });

  // ── TC3: updateErrorStatus transitions (new -> acknowledged -> resolved) ──
  test("TC3: updateErrorStatus — 상태 전이 (new -> acknowledged -> resolved)", async () => {
    const updates: Array<{ status: string; resolved_at?: string; resolved_by?: string }> = [];

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "error_logs") {
        const q = mockQuery({ data: null, error: null });
        q.update = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          updates.push(payload as { status: string; resolved_at?: string; resolved_by?: string });
          return q;
        });
        return q;
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    // Transition 1: new -> acknowledged
    const ackResult = await updateErrorStatus("err-001", "acknowledged");
    expect(ackResult.success).toBe(true);
    expect(updates[0].status).toBe("acknowledged");
    expect(updates[0].resolved_at).toBeUndefined();

    // Transition 2: acknowledged -> resolved
    const resolveResult = await updateErrorStatus("err-001", "resolved");
    expect(resolveResult.success).toBe(true);
    expect(updates[1].status).toBe("resolved");
    expect(updates[1].resolved_at).toBeDefined();
    expect(updates[1].resolved_by).toBe("admin-001");
  });

  // ── TC4: getErrorStats returns aggregate counts by type ──
  test("TC4: getErrorStats — 에러 유형별 집계 카운트 반환", async () => {
    let selectCallCount = 0;

    const fromFn = vi.fn().mockImplementation((table: string) => {
      if (table === "error_logs") {
        selectCallCount++;
        const q: Record<string, unknown> = {};
        const methods = [
          "from", "select", "insert", "update", "delete",
          "eq", "neq", "in", "is", "gte", "lte", "not",
          "order", "limit", "range", "maybeSingle", "single",
        ];
        for (const m of methods) {
          q[m] = vi.fn().mockReturnValue(q);
        }
        // Return different counts for each parallel query
        // getErrorStats makes 4 parallel queries:
        // [today, thisWeek, unresolved, serverErrors]
        const counters = [5, 23, 12, 8];
        const idx = selectCallCount - 1;
        q.count = counters[idx] ?? 0;
        q.select = vi.fn().mockReturnValue(q);
        return q;
      }
      return mockQuery({ data: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const stats = await getErrorStats();

    expect(stats).toHaveProperty("today");
    expect(stats).toHaveProperty("thisWeek");
    expect(stats).toHaveProperty("unresolved");
    expect(stats).toHaveProperty("serverErrors");
    expect(typeof stats.today).toBe("number");
    expect(typeof stats.thisWeek).toBe("number");
    expect(typeof stats.unresolved).toBe("number");
    expect(typeof stats.serverErrors).toBe("number");
  });
});
