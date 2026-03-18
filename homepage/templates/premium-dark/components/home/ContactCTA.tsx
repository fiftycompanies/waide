"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ArrowRight, Loader2, CheckCircle } from "lucide-react";

export default function ContactCTA({ projectId }: { projectId: string }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    area_pyeong: "",
    space_type: "",
    budget_range: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    if (!form.name || !form.phone) return;

    startTransition(async () => {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          name: form.name,
          phone: form.phone,
          area_pyeong: form.area_pyeong ? parseInt(form.area_pyeong) : null,
          space_type: form.space_type || null,
          budget_range: form.budget_range || null,
          message: form.message || null,
        }),
      });

      if (res.ok) setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <section id="contact" className="section-padding bg-bg-soft">
        <div className="container-narrow text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            THANK YOU
          </h2>
          <p className="text-text-secondary text-sm tracking-wide">담당자가 빠른 시일 내 연락드리겠습니다</p>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="section-padding bg-bg-soft">
      <div className="container-narrow" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <div className="w-10 h-px bg-primary mx-auto mb-6" />
          <h2
            className="text-3xl md:text-5xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            CONSULTATION
          </h2>
          <p className="text-text-secondary mt-4 text-sm tracking-wide">
            프리미엄 맞춤 상담을 신청하세요
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="max-w-xl mx-auto"
        >
          {/* Honeypot */}
          <div className="absolute opacity-0 pointer-events-none" aria-hidden="true">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium tracking-wider text-text-secondary mb-2">NAME *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-12 px-4 bg-transparent border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider text-text-secondary mb-2">PHONE *</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full h-12 px-4 bg-transparent border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="010-0000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium tracking-wider text-text-secondary mb-2">SIZE</label>
                <input
                  type="number"
                  value={form.area_pyeong}
                  onChange={(e) => setForm({ ...form, area_pyeong: e.target.value })}
                  className="w-full h-12 px-4 bg-transparent border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider text-text-secondary mb-2">TYPE</label>
                <select
                  value={form.space_type}
                  onChange={(e) => setForm({ ...form, space_type: e.target.value })}
                  className="w-full h-12 px-4 bg-transparent border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="" className="bg-bg">선택</option>
                  <option value="아파트" className="bg-bg">아파트</option>
                  <option value="빌라" className="bg-bg">빌라</option>
                  <option value="오피스텔" className="bg-bg">오피스텔</option>
                  <option value="상업공간" className="bg-bg">상업공간</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider text-text-secondary mb-2">BUDGET</label>
                <select
                  value={form.budget_range}
                  onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
                  className="w-full h-12 px-4 bg-transparent border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="" className="bg-bg">선택</option>
                  <option value="3000만~5000만" className="bg-bg">3000만~5000만</option>
                  <option value="5000만~8000만" className="bg-bg">5000만~8000만</option>
                  <option value="8000만~1억" className="bg-bg">8000만~1억</option>
                  <option value="1억~2억" className="bg-bg">1억~2억</option>
                  <option value="2억 이상" className="bg-bg">2억 이상</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wider text-text-secondary mb-2">MESSAGE</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full h-28 px-4 py-3 bg-transparent border border-border text-text text-sm resize-none focus:outline-none focus:border-primary transition-colors"
                placeholder="궁금한 점이나 요청사항을 남겨주세요"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-14 bg-primary text-bg text-sm font-medium tracking-widest hover:bg-primary-light transition-colors duration-300 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  SUBMIT
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
