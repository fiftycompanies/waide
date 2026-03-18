"use client";

import { motion } from "framer-motion";
import { commercialPartners } from "@/data/designlab";

export default function CommercialPortfolio() {
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
          <p className="text-white font-semibold text-[1.3rem] mb-2">03</p>
          <p className="text-designlab-gray text-[1.2rem] font-normal mb-4">
            High-end Space
          </p>
          <h2 className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal leading-tight mb-4">
            700평 사무실부터 감각적인 브랜드 공간까지
            <br className="hidden xl:block" />
            상업공간 시공도 디자인랩
          </h2>
          <span className="inline-block text-designlab-gray text-[1.2rem] font-normal border border-white/10 rounded-[0.4rem] px-4 py-2">
            [실내건축공사업 면허 보유]
          </span>
        </motion.div>

        {/* Commercial Partner Carousel */}
        <div className="overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Scrolling Row */}
            <div className="overflow-x-auto scrollbar-hide -mx-4 xl:-mx-[5.6rem] px-4 xl:px-[5.6rem]">
              <div className="flex gap-6 xl:gap-10 min-w-max py-4">
                {commercialPartners.map((name, index) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.03 }}
                    className="flex items-center justify-center px-6 xl:px-8 py-4 xl:py-5 border border-white/10 rounded-[0.4rem] hover:border-white/30 transition-colors duration-300 flex-shrink-0"
                  >
                    <span className="text-designlab-gray text-[1.2rem] xl:text-[1.3rem] font-normal tracking-wide whitespace-nowrap hover:text-white transition-colors duration-300">
                      {name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Second Row (duplicated for visual density) */}
            <div className="overflow-x-auto scrollbar-hide -mx-4 xl:-mx-[5.6rem] px-4 xl:px-[5.6rem] mt-4">
              <div className="flex gap-6 xl:gap-10 min-w-max py-4">
                {[...commercialPartners].reverse().map((name, index) => (
                  <motion.div
                    key={`${name}-2`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.03 }}
                    className="flex items-center justify-center px-6 xl:px-8 py-4 xl:py-5 border border-white/10 rounded-[0.4rem] hover:border-white/30 transition-colors duration-300 flex-shrink-0"
                  >
                    <span className="text-designlab-gray text-[1.2rem] xl:text-[1.3rem] font-normal tracking-wide whitespace-nowrap hover:text-white transition-colors duration-300">
                      {name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
