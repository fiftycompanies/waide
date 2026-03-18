"use client";

import { motion } from "framer-motion";
import { partnerLogos } from "@/data/wallpaper-master";

const logoStyles: Record<string, string> = {
  한솔: "font-serif text-2xl font-bold tracking-wider text-gray-700 md:text-3xl",
  한샘: "font-sans text-2xl font-black tracking-tight text-gray-800 uppercase md:text-3xl",
  ZIN: "font-['Roboto',sans-serif] text-2xl font-bold italic tracking-widest text-gray-600 md:text-3xl",
  한스: "font-serif text-2xl font-semibold tracking-wide text-gray-700 md:text-3xl",
};

export default function PartnerLogos() {
  return (
    <section className="bg-white py-[60px] md:py-[80px]">
      <div className="mx-auto max-w-[1260px] px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <h2 className="text-xl font-bold text-wallpaper-heading md:text-2xl">
            벽지마스터와 함께 했어요!
          </h2>
        </motion.div>

        {/* Partner logos row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-10 md:gap-16"
        >
          {partnerLogos.map((partner) => (
            <div
              key={partner.id}
              className="flex flex-col items-center gap-1 opacity-60 transition-opacity hover:opacity-100"
            >
              <span className={logoStyles[partner.name] || "text-2xl font-bold text-gray-700"}>
                {partner.name === "ZIN" ? partner.nameEn : partner.name}
              </span>
              {partner.name !== "ZIN" && (
                <span className="text-[10px] tracking-widest text-gray-400 uppercase">
                  {partner.nameEn}
                </span>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
