"use client";

import { useState, useTransition } from "react";
import { Clock, Bell, Save, BarChart2, Power, Play, Loader2 } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { updateSerpSchedulerSettings, type SerpSchedulerSettings } from "@/lib/actions/settings-actions";
import { triggerAllSerpCheck } from "@/lib/actions/keyword-actions";

interface SerpSettingsClientProps {
  settings: SerpSchedulerSettings;
}

export function SerpSettingsClient({ settings: initial }: SerpSettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isBulkPending, startBulkTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SerpSchedulerSettings>({ ...initial });

  function handleBulkTrigger() {
    startBulkTransition(async () => {
      const result = await triggerAllSerpCheck();
      if (result.success) {
        toast.success(`${result.count}개 키워드 수집 완료 — ${result.exposed ?? 0}개 노출`);
      } else {
        toast.error(result.error ?? "수집 트리거 실패");
      }
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateSerpSchedulerSettings(form);
      if (result.success) {
        toast.success("설정이 저장되었습니다.");
      } else {
        setError(result.error ?? "저장 실패");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 수집 스케줄 */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-base">수집 스케줄</CardTitle>
          </div>
          <CardDescription>SERP 순위를 자동 수집하는 주기를 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                name="enabled"
                checked={form.enabled}
                onChange={handleChange}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Power className={`h-3.5 w-3.5 ${form.enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
                스케줄러 활성화
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="interval_hours">수집 주기 (시간)</Label>
              <Input
                id="interval_hours"
                name="interval_hours"
                type="number"
                min={1}
                max={168}
                value={form.interval_hours}
                onChange={handleChange}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">1~168시간 (최대 7일)</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="run_at_hour">실행 시각 (0~23시)</Label>
              <Input
                id="run_at_hour"
                name="run_at_hour"
                type="number"
                min={0}
                max={23}
                value={form.run_at_hour}
                onChange={handleChange}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">매일 이 시각에 실행</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 순위 임계값 */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-violet-500" />
            <CardTitle className="text-base">순위 기준값</CardTitle>
          </div>
          <CardDescription>SERP 알림 및 비활성 처리 기준 순위를 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rank_threshold">비활성 처리 임계 순위</Label>
              <Input
                id="rank_threshold"
                name="rank_threshold"
                type="number"
                min={1}
                max={100}
                value={form.rank_threshold}
                onChange={handleChange}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">이 순위 밖이면 is_active=false 처리</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="top_n_alert">상위 알림 N위</Label>
              <Input
                id="top_n_alert"
                name="top_n_alert"
                type="number"
                min={1}
                max={20}
                value={form.top_n_alert}
                onChange={handleChange}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">상위 N개 키워드 Slack 알림</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slack 알림 */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Slack 알림</CardTitle>
          </div>
          <CardDescription>SERP 수집 결과를 전송할 Slack 채널을 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="slack_webhook_url">Slack Webhook URL</Label>
            <Input
              id="slack_webhook_url"
              name="slack_webhook_url"
              type="url"
              value={form.slack_webhook_url}
              onChange={handleChange}
              placeholder="https://hooks.slack.com/services/..."
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              비워두면 agents/.env의 SLACK_WEBHOOK_URL 사용
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slack_channel">채널명</Label>
            <Input
              id="slack_channel"
              name="slack_channel"
              type="text"
              value={form.slack_channel}
              onChange={handleChange}
              placeholder="#serp-alerts"
              className="h-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
        >
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "저장 중..." : "설정 저장"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isBulkPending}
          onClick={handleBulkTrigger}
          className="gap-1.5"
        >
          {isBulkPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isBulkPending ? "수집 중..." : "지금 수집 시작"}
        </Button>
      </div>
    </form>
  );
}
