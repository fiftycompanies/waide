"use client";

import { motion } from "framer-motion";
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
  const heroImage = portfolios.find((p) => p.is_featured)?.image_urls[0]
    || portfolios[0]?.image_urls[0];

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      {heroImage ? (
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="인테리어 시공 사례"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-bg-muted to-bg" />
      )}

      <div className="container-wide relative z-10 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 ${
              heroImage ? "text-white" : "text-text"
            }`}
          >
            {tagline}
          </h1>
          <p
            className={`text-lg md:text-xl mb-8 ${
              heroImage ? "text-white/80" : "text-text-secondary"
            }`}
          >
            {description}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="#contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
            >
              무료 상담 받기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#portfolio"
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg border font-medium transition-colors ${
                heroImage
                  ? "border-white/30 text-white hover:bg-white/10"
                  : "border-border text-text hover:bg-bg-muted"
              }`}
            >
              시공사례 보기
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
