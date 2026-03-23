/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
/**
 * url-validator.ts
 * 레퍼런스 URL 사전 검증
 *
 * Playwright 실행 전에 HEAD 요청으로 URL 접근 가능 여부를 확인한다.
 * DNS 실패, 서버 다운 등을 빠르게(5초 이내) 감지하여
 * 불필요한 Playwright 기동을 방지한다.
 *
 * - 실패 시 즉시 에러 (자동 폴백 없음)
 * - 리다이렉트 시 최종 URL 반환
 */

// ── 타입 ─────────────────────────────────────────────────────────────────────

export interface UrlValidationResult {
  /** 최종 도달 URL (리다이렉트 추적 후) */
  finalUrl: string;
  /** HTTP 상태 코드 */
  statusCode: number;
}

// ── 설정 ─────────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 5;

// ── 메인 함수 ─────────────────────────────────────────────────────────────────

/**
 * HEAD 요청으로 URL 접근 가능 여부를 검증한다.
 *
 * @param url 검증할 URL (https:// 포함)
 * @returns 최종 URL (리다이렉트 추적)
 * @throws URL 접근 불가 시 즉시 에러 (폴백 없음)
 */
export async function validateReferenceUrl(url: string): Promise<string> {
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount < MAX_REDIRECTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const resp = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      clearTimeout(timeoutId);

      // 리다이렉트 (301, 302, 303, 307, 308)
      if (resp.status >= 300 && resp.status < 400) {
        const location = resp.headers.get("location");
        if (!location) {
          throw new Error(
            `리다이렉트 응답(${resp.status})이지만 Location 헤더가 없습니다: ${currentUrl}`
          );
        }
        // 상대 경로 → 절대 경로
        currentUrl = new URL(location, currentUrl).href;
        redirectCount++;
        console.log(
          `[URLValidator] 리다이렉트 ${redirectCount}: ${resp.status} → ${currentUrl}`
        );
        continue;
      }

      // 성공 (2xx)
      if (resp.status >= 200 && resp.status < 300) {
        console.log(
          `[URLValidator] 검증 성공: ${resp.status} ${currentUrl}`
        );
        return currentUrl;
      }

      // HEAD 미지원/오작동 (403, 404, 405 등) → GET 폴백
      // 많은 서버가 HEAD 요청에 비정상 응답을 반환하므로 GET으로 재검증
      if (resp.status === 403 || resp.status === 404 || resp.status === 405) {
        console.log(
          `[URLValidator] HEAD 응답 ${resp.status}, GET 폴백 시도: ${currentUrl}`
        );
        return await validateWithGet(currentUrl);
      }

      // 서버 에러 (기타 4xx, 5xx)
      throw new Error(
        `레퍼런스 URL 접근 실패 (HTTP ${resp.status}): ${currentUrl}`
      );
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        // AbortError = 타임아웃
        if (error.name === "AbortError") {
          throw new Error(
            `레퍼런스 URL 응답 없음 (${TIMEOUT_MS}ms 타임아웃): ${currentUrl}`
          );
        }
        // fetch 실패 (DNS, 네트워크 등)
        if (
          error.message.includes("fetch failed") ||
          error.message.includes("ENOTFOUND") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ERR_NAME_NOT_RESOLVED")
        ) {
          throw new Error(
            `레퍼런스 URL에 접근할 수 없습니다 (DNS/네트워크 오류): ${currentUrl}`
          );
        }
        // 이미 우리가 throw한 에러는 그대로 전파
        if (error.message.startsWith("레퍼런스")) {
          throw error;
        }
      }

      throw new Error(
        `레퍼런스 URL 검증 실패: ${currentUrl} — ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  throw new Error(
    `레퍼런스 URL 리다이렉트가 너무 많습니다 (${MAX_REDIRECTS}회 초과): ${url}`
  );
}

// ── GET 폴백 (HEAD 미지원 서버용) ─────────────────────────────────────────────

async function validateWithGet(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    clearTimeout(timeoutId);

    if (resp.ok) {
      // body 소비하여 connection 정리
      await resp.text().catch(() => {});
      console.log(
        `[URLValidator] GET 폴백 성공: ${resp.status} ${resp.url || url}`
      );
      return resp.url || url;
    }

    throw new Error(
      `레퍼런스 URL 접근 실패 (HTTP ${resp.status}): ${url}`
    );
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.message.startsWith("레퍼런스")) {
      throw error;
    }
    throw new Error(
      `레퍼런스 URL GET 검증 실패: ${url} — ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
