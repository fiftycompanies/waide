import { NextRequest, NextResponse } from "next/server";

// 임시 진단 엔드포인트 — DB 환경변수 확인 후 삭제 예정
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== "db-check-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbVars: Record<string, string> = {};
  for (const key of Object.keys(process.env)) {
    if (
      key.includes("DATABASE") ||
      key.includes("POSTGRES") ||
      key.includes("SUPABASE") ||
      key.includes("PG") ||
      key.includes("DIRECT_URL")
    ) {
      // Mask value for security
      const val = process.env[key] || "";
      dbVars[key] = val.length > 30
        ? val.substring(0, 25) + "..." + val.substring(val.length - 10)
        : val.substring(0, 10) + "...";
    }
  }

  return NextResponse.json({ env_keys: Object.keys(dbVars), masked: dbVars });
}
