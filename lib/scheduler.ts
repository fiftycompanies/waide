/**
 * 크론 스케줄러 핵심 모듈
 *
 * 역할:
 *   - 스케줄 태스크 실행 래퍼 (로깅, 타이밍, 에러 처리)
 *   - Slack 알림 발송
 *   - cron_logs 테이블 관리
 *   - CRON_SECRET 인증 검증
 */

import { createAdminClient } from "@/lib/supabase/service";

// ── 타입 ────────────────────────────────────────────────────
export type TaskName = "serp_collection" | "search_volume" | "grading";

export interface CronLog {
  id: string;
  task_name: TaskName;
  status: "running" | "success" | "failed";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  details: Record<string, unknown>;
  error: string | null;
  created_at: string;
}

export interface SchedulerSettings {
  enabled: boolean;
  run_at_hour: number;
  // SERP
  interval_hours?: number;
  slack_webhook_url?: string;
  slack_channel?: string;
  top_n_alert?: number;
  rank_threshold?: number;
  // Search volume
  cron_day?: number; // 1~28 (day of month)
  // Grading
  cron_weekday?: number; // 0=Sun, 1=Mon, ..., 6=Sat
}

// ── CRON_SECRET 인증 ─────────────────────────────────────────
export function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 시크릿 미설정 시 통과 (개발 환경)
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// ── 태스크 실행 래퍼 ─────────────────────────────────────────
export async function runScheduledTask<T>(
  taskName: TaskName,
  fn: () => Promise<T>,
): Promise<{ success: boolean; logId: string; result?: T; error?: string }> {
  const db = createAdminClient();
  const startedAt = new Date().toISOString();

  // 실행 중 로그 생성
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logRow } = await (db as any)
    .from("cron_logs")
    .insert({ task_name: taskName, status: "running", started_at: startedAt })
    .select("id")
    .single();

  const logId = logRow?.id ?? "unknown";
  const t0 = Date.now();

  try {
    const result = await fn();
    const durationMs = Date.now() - t0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("cron_logs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        duration_ms: durationMs,
        details: result ?? {},
      })
      .eq("id", logId);

    return { success: true, logId, result };
  } catch (err) {
    const durationMs = Date.now() - t0;
    const errMsg = err instanceof Error ? err.message : String(err);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("cron_logs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        duration_ms: durationMs,
        error: errMsg,
      })
      .eq("id", logId);

    return { success: false, logId, error: errMsg };
  }
}

// ── Slack 알림 ──────────────────────────────────────────────

/**
 * 채널 라우팅이 포함된 Slack 알림 발송.
 *
 * Bot API 모드 (SLACK_BOT_TOKEN + 채널명):
 *   channel_type에 따라 settings.slack_webhook의 채널명을 조회하여 발송.
 * Webhook 모드 (webhookUrl):
 *   기존 방식 그대로 (webhook은 고정 채널).
 */
export async function sendSlackNotification(
  message: string,
  webhookUrl?: string,
  channel_type?: "serp" | "pipeline" | "alerts",
): Promise<void> {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const defaultChannel = process.env.SLACK_CHANNEL_ID;

  // Bot API 모드: 채널별 라우팅 지원
  if (botToken && defaultChannel) {
    let targetChannel = defaultChannel;
    if (channel_type) {
      try {
        const channelSettings = await _getSlackChannelSettings();
        const key = `${channel_type}_channel` as keyof typeof channelSettings;
        targetChannel = channelSettings[key] || defaultChannel;
      } catch {
        // 설정 조회 실패 시 기본 채널 사용
      }
    }

    try {
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify({ channel: targetChannel, text: message }),
      });
    } catch {
      // Slack 알림 실패는 무시 (non-critical)
    }
    return;
  }

  // Webhook 모드: 기존 방식
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
  } catch {
    // Slack 알림 실패는 무시 (non-critical)
  }
}

let _channelSettingsCache: { serp_channel: string; pipeline_channel: string; alerts_channel: string } | null = null;

async function _getSlackChannelSettings() {
  if (_channelSettingsCache) return _channelSettingsCache;

  const defaults = { serp_channel: "#serp-tracking", pipeline_channel: "#content-pipeline", alerts_channel: "#alerts" };
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("settings")
      .select("value")
      .eq("key", "slack_webhook")
      .maybeSingle();

    if (data?.value) {
      _channelSettingsCache = {
        serp_channel: data.value.serp_channel || defaults.serp_channel,
        pipeline_channel: data.value.pipeline_channel || defaults.pipeline_channel,
        alerts_channel: data.value.alerts_channel || defaults.alerts_channel,
      };
    } else {
      _channelSettingsCache = defaults;
    }
  } catch {
    _channelSettingsCache = defaults;
  }

  return _channelSettingsCache;
}

// ── 설정 조회 헬퍼 ──────────────────────────────────────────
export async function getSchedulerSettings(
  key: string,
  defaults: SchedulerSettings,
): Promise<SchedulerSettings> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (!data?.value) return defaults;
    return { ...defaults, ...(data.value as Partial<SchedulerSettings>) };
  } catch {
    return defaults;
  }
}

// ── 실행 이력 조회 ──────────────────────────────────────────
export async function getCronLogs(
  taskName?: TaskName,
  limit = 10,
): Promise<CronLog[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any)
    .from("cron_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (taskName) q = q.eq("task_name", taskName);
  const { data } = await q;
  return (data ?? []) as CronLog[];
}

// ── 전체 스케줄러 현황 조회 ──────────────────────────────────
export interface SchedulerStatus {
  serp: SchedulerSettings;
  searchVolume: SchedulerSettings;
  grading: SchedulerSettings;
  recentLogs: CronLog[];
}

const DEFAULT_SERP: SchedulerSettings = {
  enabled: true,
  interval_hours: 24,
  run_at_hour: 3,
  slack_webhook_url: "",
  slack_channel: "#serp-alerts",
  top_n_alert: 3,
  rank_threshold: 20,
};

const DEFAULT_SEARCH_VOL: SchedulerSettings = {
  enabled: true,
  cron_day: 1,
  run_at_hour: 4,
};

const DEFAULT_GRADING: SchedulerSettings = {
  enabled: true,
  cron_weekday: 1,
  run_at_hour: 5,
};

export async function getAllSchedulerStatus(): Promise<SchedulerStatus> {
  const [serp, searchVolume, grading, recentLogs] = await Promise.all([
    getSchedulerSettings("serp_scheduler", DEFAULT_SERP),
    getSchedulerSettings("search_volume_scheduler", DEFAULT_SEARCH_VOL),
    getSchedulerSettings("grading_scheduler", DEFAULT_GRADING),
    getCronLogs(undefined, 20),
  ]);

  return { serp, searchVolume, grading, recentLogs };
}
