"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SalesAgent {
  id: string;
  name: string;
  ref_code: string;
  phone: string | null;
  email: string | null;
  slack_user_id: string | null;
  is_active: boolean;
  total_analyses: number;
  total_consultations: number;
  created_at: string;
  updated_at: string | null;
}

export interface SalesAgentWithStats extends SalesAgent {
  live_analyses: number;
  live_consultations: number;
  conversion_rate: number;
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function listSalesAgents(): Promise<SalesAgentWithStats[]> {
  const db = createAdminClient();

  const { data: agents, error } = await db
    .from("sales_agents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !agents) return [];

  // 실시간 집계: brand_analyses + consultation_requests
  const refCodes = agents.map((a: SalesAgent) => a.ref_code);

  const [{ data: analysisCounts }, { data: consultCounts }] = await Promise.all([
    db
      .from("brand_analyses")
      .select("sales_ref")
      .in("sales_ref", refCodes),
    db
      .from("consultation_requests")
      .select("sales_ref")
      .in("sales_ref", refCodes),
  ]);

  // Count per ref
  const aCounts: Record<string, number> = {};
  const cCounts: Record<string, number> = {};
  (analysisCounts ?? []).forEach((r: { sales_ref: string }) => {
    aCounts[r.sales_ref] = (aCounts[r.sales_ref] ?? 0) + 1;
  });
  (consultCounts ?? []).forEach((r: { sales_ref: string }) => {
    cCounts[r.sales_ref] = (cCounts[r.sales_ref] ?? 0) + 1;
  });

  return agents.map((a: SalesAgent) => {
    const la = aCounts[a.ref_code] ?? 0;
    const lc = cCounts[a.ref_code] ?? 0;
    return {
      ...a,
      live_analyses: la,
      live_consultations: lc,
      conversion_rate: la > 0 ? Math.round((lc / la) * 100) : 0,
    };
  });
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createSalesAgent(input: {
  name: string;
  ref_code: string;
  phone?: string;
  email?: string;
  slack_user_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  // Ref code validation
  if (!/^[A-Za-z0-9_-]{2,20}$/.test(input.ref_code)) {
    return { success: false, error: "ref_code는 영문/숫자 2~20자여야 합니다." };
  }

  // 중복 검증
  const { data: existing } = await db
    .from("sales_agents")
    .select("id")
    .eq("ref_code", input.ref_code)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "이미 사용 중인 ref_code입니다." };
  }

  const { error } = await db.from("sales_agents").insert({
    name: input.name,
    ref_code: input.ref_code,
    phone: input.phone || null,
    email: input.email || null,
    slack_user_id: input.slack_user_id || null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/ops/sales-agents");
  return { success: true };
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateSalesAgent(
  id: string,
  input: {
    name?: string;
    phone?: string;
    email?: string;
    slack_user_id?: string;
    is_active?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { error } = await db
    .from("sales_agents")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/ops/sales-agents");
  return { success: true };
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteSalesAgent(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  const { error } = await db.from("sales_agents").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/ops/sales-agents");
  return { success: true };
}

// ── Get single (for Slack lookup) ────────────────────────────────────────────

export async function getSalesAgentByRef(
  refCode: string
): Promise<SalesAgent | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("sales_agents")
    .select("*")
    .eq("ref_code", refCode)
    .eq("is_active", true)
    .single();
  return (data as SalesAgent) ?? null;
}

// ── Increment counters ───────────────────────────────────────────────────────

export async function incrementSalesCounter(
  refCode: string,
  field: "total_analyses" | "total_consultations"
): Promise<void> {
  const db = createAdminClient();
  const { data } = await db
    .from("sales_agents")
    .select("id, total_analyses, total_consultations")
    .eq("ref_code", refCode)
    .eq("is_active", true)
    .single();

  if (data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = ((data as Record<string, any>)[field] ?? 0) as number;
    await db
      .from("sales_agents")
      .update({
        [field]: current + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
  }
}
