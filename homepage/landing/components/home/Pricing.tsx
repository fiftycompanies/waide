"use client";

import { Check, Minus, Star } from "lucide-react";
import RevealWrapper from "@/components/shared/RevealWrapper";

const plans = [
  {
    name: "올인원 패키지",
    price: "16만",
    priceDetail: "월",
    priceSub: "블로그 8회 포함",
    description: "홈페이지 + 브랜드 + 블로그 전부 포함",
    popular: true,
    features: [
      { text: "프리미엄 홈페이지 제작", included: true },
      { text: "브랜드 디자인 (로고·명함·컬러)", included: true },
      { text: "홈페이지 블로그 포스팅 월 8회", included: true },
      { text: "SEO·AEO 검색 최적화", included: true },
      { text: "모바일 반응형 100%", included: true },
      { text: "견적 신청 폼·카카오톡 연동", included: true },
    ],
    note: "블로그 포스팅 건당 2만원 x 월 8회 = 월 16만원. 사장님은 시공 사진만 보내주시면 글은 저희가 전부 씁니다.",
    noteType: "info" as const,
    cta: "상담 신청하기",
    gradient: "from-accent to-blue-600",
  },
  {
    name: "홈페이지만 구매",
    price: "30만",
    priceDetail: "",
    priceSub: "일시불",
    description: "홈페이지 + 브랜드 디자인만 포함",
    popular: false,
    features: [
      { text: "프리미엄 홈페이지 제작", included: true },
      { text: "브랜드 디자인 (로고·명함·컬러)", included: true },
      { text: "블로그 포스팅 미포함", included: false },
      { text: "SEO·AEO 최적화 미포함", included: false },
      { text: "모바일 반응형 100%", included: true },
      { text: "견적 신청 폼·카카오톡 연동", included: true },
    ],
    note: "블로그 1개월 진행 후 중단 시 -> 홈페이지 30만원 구매 필수. 미구매 시 홈페이지 삭제",
    noteType: "warning" as const,
    cta: "상담 신청하기",
    gradient: "from-slate-600 to-slate-700",
  },
];

export default function Pricing() {
  const handleScroll = () => {
    const el = document.querySelector("#contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-surface-alt">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <RevealWrapper className="text-center mb-16 lg:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-sm font-medium mb-4">
            가격 안내
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary leading-tight">
            투명한 가격, 숨김 없이
          </h2>
        </RevealWrapper>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <RevealWrapper key={index} delay={index * 0.15}>
              <div
                className={`relative h-full rounded-2xl border-2 p-8 lg:p-10 transition-all duration-300 ${
                  plan.popular
                    ? "border-accent bg-white shadow-xl shadow-accent/10 scale-[1.02]"
                    : "border-border bg-white hover:border-border/80 hover:shadow-lg"
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent text-white text-sm font-semibold shadow-lg shadow-accent/30">
                      <Star className="w-3.5 h-3.5 fill-white" />
                      BEST
                    </div>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-primary mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-text-secondary mb-6">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    {plan.priceDetail && (
                      <span className="text-sm text-text-muted">
                        {plan.priceDetail}
                      </span>
                    )}
                    <span className="text-4xl lg:text-5xl font-extrabold text-primary">
                      {plan.price}
                    </span>
                    <span className="text-lg text-text-muted">원</span>
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    {plan.priceSub}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                          feature.included
                            ? "bg-secondary/10"
                            : "bg-slate-100"
                        }`}
                      >
                        {feature.included ? (
                          <Check className="w-3 h-3 text-secondary" />
                        ) : (
                          <Minus className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          feature.included
                            ? "text-text-primary"
                            : "text-text-muted"
                        }`}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Note */}
                {plan.note && (
                  <div
                    className={`p-4 rounded-xl text-xs leading-relaxed mb-6 ${
                      plan.noteType === "warning"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-accent/5 text-accent border border-accent/10"
                    }`}
                  >
                    {plan.note}
                  </div>
                )}

                {/* CTA */}
                <button
                  onClick={handleScroll}
                  className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all duration-200 ${
                    plan.popular
                      ? "bg-accent text-white hover:bg-accent-hover shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30"
                      : "bg-primary text-white hover:bg-primary-light"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </RevealWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}
