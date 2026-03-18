"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fireSafetyInfo } from "@/data/wallpaper-master";

export default function FireSafety() {
  return (
    <section className="bg-white py-[90px] md:py-[120px]">
      <div className="mx-auto max-w-[1260px] px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-center"
        >
          <h2 className="mb-3 text-[28px] font-bold text-wallpaper-heading">
            {fireSafetyInfo.heading}
          </h2>
          <p className="text-sm text-wallpaper-text">
            {fireSafetyInfo.subtitle}
          </p>
        </motion.div>

        {/* Comparison */}
        <div className="mt-12 flex flex-col items-center gap-6 md:flex-row md:items-stretch md:justify-center md:gap-10">
          {/* Left - 합지벽지 */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-[360px] overflow-hidden rounded-xl border border-wallpaper-border bg-white shadow-sm"
          >
            <div className="relative h-[220px]">
              <Image
                src={fireSafetyInfo.left.image}
                alt={fireSafetyInfo.left.label}
                fill
                className="object-cover"
                unoptimized
              />
              {/* Red overlay tint */}
              <div className="absolute inset-0 bg-red-500/10" />
            </div>
            <div className="p-5 text-center">
              <span className="mb-2 inline-block rounded-full bg-red-100 px-4 py-1 text-sm font-semibold text-red-600">
                {fireSafetyInfo.left.label}
              </span>
              <p className="mt-2 text-sm leading-relaxed text-wallpaper-text">
                {fireSafetyInfo.left.description}
              </p>
            </div>
          </motion.div>

          {/* VS indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wallpaper-blue text-xl font-bold text-white shadow-lg">
              VS
            </div>
          </motion.div>

          {/* Right - 방염실크벽지 */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-[360px] overflow-hidden rounded-xl border-2 border-wallpaper-blue bg-white shadow-sm"
          >
            <div className="relative h-[220px]">
              <Image
                src={fireSafetyInfo.right.image}
                alt={fireSafetyInfo.right.label}
                fill
                className="object-cover"
                unoptimized
              />
              {/* Blue overlay tint */}
              <div className="absolute inset-0 bg-wallpaper-blue/10" />
            </div>
            <div className="p-5 text-center">
              <span className="mb-2 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-wallpaper-blue">
                {fireSafetyInfo.right.label}
              </span>
              <p className="mt-2 text-sm leading-relaxed text-wallpaper-text">
                {fireSafetyInfo.right.description}
              </p>
              <div className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-wallpaper-blue">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                추천
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
