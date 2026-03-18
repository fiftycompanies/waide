"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { aboutText, qualityImages } from "@/data/designlab";

export default function AboutSection() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!sliderRef.current || !isDragging.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handleMove(e.clientX);
    },
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleMove(e.touches[0].clientX);
    },
    [handleMove]
  );

  return (
    <section id="about" className="bg-black py-20 xl:py-32">
      <div className="px-4 xl:px-[5.6rem] max-w-[176rem] mx-auto">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-white/60 text-[1.2rem] font-normal mb-6"
        >
          About designlab
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-designlab-text text-[1.3rem] font-normal leading-relaxed max-w-[72rem] mb-16 xl:mb-24"
        >
          {aboutText}
        </motion.p>

        {/* Before / After Slider */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <div
            ref={sliderRef}
            className="relative aspect-[16/9] xl:aspect-[21/9] w-full overflow-hidden cursor-ew-resize select-none"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            onTouchMove={handleTouchMove}
          >
            {/* After Image (full width, underneath) */}
            <div className="absolute inset-0">
              <Image
                src={qualityImages.after}
                alt="After"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute bottom-4 right-4 text-white/60 text-[1.1rem] font-normal tracking-wider">
                AFTER
              </div>
            </div>

            {/* Before Image (clipped by slider) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qualityImages.before}
                alt="Before"
                className="absolute inset-0 w-auto h-full object-cover"
                style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: "none" }}
              />
              <div className="absolute bottom-4 left-4 text-white/60 text-[1.1rem] font-normal tracking-wider">
                BEFORE
              </div>
            </div>

            {/* Slider Divider */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white/80 z-10"
              style={{ left: `${sliderPosition}%` }}
            >
              {/* Slider Handle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border-2 border-white flex items-center justify-center shadow-lg">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-black"
                >
                  <path
                    d="M5 3L2 8L5 13M11 3L14 8L11 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <p className="text-designlab-gray text-[1.1rem] font-normal text-center mt-4">
            아이콘을 왼쪽으로 움직여보세요
          </p>
        </motion.div>

        {/* Divider */}
        <div className="border-t border-white/10 my-16 xl:my-24" />

        {/* Introduction Video */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal"
        >
          INTRODUCTION VIDEO
        </motion.h2>
      </div>
    </section>
  );
}
