import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "서비스를 사용할 수 없습니다" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { project_id, name, phone, area_pyeong, space_type, budget_range, message } = body;

    if (!project_id || !name || !phone) {
      return NextResponse.json({ error: "필수 항목을 입력해주세요" }, { status: 400 });
    }

    const { data: project } = await supabase
      .from("homepage_projects")
      .select("client_id")
      .eq("id", project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
    }

    const { error } = await supabase.from("homepage_inquiries").insert({
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

    const { data: proj } = await supabase
      .from("homepage_projects")
      .select("total_inquiries")
      .eq("id", project_id)
      .single();

    if (proj) {
      await supabase
        .from("homepage_projects")
        .update({ total_inquiries: (proj.total_inquiries || 0) + 1 })
        .eq("id", project_id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
}
