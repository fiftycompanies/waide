import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase: SupabaseClient | null = supabaseUrl
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const PROJECT_ID = process.env.HOMEPAGE_PROJECT_ID!;

// ── Types ──────────────────────────────────────────────────────────────────

export interface CompanyConfig {
  name: string;
  owner: string;
  phone: string;
  address: string;
  description: string;
  kakaoLink: string | null;
  logo: string | null;
  instagram: string | null;
  youtube: string | null;
  naverPlace: string | null;
  naverBlog: string | null;
  operatingHours: string | null;
  businessNumber: string | null;
}

export interface ThemeConfig {
  primary_color: string;
  secondary_color: string;
  font_heading: string;
  font_body: string;
  logo_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
}

export interface SeoConfig {
  meta_title_template: string;
  meta_description: string;
  keywords: string[];
  json_ld_local_business: Record<string, unknown>;
}

export interface Portfolio {
  id: string;
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
  is_featured: boolean;
}

export interface Review {
  id: string;
  customer_name: string;
  rating: number;
  content: string;
  project_type: string | null;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  content_type: string;
  published_at: string | null;
  meta_description: string | null;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface HomepageConfig {
  company: CompanyConfig;
  theme: ThemeConfig;
  seo: SeoConfig;
  persona: Record<string, unknown>;
  portfolios: Portfolio[];
  reviews: Review[];
  blogPosts: BlogPost[];
  faqItems: FaqItem[];
}

// ── Data Fetcher ───────────────────────────────────────────────────────────

export async function getHomepageConfig(): Promise<HomepageConfig> {
  if (!supabase) {
    return {
      company: { name: "인테리어", owner: "", phone: "", address: "", description: "", kakaoLink: null, logo: null, instagram: null, youtube: null, naverPlace: null, naverBlog: null, operatingHours: null, businessNumber: null },
      theme: { primary_color: "#2563eb", secondary_color: "#10b981", font_heading: "Pretendard", font_body: "Pretendard", logo_url: null, favicon_url: null, og_image_url: null },
      seo: { meta_title_template: "%s | 인테리어", meta_description: "", keywords: [], json_ld_local_business: {} },
      persona: {},
      portfolios: [],
      reviews: [],
      blogPosts: [],
      faqItems: [],
    };
  }

  const [projectRes, materialsRes, portfoliosRes, reviewsRes] = await Promise.all([
    supabase
      .from("homepage_projects")
      .select("*, client:clients(*)")
      .eq("id", PROJECT_ID)
      .single(),
    supabase
      .from("homepage_materials")
      .select("*")
      .eq("project_id", PROJECT_ID)
      .maybeSingle(),
    supabase
      .from("homepage_portfolios")
      .select("*")
      .eq("project_id", PROJECT_ID)
      .order("sort_order"),
    supabase
      .from("homepage_reviews")
      .select("*")
      .eq("project_id", PROJECT_ID)
      .order("created_at", { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = projectRes.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materials = materialsRes.data as any;
  const client = project?.client;

  const clientId = project?.client_id;
  const blogRes = clientId
    ? await supabase
        .from("contents")
        .select("id, title, slug, body, content_type, published_at, meta_description")
        .eq("client_id", clientId)
        .in("content_type", ["hp_blog_info", "hp_blog_review"])
        .eq("publish_status", "published")
        .order("published_at", { ascending: false })
    : { data: [] };

  const keywordsRes = clientId
    ? await supabase
        .from("keywords")
        .select("keyword")
        .eq("client_id", clientId)
        .eq("source", "homepage_seo")
    : { data: [] };

  const seoKeywords = (keywordsRes.data ?? []).map((k: { keyword: string }) => k.keyword);

  return {
    company: {
      name: materials?.company_name || client?.name || "인테리어",
      owner: materials?.owner_name || "",
      phone: materials?.phone || "",
      address: materials?.address || "",
      description: materials?.description || client?.brand_persona?.one_liner || "",
      kakaoLink: materials?.kakao_link || null,
      logo: materials?.logo_url || null,
      instagram: materials?.instagram_url || null,
      youtube: materials?.youtube_url || null,
      naverPlace: materials?.naver_place_url || null,
      naverBlog: materials?.naver_blog_url || null,
      operatingHours: materials?.operating_hours || null,
      businessNumber: materials?.business_number || null,
    },
    theme: {
      primary_color: materials?.primary_color || project?.theme_config?.primary_color || "#C9A96E",
      secondary_color: materials?.secondary_color || project?.theme_config?.secondary_color || "#8B7355",
      font_heading: project?.theme_config?.font_heading || "Playfair Display",
      font_body: project?.theme_config?.font_body || "Inter",
      logo_url: materials?.logo_url || project?.theme_config?.logo_url || null,
      favicon_url: project?.theme_config?.favicon_url || null,
      og_image_url: project?.theme_config?.og_image_url || null,
    },
    seo: {
      meta_title_template: project?.seo_config?.meta_title_template || `%s | ${materials?.company_name || "인테리어"}`,
      meta_description: project?.seo_config?.meta_description || materials?.description || "",
      keywords: seoKeywords,
      json_ld_local_business: project?.seo_config?.json_ld_local_business || {},
    },
    persona: client?.brand_persona || {},
    portfolios: (portfoliosRes.data ?? []) as Portfolio[],
    reviews: (reviewsRes.data ?? []) as Review[],
    blogPosts: (blogRes.data ?? []) as BlogPost[],
    faqItems: (materials?.faq_items as FaqItem[]) || [],
  };
}
