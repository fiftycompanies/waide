import { getOpsStats, getJobs } from "@/lib/actions/ops-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PipelineFlow } from "@/components/ops/pipeline-flow";
import { JobStatusBadge } from "@/components/ops/job-status-badge";
import Link from "next/link";
import { Activity, FileText, Clock, CheckCircle2 } from "lucide-react";

export default async function OpsPage() {
  const [stats, recentJobs] = await Promise.all([
    getOpsStats(),
    getJobs(),
  ]);

  const latestFive = recentJobs.slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">에이전트 운영 대시보드</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI 마케터 파이프라인 현황을 모니터링합니다
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              활성 브랜드
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeBrands}</div>
            <p className="text-xs text-muted-foreground mt-1">클라이언트 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              24h 생성 콘텐츠
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.contents24h}</div>
            <p className="text-xs text-muted-foreground mt-1">최근 24시간</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              대기 중 Jobs
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">PENDING 상태</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              오늘 완료
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.doneJobsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">오늘 완료된 Jobs</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline flow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">파이프라인 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineFlow jobs={recentJobs} />
        </CardContent>
      </Card>

      {/* Recent jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">최근 Jobs</CardTitle>
          <Link
            href="/ops/jobs"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            전체 보기 →
          </Link>
        </CardHeader>
        <CardContent>
          {latestFive.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Jobs 없음
            </p>
          ) : (
            <div className="space-y-2">
              {latestFive.map((job) => {
                const elapsed =
                  job.completed_at && job.started_at
                    ? Math.round(
                        (new Date(job.completed_at).getTime() -
                          new Date(job.started_at).getTime()) /
                          1000
                      )
                    : null;

                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {job.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {job.assigned_agent} ·{" "}
                        {new Date(job.created_at).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {elapsed !== null && ` · ${elapsed}s`}
                      </span>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
