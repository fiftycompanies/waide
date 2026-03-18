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
    <section className="section-padding bg-bg-soft">
      <div className="container-wide" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-14"
        >
          <div className="w-8 h-0.5 bg-accent mx-auto mb-4" />
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            시공 프로세스
          </h2>
          <p className="text-text-secondary mt-3">
            체계적인 5단계 프로세스로 완벽한 공간을 만듭니다
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12 }}
              className="relative text-center p-6"
            >
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <span className="absolute top-2 right-1/2 translate-x-1/2 text-6xl font-bold text-bg-muted -z-10" style={{ fontFamily: "var(--font-heading)" }}>
                {i + 1}
              </span>
              <h3 className="font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                {step.title}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">{step.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-12 right-0 w-full h-0.5 bg-border-light -z-10" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
