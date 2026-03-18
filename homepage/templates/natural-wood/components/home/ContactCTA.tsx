"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Send, Loader2, CheckCircle } from "lucide-react";

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
      <section id="contact" className="section-padding bg-primary/5">
        <div className="container-narrow text-center">
          <CheckCircle className="h-16 w-16 text-secondary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            상담 신청이 완료되었습니다
          </h2>
          <p className="text-text-secondary">담당자가 빠른 시일 내 연락드리겠습니다</p>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="section-padding bg-primary/5">
      <div className="container-narrow" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-10"
        >
          <div className="w-8 h-0.5 bg-accent mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            무료 상담 신청
          </h2>
          <p className="text-text-secondary mt-3">
            전문 상담사가 맞춤 견적을 안내해드립니다
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="max-w-lg mx-auto bg-surface rounded-3xl p-8 border border-border-light shadow-sm"
        >
          {/* Honeypot */}
          <div className="absolute opacity-0 pointer-events-none" aria-hidden="true">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">이름 *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-2xl border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">연락처 *</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full h-11 px-4 rounded-2xl border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="010-0000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">평수</label>
                <input
                  type="number"
                  value={form.area_pyeong}
                  onChange={(e) => setForm({ ...form, area_pyeong: e.target.value })}
                  className="w-full h-11 px-4 rounded-2xl border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">공간 유형</label>
                <select
                  value={form.space_type}
                  onChange={(e) => setForm({ ...form, space_type: e.target.value })}
                  className="w-full h-11 px-4 rounded-2xl border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">선택</option>
                  <option value="아파트">아파트</option>
                  <option value="빌라">빌라</option>
                  <option value="오피스텔">오피스텔</option>
                  <option value="상업공간">상업공간</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">예산</label>
                <select
                  value={form.budget_range}
                  onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
                  className="w-full h-11 px-4 rounded-2xl border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">선택</option>
                  <option value="1000만~3000만">1000만~3000만</option>
                  <option value="3000만~5000만">3000만~5000만</option>
                  <option value="5000만~8000만">5000만~8000만</option>
                  <option value="8000만~1억">8000만~1억</option>
                  <option value="1억 이상">1억 이상</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">문의 내용</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full h-24 px-4 py-3 rounded-2xl border border-border bg-bg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="궁금한 점이나 요청사항을 남겨주세요"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-12 rounded-3xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  무료 상담 신청하기
                </>
              )}
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
