import Link from "next/link";
import { getHomepageConfig } from "@/data/config";
import { BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getHomepageConfig();
  return {
    title: `블로그 | ${config.company.name}`,
    description: `${config.company.name}의 인테리어 정보, 시공 후기, 트렌드 블로그`,
  };
}

export default async function BlogPage() {
  const config = await getHomepageConfig();
  const { blogPosts, company } = config;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <div className="pt-24 pb-16">
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: baseUrl },
          { name: "블로그", url: `${baseUrl}/blog` },
        ]}
      />
      <div className="container-wide">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary mb-2">BLOG</p>
          <h1 className="text-3xl md:text-4xl font-bold">블로그</h1>
          <p className="text-text-secondary mt-3">인테리어 정보와 시공 후기를 확인해보세요</p>
        </div>

        {blogPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug || post.id}`}
                className="group border border-border-light rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium mb-3 ${
                    post.content_type === "hp_blog_info"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {post.content_type === "hp_blog_info" ? "정보" : "후기"}
                  </span>
                  <h2 className="font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h2>
                  {post.meta_description && (
                    <p className="text-sm text-text-secondary line-clamp-2">{post.meta_description}</p>
                  )}
                  {post.published_at && (
                    <p className="text-xs text-text-muted mt-3">
                      {new Date(post.published_at).toLocaleDateString("ko-KR")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-text-muted">
            <p>아직 블로그 글이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
