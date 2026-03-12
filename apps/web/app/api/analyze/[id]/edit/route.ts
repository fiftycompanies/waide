/**
 * POST /api/analyze/[id]/edit — 고객 보완 정보 저장
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = createAdminClient();

    const { error } = await db
      .from("brand_analyses")
      .update({ customer_edits: body })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/analyze/[id]/edit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
