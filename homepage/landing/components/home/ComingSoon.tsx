"use client";

import RevealWrapper from "@/components/shared/RevealWrapper";

const comingSoonItems = [
  {
    badge: "3주 후 오픈",
    badgeColor: "bg-accent/20 text-accent",
    title: "샤플로(Shoplo)",
    description: "AI 기반 시공 스케줄링·관리 플랫폼",
    features: [
      { emoji: "\uD83D\uDCC5", label: "일정 자동화" },
      { emoji: "\uD83D\uDC77", label: "시공자 배정" },
      { emoji: "\uD83D\uDCCA", label: "현황 대시보드" },
    ],
  },
  {
    badge: "준비 중",
    badgeColor: "bg-emerald-500/20 text-emerald-400",
    title: "AI 사진 보정",
    description: "시공 사진 -> AI가 프로 수준으로 자동 보정",
    features: [
      { emoji: "\uD83D\uDCA1", label: "조명 보정" },
      { emoji: "\uD83C\uDFA8", label: "색감 보정" },
      { emoji: "\u2728", label: "퀄리티 UP" },
    ],
  },
];

export default function ComingSoon() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Dark background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0f1729] to-[#0c1220]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 50%, #3B82F6 0%, transparent 50%),
              radial-gradient(circle at 70% 50%, #10B981 0%, transparent 40%)
            `,
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <RevealWrapper className="text-center mb-16 lg:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/[0.08] text-white/70 text-sm font-medium mb-4 border border-white/[0.12]">
            Coming Soon
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            곧 만나보실 수 있습니다
          </h2>
          <p className="mt-4 text-white/50 text-lg max-w-xl mx-auto">
            더 강력한 서비스를 준비하고 있습니다.
          </p>
        </RevealWrapper>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {comingSoonItems.map((item, index) => (
            <RevealWrapper key={index} delay={index * 0.15}>
              <div className="group relative h-full p-8 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hover:-translate-y-1">
                {/* Badge */}
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-5 ${item.badgeColor}`}
                >
                  {item.badge}
                </span>

                {/* Title */}
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-white/50 leading-relaxed mb-6">
                  {item.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-3">
                  {item.features.map((feature, fIndex) => (
                    <span
                      key={fIndex}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/70 text-sm"
                    >
                      <span>{feature.emoji}</span>
                      {feature.label}
                    </span>
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
