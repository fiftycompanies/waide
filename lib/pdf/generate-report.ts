import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { MonthlyReportDocument } from "./monthly-report-template";
import type { MonthlyReportData } from "@/lib/actions/report-actions";

/**
 * PDF Buffer 생성
 * @param data - 리포트 데이터 (getMonthlyReportData 결과)
 * @returns PDF Buffer (Uint8Array)
 */
export async function generateReportPdf(data: MonthlyReportData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(MonthlyReportDocument, { data }) as any;
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
