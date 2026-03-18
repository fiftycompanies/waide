"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { penthouses } from "@/data/designlab";

function WorldMapSVG() {
  return (
    <div className="relative w-full max-w-[80rem] mx-auto">
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Simplified World Map Outlines */}
        {/* North America */}
        <path
          d="M150 80 L200 60 L260 70 L280 90 L290 120 L280 150 L260 170 L240 200 L220 220 L200 230 L180 240 L160 230 L140 200 L120 170 L110 140 L120 110 L140 90 Z"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          fill="rgba(255,255,255,0.03)"
        />
        {/* South America */}
        <path
          d="M220 260 L240 250 L270 260 L280 290 L290 320 L280 360 L260 390 L240 410 L220 400 L210 370 L200 340 L190 310 L200 280 Z"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          fill="rgba(255,255,255,0.03)"
        />
        {/* Europe */}
        <path
          d="M440 80 L470 70 L500 80 L520 100 L510 130 L490 150 L470 140 L450 130 L440 110 Z"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          fill="rgba(255,255,255,0.03)"
        />
        {/* Africa */}
        <path
          d="M460 160 L500 150 L530 170 L540 210 L530 260 L510 300 L490 320 L470 310 L450 280 L440 240 L450 200 Z"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          fill="rgba(255,255,255,0.03)"
        />
        {/* Asia */}
        <path
          d="M540 60 L600 50 L680 60 L740 80 L780 100 L790 130 L780 160 L740 180 L700 190 L660 180 L620 160 L580 140 L550 120 L540 90 Z"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          fill="rgba(255,255,255,0.03)"
        />
        {/* Australia */}
        <path
          d="M760 300 L810 290 L850 300 L860 330 L850 360 L820 370 L790 360 L770 340 L760 320 Z"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          fill="rgba(255,255,255,0.03)"
        />

        {/* Country Markers */}
        {/* USA */}
        <circle cx="200" cy="140" r="6" fill="#888888" opacity="0.8" />
        <circle cx="200" cy="140" r="10" stroke="#888888" strokeWidth="1" opacity="0.4" />
        <text x="200" y="170" textAnchor="middle" fill="#888888" fontSize="14" fontWeight="300">
          USA
        </text>

        {/* Canada */}
        <circle cx="220" cy="85" r="6" fill="#888888" opacity="0.8" />
        <circle cx="220" cy="85" r="10" stroke="#888888" strokeWidth="1" opacity="0.4" />
        <text x="220" y="75" textAnchor="middle" fill="#888888" fontSize="14" fontWeight="300">
          Canada
        </text>

        {/* Singapore */}
        <circle cx="710" cy="210" r="6" fill="#888888" opacity="0.8" />
        <circle cx="710" cy="210" r="10" stroke="#888888" strokeWidth="1" opacity="0.4" />
        <text x="710" y="240" textAnchor="middle" fill="#888888" fontSize="14" fontWeight="300">
          Singapore
        </text>

        {/* Australia */}
        <circle cx="810" cy="330" r="6" fill="#888888" opacity="0.8" />
        <circle cx="810" cy="330" r="10" stroke="#888888" strokeWidth="1" opacity="0.4" />
        <text x="810" y="360" textAnchor="middle" fill="#888888" fontSize="14" fontWeight="300">
          Australia
        </text>
      </svg>
    </div>
  );
}

export default function ServiceSection() {
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
          <p className="text-white font-semibold text-[1.3rem] mb-2">08</p>
          <p className="text-designlab-gray text-[1.2rem] font-normal mb-4">
            High-end Service
          </p>
          <h2 className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal leading-tight">
            뉴욕 센트럴파크 펜트하우스부터
            <br className="hidden xl:block" />
            미국/캐나다/싱가포르/호주 등 전 세계 고객이 인정한 하이엔드 서비스
          </h2>
        </motion.div>

        {/* Penthouse Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <h3 className="text-white text-[1.4rem] xl:text-[1.6rem] font-normal tracking-wider mb-6">
            111 west 57th penthouse
          </h3>
        </motion.div>

        {/* Penthouse Images */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 mb-6">
          {penthouses.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="relative aspect-[4/3] overflow-hidden group"
            >
              <Image
                src={item.image}
                alt={item.label}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-500" />
              <div className="absolute bottom-4 left-4">
                <p className="text-white/60 text-[1.1rem] font-normal tracking-wider">
                  {item.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Reference Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-designlab-gray text-[1.1rem] font-normal mb-16 xl:mb-24"
        >
          [뉴욕 111 WEST 57TH 펜트하우스 실제 고객 사례]
        </motion.p>

        {/* World Map */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <WorldMapSVG />
        </motion.div>
      </div>
    </section>
  );
}
