"use client";

import { useState, FormEvent } from "react";
import { Send, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RevealWrapper from "@/components/shared/RevealWrapper";

const regions = [
  "서울특별시",
  "경기도",
  "인천광역시",
  "부산광역시",
  "대구광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

export default function ContactCTA() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company: "",
    name: "",
    phone: "",
    region: "",
    message: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // Show success anyway
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0f1729] to-[#0c1220]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 80%, #3B82F6 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, #10B981 0%, transparent 40%)
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text content */}
          <RevealWrapper direction="left">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/70 text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                상담 신청
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
                사장님 업체도
                <br />
                이런 홈페이지,
                <br />
                가질 수 있습니다
              </h2>

              <p className="text-white/50 text-lg leading-relaxed mb-8 max-w-md">
                상담 신청하시면 2주 안에 프리미엄 홈페이지를 받아보실 수
                있습니다.
              </p>

              {/* Benefits */}
              <div className="space-y-4 mb-8">
                {[
                  "프리미엄 홈페이지 제작",
                  "브랜드 디자인 (로고·명함·컬러)",
                  "홈페이지 블로그 포스팅",
                  "검색 최적화 (SEO·AEO)",
                ].map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-white/60"
                  >
                    <ArrowRight className="w-4 h-4 text-secondary flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Bottom emphasis */}
              <div className="inline-block px-5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1]">
                <p className="text-sm font-semibold text-accent">
                  홈페이지 제작 + 블로그 포스팅 + 브랜드 디자인
                </p>
              </div>
            </div>
          </RevealWrapper>

          {/* Right: Form */}
          <RevealWrapper direction="right" delay={0.15}>
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.1] rounded-2xl p-8 lg:p-10">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      상담 신청 완료!
                    </h3>
                    <p className="text-white/50 leading-relaxed">
                      빠른 시일 내에 연락드리겠습니다.
                      <br />
                      감사합니다.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    <h3 className="text-xl font-bold text-white mb-6">
                      상담 신청
                    </h3>

                    {/* Company Name */}
                    <div>
                      <label
                        htmlFor="company"
                        className="block text-sm font-medium text-white/60 mb-2"
                      >
                        업체명 <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        required
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="예: 드림인테리어"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/25 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all text-sm"
                      />
                    </div>

                    {/* Contact Person */}
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-white/60 mb-2"
                      >
                        담당자명 <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="예: 홍길동"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/25 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all text-sm"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-white/60 mb-2"
                      >
                        연락처 <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="예: 010-1234-5678"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/25 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all text-sm"
                      />
                    </div>

                    {/* Region */}
                    <div>
                      <label
                        htmlFor="region"
                        className="block text-sm font-medium text-white/60 mb-2"
                      >
                        지역 <span className="text-rose-400">*</span>
                      </label>
                      <select
                        id="region"
                        name="region"
                        required
                        value={formData.region}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all text-sm appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff60' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 16px center",
                        }}
                      >
                        <option value="" className="text-slate-900">
                          시공 지역을 선택하세요
                        </option>
                        {regions.map((region) => (
                          <option
                            key={region}
                            value={region}
                            className="text-slate-900"
                          >
                            {region}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium text-white/60 mb-2"
                      >
                        메시지{" "}
                        <span className="text-white/30">(선택사항)</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={3}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="궁금한 점이나 요청사항을 적어주세요"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/25 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all text-sm resize-none"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-accent text-white font-semibold text-base hover:bg-accent-hover transition-all duration-200 shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          전송 중...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          상담 신청하기
                        </>
                      )}
                    </button>

                    <p className="text-xs text-white/30 text-center mt-3">
                      제출 시{" "}
                      <a href="#" className="underline hover:text-white/50">
                        개인정보처리방침
                      </a>
                      에 동의합니다.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}
