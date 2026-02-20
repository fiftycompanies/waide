"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Job, JobStatus } from "@/lib/actions/ops-actions";
import { JobStatusBadge } from "@/components/ops/job-status-badge";
import { Badge } from "@/components/ui/badge";

const AGENT_ICONS: Record<string, string> = {
  ACCOUNT_MANAGER: "👤",
  CMO: "📊",
  COPYWRITER: "✏️",
  OPS_QUALITY: "✅",
  OPS_PUBLISHER: "🚀",
  RND: "🔬",
  SYSTEM: "⚙️",
};

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "전체", value: "ALL" },
  { label: "대기 중", value: "PENDING" },
  { label: "진행 중", value: "IN_PROGRESS" },
  { label: "완료", value: "DONE" },
  { label: "실패", value: "FAILED" },
];

function formatElapsed(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

interface JobsClientProps {
  initialJobs: Job[];
}

export function JobsClient({ initialJobs }: JobsClientProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("jobs-realtime")
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "jobs" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setJobs((prev) => [payload.new as Job, ...prev].slice(0, 100));
          } else if (payload.eventType === "UPDATE") {
            setJobs((prev) =>
              prev.map((j) =>
                j.id === (payload.new as Job).id ? (payload.new as Job) : j
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered =
    activeTab === "ALL"
      ? jobs
      : jobs.filter((j) => j.status === (activeTab as JobStatus));

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "ALL"
              ? jobs.length
              : jobs.filter((j) => j.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                activeTab === tab.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/40"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs ${
                  activeTab === tab.value
                    ? "opacity-70"
                    : "opacity-50"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">Jobs 없음</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
            <span>제목</span>
            <span>에이전트</span>
            <span>타입</span>
            <span>상태</span>
            <span>소요시간</span>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {filtered.map((job) => {
              const isExpanded = expandedId === job.id;
              const elapsed = formatElapsed(job.started_at, job.completed_at);

              return (
                <div key={job.id}>
                  <div
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : job.id)
                    }
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {job.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(job.created_at).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <span className="text-sm whitespace-nowrap">
                      {AGENT_ICONS[job.assigned_agent] ?? "🤖"}{" "}
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {job.assigned_agent}
                      </span>
                    </span>

                    <Badge variant="outline" className="text-xs">
                      {job.job_type}
                    </Badge>

                    <JobStatusBadge status={job.status} />

                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {elapsed ?? "—"}
                    </span>
                  </div>

                  {/* Accordion payload viewer */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-muted/20 border-t space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1 mt-3">
                          INPUT PAYLOAD
                        </p>
                        <pre className="text-xs bg-background rounded border p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                          {JSON.stringify(job.input_payload, null, 2)}
                        </pre>
                      </div>
                      {Object.keys(job.output_payload ?? {}).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            OUTPUT PAYLOAD
                          </p>
                          <pre className="text-xs bg-background rounded border p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                            {JSON.stringify(job.output_payload, null, 2)}
                          </pre>
                        </div>
                      )}
                      {job.error_message && (
                        <div>
                          <p className="text-xs font-semibold text-red-600 mb-1">
                            ERROR
                          </p>
                          <pre className="text-xs bg-red-50 rounded border border-red-200 p-3 text-red-700 whitespace-pre-wrap">
                            {job.error_message}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
