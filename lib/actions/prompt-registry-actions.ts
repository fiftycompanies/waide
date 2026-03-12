"use server";

/**
 * prompt-registry-actions.ts
 * Phase 7-10: 프롬프트 레지스트리 서버 액션
 *
 * agent_prompts 테이블의 PROMPT_REGISTRY 타입을 사용하여
 * 하드코딩된 프롬프트를 어드민에서 편집할 수 있게 함
 */

import {
  getPromptRegistry,
  savePromptRegistry,
  restorePromptDefault,
} from "@/lib/prompt-loader";
import { revalidatePath } from "next/cache";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPromptRegistryAction(): Promise<any[]> {
  return getPromptRegistry();
}

export async function savePromptAction(
  agentKey: string,
  promptTemplate: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await savePromptRegistry(agentKey, promptTemplate);
  if (result.success) {
    revalidatePath("/ops/agent-settings");
    revalidatePath("/settings/agents");
  }
  return result;
}

export async function restoreDefaultAction(
  agentKey: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await restorePromptDefault(agentKey);
  if (result.success) {
    revalidatePath("/ops/agent-settings");
    revalidatePath("/settings/agents");
  }
  return result;
}
