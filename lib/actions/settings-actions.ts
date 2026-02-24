"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export interface SerpSchedulerSettings {
  enabled: boolean;
  interval_hours: number;
  run_at_hour: number;
  slack_webhook_url: string;
  slack_channel: string;
  top_n_alert: number;
  rank_threshold: number;
}

const SERP_KEY = "serp_scheduler";

const DEFAULT_SERP: SerpSchedulerSettings = {
  enabled: true,
  interval_hours: 24,
  run_at_hour: 6,
  slack_webhook_url: "",
  slack_channel: "#serp-alerts",
  top_n_alert: 3,
  rank_threshold: 20,
};

export async function getSerpSchedulerSettings(): Promise<SerpSchedulerSettings> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("settings")
      .select("value")
      .eq("key", SERP_KEY)
      .maybeSingle();

    if (!data?.value) return DEFAULT_SERP;
    return { ...DEFAULT_SERP, ...(data.value as Partial<SerpSchedulerSettings>) };
  } catch {
    return DEFAULT_SERP;
  }
}

export async function updateSerpSchedulerSettings(
  settings: Partial<SerpSchedulerSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    const current = await getSerpSchedulerSettings();
    const merged = { ...current, ...settings };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("settings")
      .upsert(
        {
          key: SERP_KEY,
          value: merged,
          description: "SERP 순위 수집 스케줄러 설정",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) return { success: false, error: error.message };
    revalidatePath("/ops/agent-settings");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
