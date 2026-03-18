"use client";

import { motion } from "framer-motion";
import { showroom } from "@/data/designlab";

export default function ShowroomInfo() {
  return (
    <>
      <div id="showroom" />
      <section id="contact" className="bg-black py-20 xl:py-32">
        <div className="px-4 xl:px-[5.6rem] max-w-[176rem] mx-auto">
          {/* Top Divider */}
          <div className="border-t border-white/10 mb-16 xl:mb-24" />

          {/* Showroom Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-white text-[1.6rem] xl:text-[2.2rem] font-normal mb-12 xl:mb-16"
          >
            {showroom.name}
          </motion.h2>

          {/* Showroom Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6 xl:space-y-8"
          >
            {/* Address */}
            <div>
              <p className="text-designlab-gray text-[1.1rem] font-normal mb-1">
                주소
              </p>
              <p className="text-white text-[1.3rem] font-normal">
                {showroom.address}
              </p>
            </div>

            {/* Hours */}
            <div>
              <p className="text-designlab-gray text-[1.1rem] font-normal mb-1">
                영업시간
              </p>
              <p className="text-white text-[1.3rem] font-normal">
                {showroom.hours}
              </p>
            </div>

            {/* Phone */}
            <div>
              <p className="text-designlab-gray text-[1.1rem] font-normal mb-1">
                전화번호
              </p>
              <a
                href={`tel:${showroom.phone}`}
                className="text-white text-[1.3rem] font-normal hover:text-designlab-gray transition-colors duration-300"
              >
                {showroom.phone}
              </a>
            </div>

            {/* Note */}
            <div>
              <p className="text-designlab-gray text-[1.2rem] font-normal">
                {showroom.note}
              </p>
            </div>
          </motion.div>

          {/* Bottom Divider */}
          <div className="border-t border-white/10 mt-16 xl:mt-24" />
        </div>
      </section>
    </>
  );
}
