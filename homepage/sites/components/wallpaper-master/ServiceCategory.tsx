"use client";

import { Paintbrush, Image as ImageIcon, Phone, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { serviceCategories } from "@/data/wallpaper-master";

const iconMap = {
  paintbrush: Paintbrush,
  image: ImageIcon,
  phone: Phone,
  filetext: FileText,
} as const;

export default function ServiceCategory() {
  return (
    <section id="service" className="bg-white py-[60px] md:py-20">
      <div className="mx-auto max-w-[1260px] px-6">
        {/* Blue heading text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <p className="mb-2 text-sm text-wallpaper-blue">
            3~40대 가장 잘하는 고수에게 직접 시공 받으세요
          </p>
          <h2 className="text-lg font-bold text-wallpaper-heading md:text-xl">
            벽지마스터가 제공하는 전문 서비스
          </h2>
        </motion.div>

        {/* 4 circular icon cards */}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {serviceCategories.map((item, i) => {
            const Icon = iconMap[item.icon];
            return (
              <motion.a
                key={item.id}
                href={item.href}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group flex flex-col items-center"
              >
                <div className="mb-4 flex h-[90px] w-[90px] items-center justify-center rounded-full border-2 border-wallpaper-border bg-white transition-all group-hover:border-wallpaper-blue group-hover:bg-wallpaper-blue md:h-[110px] md:w-[110px]">
                  <Icon className="h-8 w-8 text-wallpaper-blue transition-colors group-hover:text-white md:h-10 md:w-10" />
                </div>
                <span className="text-sm font-semibold text-wallpaper-heading transition-colors group-hover:text-wallpaper-blue">
                  {item.title}
                </span>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
