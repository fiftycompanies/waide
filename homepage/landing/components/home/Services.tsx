"use client";

import RevealWrapper from "@/components/shared/RevealWrapper";

const services = [
  {
    number: "01",
    title: "프리미엄 홈페이지 제작",
    description:
      "포트폴리오, 고객 후기, 견적 신청까지 — 이 홈페이지 하나가 24시간 영업사원입니다.",
    features: [
      { emoji: "\uD83D\uDDBC", label: "포트폴리오 갤러리", detail: "카테고리별 필터" },
      { emoji: "\uD83D\uDCF1", label: "모바일 반응형", detail: "100% 대응" },
      { emoji: "\uD83D\uDCCB", label: "견적 신청 폼", detail: "온라인 접수" },
      { emoji: "\uD83D\uDCAC", label: "카카오톡 연동", detail: "실시간 상담" },
      { emoji: "\u2B50", label: "고객 후기", detail: "신뢰도 상승" },
      { emoji: "\uD83D\uDD0D", label: "검색 최적화", detail: "SEO/AEO 대응" },
    ],
    gradient: "from-blue-500/5 to-indigo-500/5",
    borderColor: "hover:border-blue-300",
    numberColor: "text-blue-500",
  },
  {
    number: "02",
    title: "브랜드 디자인",
    description:
      "사장님 업체만의 로고·명함·컬러를 완성해드립니다.",
    features: [
      { emoji: "\uD83C\uDFA8", label: "로고 디자인", detail: "업체 컨셉에 맞춘 전용 로고" },
      { emoji: "\uD83E\uDEAA", label: "명함 디자인", detail: "현장에서 바로 쓰는 명함" },
      { emoji: "\uD83C\uDFAF", label: "컬러·톤앤매너", detail: "일관된 브랜드 아이덴티티" },
    ],
    gradient: "from-violet-500/5 to-purple-500/5",
    borderColor: "hover:border-violet-300",
    numberColor: "text-violet-500",
  },
  {
    number: "03",
    title: "홈페이지 블로그 포스팅",
    description:
      "사장님 홈페이지에 직접 발행하는 검색 최적화 블로그",
    features: [
      { emoji: "\uD83D\uDD0D", label: "네이버·구글 노출", detail: "" },
      { emoji: "\uD83E\uDD16", label: "AI 검색 대응", detail: "" },
      { emoji: "\uD83D\uDCCD", label: "지역 키워드 선점", detail: "" },
      { emoji: "\uD83D\uDCDD", label: "월 8회·건당 2만원", detail: "" },
    ],
    gradient: "from-emerald-500/5 to-teal-500/5",
    borderColor: "hover:border-emerald-300",
    numberColor: "text-emerald-500",
  },
  {
    number: "04",
    title: "네이버 플레이스 마케팅",
    description:
      "네이버 지도에서 사장님 업체를 눈에 띄게 만듭니다.",
    features: [
      { emoji: "\uD83D\uDCCC", label: "플레이스 등록", detail: "" },
      { emoji: "\u2B50", label: "리뷰 관리", detail: "" },
      { emoji: "\uD83D\uDCCD", label: "지역 검색 노출", detail: "" },
      { emoji: "\uD83D\uDCCA", label: "순위 최적화", detail: "" },
    ],
    gradient: "from-amber-500/5 to-orange-500/5",
    borderColor: "hover:border-amber-300",
    numberColor: "text-amber-500",
  },
];

export default function Services() {
  return (
    <section id="service" className="py-24 lg:py-32 bg-surface-alt">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <RevealWrapper className="text-center mb-16 lg:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            서비스
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary leading-tight">
            사장님 업체에 필요한 전부,
            <br />
            한 곳에서 해결합니다
          </h2>
        </RevealWrapper>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <RevealWrapper key={index} delay={index * 0.1}>
              <div
                className={`group relative h-full p-8 lg:p-10 rounded-2xl bg-white border border-border ${service.borderColor} hover:shadow-xl transition-all duration-300`}
              >
                {/* Number badge */}
                <div className="flex items-center gap-3 mb-5">
                  <span
                    className={`text-sm font-bold ${service.numberColor} bg-gradient-to-br ${service.gradient} px-3 py-1 rounded-full`}
                  >
                    {service.number}
                  </span>
                  <h3 className="text-xl lg:text-2xl font-bold text-primary">
                    {service.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-text-secondary leading-relaxed mb-6">
                  {service.description}
                </p>

                {/* Features grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.features.map((feature, fIndex) => (
                    <div
                      key={fIndex}
                      className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br ${service.gradient} transition-colors`}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {feature.emoji}
                      </span>
                      <div>
                        <span className="text-sm font-semibold text-primary">
                          {feature.label}
                        </span>
                        {feature.detail && (
                          <span className="text-sm text-text-muted ml-1">
                            — {feature.detail}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </RevealWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}
