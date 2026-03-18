import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

export async function GET() {
  const db = createAdminClient();

  const { data, error } = await db
    .from("homepage_inquiries")
    .select("*, homepage_projects(project_name)")
    .order("created_at", { ascending: false });

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
