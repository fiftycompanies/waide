"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RevealWrapper from "@/components/shared/RevealWrapper";

const templates = [
  {
    name: "모던 미니멀",
    description:
      "깔끔하고 세련된 디자인. 심플한 레이아웃으로 시공 사례가 돋보입니다.",
    tag: "인기",
    bgGradient: "from-slate-50 to-blue-50",
    mockupBg: "bg-white",
    accent: "#3B82F6",
    accentName: "파란 포인트",
    headerBg: "bg-white",
    navDots: ["bg-blue-500", "bg-slate-200", "bg-slate-200", "bg-slate-200"],
    contentBlocks: [
      { h: "h-20", bg: "bg-gradient-to-r from-blue-500 to-blue-400" },
      { h: "h-3", bg: "bg-slate-100", w: "w-3/4" },
      { h: "h-3", bg: "bg-slate-100", w: "w-1/2" },
    ],
    cards: [
      "bg-gradient-to-br from-slate-100 to-blue-50",
      "bg-gradient-to-br from-blue-50 to-slate-100",
      "bg-gradient-to-br from-slate-50 to-blue-100",
    ],
    isDark: false,
  },
  {
    name: "내추럴 우드",
    description:
      "따뜻하고 자연스러운 분위기. 주거 인테리어 업체에 최적화되었습니다.",
    tag: "추천",
    bgGradient: "from-amber-50 to-orange-50",
    mockupBg: "bg-[#FFF8F0]",
    accent: "#92400E",
    accentName: "브라운 포인트",
    headerBg: "bg-[#FFF8F0]",
    navDots: [
      "bg-amber-700",
      "bg-amber-200",
      "bg-amber-200",
      "bg-amber-200",
    ],
    contentBlocks: [
      { h: "h-20", bg: "bg-gradient-to-r from-amber-700 to-amber-500" },
      { h: "h-3", bg: "bg-amber-100", w: "w-3/4" },
      { h: "h-3", bg: "bg-amber-100", w: "w-1/2" },
    ],
    cards: [
      "bg-gradient-to-br from-amber-100 to-orange-50",
      "bg-gradient-to-br from-orange-50 to-amber-100",
      "bg-gradient-to-br from-amber-50 to-orange-100",
    ],
    isDark: false,
  },
  {
    name: "프리미엄 다크",
    description:
      "고급스럽고 임팩트 있는 디자인. 상업 공간 전문 업체에 어울립니다.",
    tag: "프리미엄",
    bgGradient: "from-slate-800 to-slate-900",
    mockupBg: "bg-[#1a1a2e]",
    accent: "#D4A843",
    accentName: "골드 포인트",
    headerBg: "bg-[#1a1a2e]",
    navDots: [
      "bg-yellow-500",
      "bg-slate-600",
      "bg-slate-600",
      "bg-slate-600",
    ],
    contentBlocks: [
      { h: "h-20", bg: "bg-gradient-to-r from-yellow-600 to-amber-500" },
      { h: "h-3", bg: "bg-slate-700", w: "w-3/4" },
      { h: "h-3", bg: "bg-slate-700", w: "w-1/2" },
    ],
    cards: [
      "bg-gradient-to-br from-slate-700 to-slate-800",
      "bg-gradient-to-br from-slate-800 to-slate-700",
      "bg-gradient-to-br from-slate-700 to-yellow-900/20",
    ],
    isDark: true,
  },
];

