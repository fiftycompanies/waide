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
          className="text-center mb-16"
        >
          <div className="w-10 h-px bg-primary mx-auto mb-6" />
          <h2
            className="text-3xl md:text-5xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            JOURNAL
          </h2>
          <p className="text-text-secondary mt-4 text-sm tracking-wide">
            인테리어 인사이트와 트렌드
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {displayPosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6 }}
            >
              <Link
                href={`/blog/${post.slug || post.id}`}
                className="group block bg-bg-muted hover:bg-surface-light transition-colors duration-500 h-full"
              >
                <div className="relative h-48 bg-gradient-to-br from-primary/5 via-bg-muted to-secondary/5 flex items-center justify-center">
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
                  <h3
                    className="font-semibold text-lg text-text group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-3"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {post.title}
                  </h3>
                  {post.meta_description && (
                    <p className="text-sm text-text-muted line-clamp-2 mb-4 leading-relaxed">
                      {post.meta_description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {post.published_at && (
                      <p className="text-xs text-text-muted">
                        {new Date(post.published_at).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                    <span className="text-xs font-medium text-primary flex items-center gap-1 tracking-wider">
                      READ <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {posts.length > 3 && (
          <div className="text-center mt-12">
            <Link
              href="/blog"
              className="inline-flex items-center gap-3 px-6 py-3 border border-border text-xs font-medium tracking-widest text-text-muted hover:border-primary hover:text-primary transition-all duration-300"
            >
              VIEW ALL <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
