"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { heroImage } from "@/data/designlab";

export default function Hero() {
  return (
    <section className="relative min-h-dvh bg-black flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <Image
        src={heroImage}
        alt="프리미엄 인테리어"
        fill
        className="object-cover"
        priority
        unoptimized
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 xl:px-[5.6rem]">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-white/60 text-[1.2rem] tracking-[0.3em] uppercase mb-8 xl:mb-12 font-normal"
        >
          DESIGNLAB
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-white text-[2.2rem] xl:text-[3.6rem] font-normal leading-tight whitespace-pre-line"
        >
          {"공간은 생각과 행동\n삶을 변화시킵니다"}
        </motion.h1>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.0, ease: [0.25, 0.4, 0.25, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 xl:mt-14"
        >
          <a
            href="#contact"
            className="h-[4.4rem] px-8 bg-designlab-gray text-white text-[1.2rem] font-semibold rounded-[0.4rem] flex items-center justify-center hover:bg-white/30 transition-colors duration-300"
          >
            서비스 신청하기
          </a>
          <a
            href="#portfolio"
            className="h-[4.4rem] px-8 border border-designlab-gray bg-transparent text-white text-[1.2rem] font-semibold rounded-[0.4rem] flex items-center justify-center hover:bg-white/10 transition-colors duration-300"
          >
            포트폴리오 보러가기
          </a>
        </motion.div>
      </div>

      {/* Scroll Arrow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            width="20"
            height="30"
            viewBox="0 0 20 30"
            fill="none"
            className="text-designlab-gray"
          >
            <path
              d="M10 0L10 24M10 24L3 17M10 24L17 17"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
