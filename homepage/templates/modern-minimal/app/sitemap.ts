import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const PROJECT_ID = process.env.HOMEPAGE_PROJECT_ID!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.waide.kr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  // 포트폴리오
  const { data: portfolios } = await supabase
    .from("homepage_portfolios")
    .select("slug, id, created_at")
    .eq("project_id", PROJECT_ID);

  for (const p of portfolios || []) {
    entries.push({
      url: `${SITE_URL}/portfolio/${p.slug || p.id}`,
      lastModified: new Date(p.created_at),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // 블로그
  const { data: project } = await supabase
    .from("homepage_projects")
    .select("client_id")
    .eq("id", PROJECT_ID)
    .single();

  if (project?.client_id) {
    const { data: posts } = await supabase
      .from("contents")
      .select("slug, id, published_at")
      .eq("client_id", project.client_id)
      .in("content_type", ["hp_blog_info", "hp_blog_review"])
      .eq("publish_status", "published");

    for (const post of posts || []) {
      entries.push({
        url: `${SITE_URL}/blog/${post.slug || post.id}`,
        lastModified: post.published_at ? new Date(post.published_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
