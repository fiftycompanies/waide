"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import type { Review } from "@/data/config";

export default function Reviews({ reviews }: { reviews: Review[] }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [currentIndex, setCurrentIndex] = useState(0);

  if (reviews.length === 0) return null;

  const current = reviews[currentIndex];

  const prev = () => setCurrentIndex((i) => (i === 0 ? reviews.length - 1 : i - 1));
  const next = () => setCurrentIndex((i) => (i === reviews.length - 1 ? 0 : i + 1));

  return (
    <section id="reviews" className="section-padding">
      <div className="container-narrow" ref={ref}>
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
            고객 후기
          </h2>
          <p className="text-text-secondary mt-3">소중한 고객님들의 이야기</p>
        </motion.div>

        {/* Large quote carousel - one at a time */}
        <div className="relative max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
              className="text-center p-8 md:p-12 rounded-3xl bg-surface border border-border-light"
            >
              {/* Large quotation mark */}
              <div className="text-6xl text-primary/20 leading-none mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                &ldquo;
              </div>
              <p className="text-lg md:text-xl text-text-secondary leading-relaxed mb-6" style={{ fontFamily: "var(--font-heading)" }}>
                {current.content}
              </p>
              <div className="flex gap-0.5 justify-center mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`h-4 w-4 ${
                      j < current.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="font-semibold">{current.customer_name}</p>
              {current.project_type && (
                <p className="text-sm text-text-muted mt-1">{current.project_type}</p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          {reviews.length > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={prev}
                className="w-10 h-10 rounded-2xl border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                aria-label="이전 후기"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-text-muted">
                {currentIndex + 1} / {reviews.length}
              </span>
              <button
                onClick={next}
                className="w-10 h-10 rounded-2xl border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                aria-label="다음 후기"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
