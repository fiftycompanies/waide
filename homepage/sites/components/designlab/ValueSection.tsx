"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { problemCards } from "@/data/designlab";

export default function ValueSection() {
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
          <p className="text-white font-semibold text-[1.3rem] mb-2">09</p>
          <p className="text-designlab-gray text-[1.2rem] font-normal mb-4">
            High-end Value
          </p>
          <h2 className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal leading-tight">
            가구 구매, 인테리어 시공을 준비하며
            <br className="hidden xl:block" />
            고객이 겪는 모든 문제점을 해결하는 3D 디자인 플랫폼
          </h2>
        </motion.div>

        {/* Problem-Solution Cards Grid */}
        <div
          className="grid gap-4 xl:gap-6"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          }}
        >
          {problemCards.map((card, index) => (
            <motion.div
              key={card.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="relative overflow-hidden border border-white/10 group min-h-[28rem]"
            >
              {/* Background Image */}
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                unoptimized
              />

              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-black/70 group-hover:bg-black/60 transition-colors duration-500" />

              {/* Content */}
              <div className="relative z-10 p-6 xl:p-8 flex flex-col h-full justify-end">
                <p className="text-designlab-gray text-[1.1rem] font-semibold mb-3">
                  {card.number}
                </p>
                <h3 className="text-white text-[1.4rem] xl:text-[1.6rem] font-normal mb-3">
                  {card.title}
                </h3>
                <p className="text-designlab-text text-[1.1rem] xl:text-[1.2rem] font-normal leading-relaxed">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
