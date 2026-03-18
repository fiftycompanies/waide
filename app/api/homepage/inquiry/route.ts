import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

// 홈페이지에서 상담 접수 (외부 호출용, CORS 허용)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project_id, name, phone, area_pyeong, space_type, budget_range, message } = body;

    if (!project_id || !name || !phone) {
      return NextResponse.json(
        { error: "project_id, name, phone은 필수입니다" },
        { status: 400 },
      );
    }

    const db = createAdminClient();

    // 프로젝트 존재 여부 확인 + client_id 가져오기
    const { data: project } = await db
      .from("homepage_projects")
      .select("client_id")
      .eq("id", project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
    }

    // 상담 신청 INSERT
    const { error } = await db.from("homepage_inquiries").insert({
      project_id,
      client_id: project.client_id,
      name,
      phone,
      area_pyeong: area_pyeong || null,
      space_type: space_type || null,
      budget_range: budget_range || null,
      message: message || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // total_inquiries 카운트 증가
    await db.rpc("increment_field", {
      table_name: "homepage_projects",
      field_name: "total_inquiries",
      row_id: project_id,
    }).catch(() => {
      // RPC 없으면 수동 증가
      db.from("homepage_projects")
        .select("total_inquiries")
        .eq("id", project_id)
        .single()
        .then(({ data }) => {
          if (data) {
            db.from("homepage_projects")
              .update({ total_inquiries: (data.total_inquiries || 0) + 1 })
              .eq("id", project_id);
          }
        });
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
