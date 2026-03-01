/**
 * agent-runner.ts
 * 모든 에이전트의 공통 실행 엔진
 *
 * - agent_prompts 테이블에서 프롬프트 동적 로딩
 * - {{variable}} 템플릿 치환
 * - Claude API 호출 (raw fetch)
 * - agent_execution_logs에 실행 로그 저장
 */

import { createAdminClient } from "@/lib/supabase/service";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export type AgentName = "RND" | "CMO" | "COPYWRITER" | "QC" | "ANALYST" | "PUBLISHER";

export interface RunAgentParams {
  agent: AgentName;
  task: string;
  context: Record<string, unknown>;   // {{variable}}에 주입될 데이터
  clientId?: string;
  chainId?: string;                   // 체이닝 시 공유 ID
  chainStep?: number;
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
}

export interface AgentResult {
  success: boolean;
  data: Record<string, unknown> | null;  // 파싱된 JSON 출력
  raw: string;                           // 원본 텍스트
  usage: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
  durationMs: number;
  logId: string;                         // agent_execution_logs.id
}

interface PromptRecord {
  id: string;
  agent_type: string;
  task: string;
  prompt_section: string;
  title: string;
  content: string;           // user template (기존 컬럼)
  system_prompt: string | null;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  version: number;
  is_active: boolean;
}

// ═══════════════════════════════════════════
// 비용 테이블 (USD per token)
// ═══════════════════════════════════════════

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5":           { input: 0.80 / 1_000_000, output: 4.00 / 1_000_000 },
  "claude-haiku-4-5-20251001":  { input: 0.80 / 1_000_000, output: 4.00 / 1_000_000 },
  "claude-sonnet-4-5":          { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  "claude-sonnet-4-5-20250514": { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  "claude-sonnet-4-20250514":   { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model] || MODEL_PRICING["claude-haiku-4-5"];
  return inputTokens * p.input + outputTokens * p.output;
}

// ═══════════════════════════════════════════
// 템플릿 치환
// ═══════════════════════════════════════════

function fillTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key];
    if (value === undefined || value === null) return match;
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  });
}

// ═══════════════════════════════════════════
// JSON 파싱 헬퍼
// ═══════════════════════════════════════════

function parseJsonFromText(text: string): Record<string, unknown> | null {
  try {
    // ```json ... ``` 블록 우선
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) return JSON.parse(jsonBlockMatch[1]);

    // { ... } 최외곽 추출
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) return JSON.parse(braceMatch[0]);

    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// 메인: runAgent
// ═══════════════════════════════════════════

export async function runAgent(params: RunAgentParams): Promise<AgentResult> {
  const startTime = Date.now();
  const db = createAdminClient();

  // 1. agent_prompts에서 프롬프트 로딩
  //    새 task 컬럼 우선, 없으면 기존 prompt_section 폴백
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let promptData: PromptRecord | null = null;

  // task 컬럼으로 조회 (049 마이그레이션 이후)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: byTask } = await (db as any)
    .from("agent_prompts")
    .select("id, agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, version, is_active")
    .eq("agent_type", params.agent)
    .eq("task", params.task)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (byTask) {
    promptData = byTask as PromptRecord;
  } else {
    // 폴백: 기존 prompt_section으로 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bySection } = await (db as any)
      .from("agent_prompts")
      .select("id, agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, version, is_active")
      .eq("agent_type", params.agent)
      .eq("prompt_section", params.task)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (bySection) {
      promptData = bySection as PromptRecord;
    }
  }

  if (!promptData) {
    throw new Error(`프롬프트 없음: ${params.agent}/${params.task}`);
  }

  // 2. 컨텍스트 슬롯 치환 {{variable}} → 실제 값
  const filledPrompt = fillTemplate(promptData.content, params.context);
  const systemPrompt = promptData.system_prompt
    ? fillTemplate(promptData.system_prompt, params.context)
    : "";

  // 3. Claude API 호출 (raw fetch — 기존 패턴 유지)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const model = params.options?.model || promptData.model || "claude-haiku-4-5-20251001";
  const maxTokens = params.options?.maxTokens || promptData.max_tokens || 2000;
  const temperature = params.options?.temperature ?? promptData.temperature ?? 0.3;

  let responseData: Record<string, unknown> | null = null;
  let errorMessage: string | null = null;
  let rawText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: "user", content: filledPrompt }],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Claude API error: ${resp.status} ${text.slice(0, 300)}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await resp.json();
    rawText = data.content?.[0]?.text ?? "";
    inputTokens = data.usage?.input_tokens ?? 0;
    outputTokens = data.usage?.output_tokens ?? 0;

    // JSON 파싱 시도
    responseData = parseJsonFromText(rawText);
    if (!responseData) {
      responseData = { raw_text: rawText };
    }
  } catch (e: unknown) {
    errorMessage = e instanceof Error ? e.message : String(e);
  }

  const durationMs = Date.now() - startTime;
  const costUsd = calculateCost(model, inputTokens, outputTokens);

  // 4. 실행 로그 저장
  let logId = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logEntry } = await (db as any)
      .from("agent_execution_logs")
      .insert({
        agent: params.agent,
        task: params.task,
        prompt_version: promptData.version,
        client_id: params.clientId || null,
        input_summary: Object.keys(params.context).join(", "),
        output_data: responseData,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_cost_usd: costUsd,
        duration_ms: durationMs,
        status: errorMessage ? "error" : "success",
        error_message: errorMessage,
        chain_id: params.chainId || null,
        chain_step: params.chainStep || null,
      })
      .select("id")
      .single();

    logId = logEntry?.id ?? "";
  } catch (logErr) {
    console.error("[agent-runner] 로그 저장 실패:", logErr);
  }

  return {
    success: !errorMessage,
    data: responseData,
    raw: rawText,
    usage: { inputTokens, outputTokens, costUsd },
    durationMs,
    logId,
  };
}
