"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import { reviews } from "@/data/wallpaper-master";

export default function ReviewCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 360;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 350);
  };

  return (
    <section id="reviews" className="bg-wallpaper-light py-[90px] md:py-[120px]">
      <div className="mx-auto max-w-[1260px] px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <h2 className="mb-3 text-[28px] font-bold text-wallpaper-heading">
            고객 후기
          </h2>
          <p className="text-sm text-wallpaper-text">
            벽지마스터를 이용해주신 고객님들의 후기입니다.
          </p>
        </motion.div>

        {/* Carousel area */}
        <div className="relative">
          {/* Left arrow */}
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="absolute -left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-wallpaper-border bg-white shadow-md transition-colors hover:bg-wallpaper-blue hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-current md:flex"
            aria-label="이전 후기"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Right arrow */}
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="absolute -right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-wallpaper-border bg-white shadow-md transition-colors hover:bg-wallpaper-blue hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-current md:flex"
            aria-label="다음 후기"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Review cards */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="w-[300px] flex-shrink-0 snap-start md:w-[350px]"
              >
                <div
                  className="h-full rounded-[10px] bg-white p-6"
                  style={{ boxShadow: "2px 2px 5px rgba(0,0,0,0.2)" }}
                >
                  {/* Star rating */}
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={`h-5 w-5 ${
                          j < review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Review text */}
                  <p className="mb-5 text-sm leading-relaxed text-wallpaper-text line-clamp-4">
                    {review.content}
                  </p>

                  {/* Author info */}
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold text-wallpaper-heading">
                      {review.name}
                    </p>
                    <p className="mt-0.5 text-xs text-wallpaper-text">
                      {review.area} &middot; {review.date}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mobile scroll indicator */}
          <div className="mt-4 flex justify-center gap-1 md:hidden">
            {reviews.map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-wallpaper-blue/30"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
