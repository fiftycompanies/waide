"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────────────────

export type HomepageProjectStatus = "collecting" | "building" | "preview" | "live" | "suspended";

export interface HomepageProject {
  id: string;
  client_id: string;
  project_name: string;
  template_id: string;
  status: HomepageProjectStatus;
  subdomain: string | null;
  custom_domain: string | null;
  vercel_project_id: string | null;
  vercel_deployment_url: string | null;
  theme_config: Record<string, unknown>;
  seo_config: Record<string, unknown>;
  blog_config: Record<string, unknown>;
  total_visits: number;
  total_inquiries: number;
  last_deployed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  client_name?: string;
}

export interface HomepageMaterial {
  id: string;
  project_id: string;
  company_name: string;
  owner_name: string;
  phone: string;
  address: string;
  address_lat: number | null;
  address_lng: number | null;
  description: string;
  kakao_link: string | null;
  service_regions: string[];
  service_types: string[];
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  instagram_url: string | null;
  youtube_url: string | null;
  naver_place_url: string | null;
  naver_blog_url: string | null;
  certifications: string[] | null;
  operating_hours: string | null;
  business_number: string | null;
  faq_items: { q: string; a: string }[];
  is_complete: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomepagePortfolio {
  id: string;
  project_id: string;
  title: string | null;
  slug: string | null;
  space_type: string | null;
  style: string | null;
  area_pyeong: number | null;
  budget_range: string | null;
  description: string | null;
  image_urls: string[];
  before_image_url: string | null;
  after_image_url: string | null;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
}

export interface HomepageReview {
  id: string;
  project_id: string;
  customer_name: string;
  rating: number;
  content: string;
  project_type: string | null;
  source: string;
  created_at: string;
}

export type InquiryStatus = "new" | "contacted" | "consulting" | "contracted" | "lost";

export interface HomepageInquiry {
  id: string;
  project_id: string;
  client_id: string | null;
  name: string;
  phone: string;
  area_pyeong: number | null;
  space_type: string | null;
  budget_range: string | null;
  message: string | null;
  status: InquiryStatus;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Homepage Projects CRUD ─────────────────────────────────────────────────

export async function getHomepageProjects(clientId?: string | null): Promise<HomepageProject[]> {
  const db = createAdminClient();

  let query = db
    .from("homepage_projects")
    .select("*, clients(name)")
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[homepage-actions] getHomepageProjects error:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((p: any) => ({
    ...p,
    client_name: p.clients?.name ?? null,
    clients: undefined,
  }));
}

export async function getHomepageProject(projectId: string): Promise<HomepageProject | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("homepage_projects")
    .select("*, clients(name)")
    .eq("id", projectId)
    .single();

