"use client";

import { useState, useTransition } from "react";
import {
  Clock,
  Play,
  Save,
  Power,
  Loader2,
  BarChart2,
  Search,
  Award,
  CheckCircle2,
  XCircle,
  Timer,
  MessageSquare,
  Hash,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  updateSchedulerSetting,
  triggerCronManually,
  updateSlackChannelSettings,
  type AllSchedulerSettings,
  type SlackChannelSettings,
} from "@/lib/actions/scheduler-actions";
import type { CronLog, SchedulerSettings } from "@/lib/scheduler";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const TASK_LABELS: Record<string, string> = {
  serp_collection: "SERP 수집",
  search_volume: "검색량 갱신",
  grading: "등급 재산출",
};

interface SchedulerClientProps {
  settings: AllSchedulerSettings;
  logs: CronLog[];
  slackChannels?: SlackChannelSettings;
}

export function SchedulerClient({ settings: initial, logs, slackChannels: initialChannels }: SchedulerClientProps) {
  const [serp, setSerp] = useState<SchedulerSettings>({ ...initial.serp });
  const [vol, setVol] = useState<SchedulerSettings>({ ...initial.searchVolume });
  const [grade, setGrade] = useState<SchedulerSettings>({ ...initial.grading });
  const [channels, setChannels] = useState<SlackChannelSettings>(
    initialChannels ?? {
      serp_channel: "#serp-tracking",
      pipeline_channel: "#content-pipeline",
      alerts_channel: "#alerts",
    }
  );

  const [isSaving, startSaving] = useTransition();
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [, startRun] = useTransition();

  // ── 저장 핸들러 ────────────────────────────────────────
  function handleSave(type: "serp" | "searchVolume" | "grading") {
    const data = type === "serp" ? serp : type === "searchVolume" ? vol : grade;
    startSaving(async () => {
      const result = await updateSchedulerSetting(type, data);
      if (result.success) toast.success("설정이 저장되었습니다.");
      else toast.error(result.error ?? "저장 실패");
    });
  }

  // ── Slack 채널 저장 핸들러 ─────────────────────────────
  function handleSaveChannels() {
    startSaving(async () => {
      const result = await updateSlackChannelSettings(channels);
      if (result.success) toast.success("Slack 채널 설정이 저장되었습니다.");
      else toast.error(result.error ?? "저장 실패");
    });
  }

  // ── 수동 실행 핸들러 ──────────────────────────────────
  function handleTrigger(type: "serp" | "searchVolume" | "grading") {
    setRunningTask(type);
    startRun(async () => {
      const result = await triggerCronManually(type);
      setRunningTask(null);
      if (result.success) {
        toast.success("실행이 시작되었습니다. 완료까지 몇 분 걸릴 수 있습니다.");
      } else {
        toast.error(result.error ?? "실행 실패");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── 3개 스케줄러 카드 ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* SERP 수집 */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm">SERP 순위 수집</CardTitle>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={serp.enabled}
                  onChange={(e) => setSerp({ ...serp, enabled: e.target.checked })}
                  className="h-3.5 w-3.5 rounded"
                />
                <Power className={`h-3.5 w-3.5 ${serp.enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
              </label>
            </div>
            <CardDescription className="text-xs">매일 실행 · 전체 키워드 순위 수집</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">실행 시각 (0~23시)</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={serp.run_at_hour}
                onChange={(e) => setSerp({ ...serp, run_at_hour: Number(e.target.value) })}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">매일 {serp.run_at_hour}시 자동 실행</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slack Webhook URL</Label>
              <Input
                type="url"
                value={serp.slack_webhook_url || ""}
                onChange={(e) => setSerp({ ...serp, slack_webhook_url: e.target.value })}
                placeholder="https://hooks.slack.com/..."
                className="h-8 text-xs"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => handleSave("serp")} disabled={isSaving} className="h-7 text-xs gap-1">
                <Save className="h-3 w-3" /> 저장
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTrigger("serp")}
                disabled={runningTask !== null}
                className="h-7 text-xs gap-1"
              >
                {runningTask === "serp" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                지금 실행
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 검색량 갱신 */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-violet-500" />
                <CardTitle className="text-sm">검색량 갱신</CardTitle>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vol.enabled}
                  onChange={(e) => setVol({ ...vol, enabled: e.target.checked })}
                  className="h-3.5 w-3.5 rounded"
                />
                <Power className={`h-3.5 w-3.5 ${vol.enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
              </label>
            </div>
            <CardDescription className="text-xs">매월 실행 · 네이버 광고API / DataLab</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">실행일 (1~28)</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={vol.cron_day || 1}
                  onChange={(e) => setVol({ ...vol, cron_day: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">실행 시각</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={vol.run_at_hour}
                  onChange={(e) => setVol({ ...vol, run_at_hour: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">매월 {vol.cron_day || 1}일 {vol.run_at_hour}시 자동 실행</p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => handleSave("searchVolume")} disabled={isSaving} className="h-7 text-xs gap-1">
                <Save className="h-3 w-3" /> 저장
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTrigger("searchVolume")}
                disabled={runningTask !== null}
                className="h-7 text-xs gap-1"
              >
                {runningTask === "searchVolume" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                지금 실행
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 등급 재산출 */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm">등급 재산출</CardTitle>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={grade.enabled}
                  onChange={(e) => setGrade({ ...grade, enabled: e.target.checked })}
                  className="h-3.5 w-3.5 rounded"
                />
                <Power className={`h-3.5 w-3.5 ${grade.enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
              </label>
            </div>
            <CardDescription className="text-xs">매주 실행 · 계정등급 + 키워드난이도 + 추천</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">요일</Label>
                <select
                  value={grade.cron_weekday ?? 1}
                  onChange={(e) => setGrade({ ...grade, cron_weekday: Number(e.target.value) })}
                  className="w-full h-8 text-sm rounded-md border border-input bg-background px-2"
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={i} value={i}>{d}요일</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">실행 시각</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={grade.run_at_hour}
                  onChange={(e) => setGrade({ ...grade, run_at_hour: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              매주 {WEEKDAYS[grade.cron_weekday ?? 1]}요일 {grade.run_at_hour}시 자동 실행
            </p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => handleSave("grading")} disabled={isSaving} className="h-7 text-xs gap-1">
                <Save className="h-3 w-3" /> 저장
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTrigger("grading")}
                disabled={runningTask !== null}
                className="h-7 text-xs gap-1"
              >
                {runningTask === "grading" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                지금 실행
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Slack 채널 설정 ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#4A154B]" />
            <CardTitle className="text-sm font-semibold">Slack 채널 설정</CardTitle>
          </div>
          <CardDescription className="text-xs">
            알림 유형별로 발송할 Slack 채널을 설정합니다. Bot API 모드에서만 채널 라우팅이 적용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-blue-500" />
                SERP / 검색량
              </Label>
              <Input
                value={channels.serp_channel}
                onChange={(e) => setChannels({ ...channels, serp_channel: e.target.value })}
                placeholder="#serp-tracking"
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">SERP 수집 결과, 순위 변동, 검색량 갱신</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-violet-500" />
                콘텐츠 파이프라인
              </Label>
              <Input
                value={channels.pipeline_channel}
                onChange={(e) => setChannels({ ...channels, pipeline_channel: e.target.value })}
                placeholder="#content-pipeline"
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">CMO 전략, 원고 작성, QC 검수, 발행</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-amber-500" />
                알림 / 리포트
              </Label>
              <Input
                value={channels.alerts_channel}
                onChange={(e) => setChannels({ ...channels, alerts_channel: e.target.value })}
                placeholder="#alerts"
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">등급 변동, 에러, 월간 리포트, SOM</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" onClick={handleSaveChannels} disabled={isSaving} className="h-7 text-xs gap-1">
              <Save className="h-3 w-3" /> 채널 설정 저장
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Webhook 모드에서는 모든 알림이 단일 채널로 발송됩니다
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── 실행 이력 ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">실행 이력</CardTitle>
          </div>
          <CardDescription className="text-xs">최근 20건의 자동/수동 실행 기록</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">실행 이력이 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left font-medium">태스크</th>
                    <th className="py-2 text-left font-medium">상태</th>
                    <th className="py-2 text-left font-medium">시작</th>
                    <th className="py-2 text-right font-medium">소요시간</th>
                    <th className="py-2 text-left font-medium">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="py-2 font-medium">
                        {TASK_LABELS[log.task_name] ?? log.task_name}
                      </td>
                      <td className="py-2">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {formatDate(log.started_at)}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {log.duration_ms != null ? formatDuration(log.duration_ms) : "—"}
                      </td>
                      <td className="py-2 text-muted-foreground max-w-[200px] truncate">
                        {log.error
                          ? <span className="text-red-500">{log.error}</span>
                          : summarizeDetails(log.details, log.task_name)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── 유틸 컴포넌트 ──────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px] gap-0.5">
        <CheckCircle2 className="h-2.5 w-2.5" /> 성공
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="text-[10px] gap-0.5">
        <XCircle className="h-2.5 w-2.5" /> 실패
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] gap-0.5">
      <Timer className="h-2.5 w-2.5 animate-spin" /> 실행 중
    </Badge>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

function summarizeDetails(details: Record<string, unknown> | null, taskName: string): string {
  if (!details) return "";

  if (taskName === "serp_collection") {
    const d = details as { total?: number; exposed?: number; exposureRate?: number };
    if (d.total) return `${d.total}개 수집, ${d.exposed ?? 0}개 노출 (${d.exposureRate ?? 0}%)`;
  }
  if (taskName === "search_volume") {
    const d = details as { updated?: number; failed?: number };
    if (d.updated != null) return `${d.updated}건 갱신, ${d.failed ?? 0}건 실패`;
  }
  if (taskName === "grading") {
    const d = details as { accounts?: number; keywords?: number; recommendations?: number };
    if (d.accounts != null) return `계정 ${d.accounts}개, 키워드 ${d.keywords ?? 0}개, 추천 ${d.recommendations ?? 0}건`;
  }
  return "";
}
