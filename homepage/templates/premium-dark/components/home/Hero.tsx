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
  const heroImage =
    portfolios.find((p) => p.is_featured)?.image_urls[0] ||
    portfolios[0]?.image_urls[0];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background with cinematic overlay */}
      {heroImage ? (
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="프리미엄 인테리어"
            className="w-full h-full object-cover"
          />
          <div className="cinematic-overlay absolute inset-0" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-bg">
          {/* Animated particles placeholder */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-0.5 bg-primary/30 rounded-full"
                initial={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  opacity: 0,
                }}
                animate={{
                  y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: 4 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="container-wide relative z-10 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="max-w-3xl"
        >
          {/* Gold accent line */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 60 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="h-px bg-primary mb-8"
          />

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8 text-text"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {tagline}
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg md:text-xl text-text-secondary mb-12 leading-relaxed max-w-xl"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <Link
              href="#contact"
              className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-bg text-sm font-medium tracking-wider hover:bg-primary-light transition-colors duration-300"
            >
              CONSULTATION
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#portfolio"
              className="inline-flex items-center gap-3 px-8 py-4 border border-text-muted text-text-secondary text-sm font-medium tracking-wider hover:border-primary hover:text-primary transition-all duration-300"
            >
              VIEW PORTFOLIO
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg to-transparent" />
    </section>
  );
}
