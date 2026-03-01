import React from "react";
import { render } from "@react-email/components";
import { MonthlyReportEmail } from "./monthly-report-email";

interface SendReportParams {
  to: string;
  brandName: string;
  reportMonth: string;
  pdfBuffer: Buffer;
  kpiSummary: {
    monthlyContents: number;
    activeKeywords: number;
    top3Keywords: number;
  };
}

interface SendResult {
  success: boolean;
  error?: string;
}

/**
 * 월간 리포트 이메일 발송 (Resend API)
 *
 * RESEND_API_KEY 없으면 graceful skip
 */
export async function sendReportEmail(params: SendReportParams): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[send-report] RESEND_API_KEY not configured — skipping email send");
    return { success: false, error: "RESEND_API_KEY 미설정" };
  }

  const fromEmail = process.env.REPORT_FROM_EMAIL || "onboarding@resend.dev";
  const portalUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/portal/reports`
    : undefined;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    // 이메일 HTML 렌더링
    const emailElement = React.createElement(MonthlyReportEmail, {
      brandName: params.brandName,
      reportMonth: params.reportMonth,
      monthlyContents: params.kpiSummary.monthlyContents,
      activeKeywords: params.kpiSummary.activeKeywords,
      top3Keywords: params.kpiSummary.top3Keywords,
      portalUrl,
    });
    const html = await render(emailElement);

    // 파일명 생성
    const sanitizedBrand = params.brandName.replace(/[^가-힣a-zA-Z0-9]/g, "_");
    const monthPart = params.reportMonth.replace(/[^0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    const filename = `waide_report_${sanitizedBrand}_${monthPart}.pdf`;

    const { error } = await resend.emails.send({
      from: `Waide <${fromEmail}>`,
      to: [params.to],
      subject: `[Waide] ${params.brandName} — ${params.reportMonth} 마케팅 리포트`,
      html,
      attachments: [
        {
          filename,
          content: params.pdfBuffer.toString("base64"),
        },
      ],
    });

    if (error) {
      console.error("[send-report] Resend API error:", error);
      return { success: false, error: JSON.stringify(error) };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "이메일 발송 실패";
    console.error("[send-report] Exception:", err);
    return { success: false, error: message };
  }
}