  if (error || !data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = data as any;
  return { ...p, client_name: p.clients?.name ?? null, clients: undefined };
}

export async function createHomepageProject(payload: {
  clientId: string;
  projectName: string;
  templateId?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("homepage_projects")
    .insert({
      client_id: payload.clientId,
      project_name: payload.projectName,
      template_id: payload.templateId || "modern-minimal",
      status: "collecting",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/homepage");
  return { success: true, id: data.id };
}

export async function updateHomepageProject(
  projectId: string,
  updates: Partial<{
    project_name: string;
    template_id: string;
    status: HomepageProjectStatus;
    subdomain: string;
    custom_domain: string;
    vercel_project_id: string;
    vercel_deployment_url: string;
    theme_config: Record<string, unknown>;
    seo_config: Record<string, unknown>;
    blog_config: Record<string, unknown>;
    last_deployed_at: string;
  }>,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { error } = await db
    .from("homepage_projects")
    .update(updates)
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/homepage");
  revalidatePath(`/homepage/${projectId}`);
  return { success: true };
}

export async function deleteHomepageProject(
  projectId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { error } = await db
    .from("homepage_projects")
    .delete()
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/homepage");
  return { success: true };
}

// ── Homepage Materials CRUD ────────────────────────────────────────────────

export async function getHomepageMaterial(projectId: string): Promise<HomepageMaterial | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("homepage_materials")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[homepage-actions] getHomepageMaterial error:", error);
    return null;
  }

  return data as HomepageMaterial | null;
}

export async function upsertHomepageMaterial(
  projectId: string,
  payload: Omit<HomepageMaterial, "id" | "project_id" | "created_at" | "updated_at">,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  // Check existing
  const { data: existing } = await db
    .from("homepage_materials")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("homepage_materials")
      .update({ ...payload, project_id: projectId })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await db
      .from("homepage_materials")
      .insert({ ...payload, project_id: projectId });

    if (error) return { success: false, error: error.message };
  }

  revalidatePath(`/homepage/${projectId}`);
  return { success: true };
}

// ── Homepage Portfolios CRUD ───────────────────────────────────────────────

export async function getHomepagePortfolios(projectId: string): Promise<HomepagePortfolio[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("homepage_portfolios")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order");

  if (error) {
    console.error("[homepage-actions] getHomepagePortfolios error:", error);
    return [];
  }

  return (data ?? []) as HomepagePortfolio[];
}

export async function createHomepagePortfolio(
  projectId: string,
  payload: Omit<HomepagePortfolio, "id" | "project_id" | "created_at">,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("homepage_portfolios")
    .insert({ ...payload, project_id: projectId })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/homepage/${projectId}`);
  return { success: true, id: data.id };
}

export async function updateHomepagePortfolio(
  portfolioId: string,
  updates: Partial<Omit<HomepagePortfolio, "id" | "project_id" | "created_at">>,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { data: portfolio } = await db
    .from("homepage_portfolios")
    .select("project_id")
    .eq("id", portfolioId)
    .single();

  const { error } = await db
    .from("homepage_portfolios")
    .update(updates)
    .eq("id", portfolioId);

  if (error) return { success: false, error: error.message };

  if (portfolio) revalidatePath(`/homepage/${portfolio.project_id}`);
  return { success: true };
}

export async function deleteHomepagePortfolio(
  portfolioId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { data: portfolio } = await db
    .from("homepage_portfolios")
    .select("project_id")
    .eq("id", portfolioId)
    .single();

  const { error } = await db
    .from("homepage_portfolios")
    .delete()
    .eq("id", portfolioId);

  if (error) return { success: false, error: error.message };

  if (portfolio) revalidatePath(`/homepage/${portfolio.project_id}`);
  return { success: true };
}

// ── Homepage Reviews CRUD ──────────────────────────────────────────────────

export async function getHomepageReviews(projectId: string): Promise<HomepageReview[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("homepage_reviews")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[homepage-actions] getHomepageReviews error:", error);
    return [];
  }

  return (data ?? []) as HomepageReview[];
}

export async function createHomepageReview(
  projectId: string,
  payload: Omit<HomepageReview, "id" | "project_id" | "created_at">,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { error } = await db
    .from("homepage_reviews")
    .insert({ ...payload, project_id: projectId });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/homepage/${projectId}`);
  return { success: true };
}

export async function deleteHomepageReview(
  reviewId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { data: review } = await db
    .from("homepage_reviews")
    .select("project_id")
    .eq("id", reviewId)
    .single();

  const { error } = await db
    .from("homepage_reviews")
    .delete()
    .eq("id", reviewId);

  if (error) return { success: false, error: error.message };

  if (review) revalidatePath(`/homepage/${review.project_id}`);
  return { success: true };
}

// ── Homepage Inquiries CRUD ────────────────────────────────────────────────

export async function getHomepageInquiries(
  projectId: string,
  statusFilter?: InquiryStatus,
): Promise<HomepageInquiry[]> {
  const db = createAdminClient();

  let query = db
    .from("homepage_inquiries")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[homepage-actions] getHomepageInquiries error:", error);
    return [];
  }

  return (data ?? []) as HomepageInquiry[];
}

export async function createHomepageInquiry(
  payload: Omit<HomepageInquiry, "id" | "created_at" | "updated_at" | "status" | "assigned_to" | "notes">,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const { error } = await db
    .from("homepage_inquiries")
    .insert(payload);

  if (error) return { success: false, error: error.message };

  // 상담 수 카운트 증가
  await db.rpc("increment_inquiry_count", { p_project_id: payload.project_id }).catch(() => {
    // rpc 없으면 수동 업데이트
    db.from("homepage_projects")
      .update({ total_inquiries: db.rpc ? undefined : 0 })
      .eq("id", payload.project_id);
  });

  revalidatePath(`/homepage/${payload.project_id}`);
  return { success: true };
}

export async function updateInquiryStatus(
  inquiryId: string,
  status: InquiryStatus,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();

  const updatePayload: Record<string, unknown> = { status };
  if (notes !== undefined) updatePayload.notes = notes;

  const { error } = await db
    .from("homepage_inquiries")
    .update(updatePayload)
    .eq("id", inquiryId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

// ── Dashboard Stats ────────────────────────────────────────────────────────

export interface HomepageDashboardStats {
  total_projects: number;
  live_count: number;
  collecting_count: number;
  building_count: number;
  preview_count: number;
  total_inquiries: number;
  new_inquiries: number;
}

export async function getHomepageDashboardStats(): Promise<HomepageDashboardStats> {
  const db = createAdminClient();

  const { data: projects } = await db
    .from("homepage_projects")
    .select("status, total_inquiries");

  if (!projects) {
    return {
      total_projects: 0,
      live_count: 0,
      collecting_count: 0,
      building_count: 0,
      preview_count: 0,
      total_inquiries: 0,
      new_inquiries: 0,
    };
  }

  const { count: newInquiries } = await db
    .from("homepage_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  return {
    total_projects: projects.length,
    live_count: projects.filter((p) => p.status === "live").length,
    collecting_count: projects.filter((p) => p.status === "collecting").length,
    building_count: projects.filter((p) => p.status === "building").length,
    preview_count: projects.filter((p) => p.status === "preview").length,
    total_inquiries: projects.reduce((sum, p) => sum + (p.total_inquiries || 0), 0),
    new_inquiries: newInquiries || 0,
  };
}
