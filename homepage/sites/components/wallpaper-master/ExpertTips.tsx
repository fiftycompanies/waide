"use client";

import { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { expertTips } from "@/data/wallpaper-master";

export default function ExpertTips() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section id="tips" className="bg-white py-[90px] md:py-[120px]">
      <div className="mx-auto max-w-[1260px] px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <h2 className="mb-2 text-[28px] font-bold text-wallpaper-heading">
            도배가 궁금하신가요?
          </h2>
          <p className="text-sm text-wallpaper-text">
            도배 전문가가 알려주는 유용한 팁을 확인하세요
          </p>
        </motion.div>

        {/* Card carousel */}
        <div className="relative">
          {/* Navigation arrows */}
          <button
            onClick={() => scroll("left")}
            className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-wallpaper-border bg-white shadow-md transition-colors hover:bg-wallpaper-blue hover:text-white md:flex"
            aria-label="이전"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-wallpaper-border bg-white shadow-md transition-colors hover:bg-wallpaper-blue hover:text-white md:flex"
            aria-label="다음"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {expertTips.map((tip, i) => (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="w-[260px] flex-shrink-0 snap-start md:w-[280px]"
              >
                <div className="overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg">
                  <div className="relative h-[160px]">
                    <Image
                      src={tip.image}
                      alt={tip.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="mb-2 text-sm font-bold text-wallpaper-heading line-clamp-2">
                      {tip.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-wallpaper-text line-clamp-2">
                      {tip.summary}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Trust message + city illustration */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 flex flex-col items-center text-center"
        >
          <p className="mb-6 text-lg font-bold text-wallpaper-blue md:text-xl">
            믿고 맡길 수 있는 벽지마스터
          </p>
          {/* Inline city skyline SVG */}
          <svg
            viewBox="0 0 800 200"
            className="h-auto w-full max-w-[600px] text-wallpaper-blue/20"
            fill="currentColor"
          >
            <rect x="50" y="80" width="60" height="120" rx="2" />
            <rect x="55" y="90" width="12" height="12" rx="1" fill="white" />
            <rect x="73" y="90" width="12" height="12" rx="1" fill="white" />
            <rect x="91" y="90" width="12" height="12" rx="1" fill="white" />
            <rect x="55" y="110" width="12" height="12" rx="1" fill="white" />
            <rect x="73" y="110" width="12" height="12" rx="1" fill="white" />
            <rect x="91" y="110" width="12" height="12" rx="1" fill="white" />
            <rect x="55" y="130" width="12" height="12" rx="1" fill="white" />
            <rect x="73" y="130" width="12" height="12" rx="1" fill="white" />
            <rect x="91" y="130" width="12" height="12" rx="1" fill="white" />

            <rect x="130" y="40" width="80" height="160" rx="2" />
            <rect x="138" y="50" width="14" height="14" rx="1" fill="white" />
            <rect x="158" y="50" width="14" height="14" rx="1" fill="white" />
            <rect x="178" y="50" width="14" height="14" rx="1" fill="white" />
            <rect x="138" y="72" width="14" height="14" rx="1" fill="white" />
            <rect x="158" y="72" width="14" height="14" rx="1" fill="white" />
            <rect x="178" y="72" width="14" height="14" rx="1" fill="white" />
            <rect x="138" y="94" width="14" height="14" rx="1" fill="white" />
            <rect x="158" y="94" width="14" height="14" rx="1" fill="white" />
            <rect x="178" y="94" width="14" height="14" rx="1" fill="white" />
            <rect x="138" y="116" width="14" height="14" rx="1" fill="white" />
            <rect x="158" y="116" width="14" height="14" rx="1" fill="white" />
            <rect x="178" y="116" width="14" height="14" rx="1" fill="white" />

            <rect x="230" y="60" width="70" height="140" rx="2" />
            <rect x="238" y="70" width="12" height="12" rx="1" fill="white" />
            <rect x="256" y="70" width="12" height="12" rx="1" fill="white" />
            <rect x="274" y="70" width="12" height="12" rx="1" fill="white" />
            <rect x="238" y="90" width="12" height="12" rx="1" fill="white" />
            <rect x="256" y="90" width="12" height="12" rx="1" fill="white" />
            <rect x="274" y="90" width="12" height="12" rx="1" fill="white" />

            <rect x="320" y="20" width="90" height="180" rx="2" />
            <rect x="330" y="30" width="14" height="14" rx="1" fill="white" />
            <rect x="350" y="30" width="14" height="14" rx="1" fill="white" />
            <rect x="370" y="30" width="14" height="14" rx="1" fill="white" />
            <rect x="390" y="30" width="14" height="14" rx="1" fill="white" />
            <rect x="330" y="52" width="14" height="14" rx="1" fill="white" />
            <rect x="350" y="52" width="14" height="14" rx="1" fill="white" />
            <rect x="370" y="52" width="14" height="14" rx="1" fill="white" />
            <rect x="390" y="52" width="14" height="14" rx="1" fill="white" />
            <rect x="330" y="74" width="14" height="14" rx="1" fill="white" />
            <rect x="350" y="74" width="14" height="14" rx="1" fill="white" />
            <rect x="370" y="74" width="14" height="14" rx="1" fill="white" />
            <rect x="390" y="74" width="14" height="14" rx="1" fill="white" />

            <rect x="430" y="70" width="60" height="130" rx="2" />
            <rect x="438" y="80" width="12" height="12" rx="1" fill="white" />
            <rect x="456" y="80" width="12" height="12" rx="1" fill="white" />
            <rect x="474" y="80" width="12" height="12" rx="1" fill="white" />
            <rect x="438" y="100" width="12" height="12" rx="1" fill="white" />
            <rect x="456" y="100" width="12" height="12" rx="1" fill="white" />
            <rect x="474" y="100" width="12" height="12" rx="1" fill="white" />

            <rect x="510" y="50" width="80" height="150" rx="2" />
            <rect x="520" y="60" width="14" height="14" rx="1" fill="white" />
            <rect x="540" y="60" width="14" height="14" rx="1" fill="white" />
            <rect x="560" y="60" width="14" height="14" rx="1" fill="white" />
            <rect x="520" y="82" width="14" height="14" rx="1" fill="white" />
            <rect x="540" y="82" width="14" height="14" rx="1" fill="white" />
            <rect x="560" y="82" width="14" height="14" rx="1" fill="white" />
            <rect x="520" y="104" width="14" height="14" rx="1" fill="white" />
            <rect x="540" y="104" width="14" height="14" rx="1" fill="white" />
            <rect x="560" y="104" width="14" height="14" rx="1" fill="white" />

            <rect x="610" y="90" width="60" height="110" rx="2" />
            <rect x="618" y="100" width="12" height="12" rx="1" fill="white" />
            <rect x="636" y="100" width="12" height="12" rx="1" fill="white" />
            <rect x="654" y="100" width="12" height="12" rx="1" fill="white" />

            <rect x="690" y="55" width="70" height="145" rx="2" />
            <rect x="698" y="65" width="12" height="12" rx="1" fill="white" />
            <rect x="716" y="65" width="12" height="12" rx="1" fill="white" />
            <rect x="734" y="65" width="12" height="12" rx="1" fill="white" />
            <rect x="698" y="85" width="12" height="12" rx="1" fill="white" />
            <rect x="716" y="85" width="12" height="12" rx="1" fill="white" />
            <rect x="734" y="85" width="12" height="12" rx="1" fill="white" />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
