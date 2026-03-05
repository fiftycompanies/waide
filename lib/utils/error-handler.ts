import { logError } from "@/lib/actions/error-log-actions";

/**
 * 서버 액션 에러 로깅 래퍼
 *
 * 사용법:
 * ```ts
 * const result = await withErrorLogging(
 *   () => someRiskyOperation(),
 *   { pageUrl: "/ops/clients", errorType: "server" }
 * );
 * ```
 *
 * - 에러 발생 시 error_logs에 기록 + 슬랙 알림
 * - 에러는 다시 throw (기존 에러 흐름 유지)
 */
export async function withErrorLogging<T>(
  fn: () => Promise<T>,
  context?: {
    pageUrl?: string;
    errorType?: "client" | "server" | "api" | "cron";
    userId?: string;
    userEmail?: string;
    userRole?: string;
    clientId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // 에러 로깅 (비동기, 실패해도 원본 에러는 throw)
    logError({
      errorMessage: err.message,
      errorStack: err.stack,
      errorType: context?.errorType || "server",
      pageUrl: context?.pageUrl,
      userId: context?.userId,
      userEmail: context?.userEmail,
      userRole: context?.userRole,
      clientId: context?.clientId,
      metadata: context?.metadata,
    }).catch((logErr) => {
      console.error("[withErrorLogging] failed to log error:", logErr);
    });

    throw error;
  }
}
