"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import type { CronLog, SchedulerSettings } from "@/lib/scheduler";

// ── 타입 정의 ──────────────────────────────────────────────
export interface AllSchedulerSettings {
  serp: SchedulerSettings;
  searchVolume: SchedulerSettings;
  grading: SchedulerSettings;
}

export interface SlackChannelSettings {
  serp_channel: string;
  pipeline_channel: string;
  alerts_channel: string;
}

const KEYS = {
  serp: "serp_scheduler",
  searchVolume: "search_volume_scheduler",
  grading: "grading_scheduler",
} as const;

const DEFAULTS: AllSchedulerSettings = {
  serp: {
    enabled: true,
    interval_hours: 24,
    run_at_hour: 3,
    slack_webhook_url: "",
    slack_channel: "#serp-alerts",
    top_n_alert: 3,
    rank_threshold: 20,
  },
  searchVolume: {
    enabled: true,
    cron_day: 1,
    run_at_hour: 4,
  },
  grading: {
    enabled: true,
    cron_weekday: 1,
    run_at_hour: 5,
  },
};

// ── 전체 설정 조회 ─────────────────────────────────────────
export async function getAllSchedulerSettings(): Promise<AllSchedulerSettings> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("settings")
    .select("key, value")
    .in("key", Object.values(KEYS));

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }

  return {
    serp: { ...DEFAULTS.serp, ...(map[KEYS.serp] as Partial<SchedulerSettings> ?? {}) },
    searchVolume: { ...DEFAULTS.searchVolume, ...(map[KEYS.searchVolume] as Partial<SchedulerSettings> ?? {}) },
    grading: { ...DEFAULTS.grading, ...(map[KEYS.grading] as Partial<SchedulerSettings> ?? {}) },
  };
}

// ── 개별 설정 업데이트 ──────────────────────────────────────
export async function updateSchedulerSetting(
  type: "serp" | "searchVolume" | "grading",
  updates: Partial<SchedulerSettings>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    const key = KEYS[type];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (db as any)
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    const current = existing?.value ?? DEFAULTS[type];
    const merged = { ...current, ...updates };

    const descriptions: Record<string, string> = {
      serp: "SERP 순위 수집 스케줄러 설정",
      searchVolume: "검색량 갱신 스케줄러 설정",
      grading: "계정 등급/발행 추천 스케줄러 설정",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("settings")
      .upsert({
        key,
        value: merged,
        description: descriptions[type],
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    if (error) return { success: false, error: error.message };
    revalidatePath("/ops/scheduler");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── 크론 실행 이력 조회 ─────────────────────────────────────
export async function getCronLogHistory(limit = 20): Promise<CronLog[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("cron_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as CronLog[];
}

// ── Slack 채널 설정 조회 ──────────────────────────────────────
const SLACK_CHANNEL_DEFAULTS: SlackChannelSettings = {
  serp_channel: "#serp-tracking",
  pipeline_channel: "#content-pipeline",
  alerts_channel: "#alerts",
};

export async function getSlackChannelSettings(): Promise<SlackChannelSettings> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("settings")
    .select("value")
    .eq("key", "slack_webhook")
    .maybeSingle();

  const val = data?.value ?? {};
  return {
    serp_channel: val.serp_channel || SLACK_CHANNEL_DEFAULTS.serp_channel,
    pipeline_channel: val.pipeline_channel || SLACK_CHANNEL_DEFAULTS.pipeline_channel,
    alerts_channel: val.alerts_channel || SLACK_CHANNEL_DEFAULTS.alerts_channel,
  };
}

// ── Slack 채널 설정 업데이트 ─────────────────────────────────
export async function updateSlackChannelSettings(
  channels: SlackChannelSettings,
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (db as any)
      .from("settings")
      .select("value")
      .eq("key", "slack_webhook")
      .maybeSingle();

    const current = existing?.value ?? {};
    const merged = { ...current, ...channels };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("settings")
      .upsert({
        key: "slack_webhook",
        value: merged,
        description: "Slack 웹훅 알림 설정",
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    if (error) return { success: false, error: error.message };
    revalidatePath("/ops/scheduler");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── 수동 실행 트리거 ─────────────────────────────────────────
export async function triggerCronManually(
  type: "serp" | "searchVolume" | "grading",
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const pathMap = {
      serp: "/api/cron/serp",
      searchVolume: "/api/cron/search-volume",
      grading: "/api/cron/grading",
    };

    const resp = await fetch(`${baseUrl}${pathMap[type]}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { success: false, error: `HTTP ${resp.status}: ${text.slice(0, 200)}` };
    }

    revalidatePath("/ops/scheduler");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
