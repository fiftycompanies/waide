/**
 * PDF 리포트 다운로드 API
 *
 * GET /api/portal/report-pdf?clientId=xxx&month=2026-02
 *
 * 어드민: clientId 파라미터 사용
 * 포털: Supabase Auth → users.client_id 사용
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";
import { getMonthlyReportData } from "@/lib/actions/report-actions";
import { generateReportPdf } from "@/lib/pdf/generate-report";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  let clientId = searchParams.get("clientId");
  const monthParam = searchParams.get("month"); // "2026-02"

  // 인증: 어드민 세션 쿠키 또는 Supabase Auth 확인
  if (!clientId) {
    // 포털 사용자 — Supabase Auth로 client_id 조회
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const db = createAdminClient();
      const { data: userData } = await db
        .from("users")
        .select("client_id")
        .eq("id", user.id)
        .single();
      if (!userData?.client_id) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      clientId = userData.client_id;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 월 파싱
  let year: number;
  let month: number;
  if (monthParam) {
    const parts = monthParam.split("-");
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  // 리포트 데이터 수집
  const reportData = await getMonthlyReportData(clientId as string, year, month);
  if (!reportData) {
    return NextResponse.json({ error: "Report data not found" }, { status: 404 });
  }

  // PDF 생성
  const pdfBuffer = await generateReportPdf(reportData);

  // 파일명
  const sanitizedBrand = reportData.brandName.replace(/[^가-힣a-zA-Z0-9]/g, "_");
  const filename = `waide_report_${sanitizedBrand}_${year}_${String(month).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "no-cache",
    },
  });
}
