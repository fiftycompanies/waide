import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session";

export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. 환경변수 존재 확인
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  checks.ANTHROPIC_API_KEY = anthropicKey
    ? `SET (${anthropicKey.slice(0, 10)}...${anthropicKey.slice(-4)})`
    : "NOT SET";

  checks.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
    ? "SET"
    : "NOT SET";

  checks.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? "SET"
    : "NOT SET";

  checks.VERCEL_TOKEN = process.env.VERCEL_TOKEN ? "SET" : "NOT SET";
  checks.VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID ? "SET" : "NOT SET";

  // 2. 인증 세션 확인
  try {
    const session = await getAdminSession();
    checks.adminSession = session
      ? { id: session.id, role: session.role, username: session.username }
      : "NULL (not logged in)";
  } catch (e) {
    checks.adminSession = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 3. Anthropic API 테스트
  if (anthropicKey) {
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 5,
          messages: [{ role: "user", content: "test" }],
        }),
      });

      if (resp.ok) {
        checks.anthropicApiTest = "OK (200)";
      } else {
        const errBody = await resp.text().catch(() => "");
        checks.anthropicApiTest = `FAIL (${resp.status}): ${errBody.slice(0, 200)}`;
      }
    } catch (e) {
      checks.anthropicApiTest = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    checks.anthropicApiTest = "SKIP (no key)";
  }

  // 4. Supabase homepage_projects 테이블 접근 테스트
  try {
    const { createAdminClient } = await import("@/lib/supabase/service");
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("homepage_projects")
      .select("id")
      .limit(1);

    checks.homepageProjectsTable = error
      ? `ERROR: ${error.message}`
      : "OK (accessible)";
  } catch (e) {
    checks.homepageProjectsTable = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks,
  });
}
