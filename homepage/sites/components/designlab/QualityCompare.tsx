"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { qualityImages } from "@/data/designlab";

const columns = [
  {
    label: "BEFORE",
    image: qualityImages.before,
    alt: "시공 전",
  },
  {
    label: "3D IMAGE",
    image: qualityImages.threeD,
    alt: "3D 렌더링 이미지",
  },
  {
    label: "AFTER",
    image: qualityImages.after,
    alt: "시공 후",
  },
];

export default function QualityCompare() {
  return (
    <section id="quality" className="bg-black py-20 xl:py-32">
      <div className="px-4 xl:px-[5.6rem] max-w-[176rem] mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 xl:mb-20"
        >
          <p className="text-white font-semibold text-[1.3rem] mb-2">04</p>
          <p className="text-designlab-gray text-[1.2rem] font-normal mb-4">
            High-end 3D Quality
          </p>
          <h2 className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal leading-tight">
            실제 사진과 같은 3D 퀄리티로
            <br className="hidden xl:block" />
            실패 없는 인테리어를 완성하세요
          </h2>
        </motion.div>

        {/* 3-Column Comparison */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6">
          {columns.map((col, index) => (
            <motion.div
              key={col.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="flex flex-col"
            >
              {/* Label */}
              <div className="flex items-center gap-3 mb-4">
                <p className="text-designlab-gray text-[1.2rem] font-normal tracking-wider">
                  {col.label}
                </p>
                {index < columns.length - 1 && (
                  <span className="hidden xl:inline-block text-white/30 text-[1.2rem]">
                    →
                  </span>
                )}
              </div>

              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden group">
                <Image
                  src={col.image}
                  alt={col.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Reference Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-designlab-gray text-[1.1rem] font-normal mt-8 text-center xl:text-left"
        >
          [실제 한남더힐 고객 사례]
        </motion.p>
      </div>
    </section>
  );
}
