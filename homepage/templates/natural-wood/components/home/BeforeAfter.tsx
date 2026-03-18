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
          className="text-center mb-12"
        >
          <div className="w-8 h-0.5 bg-accent mx-auto mb-4" />
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            시공 전후 비교
          </h2>
          <p className="text-text-secondary mt-3">
            드래그하여 변화를 직접 확인해보세요
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
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
                className={`px-4 py-2 rounded-3xl text-sm font-medium transition-colors ${
                  activeIndex === i
                    ? "bg-primary text-white"
                    : "bg-bg-muted text-text-secondary hover:bg-bg"
                }`}
              >
                {item.title || `사례 ${i + 1}`}
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
      className="relative aspect-[16/9] max-w-4xl mx-auto rounded-3xl overflow-hidden cursor-col-resize select-none touch-none"
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

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-primary">
            <path d="M6 10L2 10M2 10L5 7M2 10L5 13M14 10L18 10M18 10L15 7M18 10L15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="absolute top-4 left-4 z-20">
        <span className="px-3 py-1.5 rounded-2xl bg-[#2C2417]/50 text-white text-xs font-medium backdrop-blur-sm">BEFORE</span>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <span className="px-3 py-1.5 rounded-2xl bg-accent/80 text-white text-xs font-medium backdrop-blur-sm">AFTER</span>
      </div>
    </div>
  );
}
