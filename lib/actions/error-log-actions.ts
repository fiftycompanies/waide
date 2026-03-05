"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { sendErrorSlackNotification } from "@/lib/slack/error-notification";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LogErrorParams {
  errorMessage: string;
  errorStack?: string;
  errorType: "client" | "server" | "api" | "cron";
  pageUrl?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
  browserInfo?: string;
}

export interface ErrorLogEntry {
  id: string;
  error_message: string;
  error_stack: string | null;
  error_type: string;
  page_url: string | null;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  client_id: string | null;
  metadata: Record<string, unknown>;
  browser_info: string | null;
  status: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface ErrorStats {
  today: number;
  thisWeek: number;
  unresolved: number;
  serverErrors: number;
}

// ── 에러 로깅 (인증 불필요 — 에러 발생 시점에 호출) ──────────────────────

export async function logError(
  params: LogErrorParams
): Promise<{ success: boolean; errorId?: string }> {
  try {
    const db = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from("error_logs")
      .insert({
        error_message: params.errorMessage,
        error_stack: params.errorStack || null,
        error_type: params.errorType,
        page_url: params.pageUrl || null,
        user_id: params.userId || null,
        user_email: params.userEmail || null,
        user_role: params.userRole || null,
        client_id: params.clientId || null,
        metadata: params.metadata || {},
        browser_info: params.browserInfo || null,
        status: "new",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[error-log] insert failed:", error);
      return { success: false };
    }

    const errorId = data?.id;

    // 슬랙 알림 (비동기, 실패해도 에러 로깅은 성공)
    sendErrorSlackNotification({
      errorMessage: params.errorMessage,
      errorType: params.errorType,
      pageUrl: params.pageUrl,
      userEmail: params.userEmail,
      userRole: params.userRole,
      errorId,
    }).catch((err) => {
      console.error("[error-log] slack notification failed:", err);
    });

    return { success: true, errorId };
  } catch (err) {
    console.error("[error-log] logError unexpected:", err);
    return { success: false };
  }
}

// ── 에러 로그 목록 조회 ──────────────────────────────────────────────────

export async function getErrorLogs(filters?: {
  status?: string;
  errorType?: string;
  days?: number;
}): Promise<ErrorLogEntry[]> {
  await requireAdminSession();

  try {
    const db = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db as any)
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.errorType && filters.errorType !== "all") {
      query = query.eq("error_type", filters.errorType);
    }

    if (filters?.days) {
      const since = new Date(Date.now() - filters.days * 86400000).toISOString();
      query = query.gte("created_at", since);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[error-log] getErrorLogs:", error);
      return [];
    }

    return (data || []) as ErrorLogEntry[];
  } catch (err) {
    console.error("[error-log] getErrorLogs unexpected:", err);
    return [];
  }
}

// ── 에러 상세 조회 ────────────────────────────────────────────────────────

export async function getErrorLogDetail(
  id: string
): Promise<ErrorLogEntry | null> {
  await requireAdminSession();

  try {
    const db = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from("error_logs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[error-log] getErrorLogDetail:", error);
      return null;
    }

    return data as ErrorLogEntry | null;
  } catch (err) {
    console.error("[error-log] getErrorLogDetail unexpected:", err);
    return null;
  }
}

// ── 에러 상태 변경 ────────────────────────────────────────────────────────

export async function updateErrorStatus(
  id: string,
  status: "acknowledged" | "resolved" | "ignored"
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdminSession();

  try {
    const db = createAdminClient();

    const updateData: Record<string, unknown> = { status };
    if (status === "resolved") {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = session.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("error_logs")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[error-log] updateErrorStatus unexpected:", err);
    return { success: false, error: "상태 변경 실패" };
  }
}

// ── 에러 통계 ─────────────────────────────────────────────────────────────

export async function getErrorStats(): Promise<ErrorStats> {
  await requireAdminSession();

  try {
    const db = createAdminClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

    // 병렬 쿼리
    const [todayRes, weekRes, unresolvedRes, serverRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).from("error_logs").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).from("error_logs").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).from("error_logs").select("id", { count: "exact", head: true }).eq("status", "new"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).from("error_logs").select("id", { count: "exact", head: true }).eq("error_type", "server"),
    ]);

    return {
      today: todayRes.count ?? 0,
      thisWeek: weekRes.count ?? 0,
      unresolved: unresolvedRes.count ?? 0,
      serverErrors: serverRes.count ?? 0,
    };
  } catch (err) {
    console.error("[error-log] getErrorStats unexpected:", err);
    return { today: 0, thisWeek: 0, unresolved: 0, serverErrors: 0 };
  }
}
