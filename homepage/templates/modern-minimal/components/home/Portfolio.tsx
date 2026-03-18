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
          <p className="text-sm font-medium text-primary mb-2">PORTFOLIO</p>
          <h2 className="text-3xl md:text-4xl font-bold">시공 사례</h2>
          <p className="text-text-secondary mt-3 max-w-lg mx-auto">
            고객의 공간을 새롭게 변화시킨 실제 시공 사례를 확인해보세요
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === opt
                  ? "bg-primary text-white"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-soft"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Link
                  href={item.slug ? `/portfolio/${item.slug}` : "#"}
                  className="group block rounded-xl overflow-hidden border border-border-light hover:shadow-lg transition-shadow"
                >
                  {item.image_urls[0] ? (
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={item.image_urls[0]}
                        alt={item.title || "시공 사례"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {item.is_featured && (
                        <span className="absolute top-3 left-3 px-2 py-1 bg-primary text-white text-xs font-medium rounded">
                          BEST
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-bg-muted flex items-center justify-center text-text-muted">
                      사진 준비중
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {item.title || "시공 사례"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                      {item.space_type && <span>{item.space_type}</span>}
                      {item.area_pyeong && <span>{item.area_pyeong}평</span>}
                      {item.style && <span>{item.style}</span>}
                    </div>
                    {item.budget_range && (
                      <p className="text-xs text-text-secondary mt-1">{item.budget_range}</p>
                    )}
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
