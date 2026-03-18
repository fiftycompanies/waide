"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { heroSlides } from "@/data/wallpaper-master";

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current]
  );

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % heroSlides.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = heroSlides[current];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
      {/* Slides */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            unoptimized
            priority={current === 0}
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>
      </AnimatePresence>

      {/* Center text */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h1
              className="mb-2 text-3xl font-bold text-white md:text-5xl"
              style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.5)" }}
            >
              {slide.title}
            </h1>
            <p
              className="mb-3 text-2xl font-bold text-white md:text-4xl"
              style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.5)" }}
            >
              {slide.subtitle}
            </p>
            <p
              className="mb-8 text-sm text-white/90 md:text-base"
              style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.5)" }}
            >
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
        <a
          href="#estimate"
          className="inline-flex h-12 items-center rounded-[30px] bg-wallpaper-blue px-8 text-sm font-semibold text-white transition-colors hover:bg-wallpaper-blue-dark md:h-[58px] md:px-10 md:text-base"
        >
          견적알아보기
        </a>
      </div>

      {/* Left arrow */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 z-20 flex h-[50px] w-[50px] -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-wallpaper-dark shadow-md transition-colors hover:bg-white md:left-8"
        aria-label="이전 슬라이드"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {/* Right arrow */}
      <button
        onClick={next}
        className="absolute right-4 top-1/2 z-20 flex h-[50px] w-[50px] -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-wallpaper-dark shadow-md transition-colors hover:bg-white md:right-8"
        aria-label="다음 슬라이드"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Pagination dots */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2.5">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-3 w-3 rounded-full transition-all ${
              i === current
                ? "bg-wallpaper-blue scale-110"
                : "bg-white/70 hover:bg-white"
            }`}
            aria-label={`슬라이드 ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
