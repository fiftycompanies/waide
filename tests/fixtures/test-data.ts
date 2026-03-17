// ── 테스트 상수 ─────────────────────────────────────────────────────────────
// Playwright E2E 테스트에서 공통으로 사용하는 ID, 인증 정보, 테스트 데이터

// ── Workspace / Client ID ───────────────────────────────────────────────────
export const WORKSPACE_ID = "2d716b35-407e-45bf-8941-60bce627d249";
export const CAMFIT_CLIENT_ID = "d9af5297-de7c-4353-96ea-78ba0bb59f0c";

// ── 테스트 계정 (Supabase Auth) ─────────────────────────────────────────────
export const TEST_ADMIN = {
  email: "admin@test.com",
  password: "admin1234",
} as const;

export const TEST_SALES = {
  email: "sales@test.com",
  password: "sales1234",
} as const;

export const TEST_CLIENT = {
  email: "client@test.com",
  password: "client1234",
} as const;

// ── 테스트 키워드 ID ────────────────────────────────────────────────────────
export const TEST_KEYWORD_IDS = {
  active: "00000000-0000-0000-0000-000000000001",
  suggested: "00000000-0000-0000-0000-000000000002",
  paused: "00000000-0000-0000-0000-000000000003",
} as const;

// ── 테스트 콘텐츠 ID ────────────────────────────────────────────────────────
export const TEST_CONTENT_IDS = {
  draft: "00000000-0000-0000-0000-000000001001",
  approved: "00000000-0000-0000-0000-000000001002",
  published: "00000000-0000-0000-0000-000000001003",
} as const;

// ── 테스트 분석 ID ──────────────────────────────────────────────────────────
export const TEST_ANALYSIS_IDS = {
  completed: "00000000-0000-0000-0000-000000002001",
  pending: "00000000-0000-0000-0000-000000002002",
} as const;

// ── 테스트 블로그 계정 ID ───────────────────────────────────────────────────
export const TEST_BLOG_ACCOUNT_IDS = {
  naver: "00000000-0000-0000-0000-000000003001",
  tistory: "00000000-0000-0000-0000-000000003002",
} as const;

// ── Storage State 경로 ──────────────────────────────────────────────────────
export const STORAGE_STATE = {
  admin: ".auth/admin.json",
  sales: ".auth/sales.json",
  portal: ".auth/portal.json",
} as const;
