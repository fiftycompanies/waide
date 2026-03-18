"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as const },
  },
};

const stats = [
  "20+ 인테리어 업체 분석 완료",
  "올인원 홈페이지 + 브랜드 + 블로그",
  "2주 평균 제작 기간",
  "100% 모바일 반응형",
];

export default function Hero() {
  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0f1729] to-[#0c1220]" />

        {/* Abstract pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, #3B82F6 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, #10B981 0%, transparent 40%),
              radial-gradient(circle at 60% 80%, #3B82F6 0%, transparent 45%)
            `,
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating orbs */}
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -25, 0],
            y: [0, 25, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl"
        />
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center"
      >
        {/* Badge */}
        <motion.div variants={itemVariants}>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/80 text-sm font-medium backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            인테리어 업체 전용 홈페이지 서비스
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="mt-8 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-tight tracking-tight"
        >
          사장님 업체,
          <br />
          <span className="bg-gradient-to-r from-accent via-blue-400 to-secondary bg-clip-text text-transparent italic">
            검색하면 나오긴 하나요?
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed"
        >
          홈페이지 하나면 네이버·구글·AI 검색까지 전부 노출됩니다.
          <br className="hidden sm:block" />
          프리미엄 홈페이지 제작부터 브랜드 디자인까지.
        </motion.p>

        {/* Stat badges */}
        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          {stats.map((stat, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/70 text-sm font-medium backdrop-blur-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
              {stat}
            </span>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => handleScroll("#contact")}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-accent text-white font-semibold text-base hover:bg-accent-hover transition-all duration-200 shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
          >
            상담 신청 &rarr;
          </button>
          <button
            onClick={() => handleScroll("#service")}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-transparent text-white font-semibold text-base border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-200"
          >
            서비스 알아보기
          </button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.button
          onClick={() => handleScroll("#service")}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-white/30 hover:text-white/50 transition-colors"
          aria-label="스크롤 다운"
        >
          <span className="text-xs font-medium tracking-widest uppercase">
            Scroll
          </span>
          <ChevronDown size={20} />
        </motion.button>
      </motion.div>
    </section>
  );
}
