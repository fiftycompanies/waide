import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { BreadcrumbJsonLd, JsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

async function getPost(slug: string) {
  if (!supabase) return null;

  const { data } = await supabase
    .from("contents")
    .select("*")
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .in("content_type", ["hp_blog_info", "hp_blog_review"])
    .eq("publish_status", "published")
    .single();

  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not Found" };

  return {
    title: post.title,
    description: post.meta_description || post.title,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <article className="pt-24 pb-16">
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: baseUrl },
          { name: "블로그", url: `${baseUrl}/blog` },
          { name: post.title, url: `${baseUrl}/blog/${slug}` },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          datePublished: post.published_at || post.created_at,
          description: post.meta_description || "",
        }}
      />
      <div className="container-narrow">
        <div className="mb-8">
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-4 ${
            post.content_type === "hp_blog_info"
              ? "bg-blue-100 text-blue-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {post.content_type === "hp_blog_info" ? "정보" : "후기"}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">{post.title}</h1>
          {post.published_at && (
            <p className="text-sm text-text-muted mt-3">
              {new Date(post.published_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        <div
          className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: post.body || "" }}
        />
      </div>
    </article>
  );
}
