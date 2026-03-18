"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Star, Quote } from "lucide-react";
import type { Review } from "@/data/config";

export default function Reviews({ reviews }: { reviews: Review[] }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  if (reviews.length === 0) return null;

  return (
    <section id="reviews" className="section-padding bg-bg-soft">
      <div className="container-wide" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-primary mb-2">REVIEWS</p>
          <h2 className="text-3xl md:text-4xl font-bold">고객 후기</h2>
          <p className="text-text-secondary mt-3">실제 고객님들의 생생한 후기를 확인해보세요</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.slice(0, 6).map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-xl bg-white border border-border-light"
            >
              <Quote className="h-6 w-6 text-primary/20 mb-3" />
              <p className="text-sm text-text-secondary mb-4 line-clamp-4">{review.content}</p>
              <div className="flex items-center justify-between pt-3 border-t">
                <div>
                  <p className="font-medium text-sm">{review.customer_name}</p>
                  {review.project_type && (
                    <p className="text-xs text-text-muted">{review.project_type}</p>
                  )}
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className={`h-3.5 w-3.5 ${
                        j < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
