"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { MessageSquare, Ruler, Palette, Hammer, CheckCircle } from "lucide-react";

const STEPS = [
  { icon: MessageSquare, title: "상담", desc: "전화/방문 상담을 통해 고객 니즈를 파악합니다" },
  { icon: Ruler, title: "실측", desc: "현장 방문하여 정확한 실측과 공간 분석을 진행합니다" },
  { icon: Palette, title: "디자인", desc: "3D 시뮬레이션으로 완성 이미지를 미리 확인합니다" },
  { icon: Hammer, title: "시공", desc: "전문 시공팀이 꼼꼼하게 시공을 진행합니다" },
  { icon: CheckCircle, title: "완공", desc: "최종 점검 후 깨끗하게 정리하여 인도합니다" },
];

export default function Process() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="section-padding">
      <div className="container-wide" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <div className="w-10 h-px bg-primary mx-auto mb-6" />
          <h2
            className="text-3xl md:text-5xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            PROCESS
          </h2>
          <p className="text-text-secondary mt-4 text-sm tracking-wide">
            체계적인 5단계 프로세스
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.7 }}
              className="relative text-center p-8 group"
            >
              {/* Step number */}
              <span
                className="text-7xl font-bold text-bg-muted absolute top-4 left-1/2 -translate-x-1/2 -z-10"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="w-12 h-12 border border-primary/30 flex items-center justify-center mx-auto mb-4 group-hover:border-primary transition-colors duration-300">
                <step.icon className="h-5 w-5 text-primary" />
              </div>

              <h3
                className="font-semibold text-sm tracking-wider mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {step.title}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">{step.desc}</p>

              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-14 right-0 w-full h-px bg-border -z-10" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
