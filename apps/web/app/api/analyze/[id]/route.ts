/**
 * GET /api/analyze/[id] — 분석 상태/결과 조회
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createAdminClient();

    const { data, error } = await db
      .from("brand_analyses")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 조회수 증가 (completed 상태만, non-blocking)
    if (data.status === "completed") {
      void db
        .from("brand_analyses")
        .update({ view_count: (data.view_count ?? 0) + 1 })
        .eq("id", id);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/analyze/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
