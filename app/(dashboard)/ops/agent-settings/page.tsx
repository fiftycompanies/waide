import { getAgentPrompts } from "@/lib/actions/agent-prompt-actions";
import { getContentPrompts } from "@/lib/actions/content-prompt-actions";
import { getEvolvingKnowledge } from "@/lib/actions/analytics-actions";
import { AgentSettingsClient } from "@/components/ops/agent-settings-client";
import { ContentPromptSettings } from "@/components/ops/content-prompt-settings";
import { EvolvingKnowledgeTable } from "@/components/analytics/evolving-knowledge-table";
import { PromptRegistryClient } from "@/components/ops/prompt-registry-client";
import { getPromptRegistryAction } from "@/lib/actions/prompt-registry-actions";
import { getSelectedClientId } from "@/lib/actions/brand-actions";
import { KnowledgeLearningSection } from "@/components/analytics/knowledge-learning-section";

const AGENT_TYPES = ["CMO", "RND", "COPYWRITER", "OPS_QUALITY", "OPS_PUBLISHER"] as const;

export default async function AgentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string; tab?: string }>;
}) {
  const { agent, tab } = await searchParams;
  const activeAgent = (AGENT_TYPES as readonly string[]).includes(agent ?? "")
    ? (agent as string)
    : AGENT_TYPES[0];
  const activeTab = tab === "content" ? "content" : tab === "knowledge" ? "knowledge" : tab === "registry" ? "registry" : "agent";

  const [prompts, contentPrompts, ekRecords, registryItems, clientId] = await Promise.all([
    getAgentPrompts(activeAgent),
    activeTab === "content" ? getContentPrompts() : Promise.resolve([]),
    activeTab === "knowledge" ? getEvolvingKnowledge(undefined, 50) : Promise.resolve([]),
    activeTab === "registry" ? getPromptRegistryAction() : Promise.resolve([]),
    activeTab === "knowledge" ? getSelectedClientId() : Promise.resolve(null),
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">에이전트 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          에이전트 프롬프트, 콘텐츠 프롬프트, AI 학습 지식을 관리합니다
        </p>
      </div>

      {/* 상위 탭 */}
      <div className="flex items-center gap-1 border-b border-border/60 pb-0 overflow-x-auto">
        <a
          href={`/ops/agent-settings?tab=agent&agent=${activeAgent}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "agent"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          에이전트 프롬프트
        </a>
        <a
          href="/ops/agent-settings?tab=content"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "content"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          콘텐츠 프롬프트
        </a>
        <a
          href="/ops/agent-settings?tab=registry"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "registry"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          프롬프트 관리
        </a>
        <a
          href="/ops/agent-settings?tab=knowledge"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "knowledge"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          진화지식
        </a>
      </div>

      {activeTab === "agent" && (
        <AgentSettingsClient
          agentTypes={[...AGENT_TYPES]}
          activeAgent={activeAgent}
          prompts={prompts}
        />
      )}

      {activeTab === "content" && (
        <ContentPromptSettings prompts={contentPrompts} />
      )}

      {activeTab === "registry" && (
        <PromptRegistryClient items={registryItems} />
      )}

      {activeTab === "knowledge" && (
        <div className="space-y-6">
          {/* 학습 실행 + 통계 */}
          <KnowledgeLearningSection
            clientId={clientId ?? undefined}
            recordCount={ekRecords.length}
            lastLearned={ekRecords.length > 0 ? ekRecords[0].created_at : null}
          />

          {/* 패턴 목록 */}
          <EvolvingKnowledgeTable records={ekRecords} />
        </div>
      )}
    </div>
  );
}
