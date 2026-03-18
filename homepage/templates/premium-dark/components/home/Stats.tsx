"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

interface StatsProps {
  experienceYears?: number;
  completedProjects?: number;
  reviewCount: number;
  averageRating: number;
}

export default function Stats({
  experienceYears = 10,
  completedProjects = 100,
  reviewCount,
  averageRating,
}: StatsProps) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 });

  const stats = [
    { value: `${experienceYears}`, suffix: "년", label: "시공 경력" },
    { value: `${completedProjects}`, suffix: "+", label: "시공 완료" },
    { value: `${reviewCount}`, suffix: "건", label: "고객 후기" },
    { value: averageRating.toFixed(1), suffix: "", label: "평균 평점" },
  ];

  return (
    <section className="section-padding border-y border-border">
      <div className="container-wide" ref={ref}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.8 }}
              className="text-center"
            >
              <p className="text-4xl md:text-5xl font-bold text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                {stat.value}
                <span className="text-2xl text-text-secondary">{stat.suffix}</span>
              </p>
              <div className="w-6 h-px bg-primary/30 mx-auto my-3" />
              <p className="text-xs tracking-widest text-text-muted uppercase">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
