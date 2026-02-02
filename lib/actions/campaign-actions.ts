"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Content status enum
export type ContentStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED";

// Content type
export interface Content {
  id: string;
  workspace_id: string;
  persona_id: string | null;
  topic: string;
  caption: string;
  image_url: string | null;
  image_prompt: string | null;
  hashtags: string[];
  status: ContentStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// Input validation schemas
const CreateContentSchema = z.object({
  topic: z.string().min(1),
  caption: z.string().min(1),
  imagePrompt: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

const UpdateContentSchema = z.object({
  caption: z.string().optional(),
  imageUrl: z.string().url().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).optional(),
});

/**
 * Helper: Get authenticated user's workspace ID
 */
async function getAuthWorkspaceId(): Promise<{ workspaceId: string | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { workspaceId: null, error: "로그인이 필요합니다." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const membership = membershipRaw as { workspace_id: string } | null;

  if (!membership?.workspace_id) {
    return { workspaceId: null, error: "워크스페이스를 찾을 수 없습니다." };
  }

  return { workspaceId: membership.workspace_id, error: null };
}

/**
 * Get all campaigns (contents) for the workspace
 */
export async function getCampaigns(): Promise<{ success: boolean; data?: Content[]; error?: string }> {
  try {
    const { workspaceId, error: authError } = await getAuthWorkspaceId();
    if (authError || !workspaceId) {
      return { success: false, error: authError || "워크스페이스를 찾을 수 없습니다." };
    }

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("contents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Campaign Action] Fetch error:", error);
      return { success: false, error: "콘텐츠를 불러오는데 실패했습니다." };
    }

    return { success: true, data: (data as Content[]) || [] };
  } catch (error) {
    console.error("[Campaign Action] Error:", error);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}

/**
 * Get a single campaign by ID
 */
export async function getCampaignById(id: string): Promise<{ success: boolean; data?: Content; error?: string }> {
  try {
    const { workspaceId, error: authError } = await getAuthWorkspaceId();
    if (authError || !workspaceId) {
      return { success: false, error: authError || "워크스페이스를 찾을 수 없습니다." };
    }

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("contents")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !data) {
      console.error("[Campaign Action] Fetch error:", error);
      return { success: false, error: "콘텐츠를 찾을 수 없습니다." };
    }

    return { success: true, data: data as Content };
  } catch (error) {
    console.error("[Campaign Action] Error:", error);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}

/**
 * Create a new campaign content
 */
export async function createCampaign(input: {
  topic: string;
  caption: string;
  imagePrompt?: string;
  hashtags?: string[];
}): Promise<{ success: boolean; data?: Content; error?: string }> {
  try {
    const validation = CreateContentSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const { workspaceId, error: authError } = await getAuthWorkspaceId();
    if (authError || !workspaceId) {
      return { success: false, error: authError || "워크스페이스를 찾을 수 없습니다." };
    }

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: persona } = await (supabase as any)
      .from("brand_personas")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("contents")
      .insert({
        workspace_id: workspaceId,
        persona_id: persona?.id || null,
        topic: input.topic,
        caption: input.caption,
        image_prompt: input.imagePrompt || null,
        hashtags: input.hashtags || [],
        status: "DRAFT",
      })
      .select()
      .single();

    if (error) {
      console.error("[Campaign Action] Create error:", error);
      return { success: false, error: "콘텐츠 생성에 실패했습니다." };
    }

    revalidatePath("/campaigns");
    return { success: true, data: data as Content };
  } catch (error) {
    console.error("[Campaign Action] Error:", error);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  id: string,
  input: {
    caption?: string;
    imageUrl?: string | null;
    scheduledAt?: string | null;
    status?: ContentStatus;
  }
): Promise<{ success: boolean; data?: Content; error?: string }> {
  try {
    const validation = UpdateContentSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const { workspaceId, error: authError } = await getAuthWorkspaceId();
    if (authError || !workspaceId) {
      return { success: false, error: authError || "워크스페이스를 찾을 수 없습니다." };
    }

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};
    if (input.caption !== undefined) updateData.caption = input.caption;
    if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;
    if (input.scheduledAt !== undefined) updateData.scheduled_at = input.scheduledAt;
    if (input.status !== undefined) updateData.status = input.status;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("contents")
      .update(updateData)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) {
      console.error("[Campaign Action] Update error:", error);
      return { success: false, error: "콘텐츠 업데이트에 실패했습니다." };
    }

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${id}`);
    return { success: true, data: data as Content };
  } catch (error) {
    console.error("[Campaign Action] Error:", error);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { workspaceId, error: authError } = await getAuthWorkspaceId();
    if (authError || !workspaceId) {
      return { success: false, error: authError || "워크스페이스를 찾을 수 없습니다." };
    }

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("contents")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("[Campaign Action] Delete error:", error);
      return { success: false, error: "콘텐츠 삭제에 실패했습니다." };
    }

    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    console.error("[Campaign Action] Error:", error);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}

/**
 * Schedule a campaign
 */
export async function scheduleCampaign(
  id: string,
  scheduledAt: string
): Promise<{ success: boolean; error?: string }> {
  return updateCampaign(id, {
    scheduledAt,
    status: "SCHEDULED",
  });
}
