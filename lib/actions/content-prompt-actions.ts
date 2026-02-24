"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export interface ContentPrompt {
  id: string;
  content_type: string;
  prompt_type: string;
  name: string;
  prompt_text: string;
  is_active: boolean;
  version: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}


// ── 조회 ──────────────────────────────────────────────────────────────────────

export async function getContentPrompts(): Promise<ContentPrompt[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("content_prompts")
    .select("*")
    .order("content_type")
    .order("prompt_type");

  if (error) {
    console.error("[content-prompt-actions] getContentPrompts:", error);
    return [];
  }
  return (data ?? []) as ContentPrompt[];
}

export async function getContentPromptsByType(
  contentType: string
): Promise<ContentPrompt[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("content_prompts")
    .select("*")
    .eq("content_type", contentType)
    .order("prompt_type");

  if (error) {
    console.error("[content-prompt-actions] getContentPromptsByType:", error);
    return [];
  }
  return (data ?? []) as ContentPrompt[];
}

// ── 수정 ──────────────────────────────────────────────────────────────────────

export async function updateContentPrompt(
  id: string,
  promptText: string
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchErr } = await (db as any)
    .from("content_prompts")
    .select("version")
    .eq("id", id)
    .single();

  if (fetchErr || !existing)
    return { success: false, error: "프롬프트를 찾을 수 없습니다." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("content_prompts")
    .update({
      prompt_text: promptText,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/ops/agent-settings");
  return { success: true };
}

// ── 활성화 토글 ───────────────────────────────────────────────────────────────

export async function toggleContentPrompt(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("content_prompts")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/ops/agent-settings");
  return { success: true };
}

// ── 생성 ──────────────────────────────────────────────────────────────────────

export async function createContentPrompt(payload: {
  contentType: string;
  promptType: string;
  name: string;
  promptText: string;
  description?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("content_prompts")
    .insert({
      content_type: payload.contentType,
      prompt_type: payload.promptType,
      name: payload.name.trim(),
      prompt_text: payload.promptText,
      description: payload.description || null,
      is_active: true,
      version: 1,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505")
      return {
        success: false,
        error: "같은 타입/종류의 활성 프롬프트가 이미 존재합니다. 기존 프롬프트를 비활성화 후 추가하세요.",
      };
    return { success: false, error: error.message };
  }
  revalidatePath("/ops/agent-settings");
  return { success: true, id: data?.id };
}
