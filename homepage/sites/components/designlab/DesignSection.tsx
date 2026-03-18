"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { clientTypes, interiorGridImage, magazineImages } from "@/data/designlab";

export default function DesignSection() {
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
          <p className="text-white font-semibold text-[1.3rem] mb-2">07</p>
          <p className="text-designlab-gray text-[1.2rem] font-normal mb-4">
            High-end Design
          </p>
          <h2 className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal leading-tight">
            흔하고 남들과 비슷한 인테리어는 그만
            <br className="hidden xl:block" />
            트렌드를 만들고 당신의 취향만을 고려한 1:1 퍼스널 디자인
          </h2>
        </motion.div>

        {/* Client Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-16 xl:mb-24"
        >
          <p className="text-white/60 text-[1.2rem] xl:text-[1.3rem] font-normal leading-loose">
            {clientTypes}
          </p>
        </motion.div>

        {/* Interior Grid Image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative w-full aspect-[16/9] overflow-hidden mb-16 xl:mb-24"
        >
          <Image
            src={interiorGridImage}
            alt="인테리어 포트폴리오"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/10" />
        </motion.div>

        {/* Magazine Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <p className="text-designlab-gray text-[1.2rem] font-normal mb-8">
            [ 매거진 소개 사례 ]
          </p>
        </motion.div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
          {magazineImages.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative aspect-[3/4] overflow-hidden group"
            >
              <Image
                src={image}
                alt={`매거진 ${index + 1}`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
