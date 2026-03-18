import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getHomepageConfig } from "@/data/config";
import { BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getHomepageConfig();
  return {
    title: `Journal | ${config.company.name}`,
    description: `${config.company.name}의 프리미엄 인테리어 인사이트, 시공 사례, 트렌드`,
  };
}

export default async function BlogPage() {
  const config = await getHomepageConfig();
  const { blogPosts } = config;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <div className="pt-28 pb-20">
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: baseUrl },
          { name: "Journal", url: `${baseUrl}/blog` },
        ]}
      />
      <div className="container-wide">
        <div className="text-center mb-16">
          <div className="w-10 h-px bg-primary mx-auto mb-6" />
          <h1
            className="text-3xl md:text-5xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            JOURNAL
          </h1>
          <p className="text-text-secondary mt-4 text-sm tracking-wide">
            인테리어 인사이트와 시공 사례
          </p>
        </div>

        {blogPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {blogPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug || post.id}`}
                className="group bg-bg-muted hover:bg-surface-light transition-colors duration-500"
              >
                <div className="relative h-40 bg-gradient-to-br from-primary/5 via-bg-muted to-secondary/5 flex items-center justify-center">
                  <span
                    className={`px-3 py-1 text-[10px] font-medium tracking-widest ${
                      post.content_type === "hp_blog_info"
                        ? "border border-primary/30 text-primary"
                        : "border border-secondary/30 text-secondary"
                    }`}
                  >
                    {post.content_type === "hp_blog_info" ? "INSIGHT" : "REVIEW"}
                  </span>
                </div>
                <div className="p-6">
                  <h2
                    className="font-semibold text-text group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-2"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {post.title}
                  </h2>
                  {post.meta_description && (
                    <p className="text-sm text-text-muted line-clamp-2 mb-3">{post.meta_description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    {post.published_at && (
                      <p className="text-xs text-text-muted">
                        {new Date(post.published_at).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                    <span className="text-xs text-primary flex items-center gap-1 tracking-wider">
                      READ <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-text-muted text-sm">
            <p>아직 게시된 글이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
