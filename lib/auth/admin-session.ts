/**
 * admin-session.ts
 * 서버 사이드 전용 (Node.js crypto 사용).
 * Edge Runtime (middleware)에서는 별도 검증 로직 사용.
 */
import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const COOKIE_NAME = "admin_session";
export const MAX_AGE = 60 * 60 * 24 * 7; // 7일
const SECRET =
  process.env.ADMIN_SESSION_SECRET || "ai-marketer-dev-secret-2026";

export interface AdminPayload {
  id: string;
  username: string;
  role: "super_admin" | "admin" | "viewer";
  displayName: string;
}

// ── 토큰 생성 ─────────────────────────────────────────────────
export function createSessionToken(payload: AdminPayload): string {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + MAX_AGE * 1000,
  });
  const encoded = Buffer.from(data).toString("base64url");
  const sig = createHmac("sha256", SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

// ── 토큰 검증 ─────────────────────────────────────────────────
export function verifySessionToken(token: string): AdminPayload | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return null;
    const encoded = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const expectedSig = createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64url");
    if (sig !== expectedSig) return null;
    const data = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8")
    );
    if (data.exp < Date.now()) return null;
    return {
      id: data.id,
      username: data.username,
      role: data.role,
      displayName: data.displayName,
    };
  } catch {
    return null;
  }
}

// ── 세션 조회 ─────────────────────────────────────────────────
export async function getAdminSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// ── 세션 필수 (없으면 /login으로 리다이렉트) ──────────────────
export async function requireAdminSession(): Promise<AdminPayload> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}

// ── super_admin 필수 ──────────────────────────────────────────
export async function requireSuperAdmin(): Promise<AdminPayload> {
  const session = await requireAdminSession();
  if (session.role !== "super_admin") redirect("/dashboard");
  return session;
}
