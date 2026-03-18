"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Portfolio } from "@/data/config";

export default function Hero({
  tagline,
  description,
  portfolios,
}: {
  tagline: string;
  description: string;
  portfolios: Portfolio[];
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const heroImage =
    portfolios.find((p) => p.is_featured)?.image_urls[0] ||
    portfolios[0]?.image_urls[0];

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Parallax Background */}
      {heroImage ? (
        <motion.div className="absolute inset-0" style={{ y }}>
          <img
            src={heroImage}
            alt="인테리어 시공 사례"
            className="w-full h-[120%] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2C2417]/50 via-[#2C2417]/30 to-[#FEFCF9]" />
        </motion.div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-bg-muted to-bg" />
      )}

      <motion.div
        className="container-wide relative z-10 pt-32 pb-20"
        style={{ opacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-2xl"
        >
          {/* 작은 장식선 */}
          <div className="w-12 h-0.5 bg-accent mb-6" />

          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 ${
              heroImage ? "text-white" : "text-text"
            }`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {tagline}
          </h1>
          <p
            className={`text-lg md:text-xl mb-10 leading-relaxed ${
              heroImage ? "text-white/80" : "text-text-secondary"
            }`}
          >
            {description}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="#contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-3xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
            >
              무료 상담 받기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#portfolio"
              className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-3xl border font-medium transition-colors ${
                heroImage
                  ? "border-white/30 text-white hover:bg-white/10"
                  : "border-border text-text hover:bg-bg-muted"
              }`}
            >
              시공사례 보기
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
