"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#fafafa",
        }}
      >
        <div style={{ textAlign: "center", padding: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>
            문제가 발생했습니다
          </h2>
          <p style={{ color: "#666", marginBottom: 24 }}>
            페이지를 새로고침하거나 다시 시도해 주세요.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #ddd",
              backgroundColor: "#fff",
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            다시 시도
          </button>
          <a
            href="/dashboard"
            style={{
              padding: "10px 24px",
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #ddd",
              backgroundColor: "#fff",
              cursor: "pointer",
              textDecoration: "none",
              color: "#333",
            }}
          >
            대시보드로 이동
          </a>
        </div>
      </body>
    </html>
  );
}
