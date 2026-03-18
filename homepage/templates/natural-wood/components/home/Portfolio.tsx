"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import type { Portfolio as PortfolioType } from "@/data/config";

const FILTER_OPTIONS = ["전체", "거실", "주방", "욕실", "침실", "전체 리모델링"];

export default function Portfolio({ portfolios }: { portfolios: PortfolioType[] }) {
  const [filter, setFilter] = useState("전체");
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const filtered = filter === "전체"
    ? portfolios
    : portfolios.filter((p) => p.space_type === filter);

  return (
    <section id="portfolio" className="section-padding">
      <div className="container-wide" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <div className="w-8 h-0.5 bg-accent mx-auto mb-4" />
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            시공 사례
          </h2>
          <p className="text-text-secondary mt-3 max-w-lg mx-auto">
            정성을 담아 완성한 공간을 둘러보세요
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-5 py-2.5 rounded-3xl text-sm font-medium transition-colors ${
                filter === opt
                  ? "bg-primary text-white"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-soft"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* 2-column masonry-style grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <Link
                  href={item.slug ? `/portfolio/${item.slug}` : "#"}
                  className="group block rounded-3xl overflow-hidden border border-border-light hover:shadow-xl transition-shadow bg-surface"
                >
                  {item.image_urls[0] ? (
                    <div className={`relative overflow-hidden ${i % 3 === 0 ? "aspect-[3/4]" : "aspect-[4/3]"}`}>
                      <img
                        src={item.image_urls[0]}
                        alt={item.title || "시공 사례"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      {item.is_featured && (
                        <span className="absolute top-4 left-4 px-3 py-1 bg-accent text-white text-xs font-medium rounded-2xl">
                          BEST
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-bg-muted flex items-center justify-center text-text-muted">
                      사진 준비중
                    </div>
                  )}
                  <div className="p-5">
                    <h3
                      className="font-semibold text-lg group-hover:text-primary transition-colors"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {item.title || "시공 사례"}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                      {item.space_type && <span className="px-2 py-0.5 rounded-full bg-bg-muted">{item.space_type}</span>}
                      {item.area_pyeong && <span className="px-2 py-0.5 rounded-full bg-bg-muted">{item.area_pyeong}평</span>}
                      {item.style && <span className="px-2 py-0.5 rounded-full bg-bg-muted">{item.style}</span>}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-text-muted py-12">
            해당 카테고리의 시공 사례가 없습니다
          </p>
        )}
      </div>
    </section>
  );
}
