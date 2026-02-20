import { cn } from "@/lib/utils";
import type { AgentType, Job } from "@/lib/actions/ops-actions";

interface PipelineFlowProps {
  jobs: Job[];
}

const PIPELINE_STAGES: {
  agent: AgentType;
  icon: string;
  label: string;
}[] = [
  { agent: "ACCOUNT_MANAGER", icon: "👤", label: "Account\nManager" },
  { agent: "CMO", icon: "📊", label: "CMO" },
  { agent: "COPYWRITER", icon: "✏️", label: "Copywriter" },
  { agent: "OPS_QUALITY", icon: "✅", label: "QA" },
  { agent: "OPS_PUBLISHER", icon: "🚀", label: "Publisher" },
];

export function PipelineFlow({ jobs }: PipelineFlowProps) {
  // Count jobs per agent
  const countsByAgent = jobs.reduce<Record<string, Record<string, number>>>(
    (acc, job) => {
      const agent = job.assigned_agent;
      if (!acc[agent]) acc[agent] = { PENDING: 0, IN_PROGRESS: 0, DONE: 0, FAILED: 0, CANCELLED: 0 };
      acc[agent][job.status] = (acc[agent][job.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  // Detect active stage (first stage with IN_PROGRESS jobs)
  const activeAgent = PIPELINE_STAGES.find(
    (s) => (countsByAgent[s.agent]?.IN_PROGRESS ?? 0) > 0
  )?.agent;

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {PIPELINE_STAGES.map((stage, index) => {
        const counts = countsByAgent[stage.agent] ?? {};
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const inProgress = counts.IN_PROGRESS ?? 0;
        const pending = counts.PENDING ?? 0;
        const done = counts.DONE ?? 0;
        const failed = counts.FAILED ?? 0;
        const isActive = stage.agent === activeAgent;

        return (
          <div key={stage.agent} className="flex items-center">
            {/* Stage card */}
            <div
              className={cn(
                "flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all min-w-[100px]",
                isActive
                  ? "border-blue-400 bg-blue-50 shadow-sm"
                  : total > 0
                  ? "border-border bg-card"
                  : "border-border/40 bg-muted/30"
              )}
            >
              <span className="text-2xl">{stage.icon}</span>
              <span
                className={cn(
                  "text-xs font-medium text-center whitespace-pre-line leading-tight",
                  isActive ? "text-blue-700" : "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>

              {/* Counts */}
              <div className="flex flex-col items-center gap-0.5 text-xs">
                {inProgress > 0 && (
                  <span className="text-blue-600 font-semibold animate-pulse">
                    ↻ {inProgress}
                  </span>
                )}
                {pending > 0 && (
                  <span className="text-yellow-600">⏳ {pending}</span>
                )}
                {done > 0 && (
                  <span className="text-green-600">✓ {done}</span>
                )}
                {failed > 0 && (
                  <span className="text-red-600">✗ {failed}</span>
                )}
                {total === 0 && (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </div>
            </div>

            {/* Arrow between stages */}
            {index < PIPELINE_STAGES.length - 1 && (
              <div className="flex items-center px-1">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="text-muted-foreground/40"
                >
                  <path
                    d="M4 10h12M12 6l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
