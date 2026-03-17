/**
 * Supabase 클라이언트 모킹
 * createClient (서버) 및 createAdminClient (서비스 롤) 모킹
 */
import { vi } from "vitest";

// 체인 가능한 쿼리 빌더 모킹 헬퍼
export function createMockQueryBuilder(returnData: unknown = null, returnError: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainMethods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte",
    "like", "ilike", "is", "in", "not",
    "filter", "or", "and",
    "order", "limit", "range", "single", "maybeSingle",
    "textSearch", "match", "contains", "containedBy",
    "csv", "count",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // 터미널 메서드: Promise resolve
  builder.single = vi.fn().mockResolvedValue({ data: returnData, error: returnError });
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: returnData, error: returnError });

  // select 호출 시 체인 리턴, 마지막엔 data/error 리턴
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalSelect = builder.select as any;
  builder.select = vi.fn().mockImplementation((...args: unknown[]) => {
    originalSelect(...args);
    return {
      ...builder,
      then: (resolve: (val: { data: unknown; error: unknown }) => void) =>
        resolve({ data: returnData, error: returnError }),
    };
  });

  // insert/update/delete도 체인 가능하게
  for (const method of ["insert", "update", "delete", "upsert"]) {
    builder[method] = vi.fn().mockReturnValue({
      ...builder,
      then: (resolve: (val: { data: unknown; error: unknown }) => void) =>
        resolve({ data: returnData, error: returnError }),
    });
  }

  return builder;
}

// 기본 Supabase 클라이언트 모킹
export function createMockSupabaseClient(overrides?: Record<string, unknown>) {
  const queryBuilder = createMockQueryBuilder();

  return {
    from: vi.fn().mockReturnValue(queryBuilder),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    _queryBuilder: queryBuilder,
    ...overrides,
  };
}

// DB 쿼리 결과를 설정하는 헬퍼
export function mockDbQuery(
  client: ReturnType<typeof createMockSupabaseClient>,
  tableName: string,
  data: unknown,
  error: unknown = null,
) {
  const qb = createMockQueryBuilder(data, error);
  client.from = vi.fn().mockImplementation((table: string) => {
    if (table === tableName) return qb;
    return createMockQueryBuilder();
  });
  return qb;
}

// 여러 테이블 동시 모킹
export function mockMultipleDbQueries(
  client: ReturnType<typeof createMockSupabaseClient>,
  queries: Record<string, { data: unknown; error?: unknown }>,
) {
  client.from = vi.fn().mockImplementation((table: string) => {
    const q = queries[table];
    if (q) return createMockQueryBuilder(q.data, q.error ?? null);
    return createMockQueryBuilder();
  });
}
