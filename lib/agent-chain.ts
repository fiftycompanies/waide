/**
 * agent-chain.ts
 * 에이전트 체이닝 헬퍼
 *
 * 여러 에이전트를 순차적으로 실행하며,
 * 이전 단계의 결과를 다음 단계의 context에 주입.
 */

import { runAgent, type AgentName, type AgentResult } from "./agent-runner";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface ChainStep {
  agent: AgentName;
  task: string;
  baseContext: Record<string, unknown>;
  /**
   * 이전 단계 결과를 컨텍스트에 주입할 매핑
   * { "competitor_summary": "rnd_result" }
   * → context.competitor_summary = results['rnd_result'].data
   */
  dependsOn?: Record<string, string>;
  resultKey: string;     // 이 단계 결과를 저장할 키
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
}

export interface ChainResult {
  chainId: string;
  results: Record<string, AgentResult>;
  totalCostUsd: number;
  totalDurationMs: number;
  failedSteps: number[];
}

// ═══════════════════════════════════════════
// UUID v4 생성 (crypto.randomUUID 사용)
// ═══════════════════════════════════════════

function generateUUID(): string {
  // Node.js 16+ / Edge Runtime 모두 지원
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 폴백
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ═══════════════════════════════════════════
// 메인: runAgentChain
// ═══════════════════════════════════════════

export async function runAgentChain(
  steps: ChainStep[],
  clientId?: string,
): Promise<ChainResult> {
  const chainId = generateUUID();
  const results: Record<string, AgentResult> = {};
  const failedSteps: number[] = [];
  let totalCostUsd = 0;
  const chainStartTime = Date.now();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // 이전 결과를 context에 주입
    const context: Record<string, unknown> = { ...step.baseContext };
    if (step.dependsOn) {
      for (const [contextKey, resultKey] of Object.entries(step.dependsOn)) {
        const prevResult = results[resultKey];
        if (prevResult?.success && prevResult.data) {
          context[contextKey] = prevResult.data;
        }
      }
    }

    try {
      const result = await runAgent({
        agent: step.agent,
        task: step.task,
        context,
        clientId,
        chainId,
        chainStep: i + 1,
        options: step.options,
      });

      results[step.resultKey] = result;
      totalCostUsd += result.usage.costUsd;

      if (!result.success) {
        failedSteps.push(i + 1);
        console.error(`[agent-chain] Step ${i + 1} failed: ${step.agent}/${step.task}`);
      }
    } catch (err) {
      // 에이전트 실행 자체가 실패한 경우 (프롬프트 없음 등)
      failedSteps.push(i + 1);
      console.error(`[agent-chain] Step ${i + 1} error: ${step.agent}/${step.task}`, err);

      results[step.resultKey] = {
        success: false,
        data: null,
        raw: "",
        usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
        durationMs: 0,
        logId: "",
      };
    }
  }

  return {
    chainId,
    results,
    totalCostUsd,
    totalDurationMs: Date.now() - chainStartTime,
    failedSteps,
  };
}
