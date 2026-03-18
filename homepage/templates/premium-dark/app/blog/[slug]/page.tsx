import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { BreadcrumbJsonLd, JsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function getPost(slug: string) {
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
    <article className="pt-28 pb-20">
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: baseUrl },
          { name: "Journal", url: `${baseUrl}/blog` },
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
        <div className="mb-10">
          <span
            className={`inline-block px-3 py-1 text-[10px] font-medium tracking-widest mb-6 ${
              post.content_type === "hp_blog_info"
                ? "border border-primary/30 text-primary"
                : "border border-secondary/30 text-secondary"
            }`}
          >
            {post.content_type === "hp_blog_info" ? "INSIGHT" : "REVIEW"}
          </span>
          <h1
            className="text-3xl md:text-4xl font-bold leading-tight tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {post.title}
          </h1>
          {post.published_at && (
            <p className="text-xs text-text-muted mt-4 tracking-wider">
              {new Date(post.published_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          <div className="w-10 h-px bg-primary mt-6" />
        </div>

        <div
          className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-wide prose-a:text-primary prose-p:text-text-secondary prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.body || "" }}
        />
      </div>
    </article>
  );
}
