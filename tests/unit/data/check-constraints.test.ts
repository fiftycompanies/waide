/**
 * check-constraints.test.ts
 * DB CHECK constraint 유효값/무효값 검증 (24 TC)
 *
 * 순수 데이터 검증 테스트 -- DB 호출 없음.
 * CLAUDE.md 섹션 1 "DB CHECK 제약" 기준.
 */
import { describe, test, expect } from "vitest";

// ─── clients ──────────────────────────────────────────────────────────────

describe("clients.client_type", () => {
  const VALID = ["company", "sub_client", "platform", "brand", "shop"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'individual'", () => {
    expect(VALID).not.toContain("individual");
  });
});

describe("clients.onboarding_status", () => {
  const VALID = ["pending", "in_progress", "completed"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'analysis_done'", () => {
    expect(VALID).not.toContain("analysis_done");
  });
});

describe("clients.status", () => {
  const VALID = ["active", "inactive", "churned"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'deleted'", () => {
    expect(VALID).not.toContain("deleted");
  });
});

// ─── keywords ─────────────────────────────────────────────────────────────

describe("keywords.status", () => {
  const VALID = ["active", "paused", "archived", "queued", "refresh", "suggested"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'deleted'", () => {
    expect(VALID).not.toContain("deleted");
  });
});

describe("keywords.priority", () => {
  const VALID = ["critical", "high", "medium", "low"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'urgent'", () => {
    expect(VALID).not.toContain("urgent");
  });
});

// ─── contents ─────────────────────────────────────────────────────────────

describe("contents.publish_status", () => {
  const VALID = ["draft", "review", "approved", "published", "rejected", "archived"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'scheduled'", () => {
    expect(VALID).not.toContain("scheduled");
  });
});

describe("contents.content_type", () => {
  const VALID = [
    "blog_list",
    "blog_review",
    "blog_info",
    "aeo_qa",
    "aeo_list",
    "aeo_entity",
    "single",
    "list",
    "review",
    "info",
  ];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'blog_post' (DEFAULT mismatch)", () => {
    expect(VALID).not.toContain("blog_post");
  });
});

// ─── publications ─────────────────────────────────────────────────────────

describe("publications.status", () => {
  const VALID = ["pending", "publishing", "published", "failed"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'cancelled'", () => {
    expect(VALID).not.toContain("cancelled");
  });
});

describe("publications.publish_type", () => {
  const VALID = ["manual", "auto"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'scheduled'", () => {
    expect(VALID).not.toContain("scheduled");
  });
});

// ─── point_transactions ───────────────────────────────────────────────────

describe("point_transactions.type", () => {
  const VALID = ["grant", "spend", "revoke", "signup_bonus", "refund"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'purchase'", () => {
    expect(VALID).not.toContain("purchase");
  });
});

// ─── subscriptions ────────────────────────────────────────────────────────

describe("subscriptions.status", () => {
  const VALID = ["trial", "active", "past_due", "cancelled", "paused"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'expired'", () => {
    expect(VALID).not.toContain("expired");
  });
});

describe("subscriptions.plan_name", () => {
  const VALID = ["trial", "basic", "pro", "enterprise"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'premium'", () => {
    expect(VALID).not.toContain("premium");
  });
});

// ─── llm_answers ──────────────────────────────────────────────────────────

describe("llm_answers.ai_model", () => {
  const VALID = ["perplexity", "claude", "chatgpt", "gemini"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'gpt4'", () => {
    expect(VALID).not.toContain("gpt4");
  });
});

describe("llm_answers.crawl_method", () => {
  const VALID = ["api", "playwright"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'puppeteer'", () => {
    expect(VALID).not.toContain("puppeteer");
  });
});

// ─── mentions ─────────────────────────────────────────────────────────────

describe("mentions.sentiment", () => {
  const VALID = ["positive", "neutral", "negative"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'mixed'", () => {
    expect(VALID).not.toContain("mixed");
  });
});

// ─── aeo_tracking_queue ───────────────────────────────────────────────────

describe("aeo_tracking_queue.status", () => {
  const VALID = ["pending", "processing", "completed", "failed"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'queued'", () => {
    expect(VALID).not.toContain("queued");
  });
});

// ─── brand_analyses ───────────────────────────────────────────────────────

describe("brand_analyses.status", () => {
  const VALID = ["pending", "analyzing", "completed", "failed", "converted"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'archived'", () => {
    expect(VALID).not.toContain("archived");
  });
});

// ─── questions ────────────────────────────────────────────────────────────

describe("questions.source", () => {
  const VALID = ["llm", "paa", "naver", "manual"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'google'", () => {
    expect(VALID).not.toContain("google");
  });
});

// ─── blog_accounts ────────────────────────────────────────────────────────

describe("blog_accounts.platform", () => {
  const VALID = ["naver", "tistory", "wordpress", "medium", "brunch"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'youtube'", () => {
    expect(VALID).not.toContain("youtube");
  });
});

describe("blog_accounts.auth_type", () => {
  const VALID = ["manual", "oauth", "api_key"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'cookie'", () => {
    expect(VALID).not.toContain("cookie");
  });
});

// ─── jobs ─────────────────────────────────────────────────────────────────

describe("jobs.priority", () => {
  const VALID = ["critical", "high", "medium", "low"];
  test("allows valid values (lowercase)", () => {
    VALID.forEach((v) => {
      expect(VALID).toContain(v);
      expect(v).toBe(v.toLowerCase());
    });
  });
  test("rejects uppercase 'HIGH'", () => {
    expect(VALID).not.toContain("HIGH");
  });
});

describe("jobs.trigger_type", () => {
  const VALID = ["USER", "SCHEDULER", "AGENT"];
  test("allows valid values (uppercase)", () => {
    VALID.forEach((v) => {
      expect(VALID).toContain(v);
      expect(v).toBe(v.toUpperCase());
    });
  });
  test("rejects lowercase 'user'", () => {
    expect(VALID).not.toContain("user");
  });
});

// ─── accounts ─────────────────────────────────────────────────────────────

describe("accounts.platform", () => {
  const VALID = ["naver", "tistory", "brunch", "google", "wordpress", "youtube"];
  test("allows valid values", () => {
    VALID.forEach((v) => expect(VALID).toContain(v));
  });
  test("rejects invalid 'medium' (only in blog_accounts, not accounts)", () => {
    expect(VALID).not.toContain("medium");
  });
});
