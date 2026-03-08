"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  updateAutoPublishSettings,
  type AutoPublishSettings,
} from "@/lib/actions/publish-actions";
import type { BlogAccount } from "@/lib/actions/blog-account-actions";
import { Power, Rss, FileCode, Settings2 } from "lucide-react";

interface AutoPublishSettingsClientProps {
  clientId: string;
  settings: AutoPublishSettings | null;
  accounts: BlogAccount[];
}

export function AutoPublishSettingsClient({
  clientId,
  settings,
  accounts,
}: AutoPublishSettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<Partial<AutoPublishSettings>>({
    is_enabled: settings?.is_enabled ?? false,
    tistory_enabled: settings?.tistory_enabled ?? false,
    wordpress_enabled: settings?.wordpress_enabled ?? false,
    medium_enabled: settings?.medium_enabled ?? false,
    publish_as_draft: settings?.publish_as_draft ?? false,
    add_canonical_url: settings?.add_canonical_url ?? true,
    add_schema_markup: settings?.add_schema_markup ?? true,
    default_blog_account_id: settings?.default_blog_account_id ?? null,
  });

  const tistoryAccounts = accounts.filter((a) => a.platform === "tistory" && a.is_active);
  const wordpressAccounts = accounts.filter((a) => a.platform === "wordpress" && a.is_active);
  const mediumAccounts = accounts.filter((a) => a.platform === "medium" && a.is_active);

  function save(updates: Partial<AutoPublishSettings>) {
    const next = { ...state, ...updates };
    setState(next);
    startTransition(async () => {
      const res = await updateAutoPublishSettings(clientId, next);
      if (!res.success) toast.error(res.error || "저장 실패");
      else toast.success("자동 발행 설정이 저장되었습니다.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <Power className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-base">자동 발행</CardTitle>
                <CardDescription>QC 통과 콘텐츠를 자동으로 발행합니다</CardDescription>
              </div>
            </div>
            <Switch
              checked={state.is_enabled}
              onCheckedChange={(v) => save({ is_enabled: v })}
              disabled={isPending}
            />
          </div>
        </CardHeader>
        {state.is_enabled && (
          <CardContent className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              콘텐츠 생성 파이프라인에서 QC 70점 이상 통과 시, 아래 활성화된 채널로 자동 발행됩니다.
              자동 발행은 포인트를 차감하지 않습니다.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Channel Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Rss className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">발행 채널</CardTitle>
              <CardDescription>자동 발행할 플랫폼을 선택하세요</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tistory */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <span className="text-lg">📝</span>
              <div>
                <p className="text-sm font-medium">Tistory</p>
                <p className="text-xs text-muted-foreground">
                  {tistoryAccounts.length > 0
                    ? `${tistoryAccounts.length}개 계정 연동됨`
                    : "연동된 계정 없음"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tistoryAccounts.length === 0 && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                  계정 필요
                </Badge>
              )}
              <Switch
                checked={state.tistory_enabled}
                onCheckedChange={(v) => save({ tistory_enabled: v })}
                disabled={isPending || tistoryAccounts.length === 0}
              />
            </div>
          </div>

          {/* WordPress */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <span className="text-lg">🌐</span>
              <div>
                <p className="text-sm font-medium">WordPress</p>
                <p className="text-xs text-muted-foreground">
                  {wordpressAccounts.length > 0
                    ? `${wordpressAccounts.length}개 계정 연동됨`
                    : "연동된 계정 없음"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {wordpressAccounts.length === 0 && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                  계정 필요
                </Badge>
              )}
              <Switch
                checked={state.wordpress_enabled}
                onCheckedChange={(v) => save({ wordpress_enabled: v })}
                disabled={isPending || wordpressAccounts.length === 0}
              />
            </div>
          </div>

          {/* Medium */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <span className="text-lg">✍️</span>
              <div>
                <p className="text-sm font-medium">Medium</p>
                <p className="text-xs text-muted-foreground">
                  {mediumAccounts.length > 0
                    ? `${mediumAccounts.length}개 계정 연동됨`
                    : "연동된 계정 없음"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mediumAccounts.length === 0 && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                  계정 필요
                </Badge>
              )}
              <Switch
                checked={state.medium_enabled}
                onCheckedChange={(v) => save({ medium_enabled: v })}
                disabled={isPending || mediumAccounts.length === 0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publishing Options */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Settings2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">발행 옵션</CardTitle>
              <CardDescription>발행 시 적용할 설정</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">초안으로 발행</p>
              <p className="text-xs text-muted-foreground">발행 시 초안(비공개) 상태로 저장</p>
            </div>
            <Switch
              checked={state.publish_as_draft}
              onCheckedChange={(v) => save({ publish_as_draft: v })}
              disabled={isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Canonical URL 추가</p>
              <p className="text-xs text-muted-foreground">중복 콘텐츠 방지를 위한 canonical 태그</p>
            </div>
            <Switch
              checked={state.add_canonical_url}
              onCheckedChange={(v) => save({ add_canonical_url: v })}
              disabled={isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium">Schema.org 마크업</p>
                <p className="text-xs text-muted-foreground">구조화된 데이터 (FAQ, Article 등) 자동 삽입</p>
              </div>
              <Badge variant="outline" className="text-xs">
                <FileCode className="h-3 w-3 mr-1" />
                SEO
              </Badge>
            </div>
            <Switch
              checked={state.add_schema_markup}
              onCheckedChange={(v) => save({ add_schema_markup: v })}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
