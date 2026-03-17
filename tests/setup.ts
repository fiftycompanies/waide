import { vi } from "vitest";

// Mock Next.js modules
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
  headers: vi.fn(() => new Headers()),
}));

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.ADMIN_SESSION_SECRET = "test-secret-key-for-hmac-2026";
process.env.CRON_SECRET = "test-cron-secret";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.PERPLEXITY_API_KEY = "test-perplexity-key";
process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/test";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
