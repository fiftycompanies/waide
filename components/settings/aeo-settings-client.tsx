"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { updateAEOSettings, type AEOSettings } from "@/lib/actions/aeo-tracking-actions";

interface AEOSettingsClientProps {
  initialSettings: AEOSettings;
}

const AI_MODELS = [
  { id: "perplexity", label: "Perplexity", method: "API", envKey: "PERPLEXITY_API_KEY" },
  { id: "claude", label: "Claude", method: "API", envKey: "ANTHROPIC_API_KEY" },
  { id: "chatgpt", label: "ChatGPT", method: "Playwright", envKey: "프록시 필요" },
  { id: "gemini", label: "Gemini", method: "Playwright", envKey: "프록시 필요" },
];

export function AEOSettingsClient({ initialSettings }: AEOSettingsClientProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();

  const handleModelToggle = (modelId: string, checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      enabled_ai_models: checked
        ? [...prev.enabled_ai_models, modelId]
        : prev.enabled_ai_models.filter((m) => m !== modelId),
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateAEOSettings(settings);
      if (result.success) {
        toast.success("AEO 설정이 저장되었습니다");
      } else {
        toast.error(result.error || "설정 저장 실패");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 활성 AI 모델 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            활성 AI 모델
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {AI_MODELS.map((model) => {
            const isPlaywright = model.method === "Playwright";
            const isChecked = settings.enabled_ai_models.includes(model.id);
            const isDisabled = isPlaywright && !settings.playwright_enabled;

            return (
              <div key={model.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`model-${model.id}`}
                    checked={isChecked}
                    disabled={isDisabled}
                    onCheckedChange={(checked) => handleModelToggle(model.id, !!checked)}
                  />
                  <Label htmlFor={`model-${model.id}`} className="cursor-pointer">
                    <span className="font-medium">{model.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({model.method} — {model.envKey})
                    </span>
                  </Label>
                </div>
                {isDisabled && (
                  <span className="text-xs text-amber-600">Playwright 활성화 필요</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 추적 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">추적 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="maxQuestions">고객당 일일 최대 질문</Label>
              <Input
                id="maxQuestions"
                type="number"
                min={1}
                max={100}
                value={settings.max_questions_per_client_per_day}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    max_questions_per_client_per_day: parseInt(e.target.value) || 10,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="repeatCount">동일 질문 반복 횟수</Label>
              <Input
                id="repeatCount"
                type="number"
                min={1}
                max={10}
                value={settings.repeat_count}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    repeat_count: parseInt(e.target.value) || 3,
                  }))
                }
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 자동 추적 (크론) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">자동 추적 (크론)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>자동 추적</Label>
              <p className="text-xs text-muted-foreground">매일 04:00 KST 자동 실행</p>
            </div>
            <Switch
              checked={settings.cron_enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, cron_enabled: checked }))
              }
            />
          </div>
          {settings.cron_enabled && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              활성화 전 API 키 설정을 확인하세요. API 호출 비용이 발생할 수 있습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Playwright 설정 (고급) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Playwright 설정 (고급)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Playwright 크롤링 활성화</Label>
              <p className="text-xs text-muted-foreground">ChatGPT/Gemini 크롤링에 필요</p>
            </div>
            <Switch
              checked={settings.playwright_enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, playwright_enabled: checked }))
              }
            />
          </div>
          {settings.playwright_enabled && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              ChatGPT/Gemini 크롤링에는 프록시와 계정 설정이 필요합니다.
              환경변수: OPENAI_SESSION_COOKIE, GOOGLE_SESSION_COOKIE, PROXY_URL
            </div>
          )}
        </CardContent>
      </Card>

      {/* 저장 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          설정 저장
        </Button>
      </div>
    </div>
  );
}
