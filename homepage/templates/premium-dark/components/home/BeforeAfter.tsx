"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import type { Portfolio } from "@/data/config";

export default function BeforeAfter({ portfolios }: { portfolios: Portfolio[] }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const items = portfolios.filter((p) => p.before_image_url && p.after_image_url);
  const [activeIndex, setActiveIndex] = useState(0);

  if (items.length === 0) return null;

  const current = items[activeIndex];

  return (
    <section className="section-padding bg-bg-soft">
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
            BEFORE &amp; AFTER
          </h2>
          <p className="text-text-secondary mt-4 text-sm tracking-wide">
            드래그하여 시공 전후를 비교해보세요
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
        >
          <Slider
            beforeImage={current.before_image_url!}
            afterImage={current.after_image_url!}
            title={current.title || "시공 사례"}
          />
        </motion.div>

        {items.length > 1 && (
          <div className="flex justify-center gap-3 mt-8">
            {items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setActiveIndex(i)}
                className={`px-4 py-2 text-xs font-medium tracking-wider transition-all duration-300 ${
                  activeIndex === i
                    ? "border border-primary text-primary bg-primary/10"
                    : "border border-border text-text-muted hover:border-text-muted"
                }`}
              >
                {item.title || `CASE ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Slider({
  beforeImage,
  afterImage,
  title,
}: {
  beforeImage: string;
  afterImage: string;
  title: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 2));
    else if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 2));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/9] max-w-5xl mx-auto overflow-hidden cursor-col-resize select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label={`${title} 시공 전후 비교`}
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <img
        src={afterImage}
        alt={`${title} 시공 후`}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={beforeImage}
          alt={`${title} 시공 전`}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100vw" }}
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-px bg-primary z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-primary bg-bg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-primary">
            <path d="M6 10L2 10M2 10L5 7M2 10L5 13M14 10L18 10M18 10L15 7M18 10L15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="absolute top-4 left-4 z-20">
        <span className="px-3 py-1 bg-bg/70 text-text-muted text-[10px] font-medium tracking-widest backdrop-blur-sm">BEFORE</span>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <span className="px-3 py-1 bg-primary/80 text-bg text-[10px] font-medium tracking-widest backdrop-blur-sm">AFTER</span>
      </div>
    </div>
  );
}
