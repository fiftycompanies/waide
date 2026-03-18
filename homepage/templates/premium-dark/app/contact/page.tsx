"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2, CheckCircle, MapPin, Phone, Clock } from "lucide-react";
import Link from "next/link";

const PROJECT_ID = process.env.NEXT_PUBLIC_HOMEPAGE_PROJECT_ID || process.env.HOMEPAGE_PROJECT_ID || "";

export default function ContactPage() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    if (honeypot) return;

    if (!form.name.trim() || !form.phone.trim()) {
      setError("이름과 연락처는 필수 항목입니다.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/inquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: PROJECT_ID,
            name: form.name.trim(),
            phone: form.phone.trim(),
            area_pyeong: form.area_pyeong ? parseInt(form.area_pyeong) : null,
            space_type: form.space_type || null,
            budget_range: form.budget_range || null,
            message: form.message.trim() || null,
          }),
        });

        if (res.ok) {
          setSubmitted(true);
        } else {
          const data = await res.json();
          setError(data.error || "상담 신청에 실패했습니다.");
        }
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  };

  if (submitted) {
    return (
      <div className="pt-28 pb-20">
        <div className="container-narrow text-center py-24">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-8" />
          <h1 className="text-3xl font-bold mb-3 tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
            THANK YOU
          </h1>
          <p className="text-text-secondary mb-10 text-sm tracking-wide">
            담당자가 빠른 시일 내 연락드리겠습니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-bg text-sm font-medium tracking-widest hover:bg-primary-light transition-colors"
          >
            HOME <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20">
      <div className="container-wide">
        <div className="text-center mb-16">
          <div className="w-10 h-px bg-primary mx-auto mb-6" />
          <h1 className="text-3xl md:text-5xl font-bold tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
            CONTACT
          </h1>
          <p className="text-text-secondary mt-4 text-sm tracking-wide">
            프리미엄 맞춤 상담을 신청하세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border max-w-6xl mx-auto">
          <div className="lg:col-span-2 bg-bg-muted p-10">
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold mb-8 tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                CONSULTATION REQUEST
              </h2>

              <div className="absolute opacity-0 pointer-events-none" aria-hidden="true">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium tracking-widest text-text-secondary mb-2">NAME *</label>
                    <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-12 px-4 bg-transparent border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors" placeholder="홍길동" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-widest text-text-secondary mb-2">PHONE *</label>
                    <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-12 px-4 bg-transparent border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors" placeholder="010-0000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium tracking-widest text-text-secondary mb-2">SIZE</label>
                    <input type="number" value={form.area_pyeong} onChange={(e) => setForm({ ...form, area_pyeong: e.target.value })} className="w-full h-12 px-4 bg-transparent border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors" placeholder="30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-widest text-text-secondary mb-2">TYPE</label>
                    <select value={form.space_type} onChange={(e) => setForm({ ...form, space_type: e.target.value })} className="w-full h-12 px-4 bg-transparent border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors">
                      <option value="" className="bg-bg">선택해주세요</option>
                      <option value="아파트" className="bg-bg">아파트</option>
                      <option value="빌라" className="bg-bg">빌라</option>
                      <option value="오피스텔" className="bg-bg">오피스텔</option>
                      <option value="주택" className="bg-bg">주택</option>
                      <option value="상업공간" className="bg-bg">상업공간</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-widest text-text-secondary mb-2">BUDGET</label>
                    <select value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} className="w-full h-12 px-4 bg-transparent border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors">
                      <option value="" className="bg-bg">선택해주세요</option>
                      <option value="3000만~5000만" className="bg-bg">3000만~5000만</option>
                      <option value="5000만~8000만" className="bg-bg">5000만~8000만</option>
                      <option value="8000만~1억" className="bg-bg">8000만~1억</option>
                      <option value="1억~2억" className="bg-bg">1억~2억</option>
                      <option value="2억 이상" className="bg-bg">2억 이상</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium tracking-widest text-text-secondary mb-2">MESSAGE</label>
                  <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full h-32 px-4 py-3 bg-transparent border border-border text-text text-sm resize-none focus:outline-none focus:border-primary transition-colors" placeholder="궁금한 점이나 요청사항을 자유롭게 남겨주세요" />
                </div>

                {error && (
                  <div className="p-3 border border-red-800 text-red-400 text-sm">{error}</div>
                )}

                <button type="submit" disabled={isPending} className="w-full h-14 bg-primary text-bg text-sm font-medium tracking-widest hover:bg-primary-light transition-colors duration-300 disabled:opacity-50 flex items-center justify-center gap-3">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>SUBMIT <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="bg-bg-muted p-10 space-y-8">
            <div>
              <h3 className="text-xs font-medium tracking-widest text-text-secondary mb-6">INFORMATION</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 border border-primary/30 flex items-center justify-center shrink-0"><MapPin className="h-3.5 w-3.5 text-primary" /></div>
                  <div><p className="text-sm font-medium text-text">주소</p><p className="text-xs text-text-muted mt-1">상세 주소는 상담 시 안내</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 border border-primary/30 flex items-center justify-center shrink-0"><Phone className="h-3.5 w-3.5 text-primary" /></div>
                  <div><p className="text-sm font-medium text-text">전화</p><p className="text-xs text-text-muted mt-1">전화 상담 가능</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 border border-primary/30 flex items-center justify-center shrink-0"><Clock className="h-3.5 w-3.5 text-primary" /></div>
                  <div><p className="text-sm font-medium text-text">영업시간</p><p className="text-xs text-text-muted mt-1">평일 09:00 ~ 18:00</p></div>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-border" />

            <div>
              <h3 className="text-xs font-medium tracking-widest text-text-secondary mb-4">PROCESS</h3>
              <ul className="space-y-3 text-xs text-text-muted">
                <li className="flex items-start gap-3"><span className="text-primary font-medium">01</span>상담 신청서 작성</li>
                <li className="flex items-start gap-3"><span className="text-primary font-medium">02</span>24시간 내 담당자 연락</li>
                <li className="flex items-start gap-3"><span className="text-primary font-medium">03</span>무료 방문 실측</li>
                <li className="flex items-start gap-3"><span className="text-primary font-medium">04</span>맞춤 견적서 제공</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
