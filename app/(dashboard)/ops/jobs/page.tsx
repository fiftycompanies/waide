import { getJobs } from "@/lib/actions/ops-actions";
import { JobsClient } from "./JobsClient";

export default async function JobsPage() {
  const jobs = await getJobs();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jobs 현황</h1>
        <p className="text-muted-foreground text-sm mt-1">
          에이전트 파이프라인의 작업 목록을 실시간으로 모니터링합니다
        </p>
      </div>
      <JobsClient initialJobs={jobs} />
    </div>
  );
}
