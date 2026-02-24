"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export interface AgentPrompt {
  id: string;
  agent_type: string;
  prompt_section: string;
  title: string;
  content: string;
  is_active: boolean;
  version: number;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

// ── 조회 ──────────────────────────────────────────────────────────────────────

export async function getAgentPrompts(agentType: string): Promise<AgentPrompt[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("agent_prompts")
    .select("id, agent_type, prompt_section, title, content, is_active, version, updated_by, created_at, updated_at")
    .eq("agent_type", agentType)
    .order("is_active", { ascending: false })
    .order("prompt_section")
    .order("title");

  if (error) {
    console.error("[agent-prompt-actions] getAgentPrompts:", error);
    return [];
  }
  return (data ?? []) as AgentPrompt[];
}

export async function getPromptHistory(
  agentType: string,
  promptSection: string,
  title: string
): Promise<AgentPrompt[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("agent_prompts")
    .select("id, agent_type, prompt_section, title, content, is_active, version, updated_by, created_at, updated_at")
    .eq("agent_type", agentType)
    .eq("prompt_section", promptSection)
    .eq("title", title)
    .order("version", { ascending: false });

  if (error) {
    console.error("[agent-prompt-actions] getPromptHistory:", error);
    return [];
  }
  return (data ?? []) as AgentPrompt[];
}

// ── 생성 ──────────────────────────────────────────────────────────────────────

export async function createAgentPrompt(payload: {
  agentType: string;
  promptSection: string;
  title: string;
  content: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("agent_prompts")
    .insert({
      agent_type:     payload.agentType,
      prompt_section: payload.promptSection,
      title:          payload.title.trim(),
      content:        payload.content,
      is_active:      true,
      version:        1,
      updated_by:     "admin",
      updated_at:     now,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { success: false, error: "동일한 섹션/제목/버전이 이미 존재합니다." };
    return { success: false, error: error.message };
  }
  revalidatePath("/ops/agent-settings");
  return { success: true, id: data?.id };
}

// ── 수정 (버전 업 방식) ───────────────────────────────────────────────────────

export async function updateAgentPrompt(
  id: string,
  content: string,
  updatedBy: string = "admin"
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // 기존 레코드 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchErr } = await (db as any)
    .from("agent_prompts")
    .select("agent_type, prompt_section, title, version")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) return { success: false, error: "프롬프트를 찾을 수 없습니다." };

  // 기존 버전 비활성화
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .from("agent_prompts")
    .update({ is_active: false, updated_at: now })
    .eq("id", id);

  // 새 버전 INSERT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertErr } = await (db as any).from("agent_prompts").insert({
    agent_type:     existing.agent_type,
    prompt_section: existing.prompt_section,
    title:          existing.title,
    content:        content,
    is_active:      true,
    version:        existing.version + 1,
    updated_by:     updatedBy,
    updated_at:     now,
    created_at:     now,
  });

  if (insertErr) return { success: false, error: insertErr.message };
  revalidatePath("/ops/agent-settings");
  return { success: true };
}

// ── 활성화 토글 ───────────────────────────────────────────────────────────────

export async function toggleAgentPrompt(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("agent_prompts")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/ops/agent-settings");
  return { success: true };
}
