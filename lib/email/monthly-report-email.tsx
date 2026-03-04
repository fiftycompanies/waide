import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface MonthlyReportEmailProps {
  brandName: string;
  reportMonth: string;
  monthlyContents: number;
  activeKeywords: number;
  top3Keywords: number;
  portalUrl?: string;
}

export function MonthlyReportEmail({
  brandName,
  reportMonth,
  monthlyContents,
  activeKeywords,
  top3Keywords,
  portalUrl,
}: MonthlyReportEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{brandName} — {reportMonth} 마케팅 리포트</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Text style={logoStyle}>Waide</Text>
          </Section>

          {/* Greeting */}
          <Section style={sectionStyle}>
            <Heading style={headingStyle}>
              {reportMonth} 마케팅 리포트
            </Heading>
            <Text style={textStyle}>
              안녕하세요, {brandName} 담당자님.
            </Text>
            <Text style={textStyle}>
              이번 달 마케팅 성과를 요약해 드립니다.
            </Text>
          </Section>

          <Hr style={hrStyle} />

          {/* Summary */}
          <Section style={sectionStyle}>
            <Text style={summaryTitleStyle}>핵심 요약</Text>
            <Text style={summaryItemStyle}>
              발행 콘텐츠: <strong>{monthlyContents}건</strong>
            </Text>
            <Text style={summaryItemStyle}>
              활성 키워드: <strong>{activeKeywords}개</strong>
            </Text>
            <Text style={summaryItemStyle}>
              TOP3 키워드: <strong>{top3Keywords}개</strong>
            </Text>
          </Section>

          <Hr style={hrStyle} />

          {/* CTA */}
          <Section style={sectionStyle}>
            <Text style={textStyle}>
              첨부된 PDF에서 상세 내용을 확인하세요.
            </Text>
            {portalUrl && (
              <Link href={portalUrl} style={buttonStyle}>
                포털에서 자세히 보기
              </Link>
            )}
          </Section>

          {/* Footer */}
          <Section style={footerSectionStyle}>
            <Hr style={hrStyle} />
            <Text style={footerStyle}>
              Waide 팀 드림
            </Text>
            <Text style={footerMutedStyle}>
              AI Hospitality Aide — B2B 마케팅 자동화
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── 스타일 ──────────────────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', -apple-system, sans-serif",
  margin: 0,
  padding: 0,
};

const containerStyle: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#10b981",
  padding: "24px",
  textAlign: "center",
};

const logoStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: 700,
  margin: 0,
};

const sectionStyle: React.CSSProperties = {
  padding: "24px",
};

const headingStyle: React.CSSProperties = {
  fontSize: "20px",
  color: "#1f2937",
  fontWeight: 700,
  margin: "0 0 12px 0",
};

const textStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  lineHeight: "1.6",
  margin: "0 0 8px 0",
};

const summaryTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#1f2937",
  margin: "0 0 12px 0",
};

const summaryItemStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
  lineHeight: "1.8",
  margin: "0 0 4px 0",
  paddingLeft: "8px",
  borderLeft: "3px solid #10b981",
};

const hrStyle: React.CSSProperties = {
  borderColor: "#e5e7eb",
  borderTop: "1px solid #e5e7eb",
  margin: "0",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#10b981",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  marginTop: "16px",
};

const footerSectionStyle: React.CSSProperties = {
  padding: "0 24px 24px 24px",
};

const footerStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "16px 0 4px 0",
};

const footerMutedStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#9ca3af",
  margin: "0",
};
