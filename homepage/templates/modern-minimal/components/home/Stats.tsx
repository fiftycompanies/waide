"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Award, Clock, Users, Star } from "lucide-react";

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
    { icon: Clock, value: `${experienceYears}년`, label: "시공 경력" },
    { icon: Award, value: `${completedProjects}+`, label: "시공 완료" },
    { icon: Users, value: `${reviewCount}건`, label: "고객 후기" },
    { icon: Star, value: averageRating.toFixed(1), label: "평균 평점" },
  ];

  return (
    <section className="section-padding bg-bg-soft">
      <div className="container-wide" ref={ref}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center p-6 rounded-xl bg-white border border-border-light"
            >
              <stat.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
              <p className="text-3xl font-bold text-text">{stat.value}</p>
              <p className="text-sm text-text-muted mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
