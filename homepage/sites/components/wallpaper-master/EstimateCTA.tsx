"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ctaBackground } from "@/data/wallpaper-master";

export default function EstimateCTA() {
  return (
    <section id="estimate" className="relative py-[80px] md:py-[100px]">
      {/* Background image */}
      <Image
        src={ctaBackground}
        alt="방문견적 배경"
        fill
        className="object-cover"
        unoptimized
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/65" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-[1260px] px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
            방문견적을 신청하시면
            <br />
            꼼꼼한 상담을 약속드립니다
          </h2>
          <p className="mb-8 text-sm text-white/80 md:text-base">
            전문가가 직접 방문하여 공간을 확인하고, 가장 합리적인 견적을
            제안드립니다.
          </p>
          <motion.a
            href="#estimate"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex h-[52px] items-center rounded-[30px] bg-wallpaper-blue px-10 text-base font-semibold text-white shadow-lg transition-colors hover:bg-wallpaper-blue-dark md:h-[58px] md:px-12"
          >
            방문견적 신청
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
