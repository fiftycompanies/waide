"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { brandPartners } from "@/data/designlab";

export default function BrandPartners() {
  return (
    <section className="bg-black py-20 xl:py-32">
      <div className="px-4 xl:px-[5.6rem] max-w-[176rem] mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 xl:mb-20"
        >
          <p className="text-white font-semibold text-[1.3rem] mb-2">01</p>
          <p className="text-designlab-gray text-[1.2rem] font-normal mb-4">
            High-end Brand
          </p>
          <h2 className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal leading-tight">
            하이엔드 브랜드들이 먼저 선택한 공간 파트너
          </h2>
        </motion.div>

        {/* Brand Cards Carousel */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 xl:-mx-[5.6rem] px-4 xl:px-[5.6rem]">
          <div className="flex gap-4 xl:gap-6 min-w-max">
            {brandPartners.map((brand, index) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative w-[28rem] xl:w-[32rem] aspect-[4/5] flex-shrink-0 overflow-hidden group"
              >
                <Image
                  src={brand.image}
                  alt={brand.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-6 xl:p-8">
                  <p className="text-white text-[1.6rem] xl:text-[2rem] font-normal tracking-wide">
                    {brand.name}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
