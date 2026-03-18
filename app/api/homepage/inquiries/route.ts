import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const db = createAdminClient();
  const clientId = request.nextUrl.searchParams.get("client_id");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("homepage_inquiries")
    .select("*, homepage_projects(project_name, client_id)")
    .order("created_at", { ascending: false });

  // 고객 역할인 경우 client_id로 필터링
  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (data ?? []).map((inq: any) => ({
    ...inq,
    project_name: inq.homepage_projects?.project_name ?? null,
    homepage_projects: undefined,
  }));

  return NextResponse.json(result);
}
