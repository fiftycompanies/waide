"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Type matching the LLM output from brand analysis
export interface PersonaData {
  url: string;
  scrapedTitle: string;
  persona: {
    toneVoice: string[];
    keywords: string[];
    summary: string;
    targetAudience: string;
    brandValues: string[];
    communicationStyle: {
      formality: number;
      enthusiasm: number;
      humor: number;
      empathy: number;
    };
  };
}

interface SavePersonaResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

// Brand persona type from DB
export interface BrandPersona {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  tone_voice_settings: Record<string, unknown>;
  target_audience: string | null;
  brand_values: string[] | null;
  base_prompt_instruction: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Helper: Get authenticated user and their workspace
 */
async function getAuthUserWithWorkspace() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, workspaceId: null, error: "로그인이 필요합니다." };
  }

  // Get user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any)
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const typedMembership = membership as { workspace_id: string } | null;

  return {
    user,
    workspaceId: typedMembership?.workspace_id || null,
    error: null,
  };
}

/**
 * Save brand persona to database
 * Uses authenticated user from Supabase Auth
 */
export async function saveBrandPersona(
  data: PersonaData
): Promise<SavePersonaResult> {
  try {
    const supabase = await createClient();

    console.log("[Brand Action] Starting save process...");

    // Step 1: Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[Brand Action] Authentication error:", authError);
      return {
        success: false,
        error: "로그인이 필요합니다.",
      };
    }

    const userId = user.id;
    console.log("[Brand Action] Authenticated user:", user.email);

    // Step 2: Ensure user record exists in users table
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: userUpsertError } = await (supabase as any).from("users").upsert(
      {
        id: userId,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        updated_at: now,
      },
      { onConflict: "id" }
    );

    if (userUpsertError) {
      console.error("[Brand Action] User upsert error:", userUpsertError);
      // Non-fatal, continue
    }

    // Step 3: Check if user already has a workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingMembershipRaw } = await (supabase as any)
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    const existingMembership = existingMembershipRaw as { workspace_id: string } | null;

    let workspaceId: string;

    if (existingMembership?.workspace_id) {
      // Use existing workspace
      workspaceId = existingMembership.workspace_id;
      console.log("[Brand Action] Found existing workspace:", workspaceId);
    } else {
      // Create new workspace (without owner_id - use workspace_members for ownership)
      const workspaceSlug = `workspace-${userId.slice(0, 8)}-${Date.now()}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newWorkspace, error: workspaceError } = await (supabase as any)
        .from("workspaces")
        .insert({
          name: "My Workspace",
          slug: workspaceSlug,
          subscription_tier: "FREE",
          updated_at: now,
        })
        .select("id")
        .single();

      if (workspaceError || !newWorkspace) {
        console.error("[Brand Action] Workspace creation failed:", workspaceError);
        return {
          success: false,
          error: `워크스페이스 생성에 실패했습니다: ${workspaceError?.message || "Unknown error"}`,
        };
      }

      workspaceId = newWorkspace.id;
      console.log("[Brand Action] Created new workspace:", workspaceId);

      // Add user as workspace owner
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: memberError } = await (supabase as any)
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role: "OWNER",
        });

      if (memberError) {
        console.error("[Brand Action] Workspace member error:", memberError);
        // Non-fatal, continue
      }
    }

    // Step 4: Save brand persona
    const toneVoiceSettings = {
      formality: data.persona.communicationStyle.formality,
      humor: data.persona.communicationStyle.humor,
      enthusiasm: data.persona.communicationStyle.enthusiasm,
      empathy: data.persona.communicationStyle.empathy,
      toneVoice: data.persona.toneVoice,
      keywords: data.persona.keywords,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: persona, error: personaError } = await (supabase as any)
      .from("brand_personas")
      .insert({
        workspace_id: workspaceId,
        name: data.scrapedTitle || "My Brand",
        description: data.persona.summary,
        tone_voice_settings: toneVoiceSettings,
        target_audience: data.persona.targetAudience,
        brand_values: data.persona.brandValues,
        base_prompt_instruction: `브랜드 톤앤매너: ${data.persona.toneVoice.join(", ")}. ${data.persona.summary}`,
        is_active: true,
        updated_at: now,
      })
      .select("id")
      .single();

    if (personaError || !persona) {
      console.error("[Brand Action] Persona creation failed:", personaError);
      return {
        success: false,
        error: `페르소나 저장에 실패했습니다: ${personaError?.message || "Unknown error"}`,
      };
    }

    console.log("[Brand Action] ✅ Successfully created brand persona:", persona.id);

    revalidatePath("/dashboard");

    return {
      success: true,
      redirectUrl: "/dashboard",
    };
  } catch (error) {
    console.error("[Brand Action] ❌ Unexpected error:", error);
    return {
      success: false,
      error: `예상치 못한 오류: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get the most recent brand persona for the authenticated user
 */
export async function getLatestBrandPersona(): Promise<BrandPersona | null> {
  try {
    const { user, workspaceId, error } = await getAuthUserWithWorkspace();

    if (error || !user || !workspaceId) {
      console.log("[Brand Action] No auth or workspace:", error);
      return null;
    }

    const supabase = await createClient();

    // Get latest persona
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: persona, error: personaError } = await (supabase as any)
      .from("brand_personas")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (personaError || !persona) {
      return null;
    }

    return persona as BrandPersona;
  } catch (error) {
    console.error("[Brand Action] Error fetching persona:", error);
    return null;
  }
}
