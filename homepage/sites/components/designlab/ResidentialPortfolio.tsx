"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { residentialPortfolios } from "@/data/designlab";

export default function ResidentialPortfolio() {
  return (
    <section id="portfolio" className="bg-black py-20 xl:py-32">
      <div className="px-4 xl:px-[5.6rem] max-w-[176rem] mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 xl:mb-20"
        >
          <p className="text-white font-semibold text-[1.3rem] mb-2">02</p>
          <p className="text-designlab-gray text-[1.2rem] font-normal mb-4">
            High-end Home
          </p>
          <h2 className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal leading-tight">
            4000개 이상의 프리미엄 주거 사례를 디자인한 경험과 실력
          </h2>
        </motion.div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6">
          {residentialPortfolios.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative aspect-[4/3] overflow-hidden cursor-pointer"
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                unoptimized
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 xl:p-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-designlab-gray text-[1.1rem] font-normal tracking-wider">
                    {item.style}
                  </span>
                  <span className="w-px h-3 bg-white/20" />
                  <span className="text-designlab-gray text-[1.1rem] font-normal">
                    {item.area}
                  </span>
                </div>
                <h3 className="text-white text-[1.4rem] xl:text-[1.6rem] font-normal">
                  {item.title}
                </h3>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
