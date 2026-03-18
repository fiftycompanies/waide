"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RevealWrapper from "@/components/shared/RevealWrapper";

const faqs = [
  {
    question: "비용 구조가 어떻게 되나요?",
    answer:
      "올인원 패키지로 홈페이지, 브랜드 디자인, 블로그 포스팅이 모두 포함됩니다. 홈페이지 제작비는 별도로 청구하지 않습니다. 사장님은 시공 사진만 제공해 주시면 됩니다.",
  },
  {
    question: "홈페이지 제작은 얼마나 걸리나요?",
    answer:
      "브랜드 디자인 포함하여 약 2주가 소요됩니다. 사진과 업체 정보 전달이 빠를수록 제작 기간이 단축됩니다.",
  },
  {
    question: "네이버 블로그와 뭐가 다른가요?",
    answer:
      "네이버 블로그는 네이버에서만 노출되고 블로그 점수만 올라갑니다. 홈페이지 내부 블로그는 홈페이지 자체의 검색 순위를 올려주며, 네이버·구글·다음은 물론 ChatGPT 같은 AI 검색에도 노출됩니다.",
  },
  {
    question: "사진은 어떻게 보내면 되나요?",
    answer:
      "카카오톡이나 이메일로 시공 전/후 사진, 현장 사진 등을 보내주시면 됩니다. 저희가 글과 함께 정리해드립니다.",
  },
  {
    question: "중간에 그만두면 어떻게 되나요?",
    answer:
      "블로그 포스팅 1개월 진행 후 중단하실 경우, 홈페이지는 30만원에 구매하실 수 있습니다. 미구매 시 홈페이지는 삭제되며, 발행된 블로그 글은 함께 유지됩니다.",
  },
];

function FAQItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <RevealWrapper delay={index * 0.08}>
      <div className="border-b border-border last:border-b-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-4 py-5 lg:py-6 text-left group"
          aria-expanded={isOpen}
        >
          <span className="text-base lg:text-lg font-semibold text-primary group-hover:text-accent transition-colors pr-4">
            {question}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronDown
              className={`w-5 h-5 transition-colors ${
                isOpen ? "text-accent" : "text-text-muted"
              }`}
            />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
              className="overflow-hidden"
            >
              <p className="pb-5 lg:pb-6 text-text-secondary leading-relaxed pr-12">
                {answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RevealWrapper>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-24 lg:py-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <RevealWrapper className="text-center mb-12 lg:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-50 text-amber-600 text-sm font-medium mb-4">
            궁금한 점
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary leading-tight">
            자주 묻는 질문
          </h2>
          <p className="mt-4 text-text-secondary text-lg">
            궁금한 점이 더 있으시다면 언제든 상담을 요청해 주세요.
          </p>
        </RevealWrapper>

        {/* FAQ Items */}
        <div className="bg-white rounded-2xl border border-border px-6 lg:px-8">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
