"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { getAdminSession } from "@/lib/auth/admin-session";
import { revalidatePath } from "next/cache";

type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * 어드민: 신청 접수 확인 (pending → reviewing)
 */
export async function confirmHomepageRequest(
  requestId: string
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "권한이 없습니다." };
  if (!["super_admin", "admin"].includes(session.role)) {
    return { success: false, error: "권한이 없습니다." };
  }

  const db = createAdminClient();

  const { error } = await db
    .from("homepage_requests")
    .update({
      status: "reviewing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/homepage-requests");
  return { success: true };
}

/**
 * 어드민: 결과물 등록 (reviewing → completed)
 */
export async function registerHomepageResult(
  requestId: string,
  resultUrl: string,
  adminMemo?: string
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "권한이 없습니다." };
  if (!["super_admin", "admin"].includes(session.role)) {
    return { success: false, error: "권한이 없습니다." };
  }

  if (!resultUrl.trim()) {
    return { success: false, error: "결과물 URL을 입력해주세요." };
  }

  const db = createAdminClient();

  const updates: Record<string, unknown> = {
    status: "completed",
    result_url: resultUrl.trim(),
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (adminMemo !== undefined && adminMemo.trim()) {
    updates.admin_memo = adminMemo.trim();
  }

  const { error } = await db
    .from("homepage_requests")
    .update(updates)
    .eq("id", requestId)
    .eq("status", "reviewing");

  if (error) return { success: false, error: error.message };

  revalidatePath("/ops/homepage-requests");
  revalidatePath("/homepage");
  return { success: true };
}
