"use client";

import { motion } from "framer-motion";
import { priceInfo } from "@/data/wallpaper-master";

const barColors = [
  "bg-wallpaper-blue",
  "bg-wallpaper-blue-dark",
  "bg-blue-400",
  "bg-blue-300",
  "bg-blue-200",
];

export default function PriceEducation() {
  return (
    <section className="bg-wallpaper-light py-[90px] md:py-[120px]">
      <div className="mx-auto max-w-[1260px] px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-3 text-[28px] font-bold text-wallpaper-heading">
            {priceInfo.heading}
          </h2>
          <p className="text-sm text-wallpaper-text">
            {priceInfo.subtitle}
          </p>
        </motion.div>

        <div className="grid gap-10 md:grid-cols-2">
          {/* Left: Donut chart SVG */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center"
          >
            <div className="relative">
              <svg viewBox="0 0 200 200" className="h-[250px] w-[250px] md:h-[300px] md:w-[300px]">
                {priceInfo.factors.reduce<{ offset: number; paths: React.ReactNode[] }>(
                  (acc, factor, i) => {
                    const radius = 80;
                    const cx = 100;
                    const cy = 100;
                    const colors = ["#3594f2", "#176cc0", "#60a5fa", "#93c5fd", "#bfdbfe"];

                    const startAngle = (acc.offset / 100) * 360;
                    const endAngle = ((acc.offset + factor.percentage) / 100) * 360;

                    const startRad = ((startAngle - 90) * Math.PI) / 180;
                    const endRad = ((endAngle - 90) * Math.PI) / 180;

                    const x1 = cx + radius * Math.cos(startRad);
                    const y1 = cy + radius * Math.sin(startRad);
                    const x2 = cx + radius * Math.cos(endRad);
                    const y2 = cy + radius * Math.sin(endRad);

                    const largeArc = factor.percentage > 50 ? 1 : 0;

                    const d = [
                      `M ${cx} ${cy}`,
                      `L ${x1} ${y1}`,
                      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                      "Z",
                    ].join(" ");

                    acc.paths.push(
                      <path key={i} d={d} fill={colors[i]} stroke="white" strokeWidth="2" />
                    );
                    return { offset: acc.offset + factor.percentage, paths: acc.paths };
                  },
                  { offset: 0, paths: [] }
                ).paths}
                {/* Center circle for donut effect */}
                <circle cx="100" cy="100" r="45" fill="white" />
                <text
                  x="100"
                  y="95"
                  textAnchor="middle"
                  className="fill-wallpaper-heading text-xs font-bold"
                  fontSize="11"
                >
                  도배 비용
                </text>
                <text
                  x="100"
                  y="112"
                  textAnchor="middle"
                  className="fill-wallpaper-text"
                  fontSize="9"
                >
                  구성 요소
                </text>
              </svg>
            </div>
          </motion.div>

          {/* Right: Factor breakdown */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center space-y-5"
          >
            {priceInfo.factors.map((factor, i) => (
              <div key={factor.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-3 w-3 rounded-sm ${barColors[i]}`}
                    />
                    <span className="text-sm font-semibold text-wallpaper-heading">
                      {factor.label}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-wallpaper-blue">
                    {factor.percentage}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${factor.percentage}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                    className={`h-full rounded-full ${barColors[i]}`}
                  />
                </div>
                <p className="mt-1 text-xs text-wallpaper-text">
                  {factor.description}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 rounded-xl bg-white p-6 text-center shadow-sm"
        >
          <p className="text-sm text-wallpaper-text">
            * 정확한 견적은 현장 방문 후 안내드립니다. 벽지마스터는{" "}
            <span className="font-semibold text-wallpaper-blue">투명한 견적</span>을
            약속합니다.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
