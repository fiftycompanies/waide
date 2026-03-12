/**
 * Slack 에러 알림 모듈
 * SLACK_ERROR_WEBHOOK_URL → SLACK_WEBHOOK_URL 순서로 폴백 (없으면 graceful skip)
 */

// 중복 발송 방지: 동일 에러 5분 이내 재발송 차단
const recentErrors = new Map<string, number>();
const DEDUP_INTERVAL_MS = 5 * 60 * 1000; // 5분

function isDuplicate(errorMessage: string): boolean {
  const key = errorMessage.slice(0, 200);
  const lastSent = recentErrors.get(key);
  const now = Date.now();

  if (lastSent && now - lastSent < DEDUP_INTERVAL_MS) {
    return true;
  }

  recentErrors.set(key, now);

  // 오래된 항목 정리 (100개 초과 시)
  if (recentErrors.size > 100) {
    const cutoff = now - DEDUP_INTERVAL_MS;
    for (const [k, v] of recentErrors) {
      if (v < cutoff) recentErrors.delete(k);
    }
  }

  return false;
}

export interface ErrorNotificationParams {
  errorMessage: string;
  errorType: string;
  pageUrl?: string;
  userEmail?: string;
  userRole?: string;
  errorId?: string;
}

export async function sendErrorSlackNotification(
  params: ErrorNotificationParams
): Promise<void> {
  const webhookUrl = process.env.SLACK_ERROR_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  // 중복 발송 방지
  if (isDuplicate(params.errorMessage)) {
    return;
  }

  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://waide.co.kr";

  const typeEmoji: Record<string, string> = {
    client: "🖥️",
    server: "🔥",
    api: "⚡",
    cron: "⏰",
  };

  const emoji = typeEmoji[params.errorType] || "🚨";

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *에러 발생*\n*유형:* \`${params.errorType}\`\n*시간:* ${now}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*에러:*\n\`\`\`${params.errorMessage.slice(0, 500)}\`\`\``,
      },
    },
  ];

  const contextFields: string[] = [];
  if (params.pageUrl) contextFields.push(`*페이지:* ${params.pageUrl}`);
  if (params.userEmail) contextFields.push(`*사용자:* ${params.userEmail} (${params.userRole || "unknown"})`);

  if (contextFields.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: contextFields.join("\n"),
      },
    });
  }

  if (params.errorId) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${baseUrl}/ops/error-logs?id=${params.errorId}|에러 로그 보기 →>`,
      },
    });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    if (!res.ok) {
      console.error("[slack-error] webhook failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[slack-error] send failed:", err);
    // 슬랙 실패해도 에러 로깅 자체는 성공해야 함
  }
}
