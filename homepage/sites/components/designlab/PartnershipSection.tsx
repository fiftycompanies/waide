"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { partnershipBenefits } from "@/data/designlab";

export default function PartnershipSection() {
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
          <p className="text-white font-semibold text-[1.3rem] mb-2">06</p>
          <p className="text-designlab-gray text-[1.2rem] font-normal mb-4">
            High-end Partnership
          </p>
          <h2 className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal leading-tight">
            약 300개의 국내 최대 규모 가구 브랜드 제휴관계로
            <br className="hidden xl:block" />
            가구에 대한 고민과 걱정을 비워드립니다
          </h2>
        </motion.div>

        {/* Benefit Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6 mb-16 xl:mb-24">
          {partnershipBenefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group overflow-hidden"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden mb-4">
                <Image
                  src={benefit.image}
                  alt={benefit.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-500" />
              </div>

              {/* Text */}
              <h3 className="text-white text-[1.3rem] font-normal mb-2">
                {benefit.title}
              </h3>
              <p className="text-designlab-gray text-[1.1rem] font-normal leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Partner Brand List Image (placeholder) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative w-full aspect-[21/6] bg-white/5 border border-white/10 rounded-[0.4rem] overflow-hidden flex items-center justify-center"
        >
          <div className="grid grid-cols-5 xl:grid-cols-10 gap-6 xl:gap-10 px-8 py-6 w-full">
            {[
              "Cassina",
              "Minotti",
              "Poliform",
              "Molteni",
              "Fritz Hansen",
              "Vitra",
              "B&B Italia",
              "Flos",
              "Kartell",
              "Hay",
              "Muuto",
              "Knoll",
              "Herman Miller",
              "USM",
              "Bulthaup",
              "Gaggenau",
              "Miele",
              "Hansgrohe",
              "Duravit",
              "Dyson",
            ].map((name) => (
              <div
                key={name}
                className="flex items-center justify-center"
              >
                <span className="text-white/30 text-[1rem] xl:text-[1.1rem] font-normal tracking-wider whitespace-nowrap">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
