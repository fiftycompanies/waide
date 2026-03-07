import { getAgentPrompts } from "@/lib/actions/agent-prompt-actions";
import { getContentPrompts } from "@/lib/actions/content-prompt-actions";
import { getEvolvingKnowledge } from "@/lib/actions/analytics-actions";
import { AgentSettingsClient } from "@/components/ops/agent-settings-client";
import { ContentPromptSettings } from "@/components/ops/content-prompt-settings";
import { EvolvingKnowledgeTable } from "@/components/analytics/evolving-knowledge-table";

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
  const activeTab = tab === "content" ? "content" : tab === "knowledge" ? "knowledge" : "agent";

  const [prompts, contentPrompts, ekRecords] = await Promise.all([
    getAgentPrompts(activeAgent),
    getContentPrompts(),
    activeTab === "knowledge" ? getEvolvingKnowledge(undefined, 50) : Promise.resolve([]),
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">프롬프트 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          에이전트 시스템 프롬프트 및 콘텐츠 타입별 집필 프롬프트를 관리합니다
        </p>
      </div>

      {/* 상위 탭: 에이전트 프롬프트 / 콘텐츠 프롬프트 */}
      <div className="flex items-center gap-1 border-b border-border/60 pb-0">
        <a
          href={`/settings/agents?tab=agent&agent=${activeAgent}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "agent"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          에이전트 프롬프트
        </a>
        <a
          href="/settings/agents?tab=content"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "content"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          콘텐츠 타입 프롬프트
        </a>
        <a
          href="/settings/agents?tab=knowledge"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "knowledge"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          진화지식
        </a>
      </div>

      {activeTab === "agent" ? (
        <AgentSettingsClient
          agentTypes={[...AGENT_TYPES]}
          activeAgent={activeAgent}
          prompts={prompts}
        />
      ) : activeTab === "content" ? (
        <ContentPromptSettings prompts={contentPrompts} />
      ) : null}

      {activeTab === "knowledge" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">총 패턴 수</p>
              <p className="text-2xl font-bold mt-1">{ekRecords.length}개</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">최근 학습</p>
              <p className="text-sm font-medium mt-1">
                {ekRecords.length > 0
                  ? new Date(ekRecords[0].created_at).toLocaleString("ko-KR")
                  : "—"}
              </p>
            </div>
          </div>
          <EvolvingKnowledgeTable records={ekRecords} />
        </div>
      )}
    </div>
  );
}
