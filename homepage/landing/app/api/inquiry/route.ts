import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company, name, phone, region, message } = body;

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: "WIDEWILD 상담 <onboarding@resend.dev>",
        to: "widewildonline@gmail.com",
        subject: `[새 상담] ${company} - ${name}`,
        html: `
          <h2>새 상담 신청이 접수되었습니다</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">업체명</td><td style="padding: 8px; border: 1px solid #ddd;">${company}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">담당자</td><td style="padding: 8px; border: 1px solid #ddd;">${name}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">연락처</td><td style="padding: 8px; border: 1px solid #ddd;">${phone}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">지역</td><td style="padding: 8px; border: 1px solid #ddd;">${region}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">메시지</td><td style="padding: 8px; border: 1px solid #ddd;">${message || "없음"}</td></tr>
          </table>
          <p style="color: #666; margin-top: 16px;">접수 시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
        `,
      });
    } else {
      console.warn("RESEND_API_KEY not configured. Email not sent.");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ success: true }); // Still show success to user
  }
}
