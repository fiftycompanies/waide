"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/data/config";

export default function Blog({ posts }: { posts: BlogPost[] }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  if (posts.length === 0) return null;

  const displayPosts = posts.slice(0, 3);

  return (
    <section className="section-padding">
      <div className="container-wide" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-primary mb-2">BLOG</p>
          <h2 className="text-3xl md:text-4xl font-bold">인테리어 블로그</h2>
          <p className="text-text-secondary mt-3">
            인테리어 트렌드와 유용한 정보를 확인하세요
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayPosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={`/blog/${post.slug || post.id}`}
                className="group block rounded-xl overflow-hidden border border-border-light hover:shadow-md transition-shadow h-full"
              >
                {/* 썸네일 그라데이션 */}
                <div className="relative h-40 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      post.content_type === "hp_blog_info"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {post.content_type === "hp_blog_info" ? "정보" : "후기"}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                  {post.meta_description && (
                    <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                      {post.meta_description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {post.published_at && (
                      <p className="text-xs text-text-muted">
                        {new Date(post.published_at).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                    <span className="text-xs font-medium text-primary flex items-center gap-1">
                      읽기
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {posts.length > 3 && (
          <div className="text-center mt-10">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-sm font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors"
            >
              블로그 더 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
