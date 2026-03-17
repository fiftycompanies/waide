import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/service";

describe("product-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function mockChain(resolvedValue: unknown) {
    const chain: Record<string, unknown> = {};
    const methods = ["select", "eq", "neq", "or", "lte", "gte", "lt", "gt", "in", "order", "limit", "range", "maybeSingle", "single", "not", "filter", "insert", "update", "delete", "upsert"];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(resolvedValue));
    return chain;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TC1: getProducts returns list
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: getProducts returns active products with subscription counts", async () => {
    const products = [
      {
        id: "p1", name: "Basic", slug: "basic", description: "기본 플랜",
        price: 300000, features: [{ key: "contents", label: "콘텐츠", value: "10건" }],
        is_public: true, is_active: true, sort_order: 1, highlight_label: null,
        created_at: "2026-01-01", updated_at: "2026-01-01",
      },
      {
        id: "p2", name: "Pro", slug: "pro", description: "프로 플랜",
        price: 500000, features: [{ key: "contents", label: "콘텐츠", value: "30건" }],
        is_public: true, is_active: true, sort_order: 2, highlight_label: "인기",
        created_at: "2026-01-01", updated_at: "2026-01-01",
      },
    ];

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // products select
        return mockChain({ data: products, error: null });
      }
      // subscription count per product
      return mockChain({ count: callCount === 2 ? 3 : 5 });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { getProducts } = await import("@/lib/actions/product-actions");
    const result = await getProducts();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Basic");
    expect(result[1].name).toBe("Pro");
    expect(result[0].subscription_count).toBeTypeOf("number");
  });

  test("TC1b: getProducts returns empty array on error", async () => {
    const mockFrom = vi.fn().mockReturnValue(
      mockChain({ data: null, error: { message: "DB error" } })
    );
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { getProducts } = await import("@/lib/actions/product-actions");
    const result = await getProducts();

    expect(result).toEqual([]);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: createProduct inserts with correct fields
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: createProduct inserts with correct fields", async () => {
    const chain = mockChain({ data: { id: "p-new" }, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { createProduct } = await import("@/lib/actions/product-actions");
    const result = await createProduct({
      name: "Enterprise",
      slug: "enterprise",
      description: "엔터프라이즈 플랜",
      price: 1000000,
      features: [
        { key: "contents", label: "콘텐츠", value: "무제한" },
        { key: "support", label: "지원", value: "24/7" },
      ],
      is_public: true,
      sort_order: 3,
      highlight_label: "프리미엄",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("p-new");

    // Verify insert was called with correct payload
    const insertCall = (chain.insert as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(insertCall[0]).toMatchObject({
      name: "Enterprise",
      slug: "enterprise",
      price: 1000000,
      is_public: true,
      sort_order: 3,
      highlight_label: "프리미엄",
    });
    expect(insertCall[0].features).toHaveLength(2);
  });

  test("TC2b: createProduct returns error on DB failure", async () => {
    const chain = mockChain({ data: null, error: { message: "Duplicate slug" } });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { createProduct } = await import("@/lib/actions/product-actions");
    const result = await createProduct({
      name: "Basic",
      slug: "basic",
      price: 300000,
      features: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Duplicate slug");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: createSubscription links product to client
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: createSubscription creates active subscription", async () => {
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // subscriptions insert
        return mockChain({ data: { id: "sub-1" }, error: null });
      }
      // clients update (subscription_id link)
      return mockChain({ data: null, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { createSubscription } = await import("@/lib/actions/product-actions");
    const result = await createSubscription("c1", "p1", 500000, "2026-12-31");

    expect(result.success).toBe(true);
    expect(result.id).toBe("sub-1");

    // Verify subscription insert payload
    expect(mockFrom).toHaveBeenCalledWith("subscriptions");
    expect(mockFrom).toHaveBeenCalledWith("clients");
  });

  test("TC3b: createSubscription handles optional expiresAt", async () => {
    let callCount = 0;
    const insertChain = mockChain({ data: { id: "sub-2" }, error: null });
    const updateChain = mockChain({ data: null, error: null });
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return insertChain;
      return updateChain;
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { createSubscription } = await import("@/lib/actions/product-actions");
    const result = await createSubscription("c1", "p1", 300000);

    expect(result.success).toBe(true);

    const insertCall = (insertChain.insert as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(insertCall[0].expires_at).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC4: cancelSubscription changes status to 'cancelled'
  // ─────────────────────────────────────────────────────────────────────────
  test("TC4: cancelSubscription changes status and sets cancelled_at", async () => {
    const chain = mockChain({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { cancelSubscription } = await import("@/lib/actions/product-actions");
    const result = await cancelSubscription("sub-1", "고객 요청");

    expect(result.success).toBe(true);

    // Verify update was called with cancelled status
    const updateCall = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateCall[0].status).toBe("cancelled");
    expect(updateCall[0].notes).toBe("고객 요청");
    expect(updateCall[0].cancelled_at).toBeDefined();
    expect(updateCall[0].updated_at).toBeDefined();
  });

  test("TC4b: cancelSubscription returns error on failure", async () => {
    const chain = mockChain({ data: null, error: { message: "Not found" } });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { cancelSubscription } = await import("@/lib/actions/product-actions");
    const result = await cancelSubscription("sub-nonexistent", "test");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Not found");
  });
});
