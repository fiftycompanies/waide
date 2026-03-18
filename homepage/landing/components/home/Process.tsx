"use client";

import { Phone, Palette, Monitor, FileText, TrendingUp } from "lucide-react";
import RevealWrapper from "@/components/shared/RevealWrapper";

const steps = [
  {
    number: "01",
    icon: Phone,
    title: "무료 상담",
    description: "전화 상담으로 니즈 파악",
    gradient: "from-blue-500 to-blue-600",
    lightBg: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    number: "02",
    icon: Palette,
    title: "브랜드 디자인",
    description: "로고·명함·컬러 완성",
    gradient: "from-violet-500 to-violet-600",
    lightBg: "bg-violet-50",
    textColor: "text-violet-600",
  },
  {
    number: "03",
    icon: Monitor,
    title: "홈페이지 제작",
    description: "브랜딩 반영 프리미엄 웹 구축",
    gradient: "from-emerald-500 to-emerald-600",
    lightBg: "bg-emerald-50",
    textColor: "text-emerald-600",
  },
  {
    number: "04",
    icon: FileText,
    title: "블로그 운영",
    description: "월 8회 포스팅",
    gradient: "from-amber-500 to-amber-600",
    lightBg: "bg-amber-50",
    textColor: "text-amber-600",
  },
  {
    number: "05",
    icon: TrendingUp,
    title: "고객 유입",
    description: "검색 노출로 견적 문의 증가",
    gradient: "from-rose-500 to-rose-600",
    lightBg: "bg-rose-50",
    textColor: "text-rose-600",
  },
];

export default function Process() {
  return (
    <section id="process" className="py-24 lg:py-32 bg-surface-alt">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <RevealWrapper className="text-center mb-16 lg:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-violet-50 text-violet-600 text-sm font-medium mb-4">
            진행 프로세스
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary leading-tight">
            이렇게 시작됩니다
          </h2>
          <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
            사장님은 사진만 보내주시면 됩니다.
          </p>
        </RevealWrapper>

        {/* Steps */}
        <div className="relative">
          {/* Connection line (desktop) */}
          <div className="hidden lg:block absolute top-[100px] left-[10%] right-[10%] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-blue-200 via-violet-200 via-emerald-200 via-amber-200 to-rose-200 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <RevealWrapper key={index} delay={index * 0.1}>
                  <div className="relative text-center group">
                    {/* Step number circle */}
                    <div className="relative inline-flex items-center justify-center mb-6">
                      <div
                        className={`w-[100px] h-[100px] lg:w-[110px] lg:h-[110px] rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                      >
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      {/* Number badge */}
                      <div
                        className={`absolute -top-1 -right-1 w-9 h-9 rounded-full ${step.lightBg} border-4 border-surface-alt flex items-center justify-center`}
                      >
                        <span
                          className={`text-xs font-bold ${step.textColor}`}
                        >
                          {step.number}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg lg:text-xl font-bold text-primary mb-2">
                      {step.title}
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed max-w-[180px] mx-auto">
                      {step.description}
                    </p>

                    {/* Mobile connector */}
                    {index < steps.length - 1 && (
                      <div className="lg:hidden flex justify-center mt-6">
                        <div className="w-[2px] h-6 bg-gradient-to-b from-border to-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                </RevealWrapper>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
