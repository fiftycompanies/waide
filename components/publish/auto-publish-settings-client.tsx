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
import { createPublishingAccount } from "@/lib/actions/publishing-account-actions";
import { Power, Rss, Settings2, Plus } from "lucide-react";

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

  const [addingPlatform, setAddingPlatform] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountUrl, setNewAccountUrl] = useState("");

  const tistoryAccounts = accounts.filter((a) => a.platform === "tistory" && a.is_active);
  const wordpressAccounts = accounts.filter((a) => a.platform === "wordpress" && a.is_active);
  const mediumAccounts = accounts.filter((a) => a.platform === "medium" && a.is_active);

  async function handleAddAccount(platform: string) {
    if (!newAccountName.trim()) return;
    const result = await createPublishingAccount({
      clientId,
      platform,
      accountName: newAccountName.trim(),
      accountUrl: newAccountUrl.trim() || undefined,
    });
    if (result.success) {
      toast.success("계정이 연동되었습니다.");
      setAddingPlatform(null);
      setNewAccountName("");
      setNewAccountUrl("");
    } else {
      toast.error(result.error || "계정 연동에 실패했습니다.");
    }
  }

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
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
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
                  <button
                    onClick={() => setAddingPlatform(addingPlatform === "tistory" ? null : "tistory")}
                    className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
                  >
                    <Plus className="h-3 w-3" />
                    계정 연동
                  </button>
                )}
                <Switch
                  checked={state.tistory_enabled}
                  onCheckedChange={(v) => save({ tistory_enabled: v })}
                  disabled={isPending || tistoryAccounts.length === 0}
                />
              </div>
            </div>
            {addingPlatform === "tistory" && (
              <AddAccountInline
                onAdd={() => handleAddAccount("tistory")}
                onCancel={() => { setAddingPlatform(null); setNewAccountName(""); setNewAccountUrl(""); }}
                name={newAccountName}
                url={newAccountUrl}
                onNameChange={setNewAccountName}
                onUrlChange={setNewAccountUrl}
              />
            )}
          </div>

          {/* WordPress */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
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
                  <button
                    onClick={() => setAddingPlatform(addingPlatform === "wordpress" ? null : "wordpress")}
                    className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
                  >
                    <Plus className="h-3 w-3" />
                    계정 연동
                  </button>
                )}
                <Switch
                  checked={state.wordpress_enabled}
                  onCheckedChange={(v) => save({ wordpress_enabled: v })}
                  disabled={isPending || wordpressAccounts.length === 0}
                />
              </div>
            </div>
            {addingPlatform === "wordpress" && (
              <AddAccountInline
                onAdd={() => handleAddAccount("wordpress")}
                onCancel={() => { setAddingPlatform(null); setNewAccountName(""); setNewAccountUrl(""); }}
                name={newAccountName}
                url={newAccountUrl}
                onNameChange={setNewAccountName}
                onUrlChange={setNewAccountUrl}
              />
            )}
          </div>

          {/* Medium */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
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
                  <button
                    onClick={() => setAddingPlatform(addingPlatform === "medium" ? null : "medium")}
                    className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
                  >
                    <Plus className="h-3 w-3" />
                    계정 연동
                  </button>
                )}
                <Switch
                  checked={state.medium_enabled}
                  onCheckedChange={(v) => save({ medium_enabled: v })}
                  disabled={isPending || mediumAccounts.length === 0}
                />
              </div>
            </div>
            {addingPlatform === "medium" && (
              <AddAccountInline
                onAdd={() => handleAddAccount("medium")}
                onCancel={() => { setAddingPlatform(null); setNewAccountName(""); setNewAccountUrl(""); }}
                name={newAccountName}
                url={newAccountUrl}
                onNameChange={setNewAccountName}
                onUrlChange={setNewAccountUrl}
              />
            )}
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
        </CardContent>
      </Card>
    </div>
  );
}

function AddAccountInline({
  onAdd,
  onCancel,
  name,
  url,
  onNameChange,
  onUrlChange,
}: {
  onAdd: () => void;
  onCancel: () => void;
  name: string;
  url: string;
  onNameChange: (v: string) => void;
  onUrlChange: (v: string) => void;
}) {
  return (
    <div className="border-t pt-3 space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="계정명 (예: 내 블로그)"
        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <input
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="블로그 URL (선택)"
        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <div className="flex gap-2">
        <button
          onClick={onAdd}
          disabled={!name.trim()}
          className="px-3 py-1 text-xs font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          연동
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}
