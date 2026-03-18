"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { outputComparison } from "@/data/designlab";

export default function OutputCompare() {
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
          <p className="text-white font-semibold text-[1.3rem] mb-2">05</p>
          <p className="text-designlab-gray text-[1.2rem] font-normal mb-4">
            High-end Output
          </p>
          <h2 className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal leading-tight">
            시공부터 가구까지, 처음부터 한 번에 계획하여
            <br className="hidden xl:block" />
            어느 곳보다 완성도 높고 합리적인 결과를 만나보세요
          </h2>
        </motion.div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
          {/* OTHERS */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col"
          >
            <p className="text-designlab-gray text-[1.3rem] font-normal tracking-wider mb-4">
              OTHERS
            </p>
            <div className="relative aspect-[4/3] overflow-hidden mb-4">
              <Image
                src={outputComparison.others.image}
                alt="타사 시공 결과"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <p className="text-designlab-gray text-[1.1rem] font-normal">
              {outputComparison.others.caption}
            </p>
          </motion.div>

          {/* DESIGNLAB */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col"
          >
            <p className="text-white text-[1.3rem] font-semibold tracking-wider mb-4">
              DESIGNLAB
            </p>
            <div className="relative aspect-[4/3] overflow-hidden mb-4">
              <Image
                src={outputComparison.designlab.image}
                alt="디자인랩 시공 결과"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/5" />
            </div>
            <p className="text-designlab-text text-[1.1rem] font-normal">
              {outputComparison.designlab.caption}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
