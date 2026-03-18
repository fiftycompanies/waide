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
    <section id="reviews" className="section-padding bg-bg-soft">
      <div className="container-narrow" ref={ref}>
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
            REVIEWS
          </h2>
        </motion.div>

        {/* Premium review display - one at a time */}
        <div className="relative max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6 }}
              className="text-center py-12"
            >
              {/* Stars */}
              <div className="flex gap-1 justify-center mb-8">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`h-4 w-4 ${
                      j < current.rating ? "fill-primary text-primary" : "text-border"
                    }`}
                  />
                ))}
              </div>

              {/* Large quote */}
              <p
                className="text-xl md:text-2xl text-text leading-relaxed mb-8 italic"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                &ldquo;{current.content}&rdquo;
              </p>

              <div className="w-8 h-px bg-primary mx-auto mb-4" />

              <p className="text-sm font-medium text-text tracking-wider">{current.customer_name}</p>
              {current.project_type && (
                <p className="text-xs text-text-muted mt-1 tracking-wide">{current.project_type}</p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {reviews.length > 1 && (
            <div className="flex items-center justify-center gap-6 mt-4">
              <button
                onClick={prev}
                className="w-10 h-10 border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors duration-300"
                aria-label="이전 후기"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-text-muted tracking-widest">
                {String(currentIndex + 1).padStart(2, "0")} / {String(reviews.length).padStart(2, "0")}
              </span>
              <button
                onClick={next}
                className="w-10 h-10 border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors duration-300"
                aria-label="다음 후기"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
