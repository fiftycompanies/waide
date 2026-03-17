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
vi.mock("@/lib/publishers", () => ({
  publishContent: vi.fn(),
}));
vi.mock("@/lib/publishers/wordpress-publisher", () => ({
  testWordPressConnection: vi.fn(),
}));
vi.mock("@/lib/publishers/tistory-publisher", () => ({
  getTistoryBlogInfo: vi.fn(),
}));
vi.mock("@/lib/publishers/medium-publisher", () => ({
  getMediumUser: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/service";
import { publishContent } from "@/lib/publishers";
import { testWordPressConnection } from "@/lib/publishers/wordpress-publisher";
import { getTistoryBlogInfo } from "@/lib/publishers/tistory-publisher";
import { getMediumUser } from "@/lib/publishers/medium-publisher";

describe("publish-actions", () => {
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
  // TC1: executePublish creates publication record
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: executePublish creates publication record and publishes", async () => {
    (publishContent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      external_url: "https://blog.tistory.com/1",
      external_post_id: "123",
    });

    // Notification mock
    vi.doMock("@/lib/actions/notification-actions", () => ({
      createNotification: vi.fn().mockResolvedValue({ success: true }),
    }));
    vi.doMock("@/lib/actions/portal-actions", () => ({
      getPortalPointBalance: vi.fn().mockResolvedValue(10),
    }));

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // blog_accounts select
        return mockChain({ data: { id: "ba1", platform: "tistory", access_token: "tok" }, error: null });
      }
      if (callCount === 2) {
        // contents select
        return mockChain({ data: { id: "ct1", title: "Test Post", body: "Body", meta_description: "desc", content_type: "list", tags: [] }, error: null });
      }
      if (callCount === 3) {
        // publications insert
        return mockChain({ data: { id: "pub1" }, error: null });
      }
      if (callCount === 4) {
        // auto_publish_settings select
        return mockChain({ data: null, error: null });
      }
      // subsequent updates
      return mockChain({ data: null, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { executePublish } = await import("@/lib/actions/publish-actions");
    const result = await executePublish({
      contentId: "ct1",
      clientId: "c1",
      blogAccountId: "ba1",
      platform: "tistory",
    });

    expect(result.success).toBe(true);
    expect(result.publication).toBeDefined();
    expect(result.publication?.status).toBe("published");
    expect(result.publication?.external_url).toBe("https://blog.tistory.com/1");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: retryPublish increments retry_count (max 3)
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: retryPublish rejects when max retries exceeded", async () => {
    const pub = {
      id: "pub1",
      content_id: "ct1",
      client_id: "c1",
      blog_account_id: "ba1",
      platform: "tistory",
      publish_type: "manual",
      retry_count: 3, // already at max
      status: "failed",
    };

    const mockFrom = vi.fn().mockImplementation(() => {
      return mockChain({ data: pub, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { retryPublish } = await import("@/lib/actions/publish-actions");
    const result = await retryPublish("pub1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("최대 재시도 횟수");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: checkAutoPublish triggers for QC-passed content
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: checkAutoPublish skips when auto-publish is disabled", async () => {
    const mockFrom = vi.fn().mockImplementation(() => {
      // auto_publish_settings — disabled
      return mockChain({ data: { is_enabled: false }, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { checkAutoPublish } = await import("@/lib/actions/publish-actions");

    // Should not throw and not call publishContent
    await checkAutoPublish("ct1", "c1");
    expect(publishContent).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC4: getAutoPublishSettings returns defaults when none set
  // ─────────────────────────────────────────────────────────────────────────
  test("TC4: getAutoPublishSettings returns null when no settings", async () => {
    const mockFrom = vi.fn().mockImplementation(() => {
      return mockChain({ data: null, error: null });
    });

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { getAutoPublishSettings } = await import("@/lib/actions/publish-actions");
    const result = await getAutoPublishSettings("c1");

    expect(result).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC5: updateAutoPublishSettings upserts correctly
  // ─────────────────────────────────────────────────────────────────────────
  test("TC5: updateAutoPublishSettings upserts settings", async () => {
    const chain = mockChain({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    });

    const { updateAutoPublishSettings } = await import("@/lib/actions/publish-actions");
    const result = await updateAutoPublishSettings("c1", {
      is_enabled: true,
      tistory_enabled: true,
      wordpress_enabled: false,
      medium_enabled: false,
    });

    expect(result.success).toBe(true);
    expect(chain.upsert).toHaveBeenCalled();
    const upsertCall = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(upsertCall[0]).toMatchObject({
      client_id: "c1",
      is_enabled: true,
      tistory_enabled: true,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC6: testBlogConnection verifies platform connectivity
  // ─────────────────────────────────────────────────────────────────────────
  test("TC6: testBlogConnection verifies tistory connectivity", async () => {
    (getTistoryBlogInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      blogName: "MyTistoryBlog",
    });

    const { testBlogConnection } = await import("@/lib/actions/publish-actions");
    const result = await testBlogConnection({
      platform: "tistory",
      accessToken: "test-token",
    });

    expect(result.success).toBe(true);
    expect(result.info).toContain("MyTistoryBlog");
  });

  test("TC6b: testBlogConnection verifies wordpress connectivity", async () => {
    (testWordPressConnection as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      siteName: "MyWPSite",
    });

    const { testBlogConnection } = await import("@/lib/actions/publish-actions");
    const result = await testBlogConnection({
      platform: "wordpress",
      blogUrl: "https://mysite.com",
      apiKey: "admin",
      apiSecret: "app-password",
    });

    expect(result.success).toBe(true);
    expect(result.info).toContain("MyWPSite");
  });

  test("TC6c: testBlogConnection verifies medium connectivity", async () => {
    (getMediumUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      name: "MediumUser",
      username: "meduser",
    });

    const { testBlogConnection } = await import("@/lib/actions/publish-actions");
    const result = await testBlogConnection({
      platform: "medium",
      apiKey: "medium-token",
    });

    expect(result.success).toBe(true);
    expect(result.info).toContain("MediumUser");
  });
});
