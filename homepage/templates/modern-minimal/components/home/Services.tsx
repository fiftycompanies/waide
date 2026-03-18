"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Home, Building, Paintbrush, Hammer, Sofa, Wrench } from "lucide-react";

const SERVICE_ICONS: Record<string, React.ElementType> = {
  "아파트 인테리어": Building,
  "리모델링": Hammer,
  "빌라 인테리어": Home,
  "오피스텔 인테리어": Building,
  "상업공간 인테리어": Paintbrush,
  "사무실 인테리어": Sofa,
  "부분 인테리어": Wrench,
  "올수리": Hammer,
};

const SERVICE_DESC: Record<string, string> = {
  "아파트 인테리어": "아파트 특성에 맞는 최적의 인테리어 설계와 시공",
  "리모델링": "노후 공간을 새롭게 탈바꿈하는 전문 리모델링",
  "빌라 인테리어": "빌라 구조에 특화된 맞춤형 인테리어",
  "오피스텔 인테리어": "효율적인 공간 활용의 오피스텔 인테리어",
  "상업공간 인테리어": "매장, 카페, 사무실 등 상업 공간 전문",
  "사무실 인테리어": "생산성을 높이는 쾌적한 오피스 공간",
  "부분 인테리어": "주방, 욕실, 거실 등 부분 리뉴얼",
  "올수리": "전체 공간을 새로 시공하는 올수리 전문",
};

export default function Services({ serviceTypes }: { serviceTypes: string[] }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const services = serviceTypes.length > 0 ? serviceTypes : ["아파트 인테리어", "리모델링", "부분 인테리어"];

  return (
    <section id="services" className="section-padding bg-bg-soft">
      <div className="container-wide" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-primary mb-2">SERVICE</p>
          <h2 className="text-3xl md:text-4xl font-bold">서비스 안내</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc, i) => {
            const Icon = SERVICE_ICONS[svc] || Paintbrush;
            const desc = SERVICE_DESC[svc] || `전문 ${svc} 서비스를 제공합니다`;
            return (
              <motion.div
                key={svc}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl bg-white border border-border-light hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{svc}</h3>
                <p className="text-sm text-text-secondary">{desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
