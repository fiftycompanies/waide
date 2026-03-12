"use server";

/**
 * notification-actions.ts
 * 알림 관련 서버 액션
 * - 알림 CRUD (목록, 읽음 처리, 생성)
 * - 알림 설정 CRUD
 */

import { createAdminClient } from "@/lib/supabase/service";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface Notification {
  id: string;
  client_id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationSettings {
  rank_drop: boolean;
  rank_rise: boolean;
  publish_complete: boolean;
  quota_warning: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  rank_drop: true,
  rank_rise: true,
  publish_complete: true,
  quota_warning: true,
  email_enabled: false,
  push_enabled: false,
};

// ═══════════════════════════════════════════
// 알림 조회
// ═══════════════════════════════════════════

/**
 * 알림 목록 조회
 */
export async function getNotifications(
  clientId: string,
  limit = 50
): Promise<Notification[]> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("notifications")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[notification-actions] getNotifications:", error);
    return [];
  }

  return (data ?? []) as Notification[];
}

/**
 * 읽지 않은 알림 수
 */
export async function getUnreadCount(clientId: string): Promise<number> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (db as any)
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("is_read", false);

  if (error) {
    console.error("[notification-actions] getUnreadCount:", error);
    return 0;
  }

  return count ?? 0;
}

// ═══════════════════════════════════════════
// 읽음 처리
// ═══════════════════════════════════════════

/**
 * 모두 읽음 처리
 */
export async function markAllRead(clientId: string): Promise<void> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .from("notifications")
    .update({ is_read: true })
    .eq("client_id", clientId)
    .eq("is_read", false);
}

/**
 * 단일 읽음 처리
 */
export async function markRead(notificationId: string): Promise<void> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}

// ═══════════════════════════════════════════
// 알림 생성
// ═══════════════════════════════════════════

/**
 * 알림 생성 (내부 + 외부 공용)
 * 알림 설정에서 해당 타입이 비활성화되어 있으면 생성 스킵
 */
export async function createNotification(params: {
  clientId: string;
  type: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = createAdminClient();

    // 알림 설정 확인 — 해당 타입 비활성화 시 스킵
    const settings = await getNotificationSettings(params.clientId);
    const typeKey = params.type as keyof NotificationSettings;
    if (typeKey in settings && settings[typeKey] === false) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("notifications").insert({
      client_id: params.clientId,
      type: params.type,
      title: params.title,
      body: params.body || null,
      metadata: params.metadata || {},
    });
  } catch (err) {
    // 알림 생성 실패는 서비스 블로킹하지 않음
    console.error("[notification-actions] createNotification failed:", err);
  }
}

// ═══════════════════════════════════════════
// 알림 설정
// ═══════════════════════════════════════════

/**
 * 알림 설정 조회
 */
export async function getNotificationSettings(
  clientId: string
): Promise<NotificationSettings> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("notification_settings")
    .select("settings")
    .eq("client_id", clientId)
    .single();

  if (!data?.settings) {
    return { ...DEFAULT_SETTINGS };
  }

  return { ...DEFAULT_SETTINGS, ...data.settings } as NotificationSettings;
}

/**
 * 알림 설정 저장 (UPSERT)
 */
export async function updateNotificationSettings(
  clientId: string,
  settings: Partial<NotificationSettings>
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  // SELECT → spread → UPDATE 패턴
  const current = await getNotificationSettings(clientId);
  const merged = { ...current, ...settings };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from("notification_settings")
    .upsert(
      {
        client_id: clientId,
        settings: merged,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
