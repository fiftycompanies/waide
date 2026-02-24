import {
  getAllSchedulerSettings,
  getCronLogHistory,
  getSlackChannelSettings,
} from "@/lib/actions/scheduler-actions";
import { SchedulerClient } from "@/components/ops/scheduler-client";

export default async function SchedulerPage() {
  const [settings, logs, slackChannels] = await Promise.all([
    getAllSchedulerSettings(),
    getCronLogHistory(20),
    getSlackChannelSettings(),
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">자동 스케줄러</h1>
        <p className="text-sm text-muted-foreground mt-1">
          SERP 수집 · 검색량 갱신 · 등급 재산출을 자동 스케줄링합니다
        </p>
      </div>
      <SchedulerClient settings={settings} logs={logs} slackChannels={slackChannels} />
    </div>
  );
}
