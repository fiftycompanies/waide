"use client";

import { useState, useTransition } from "react";
import { Send, Loader2, CheckCircle, MapPin, Phone, Clock } from "lucide-react";
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
      <div className="pt-24 pb-16">
        <div className="container-narrow text-center py-20">
          <CheckCircle className="h-20 w-20 text-secondary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            상담 신청이 완료되었습니다
          </h1>
          <p className="text-text-secondary mb-8">
            담당자가 빠른 시일 내 연락드리겠습니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-3xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16">
      <div className="container-wide">
        <div className="text-center mb-12">
          <div className="w-8 h-0.5 bg-accent mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            상담 신청
          </h1>
          <p className="text-text-secondary mt-3">
            무료 방문 상담을 신청해보세요. 전문 상담사가 맞춤 견적을 안내해드립니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-surface rounded-3xl p-8 border border-border-light shadow-sm"
            >
              <h2 className="text-xl font-bold mb-6" style={{ fontFamily: "var(--font-heading)" }}>
                상담 신청서
              </h2>

              <div className="absolute opacity-0 pointer-events-none" aria-hidden="true">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">이름 <span className="text-red-500">*</span></label>
                    <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-11 px-4 rounded-2xl border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="홍길동" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">연락처 <span className="text-red-500">*</span></label>
                    <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-11 px-4 rounded-2xl border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="010-0000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">평수</label>
                    <input type="number" value={form.area_pyeong} onChange={(e) => setForm({ ...form, area_pyeong: e.target.value })} className="w-full h-11 px-4 rounded-2xl border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">공간 유형</label>
                    <select value={form.space_type} onChange={(e) => setForm({ ...form, space_type: e.target.value })} className="w-full h-11 px-4 rounded-2xl border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                      <option value="">선택해주세요</option>
                      <option value="아파트">아파트</option>
                      <option value="빌라">빌라</option>
                      <option value="오피스텔">오피스텔</option>
                      <option value="주택">주택</option>
                      <option value="상업공간">상업공간</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">예산 범위</label>
                    <select value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} className="w-full h-11 px-4 rounded-2xl border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                      <option value="">선택해주세요</option>
                      <option value="1000만~3000만">1000만~3000만</option>
                      <option value="3000만~5000만">3000만~5000만</option>
                      <option value="5000만~8000만">5000만~8000만</option>
                      <option value="8000만~1억">8000만~1억</option>
                      <option value="1억 이상">1억 이상</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">문의 내용</label>
                  <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full h-32 px-4 py-3 rounded-2xl border border-border bg-bg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="궁금한 점이나 요청사항을 자유롭게 남겨주세요" />
                </div>

                {error && (
                  <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-sm">{error}</div>
                )}

                <button type="submit" disabled={isPending} className="w-full h-12 rounded-3xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4" /> 무료 상담 신청하기</>}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-surface rounded-3xl p-6 border border-border-light shadow-sm">
              <h3 className="font-bold text-lg mb-4" style={{ fontFamily: "var(--font-heading)" }}>연락처 정보</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"><MapPin className="h-5 w-5 text-primary" /></div>
                  <div><p className="text-sm font-medium">주소</p><p className="text-sm text-text-secondary mt-0.5">상세 주소는 상담 시 안내드립니다</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"><Phone className="h-5 w-5 text-primary" /></div>
                  <div><p className="text-sm font-medium">전화</p><p className="text-sm text-text-secondary mt-0.5">전화 상담도 가능합니다</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"><Clock className="h-5 w-5 text-primary" /></div>
                  <div><p className="text-sm font-medium">영업시간</p><p className="text-sm text-text-secondary mt-0.5">평일 09:00 ~ 18:00</p></div>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-3xl overflow-hidden border border-border-light shadow-sm">
              <div className="aspect-[4/3] bg-bg-muted flex items-center justify-center">
                <div className="text-center"><MapPin className="h-10 w-10 text-text-muted mx-auto mb-2" /><p className="text-sm text-text-muted">지도</p></div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-3xl p-6">
              <h3 className="font-bold mb-2" style={{ fontFamily: "var(--font-heading)" }}>상담 안내</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2"><span className="text-primary font-bold">1.</span>상담 신청서를 작성해주세요</li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold">2.</span>담당자가 24시간 내 연락드립니다</li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold">3.</span>무료 방문 실측을 진행합니다</li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold">4.</span>맞춤 견적서를 제공해드립니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
