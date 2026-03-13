/**
 * admin-session.ts
 * Phase AUTH-1: Supabase Auth 기반으로 전환.
 * AdminPayload 인터페이스와 함수 시그니처 유지 (하위 호환).
 *
 * 기존 HMAC 토큰 생성/검증은 unifiedLogin() 폴백용으로 유지.
 */
import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdminRole, type UserRole } from "@/lib/auth";

export const COOKIE_NAME = "admin_session";
export const MAX_AGE = 60 * 60 * 24 * 7; // 7일
const SECRET =
  process.env.ADMIN_SESSION_SECRET || "ai-marketer-dev-secret-2026";

export interface AdminPayload {
  id: string;
  username: string;
  role: "super_admin" | "admin" | "sales" | "viewer";
  displayName: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HMAC 토큰 생성/검증 (DEPRECATED — unifiedLogin username 폴백용 유지)
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// 통합 세션 조회 (Supabase Auth 기본 → HMAC 폴백)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 어드민 세션 조회.
 * 1) Supabase Auth → users 테이블 role 확인 → 어드민 역할이면 AdminPayload 반환
 * 2) HMAC 쿠키 폴백 (기존 admin_users 사용자 전환 완료까지)
 */
export async function getAdminSession(): Promise<AdminPayload | null> {
  // 1. Supabase Auth 기반
  try {
    const user = await getCurrentUser();
    if (user && isAdminRole(user.role as UserRole)) {
      return {
        id: user.id,
        username: user.email,
        role: user.role as AdminPayload["role"],
        displayName: user.name || user.email,
      };
    }
  } catch {
    // Supabase Auth 실패 → HMAC 폴백으로 진행
  }

  // 2. HMAC 폴백 (DEPRECATED)
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * 어드민 세션 필수 (없으면 /login 리다이렉트)
 */
export async function requireAdminSession(): Promise<AdminPayload> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * super_admin 전용 (그 외 역할 → /dashboard 리다이렉트)
 */
export async function requireSuperAdmin(): Promise<AdminPayload> {
  const session = await requireAdminSession();
  if (session.role !== "super_admin") redirect("/dashboard");
  return session;
}
