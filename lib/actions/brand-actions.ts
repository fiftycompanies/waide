"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

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

    // Step 4: Insert into clients (최상위 엔티티)
    const brandName = data.scrapedTitle || "My Brand";
    const adminDb = createAdminClient();

    const { data: client, error: clientError } = await adminDb
      .from("clients")
      .insert({
        workspace_id: workspaceId,
        name: brandName,
        company_name: brandName,
        status: "active",
        is_active: true,
        website_url: data.url || null,
        updated_at: now,
      })
      .select("id")
      .single();

    if (clientError || !client) {
      console.error("[Brand Action] Client creation failed:", clientError);
      return {
        success: false,
        error: `클라이언트 생성에 실패했습니다: ${clientError?.message || "Unknown error"}`,
      };
    }

    const clientId = client.id;
    console.log("[Brand Action] Created client:", clientId);

    // Step 5: 기존 활성 페르소나 비활성화 (1:1 UNIQUE 인덱스 충돌 방지)
    await adminDb
      .from("brand_personas")
      .update({ is_active: false, updated_at: now })
      .eq("client_id", clientId)
      .eq("is_active", true);

    // Step 6: Save brand persona (linked to client)
    const toneVoiceSettings = {
      formality: data.persona.communicationStyle.formality,
      humor: data.persona.communicationStyle.humor,
      enthusiasm: data.persona.communicationStyle.enthusiasm,
      empathy: data.persona.communicationStyle.empathy,
      toneVoice: data.persona.toneVoice,
      keywords: data.persona.keywords,
    };

    const { data: persona, error: personaError } = await adminDb
      .from("brand_personas")
      .insert({
        workspace_id: workspaceId,
        client_id: clientId,
        name: brandName,
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
      // Rollback: delete the client we just created
      await adminDb.from("clients").delete().eq("id", clientId);
      return {
        success: false,
        error: `페르소나 저장에 실패했습니다: ${personaError?.message || "Unknown error"}`,
      };
    }

    console.log("[Brand Action] ✅ Successfully created client + brand persona:", clientId, persona.id);

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

// ── AI 마케터 브랜드(brand_personas) 관련 ────────────────────────────────────

export interface AiMarketBrand {
  id: string;
  name: string;
  parent_id: string | null;
  client_type: string;
}

/**
 * 활성 브랜드(고객사) 목록 조회.
 * clients 테이블에서 is_active=true인 고객사를 반환한다.
 * 부모(parent_id IS NULL)를 먼저, 자식을 이후에 반환한다.
 */
export async function getAiMarketBrands(): Promise<AiMarketBrand[]> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("clients")
      .select("id, name, parent_id, client_type")
      .eq("is_active", true)
      .order("parent_id", { ascending: true, nullsFirst: true })
      .order("name");
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      parent_id: (row as Record<string, unknown>).parent_id as string | null ?? null,
      client_type: (row as Record<string, unknown>).client_type as string ?? "brand",
    }));
  } catch {
    return [];
  }
}

/**
 * 자식 클라이언트 목록 조회 (parentId를 부모로 갖는 clients)
 */
export async function getChildClients(
  parentId: string
): Promise<{ id: string; name: string }[]> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("clients")
      .select("id, name")
      .eq("parent_id", parentId)
      .eq("is_active", true)
      .order("name");
    return (data ?? []).map((row: { id: string; name: string }) => ({
      id: row.id,
      name: row.name,
    }));
  } catch {
    return [];
  }
}

// ── 브랜드 관리 CRUD ─────────────────────────────────────────────────────────

export interface BrandDetail {
  id: string;
  name: string;
  company_name: string | null;
  website_url: string | null;
  parent_id: string | null;
  client_type: string;
  is_active: boolean;
  created_at: string;
  keyword_count: number;
  content_count: number;
}

/** 브랜드 전체 목록 조회 (관리용, 비활성 포함) */
export async function getBrandList(): Promise<BrandDetail[]> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("clients")
      .select("id, name, company_name, website_url, parent_id, client_type, is_active, created_at")
      .order("parent_id", { ascending: true, nullsFirst: true })
      .order("name");

    if (!data) return [];

    // 키워드 수 / 콘텐츠 수 집계 (별도 쿼리 없이 0으로 초기화, 필요 시 확장)
    const rows = data as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      company_name: (row.company_name as string) ?? null,
      website_url: (row.website_url as string) ?? null,
      parent_id: (row.parent_id as string) ?? null,
      client_type: (row.client_type as string) ?? "brand",
      is_active: (row.is_active as boolean) ?? true,
      created_at: row.created_at as string,
      keyword_count: 0,
      content_count: 0,
    }));
  } catch {
    return [];
  }
}

