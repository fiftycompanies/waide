import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contentIds } = body;

  if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
    return new Response(JSON.stringify({ titles: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = createAdminClient();
  const { data } = await db
    .from("contents")
    .select("id, title")
    .in("id", contentIds.slice(0, 10));

  const titles = (data ?? []).map(
    (r: { id: string; title: string | null }) => r.title || "(제목 없음)"
  );

  return new Response(JSON.stringify({ titles }), {
    headers: { "Content-Type": "application/json" },
  });
}
