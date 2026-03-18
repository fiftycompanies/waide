/**
 * Slack Webhook 설정
 */
export interface SlackConfig {
  /** Slack Incoming Webhook URL */
  webhookUrl: string;
  /** 대상 채널명 (표시용) */
  channel: string;
}

/**
 * 상담 신청 정보
 */
export interface InquiryNotificationData {
  /** 고객명 */
  name: string;
  /** 연락처 */
  phone: string;
  /** 공간 유형 (아파트, 빌라 등) */
  spaceType: string;
  /** 평수 */
  areaPyeong: number;
  /** 예산 범위 */
  budgetRange: string;
  /** 프로젝트명 */
  projectName: string;
  /** 추가 메시지 (선택) */
  message?: string;
  /** 상담 ID */
  inquiryId?: string;
  /** 프로젝트 ID */
  projectId?: string;
}

/**
 * 월간 리포트 요약 (알림용)
 */
export interface MonthlyReportSummary {
  /** 프로젝트명 */
  projectName: string;
  /** 기간 */
  period: string;
  /** 월간 방문수 */
  totalVisits: number;
  /** 월간 상담수 */
  totalInquiries: number;
  /** 전환율 */
  conversionRate: number;
  /** 블로그 발행 수 */
  blogPostsPublished: number;
  /** 리포트 URL */
  reportUrl?: string;
}

/**
 * Slack + Email 알림 서비스.
 *
 * 홈페이지에서 발생하는 이벤트(새 상담, 월간 리포트 등)에 대해
 * Slack 채널과 이메일로 실시간 알림을 발송한다.
 *
 * Slack은 Block Kit 포맷을 사용하고,
 * 이메일은 Resend API를 사용한다.
 *
 * @example
 * ```ts
 * const notifier = new NotificationService(
 *   { webhookUrl: "https://hooks.slack.com/...", channel: "#inquiries" },
 *   "re_xxxx"
 * );
 * await notifier.notifyNewInquiry({ name: "김OO", phone: "010-1234-5678", ... });
 * ```
 */
export class NotificationService {
  private resendBaseUrl = "https://api.resend.com";

  constructor(
    private slackConfig: SlackConfig,
    private resendApiKey: string
  ) {}

