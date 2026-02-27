/**
 * lib/auth.ts — Supabase Auth 기반 사용자 인증 유틸리티
 * 기존 admins 테이블 인증과 병렬 운영
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";

export type UserRole = "super_admin" | "admin" | "sales" | "client_owner" | "client_member";

export interface AppUser {
  id: string;
  auth_id: string | null;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  client_id: string | null;
  sales_agent_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  // 조인 데이터
  client_brand_name?: string;
  client_status?: string;
  sales_agent_name?: string;
  sales_agent_ref_code?: string;
}

/**
 * 현재 Supabase Auth 로그인 사용자의 users 테이블 정보
 * 미로그인 또는 users 레코드 없으면 null
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const db = createAdminClient();
    const { data: user } = await db
      .from("users")
      .select("*")
      .eq("auth_id", authUser.id)
      .single();

    if (!user) return null;

    // 클라이언트 정보 조인
    let clientBrandName: string | undefined;
    let clientStatus: string | undefined;
    if (user.client_id) {
      const { data: client } = await db
        .from("clients")
        .select("brand_name:name, status")
        .eq("id", user.client_id)
        .single();
      if (client) {
        clientBrandName = client.brand_name;
        clientStatus = client.status;
      }
    }

    return {
      ...user,
      role: user.role as UserRole,
      client_brand_name: clientBrandName,
      client_status: clientStatus,
    } as AppUser;
  } catch {
    return null;
  }
}

/** 역할 체크 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/** 어드민 여부 (super_admin, admin) */
export function isAdmin(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

/** 고객 여부 (client_owner, client_member) */
export function isClient(role: UserRole): boolean {
  return role === "client_owner" || role === "client_member";
}

/** 영업사원 여부 */
export function isSales(role: UserRole): boolean {
  return role === "sales";
}
