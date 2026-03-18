import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. 환경변수 체크
  checks.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    SUPABASE_SERVICE_KEY_LENGTH: process.env.SUPABASE_SERVICE_KEY?.length ?? 0,
  };

  // 2. createAdminClient 테스트
  try {
    const { createAdminClient } = await import("@/lib/supabase/service");
    const db = createAdminClient();
    checks.adminClient = "OK";

    // 3. consultation_requests 쿼리 테스트
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error, count } = await (db as any)
        .from("consultation_requests")
        .select("id, contact_name, status, brand_name", { count: "exact" })
        .limit(3);

      checks.query = {
        success: !error,
        error: error ? { message: error.message, code: error.code, details: error.details } : null,
        count,
        sampleIds: data?.map((r: { id: string }) => r.id.substring(0, 8)) ?? [],
      };
    } catch (queryErr) {
      checks.query = {
        success: false,
        exception: queryErr instanceof Error ? queryErr.message : String(queryErr),
      };
    }

    // 4. sales_agents 쿼리 테스트
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (db as any)
        .from("sales_agents")
        .select("ref_code, name")
        .eq("is_active", true)
        .limit(3);

      checks.salesAgents = {
        success: !error,
        error: error ? { message: error.message, code: error.code } : null,
        count: data?.length ?? 0,
      };
    } catch (agentErr) {
      checks.salesAgents = {
        success: false,
        exception: agentErr instanceof Error ? agentErr.message : String(agentErr),
      };
    }
  } catch (clientErr) {
    checks.adminClient = {
      success: false,
      exception: clientErr instanceof Error ? clientErr.message : String(clientErr),
    };
  }

  return NextResponse.json(checks);
}