  /**
   * 새 상담 접수 시 Slack 알림을 발송한다.
   *
   * Slack Block Kit 포맷으로 고객 정보, 공간 유형, 평수, 예산 등을
   * 시각적으로 구성하여 전송한다. "상세 보기" 버튼으로
   * 어드민 상담 상세 페이지로 바로 이동할 수 있다.
   *
   * @param inquiry - 상담 신청 정보
   */
  async notifyNewInquiry(inquiry: InquiryNotificationData): Promise<void> {
    if (!this.slackConfig.webhookUrl) {
      console.warn("Slack Webhook URL이 설정되지 않았습니다");
      return;
    }

    const adminUrl = inquiry.projectId && inquiry.inquiryId
      ? `${process.env.NEXT_PUBLIC_APP_URL || "https://app.waide.kr"}/dashboard/homepage/${inquiry.projectId}/inquiries/${inquiry.inquiryId}`
      : undefined;

    const blocks: Record<string, unknown>[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `새 상담 신청 - ${inquiry.projectName}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*고객명*\n${inquiry.name}`,
          },
          {
            type: "mrkdwn",
            text: `*연락처*\n${inquiry.phone}`,
          },
          {
            type: "mrkdwn",
            text: `*공간유형*\n${inquiry.spaceType}`,
          },
          {
            type: "mrkdwn",
            text: `*평수*\n${inquiry.areaPyeong}평`,
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*예산*\n${inquiry.budgetRange}`,
          },
          {
            type: "mrkdwn",
            text: `*접수 시각*\n${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
          },
        ],
      },
    ];

    // 메시지가 있으면 추가
    if (inquiry.message) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*고객 메시지*\n> ${inquiry.message}`,
        },
      });
    }

    // 구분선
    blocks.push({ type: "divider" });

    // 상세 보기 버튼
    if (adminUrl) {
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "상세 보기",
              emoji: true,
            },
            url: adminUrl,
            style: "primary",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "전화 걸기",
              emoji: true,
            },
            url: `tel:${inquiry.phone}`,
          },
        ],
      });
    }

    await this.sendSlackMessage({ blocks });
  }

  /**
   * 새 상담 접수 시 이메일 알림을 발송한다.
   *
   * Resend API를 사용하여 HTML 이메일을 전송한다.
   * 이메일에는 고객 정보, 상담 내용, 관리 페이지 링크가 포함된다.
   *
   * @param to - 수신자 이메일 주소 (복수 가능)
   * @param inquiry - 상담 신청 정보
   */
  async emailNewInquiry(
    to: string | string[],
    inquiry: InquiryNotificationData
  ): Promise<void> {
    if (!this.resendApiKey) {
      console.warn("Resend API Key가 설정되지 않았습니다");
      return;
    }

    const recipients = Array.isArray(to) ? to : [to];

    const adminUrl = inquiry.projectId && inquiry.inquiryId
      ? `${process.env.NEXT_PUBLIC_APP_URL || "https://app.waide.kr"}/dashboard/homepage/${inquiry.projectId}/inquiries/${inquiry.inquiryId}`
      : "#";

    const html = this.buildInquiryEmailHtml(inquiry, adminUrl);

    const subject = `[새 상담] ${inquiry.projectName} - ${inquiry.name}님 (${inquiry.spaceType} ${inquiry.areaPyeong}평)`;

    await this.sendEmail({
      to: recipients,
      subject,
      html,
    });
  }

  /**
   * 월간 리포트 알림을 발송한다.
   *
   * Slack과 이메일 모두로 월간 성과 요약을 전송한다.
   *
   * @param to - 수신자 이메일 주소
   * @param report - 월간 리포트 요약
   */
  async notifyMonthlyReport(
    to: string | string[],
    report: MonthlyReportSummary
  ): Promise<void> {
    // Slack 알림
    if (this.slackConfig.webhookUrl) {
      const blocks: Record<string, unknown>[] = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `월간 리포트 - ${report.projectName}`,
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*기간*: ${report.period}`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*방문수*\n${report.totalVisits.toLocaleString()}회`,
            },
            {
              type: "mrkdwn",
              text: `*상담 접수*\n${report.totalInquiries}건`,
            },
            {
              type: "mrkdwn",
              text: `*전환율*\n${report.conversionRate}%`,
            },
            {
              type: "mrkdwn",
              text: `*블로그 발행*\n${report.blogPostsPublished}건`,
            },
          ],
        },
      ];

      if (report.reportUrl) {
        blocks.push({
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "전체 리포트 보기",
                emoji: true,
              },
              url: report.reportUrl,
              style: "primary",
            },
          ],
        });
      }

      await this.sendSlackMessage({ blocks });
    }

    // 이메일 알림
    if (this.resendApiKey) {
      const recipients = Array.isArray(to) ? to : [to];
      const html = this.buildMonthlyReportEmailHtml(report);

      await this.sendEmail({
        to: recipients,
        subject: `[월간 리포트] ${report.projectName} - ${report.period}`,
        html,
      });
    }
  }

  /**
   * 테스트 알림을 발송한다.
   * 설정 확인용으로 사용한다.
   *
   * @param type - 알림 유형 ("slack" | "email")
   * @param emailTo - 이메일 수신자 (email 타입 시 필수)
   */
  async sendTestNotification(
    type: "slack" | "email",
    emailTo?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (type === "slack") {
        await this.sendSlackMessage({
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "테스트 알림입니다. Slack 연동이 정상적으로 작동하고 있습니다.",
              },
            },
          ],
        });
        return { success: true, message: "Slack 테스트 알림 발송 완료" };
      }

      if (type === "email" && emailTo) {
        await this.sendEmail({
          to: [emailTo],
          subject: "[테스트] 와이드와일드 알림 테스트",
          html: `
            <div style="font-family: 'Apple SD Gothic Neo', sans-serif; padding: 20px;">
              <h2>알림 테스트</h2>
              <p>이메일 알림 연동이 정상적으로 작동하고 있습니다.</p>
              <p style="color: #666; font-size: 12px;">와이드와일드 홈페이지 서비스</p>
            </div>
          `,
        });
        return { success: true, message: "이메일 테스트 알림 발송 완료" };
      }

      return { success: false, message: "유효하지 않은 알림 유형입니다" };
    } catch (error) {
      return {
        success: false,
        message: `알림 발송 실패: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Slack Webhook으로 메시지를 전송한다.
   */
  private async sendSlackMessage(
    payload: Record<string, unknown>
  ): Promise<void> {
    const response = await fetch(this.slackConfig.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Slack 메시지 발송 실패: ${response.status} ${errorText}`
      );
    }
  }

  /**
   * Resend API로 이메일을 전송한다.
   */
  private async sendEmail(params: {
    to: string[];
    subject: string;
    html: string;
  }): Promise<void> {
    const response = await fetch(`${this.resendBaseUrl}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "와이드와일드 <noreply@waide.kr>",
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `이메일 발송 실패: ${data.message || response.statusText}`
      );
    }
  }

  /**
   * 상담 접수 알림 이메일 HTML을 생성한다.
   */
  private buildInquiryEmailHtml(
    inquiry: InquiryNotificationData,
    adminUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- 헤더 -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px 32px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">
                새 상담 신청이 접수되었습니다
              </h1>
              <p style="margin: 4px 0 0; color: #bfdbfe; font-size: 14px;">
                ${inquiry.projectName}
              </p>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 13px;">고객명</span><br>
                    <strong style="font-size: 15px;">${inquiry.name}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 13px;">연락처</span><br>
                    <strong style="font-size: 15px;">${inquiry.phone}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 13px;">공간유형 / 평수</span><br>
                    <strong style="font-size: 15px;">${inquiry.spaceType} ${inquiry.areaPyeong}평</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 13px;">예산</span><br>
                    <strong style="font-size: 15px;">${inquiry.budgetRange}</strong>
                  </td>
                </tr>
                ${inquiry.message ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 13px;">고객 메시지</span><br>
                    <p style="font-size: 14px; color: #374151; margin: 8px 0 0; padding: 12px; background-color: #f9fafb; border-radius: 4px;">
                      ${inquiry.message}
                    </p>
                  </td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #6b7280; font-size: 13px;">접수 시각</span><br>
                    <strong style="font-size: 15px;">${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</strong>
                  </td>
                </tr>
              </table>

              <!-- CTA 버튼 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${adminUrl}" style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                      상담 관리 페이지에서 확인하기
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                이 알림은 와이드와일드 홈페이지 서비스에서 자동 발송되었습니다.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * 월간 리포트 알림 이메일 HTML을 생성한다.
   */
  private buildMonthlyReportEmailHtml(
    report: MonthlyReportSummary
  ): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- 헤더 -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px 32px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">
                월간 홈페이지 성과 리포트
              </h1>
              <p style="margin: 4px 0 0; color: #bfdbfe; font-size: 14px;">
                ${report.projectName} | ${report.period}
              </p>
            </td>
          </tr>

          <!-- KPI 카드 -->
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">방문수</p>
                    <p style="margin: 4px 0 0; font-size: 28px; font-weight: 700; color: #111827;">
                      ${report.totalVisits.toLocaleString()}
                    </p>
                  </td>
                  <td width="8"></td>
                  <td width="50%" style="padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">상담 접수</p>
                    <p style="margin: 4px 0 0; font-size: 28px; font-weight: 700; color: #111827;">
                      ${report.totalInquiries}건
                    </p>
                  </td>
                </tr>
                <tr><td colspan="3" height="8"></td></tr>
                <tr>
                  <td width="50%" style="padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">전환율</p>
                    <p style="margin: 4px 0 0; font-size: 28px; font-weight: 700; color: #10b981;">
                      ${report.conversionRate}%
                    </p>
                  </td>
                  <td width="8"></td>
                  <td width="50%" style="padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">블로그 발행</p>
                    <p style="margin: 4px 0 0; font-size: 28px; font-weight: 700; color: #111827;">
                      ${report.blogPostsPublished}건
                    </p>
                  </td>
                </tr>
              </table>

              ${report.reportUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${report.reportUrl}" style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                      전체 리포트 보기
                    </a>
                  </td>
                </tr>
              </table>
              ` : ""}
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                이 리포트는 와이드와일드 홈페이지 서비스에서 자동 생성되었습니다.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
