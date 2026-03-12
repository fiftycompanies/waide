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

// ── Scoring Weights ─────────────────────────────────────────────────────────

export interface ScoringWeights {
  account_grade: {
    weighted_exposure: number;
    exposure_rate: number;
    content_volume: number;
    thresholds: Record<string, number>;
    content_tiers: Record<string, number>;
  };
  keyword_difficulty: {
    search_volume: number;
    competition: number;
    serp_dominance: number;
    own_rank_bonus: number;
    thresholds: Record<string, number>;
    volume_tiers: Record<string, number>;
  };
  publish_recommendation: {
    block_already_exposed: boolean;
    block_recent_days: number;
    grade_matching: number;
    publish_history: number;
    keyword_relevance: number;
    volume_weight: number;
  };
  qc_scoring: {
    char_count: number;
    haeyo_ratio: number;
    keyword_density: number;
    h2_structure: number;
    image_placeholders: number;
    forbidden_terms: number;
    comparison_table: number;
    cta_included: number;
    hashtags: number;
    fail_threshold: number;
    haeyo_minimum: number;
  };
  marketing_score: {
    review_reputation: number;
    naver_keyword: number;
    google_keyword: number;
    image_quality: number;
    online_channels: number;
    seo_aeo_readiness: number;
  };
}

const SCORING_KEY = "scoring_weights";

const DEFAULT_SCORING: ScoringWeights = {
  account_grade: {
    weighted_exposure: 0.5,
    exposure_rate: 0.3,
    content_volume: 0.2,
    thresholds: { S: 80, A: 60, B: 40 },
    content_tiers: { "100": 100, "50": 75, "20": 50, "10": 25, "0": 10 },
  },
  keyword_difficulty: {
    search_volume: 0.4,
    competition: 0.3,
    serp_dominance: 0.3,
    own_rank_bonus: -25,
    thresholds: { S: 80, A: 60, B: 40 },
    volume_tiers: { "10000": 100, "5000": 80, "1000": 60, "500": 40, "100": 20, "0": 10 },
  },
  publish_recommendation: {
    block_already_exposed: true,
    block_recent_days: 7,
    grade_matching: 0.35,
    publish_history: 0.25,
    keyword_relevance: 0.25,
    volume_weight: 0.15,
  },
  qc_scoring: {
    char_count: 20,
    haeyo_ratio: 15,
    keyword_density: 15,
    h2_structure: 10,
    image_placeholders: 10,
    forbidden_terms: 10,
    comparison_table: 10,
    cta_included: 5,
    hashtags: 5,
    fail_threshold: 70,
    haeyo_minimum: 0.6,
  },
  marketing_score: {
    review_reputation: 20,
    naver_keyword: 25,
    google_keyword: 15,
    image_quality: 10,
    online_channels: 15,
    seo_aeo_readiness: 15,
  },
};

export async function getScoringWeights(): Promise<ScoringWeights> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("settings")
      .select("value")
      .eq("key", SCORING_KEY)
      .maybeSingle();

    if (!data?.value) return DEFAULT_SCORING;
    return deepMerge(DEFAULT_SCORING, data.value as Partial<ScoringWeights>) as ScoringWeights;
  } catch {
    return DEFAULT_SCORING;
  }
}

export async function updateScoringWeights(
  weights: ScoringWeights
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("settings")
      .upsert(
        {
          key: SCORING_KEY,
          value: weights,
          description: "계정등급/키워드난이도/발행추천/QC검수/마케팅점수 통합 가중치 설정",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) return { success: false, error: error.message };
    revalidatePath("/ops/scoring-settings");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function getDefaultScoringWeights(): Promise<ScoringWeights> {
  return structuredClone(DEFAULT_SCORING);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && target[key]) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ── Analysis Options (이미지 분석 on/off) ─────────────────────────────────────

export interface AnalysisOptions {
  image_analysis_enabled: boolean;
  image_analysis_count: number;
}

const ANALYSIS_OPTIONS_KEY = "analysis_options";

const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  image_analysis_enabled: false,
  image_analysis_count: 5,
};

export async function getAnalysisOptions(): Promise<AnalysisOptions> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("settings")
      .select("value")
      .eq("key", ANALYSIS_OPTIONS_KEY)
      .maybeSingle();

    if (!data?.value) return DEFAULT_ANALYSIS_OPTIONS;
    return { ...DEFAULT_ANALYSIS_OPTIONS, ...(data.value as Partial<AnalysisOptions>) };
  } catch {
    return DEFAULT_ANALYSIS_OPTIONS;
  }
}

export async function updateAnalysisOptions(
  options: Partial<AnalysisOptions>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    const current = await getAnalysisOptions();
    const merged = { ...current, ...options };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("settings")
      .upsert(
        {
          key: ANALYSIS_OPTIONS_KEY,
          value: merged,
          description: "분석 옵션 (이미지 분석 등)",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) return { success: false, error: error.message };
    revalidatePath("/ops/scoring-settings");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
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