function TemplateMockup({
  template,
  large = false,
}: {
  template: (typeof templates)[0];
  large?: boolean;
}) {
  return (
    <div
      className={`${template.mockupBg} ${
        large ? "rounded-xl" : "rounded-t-xl"
      } shadow-lg overflow-hidden`}
    >
      {/* Browser bar */}
      <div
        className={`${template.headerBg} border-b ${
          template.isDark ? "border-slate-700" : "border-slate-100"
        } px-4 py-2.5 flex items-center gap-2`}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
        </div>
        <div
          className={`ml-3 flex-1 h-5 rounded-md ${
            template.isDark ? "bg-slate-700" : "bg-slate-100"
          }`}
        />
      </div>

      {/* Page content mockup */}
      <div className={`p-4 ${large ? "p-6" : "p-4"} space-y-3`}>
        {/* Navigation */}
        <div className="flex items-center gap-2 mb-3">
          {template.navDots.map((dot, i) => (
            <div
              key={i}
              className={`h-2 ${
                i === 0 ? "w-8" : "w-6"
              } rounded-full ${dot}`}
            />
          ))}
        </div>

        {/* Hero block */}
        <div
          className={`${large ? "h-32" : template.contentBlocks[0].h} ${
            template.contentBlocks[0].bg
          } rounded-lg`}
        />

        {/* Text lines */}
        {template.contentBlocks.slice(1).map((block, i) => (
          <div
            key={i}
            className={`${block.h} ${block.w} ${block.bg} rounded-full`}
          />
        ))}

        {/* Cards grid */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {template.cards.map((card, i) => (
            <div
              key={i}
              className={`${large ? "h-20" : "h-14"} ${card} rounded-lg`}
            />
          ))}
        </div>

        {/* Extra content for large view */}
        {large && (
          <>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {template.cards.slice(0, 2).map((card, i) => (
                <div key={i} className={`h-16 ${card} rounded-lg`} />
              ))}
            </div>
            <div
              className={`h-3 w-2/3 ${template.contentBlocks[1].bg} rounded-full mt-3`}
            />
            <div
              className={`h-3 w-1/3 ${template.contentBlocks[2].bg} rounded-full`}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function Templates() {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  return (
    <section className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <RevealWrapper className="text-center mb-16 lg:mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-4">
            디자인 템플릿
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary leading-tight">
            3가지 프리미엄 템플릿
          </h2>
          <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
            업체의 스타일에 맞는 템플릿을 선택하세요. 모두 모바일에 완벽
            대응합니다.
          </p>
        </RevealWrapper>

        {/* Template Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {templates.map((template, index) => (
            <RevealWrapper key={index} delay={index * 0.15}>
              <div className="group relative rounded-2xl border border-border hover:border-accent/30 overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                {/* Mockup Preview */}
                <div
                  className={`relative bg-gradient-to-br ${template.bgGradient} p-6 pb-0`}
                >
                  {/* Tag */}
                  <div className="absolute top-4 right-4 z-10">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        template.isDark
                          ? "bg-yellow-500 text-slate-900"
                          : "bg-white text-text-primary shadow-sm"
                      }`}
                    >
                      {template.tag}
                    </span>
                  </div>

                  {/* Browser mockup */}
                  <TemplateMockup template={template} />
                </div>

                {/* Info */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-primary">
                      {template.name}
                    </h3>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${template.accent}15`,
                        color: template.accent,
                      }}
                    >
                      {template.accentName}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    {template.description}
                  </p>
                  <button
                    onClick={() => setSelectedTemplate(index)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-hover transition-colors group/btn"
                  >
                    <Eye className="w-4 h-4" />
                    미리보기
                    <span className="inline-block transition-transform group-hover/btn:translate-x-0.5">
                      &rarr;
                    </span>
                  </button>
                </div>
              </div>
            </RevealWrapper>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedTemplate !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
            onClick={() => setSelectedTemplate(null)}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
              className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedTemplate(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Template info header */}
              <div className="bg-white rounded-t-2xl px-6 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-primary">
                    {templates[selectedTemplate].name}
                  </h3>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${templates[selectedTemplate].accent}15`,
                      color: templates[selectedTemplate].accent,
                    }}
                  >
                    {templates[selectedTemplate].accentName}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-1">
                  {templates[selectedTemplate].description}
                </p>
              </div>

              {/* Large mockup */}
              <div
                className={`bg-gradient-to-br ${templates[selectedTemplate].bgGradient} p-6 sm:p-10 rounded-b-2xl`}
              >
                <TemplateMockup
                  template={templates[selectedTemplate]}
                  large
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
