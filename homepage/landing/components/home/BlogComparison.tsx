"use client";

import RevealWrapper from "@/components/shared/RevealWrapper";

const comparisonRows = [
  {
    label: "네이버 노출",
    emoji: "\uD83D\uDD0D",
    naver: { text: "블로그만", status: "warning" as const },
    homepage: { text: "홈페이지 전체", status: "good" as const },
  },
  {
    label: "구글·다음 노출",
    emoji: "\uD83C\uDF10",
    naver: { text: "안 됨", status: "bad" as const },
    homepage: { text: "전부 노출", status: "good" as const },
  },
  {
    label: "AI 검색",
    emoji: "\uD83E\uDD16",
    naver: { text: "읽지 못함", status: "bad" as const },
    homepage: { text: "크롤링·추천", status: "good" as const },
  },
  {
    label: "검색 점수 축적",
    emoji: "\uD83D\uDCC8",
    naver: { text: "블로그 점수만", status: "warning" as const },
    homepage: { text: "홈페이지 DA\u2191", status: "good" as const },
  },
  {
    label: "고객 이탈",
    emoji: "\uD83D\uDEAA",
    naver: { text: "다른 광고로 이탈", status: "bad" as const },
    homepage: { text: "바로 견적 신청", status: "good" as const },
  },
  {
    label: "브랜드 자산",
    emoji: "\uD83C\uDFE0",
    naver: { text: "네이버 소유", status: "bad" as const },
    homepage: { text: "사장님 자산", status: "good" as const },
  },
];

const cycleSteps = [
  { emoji: "\u270D\uFE0F", title: "블로그 발행", description: "시공 사례 포스팅" },
  { emoji: "\uD83D\uDD0D", title: "검색 노출", description: "네이버·구글·AI" },
  { emoji: "\uD83D\uDC40", title: "포트폴리오", description: "고객이 사례 확인" },
  { emoji: "\uD83D\uDCCB", title: "견적 문의", description: "이탈 없이 전환" },
];

function StatusIcon({ status }: { status: "good" | "bad" | "warning" }) {
  if (status === "good") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex-shrink-0">
        &#10003;
      </span>
    );
  }
  if (status === "bad") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex-shrink-0">
        &#10005;
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex-shrink-0">
      &#9651;
    </span>
  );
}

export default function BlogComparison() {
  return (
    <section id="why-blog" className="py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <RevealWrapper className="text-center mb-16 lg:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            왜 홈페이지 블로그?
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary leading-tight">
            왜 홈페이지 블로그인가?
          </h2>
          <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
            네이버 블로그 vs 홈페이지 블로그
          </p>
        </RevealWrapper>

        {/* Comparison Table */}
        <RevealWrapper>
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-surface-alt border-b border-border">
              <div className="px-6 py-4 text-sm font-semibold text-text-secondary">
                항목
              </div>
              <div className="px-6 py-4 text-sm font-semibold text-text-secondary text-center">
                네이버 블로그
              </div>
              <div className="px-6 py-4 text-sm font-semibold text-accent text-center">
                홈페이지 블로그
              </div>
            </div>

            {/* Table Rows */}
            {comparisonRows.map((row, index) => (
              <div
                key={index}
                className={`grid grid-cols-3 ${
                  index < comparisonRows.length - 1
                    ? "border-b border-border-light"
                    : ""
                } hover:bg-surface-alt/50 transition-colors`}
              >
                <div className="px-6 py-4 flex items-center gap-2">
                  <span className="text-base">{row.emoji}</span>
                  <span className="text-sm font-medium text-primary">
                    {row.label}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-center gap-2">
                  <StatusIcon status={row.naver.status} />
                  <span className="text-sm text-text-secondary">
                    {row.naver.text}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-center gap-2">
                  <StatusIcon status={row.homepage.status} />
                  <span className="text-sm text-primary font-medium">
                    {row.homepage.text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </RevealWrapper>

        {/* Cycle Steps */}
        <RevealWrapper delay={0.2}>
          <div className="mt-16">
            <h3 className="text-center text-xl lg:text-2xl font-bold text-primary mb-10">
              홈페이지 블로그의 선순환 구조
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cycleSteps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-surface-alt border border-border hover:border-accent/30 transition-colors">
                    <span className="text-3xl mb-3">{step.emoji}</span>
                    <h4 className="text-base font-bold text-primary mb-1">
                      {step.title}
                    </h4>
                    <p className="text-sm text-text-secondary">
                      {step.description}
                    </p>
                  </div>
                  {/* Arrow between steps */}
                  {index < cycleSteps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-2.5 -translate-y-1/2 z-10 text-text-muted">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M7 4l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </RevealWrapper>

        {/* Bottom emphasis */}
        <RevealWrapper delay={0.3}>
          <div className="mt-12 text-center">
            <p className="inline-block px-6 py-3 rounded-full bg-accent/10 text-accent font-semibold text-sm lg:text-base">
              글이 쌓일수록 검색 순위가 올라가고, 고객이 먼저 찾아옵니다
            </p>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}
