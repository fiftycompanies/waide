"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Loader2,
  Settings,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  getNotifications,
  markAllRead,
  markRead,
  getNotificationSettings,
  updateNotificationSettings,
  type Notification,
  type NotificationSettings,
} from "@/lib/actions/notification-actions";

interface Props {
  clientId: string;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  rank_drop: { icon: TrendingDown, color: "text-red-500 bg-red-50", label: "순위 하락" },
  rank_rise: { icon: TrendingUp, color: "text-emerald-500 bg-emerald-50", label: "순위 상승" },
  publish_complete: { icon: FileText, color: "text-blue-500 bg-blue-50", label: "발행 완료" },
  quota_warning: { icon: CreditCard, color: "text-amber-500 bg-amber-50", label: "포인트 경고" },
  auto_publish_confirm: { icon: Zap, color: "text-purple-500 bg-purple-50", label: "자동발행 확인" },
};

const ctaConfig: Record<string, { label: string; getPath: (meta: Record<string, unknown>) => string }> = {
  rank_drop: { label: "지금 발행", getPath: (m) => `/portal/blog/write?keyword_id=${m.keyword_id || ""}` },
  rank_rise: { label: "확인하기", getPath: () => "/portal/serp" },
  publish_complete: { label: "글 보기", getPath: (m) => `/portal/blog/${m.content_id || ""}` },
  quota_warning: { label: "포인트 충전", getPath: () => "/portal/settings?tab=subscription" },
  auto_publish_confirm: { label: "확인 후 발행", getPath: (m) => `/portal/blog/write?post_id=${m.content_id || ""}&mode=confirm` },
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

export default function PortalNotificationsClient({ clientId }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadData = useCallback(async () => {
    const [notifs, setts] = await Promise.all([
      getNotifications(clientId),
      getNotificationSettings(clientId),
    ]);
    setNotifications(notifs);
    setSettings(setts);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllRead(clientId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMarkingAll(false);
  };

  const handleClickNotification = async (notif: Notification) => {
    if (!notif.is_read) {
      await markRead(notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
    }
    const cta = ctaConfig[notif.type];
    if (cta) {
      router.push(cta.getPath(notif.metadata as Record<string, unknown>));
    }
  };

  const handleToggleSetting = (key: keyof NotificationSettings) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    await updateNotificationSettings(clientId, settings);
    setSavingSettings(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">알림 센터</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}건` : "모든 알림을 확인했습니다"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              모두 읽음
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && settings && (
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">알림 설정</h2>
            <button onClick={() => setShowSettings(false)}>
              <ChevronUp className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="space-y-3">
            {([
              { key: "rank_drop" as const, label: "순위 하락 알림", desc: "키워드 순위가 10위 이상 하락 시" },
              { key: "rank_rise" as const, label: "순위 상승 알림", desc: "TOP10 진입 시" },
              { key: "publish_complete" as const, label: "발행 완료 알림", desc: "콘텐츠 발행 성공 시" },
              { key: "quota_warning" as const, label: "포인트 경고 알림", desc: "잔여 포인트 3건 이하 시" },
            ]).map(({ key, label, desc }) => (
              <label key={key} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="block text-xs text-gray-400">{desc}</span>
                </div>
                <button
                  onClick={() => handleToggleSetting(key)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    settings[key] ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${
                      settings[key] ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </label>
            ))}

            <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div>
                <span className="text-sm font-medium text-gray-700">이메일 알림</span>
                <span className="block text-xs text-gray-400">중요 알림을 이메일로 수신</span>
              </div>
              <button
                onClick={() => handleToggleSetting("email_enabled")}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  settings.email_enabled ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${
                    settings.email_enabled ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </label>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            저장
          </button>
        </div>
      )}

      {/* Notification feed */}
      {notifications.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">알림이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">
            키워드 순위 변동, 콘텐츠 발행 완료 시 알림을 받을 수 있습니다
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const config = typeConfig[notif.type] || typeConfig.publish_complete;
            const cta = ctaConfig[notif.type];
            const Icon = config.icon;

            return (
              <div
                key={notif.id}
                className={`rounded-xl border bg-white p-4 transition-colors cursor-pointer hover:border-emerald-200 ${
                  !notif.is_read ? "border-l-4 border-l-emerald-500 bg-emerald-50/30" : ""
                }`}
                onClick={() => handleClickNotification(notif)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${!notif.is_read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {notif.title}
                      </p>
                      <span className="text-xs text-gray-400 shrink-0">
                        {relativeTime(notif.created_at)}
                      </span>
                    </div>
                    {notif.body && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{notif.body}</p>
                    )}
                    {cta && (
                      <button
                        className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClickNotification(notif);
                        }}
                      >
                        {cta.label} &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