/** 브랜드 정보 수정 */
export async function updateBrand(
  id: string,
  payload: { name?: string; company_name?: string; website_url?: string; client_type?: string; is_active?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("clients")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/brands");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** 브랜드 삭제 (cascade: keywords, contents, jobs 등은 DB FK ON DELETE CASCADE 처리 가정) */
export async function deleteBrand(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    // 소프트 삭제: is_active = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("clients")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/brands");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** 브랜드 생성 (온보딩 없이 직접 생성) */
export async function createBrand(payload: {
  name: string;
  companyName?: string;
  websiteUrl?: string;
  clientType?: string;
  parentId?: string | null;
  workspaceId: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const db = createAdminClient();
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from("clients")
      .insert({
        workspace_id: payload.workspaceId,
        name: payload.name.trim(),
        company_name: payload.companyName?.trim() || payload.name.trim(),
        website_url: payload.websiteUrl?.trim() || null,
        client_type: payload.clientType ?? "company",
        parent_id: payload.parentId ?? null,
        status: "active",
        is_active: true,
        updated_at: now,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/brands");
    return { success: true, id: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** company 타입 브랜드만 조회 (하위 업체 생성 시 부모 선택용) */
export async function getCompanyBrands(): Promise<Array<{ id: string; name: string }>> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("clients")
      .select("id, name")
      .eq("client_type", "company")
      .eq("is_active", true)
      .order("name");
    return (data ?? []).map((r: { id: string; name: string }) => ({ id: r.id, name: r.name }));
  } catch {
    return [];
  }
}

/** 기본 워크스페이스 ID 조회 */
export async function getDefaultWorkspaceId(): Promise<string | null> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("workspaces")
      .select("id")
      .limit(1)
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

// ── 네이버 광고 API 키 관리 ──────────────────────────────────────────────────

export interface ClientNaverApiKeys {
  naver_ad_api_key: string | null;
  naver_ad_secret_key: string | null;
  naver_ad_customer_id: string | null;
}

export async function getClientApiKeys(clientId: string): Promise<ClientNaverApiKeys> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("clients")
      .select("naver_ad_api_key, naver_ad_secret_key, naver_ad_customer_id")
      .eq("id", clientId)
      .single();
    return {
      naver_ad_api_key: data?.naver_ad_api_key ?? null,
      naver_ad_secret_key: data?.naver_ad_secret_key ?? null,
      naver_ad_customer_id: data?.naver_ad_customer_id ?? null,
    };
  } catch {
    return { naver_ad_api_key: null, naver_ad_secret_key: null, naver_ad_customer_id: null };
  }
}

export async function updateClientApiKeys(
  clientId: string,
  keys: Partial<ClientNaverApiKeys>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("clients")
      .update({ ...keys, updated_at: new Date().toISOString() })
      .eq("id", clientId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/brands");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── 브랜드 스타일 가이드 + 기본 소스 ────────────────────────────────────────

export interface BrandStyleGuide {
  tone?: string;
  closing_text?: string;
  cta_text?: string;
  writing_rules?: string[];
  [key: string]: unknown;
}

export async function getBrandPersonaSettings(clientId: string): Promise<{
  default_source_ids: string[];
  content_style_guide: BrandStyleGuide;
} | null> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("brand_personas")
      .select("default_source_ids, content_style_guide")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .maybeSingle();
    if (!data) return null;
    return {
      default_source_ids: data.default_source_ids ?? [],
      content_style_guide: data.content_style_guide ?? {},
    };
  } catch {
    return null;
  }
}

export async function updateBrandPersonaSettings(
  clientId: string,
  payload: { default_source_ids?: string[]; content_style_guide?: BrandStyleGuide },
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = { updated_at: new Date().toISOString() };
    if (payload.default_source_ids !== undefined) update.default_source_ids = payload.default_source_ids;
    if (payload.content_style_guide !== undefined) update.content_style_guide = payload.content_style_guide;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("brand_personas")
      .update(update)
      .eq("client_id", clientId)
      .eq("is_active", true);

    if (error) return { success: false, error: error.message };
    revalidatePath("/brands");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** 글로벌 브랜드 필터 쿠키 읽기 */
export async function getSelectedClientId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("selected_client")?.value ?? null;
}

/** 글로벌 브랜드 필터 쿠키 저장 */
export async function setSelectedClient(clientId: string | null) {
  const cookieStore = await cookies();
  if (clientId && clientId !== "all") {
    cookieStore.set("selected_client", clientId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    cookieStore.delete("selected_client");
  }
  revalidatePath("/", "layout");
}

/** CMO 에이전트로 캠페인 기획 Job 삽입 */
export async function triggerCampaign(payload: {
  clientId: string;
  keyword: string;
  subKeyword?: string;
  styleRefIds?: string[];
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const db = createAdminClient();
  try {
    const { data: job, error } = await db
      .from("jobs")
      .insert({
        assigned_agent: "CMO",
        job_type: "CAMPAIGN_PLAN",
        status: "PENDING",
        title: `[캠페인 기획] ${payload.keyword}`,
        client_id: payload.clientId,
        trigger_type: "USER",
        triggered_by: "SYSTEM",
        priority: "medium",
        input_payload: {
          keyword: payload.keyword,
          sub_keyword: payload.subKeyword ?? "",
          style_ref_ids: payload.styleRefIds ?? [],
        },
        retry_count: 0,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { success: true, jobId: job.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

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
