"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  BarChart3,
  Star,
  Smartphone,
  Tag,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

// ── URL Input Component ──────────────────────────────────────────────────────

function HeroUrlInput({
  defaultUrl,
  compact = false,
  autoFocus = false,
}: {
  defaultUrl?: string;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (defaultUrl) setUrl(defaultUrl);
  }, [defaultUrl]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    const salesRef =
      document.cookie
        .split("; ")
        .find((c) => c.startsWith("waide_sales_ref="))
        ?.split("=")[1] ?? "";
    router.push(
      `/analysis/loading?url=${encodeURIComponent(url.trim())}${salesRef ? `&ref=${salesRef}` : ""}`
    );
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div
        className={`waide-input-glow flex flex-col sm:flex-row gap-3 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] transition-all ${compact ? "p-1.5" : "p-2"}`}
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#666666]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="네이버 플레이스 URL을 붙여넣으세요"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`w-full pl-12 bg-transparent border-0 text-white placeholder:text-[#666666] focus:outline-none ${compact ? "h-12 text-sm" : "h-14 text-base"}`}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className={`shrink-0 flex items-center justify-center gap-2 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${compact ? "h-12 px-6 text-sm" : "h-14 px-8 text-base"}`}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              무료 플레이스 점검 받기
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Preview Tab Component ────────────────────────────────────────────────────

const PREVIEW_TABS = [
  {
    label: "마케팅 점수",
    content: (
      <div className="space-y-5">
        <div className="flex items-center gap-6">
          <div className="relative w-28 h-28">
            <svg width="112" height="112" className="-rotate-90">
              <circle cx="56" cy="56" r="48" fill="none" stroke="#2a2a2a" strokeWidth="6" />
              <circle cx="56" cy="56" r="48" fill="none" stroke="#10b981" strokeWidth="6" strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - 0.72)} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">72</span>
              <span className="text-[10px] text-[#666666]">/ 100</span>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            {[
              { label: "리뷰/평판", score: 18, max: 20 },
              { label: "네이버 키워드", score: 15, max: 25 },
              { label: "구글 키워드", score: 12, max: 15 },
              { label: "이미지 품질", score: 8, max: 10 },
              { label: "온라인 채널", score: 10, max: 15 },
              { label: "SEO/AEO", score: 9, max: 15 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-[10px] text-[#a0a0a0] w-20 shrink-0">{item.label}</span>
                <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#10b981]"
                    style={{ width: `${(item.score / item.max) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#666666] w-8 text-right">{item.score}/{item.max}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "키워드 분석",
    content: (
      <div className="space-y-1.5">
        <div className="grid grid-cols-[1fr_80px_60px] gap-2 text-[10px] text-[#666666] pb-1.5 border-b border-[#2a2a2a]">
          <span>키워드</span>
          <span className="text-right">월간 검색량</span>
          <span className="text-right">경쟁도</span>
        </div>
        {[
          { kw: "방이동 맛집", vol: "30,490", comp: "높음", compColor: "text-red-400" },
          { kw: "잠실 곱창", vol: "12,100", comp: "중간", compColor: "text-amber-400" },
          { kw: "송파 소곱창 맛집", vol: "5,200", comp: "낮음", compColor: "text-emerald-400" },
          { kw: "방이동 회식", vol: "3,800", comp: "낮음", compColor: "text-emerald-400" },
          { kw: "잠실역 맛집 추천", vol: "22,300", comp: "높음", compColor: "text-red-400" },
        ].map((row) => (
          <div key={row.kw} className="grid grid-cols-[1fr_80px_60px] gap-2 py-1.5 text-xs border-b border-[#2a2a2a]/50">
            <span className="text-white font-medium">{row.kw}</span>
            <span className="text-[#a0a0a0] text-right">{row.vol}</span>
            <span className={`text-right ${row.compColor}`}>{row.comp}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "개선 포인트",
    content: (
      <div className="space-y-2.5">
        {[
          "네이버 플레이스 대표 사진을 전문 촬영으로 교체하세요",
          "'방이동 맛집' 키워드로 블로그 콘텐츠를 발행하세요",
          "인스타그램 비즈니스 계정을 연결하세요",
          "구글 비즈니스 프로필에 메뉴 정보를 추가하세요",
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#111111] border border-[#2a2a2a]">
            <span className="text-[#10b981] font-bold text-xs mt-0.5">{i + 1}.</span>
            <span className="text-xs text-[#a0a0a0] leading-relaxed">{tip}</span>
          </div>
        ))}
      </div>
    ),
  },
];

function PreviewTabs() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % PREVIEW_TABS.length);
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleClick = (i: number) => {
    setActive(i);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % PREVIEW_TABS.length);
    }, 4000);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden shadow-2xl shadow-[#10b981]/5">
        {/* Tab bar */}
        <div className="flex border-b border-[#2a2a2a]">
          {PREVIEW_TABS.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => handleClick(i)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                active === i
                  ? "text-[#10b981] border-b-2 border-[#10b981] bg-[#10b981]/5"
                  : "text-[#666666] hover:text-[#a0a0a0]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="p-6 min-h-[240px]">
          {PREVIEW_TABS[active].content}
        </div>
      </div>
    </div>
  );
}

// ── Stat Counter ─────────────────────────────────────────────────────────────

function StatCounter({ value, suffix, label }: { value: string; suffix?: string; label: string }) {
  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-4xl md:text-5xl font-bold text-[#10b981]">{value}</span>
        {suffix && <span className="text-lg text-[#10b981]">{suffix}</span>}
      </div>
      <p className="text-sm text-[#666666] mt-2">{label}</p>
    </div>
  );
}

// ── Main Landing ─────────────────────────────────────────────────────────────

function LandingContent() {
  const searchParams = useSearchParams();
  const defaultPlace = searchParams.get("place") ?? "";
  const hasPlace = !!searchParams.get("place");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      // waide_sales_ref 쿠키에 30일 저장
      document.cookie = `waide_sales_ref=${ref}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    }
  }, [searchParams]);

  return (
    <>
      {/* ── Banner ── */}
      <div className="bg-[#10b981] text-white text-center py-2.5 text-sm font-medium">
        <span className="mr-1">🎉</span> 오픈 기념 무료 매장 분석 진행 중
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1: Hero
         ══════════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-32 overflow-hidden waide-grid-bg">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#10b981]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] mb-6">
            플레이스 무료 점검만 받으셔도,
            <br />
            <span className="waide-gradient-text">고퀄리티 홈페이지를 무료로 제작해 드립니다!</span>
          </h1>

          <p className="text-lg md:text-xl text-amber-400 font-semibold max-w-xl mx-auto mb-10">
            (선착순 20개 업체 한정 이벤트)
          </p>

          <div className="mb-6">
            <HeroUrlInput defaultUrl={defaultPlace} autoFocus={hasPlace} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#666666]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
              30초 완료
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
              로그인 불필요
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
              완전 무료
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2: Preview
         ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-[#111111]">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            이런 분석 결과를 바로 받아보실 수 있어요
          </h2>
          <p className="text-center text-[#666666] mb-12">
            실제 분석 화면 미리보기
          </p>

          <PreviewTabs />

          {/* Callout */}
          <div className="mt-8 mx-auto max-w-xl rounded-xl border border-[#10b981]/20 bg-[#10b981]/5 p-4 text-center">
            <p className="text-sm text-[#a0a0a0]">
              <span className="text-[#10b981] font-medium">💡 예시</span>{" "}
              &apos;방이동 맛집&apos; 키워드 미노출 → 콘텐츠 발행으로 월 3만명 유입 가능
            </p>
          </div>

          <div className="mt-8 text-center">
            <a
              href="#hero-input"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#10b981] font-medium text-sm hover:bg-[#222222] transition-colors"
            >
              내 매장도 분석해보기
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3: Feature Cards
         ══════════════════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            AI가 이 모든 걸 분석해드려요
          </h2>
          <p className="text-center text-[#666666] mb-12">
            URL 하나로 매장의 온라인 마케팅 상태를 한눈에
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 waide-stagger">
            {[
              { icon: <BarChart3 className="h-6 w-6" />, title: "마케팅 종합 점수", desc: "6개 영역 데이터 기반 매장 진단" },
              { icon: <Search className="h-6 w-6" />, title: "공략 키워드 분석", desc: "검색량, 경쟁도 기반 맞춤 키워드" },
              { icon: <Star className="h-6 w-6" />, title: "리뷰 분석", desc: "고객이 뽑은 강점 TOP 5" },
              { icon: <Smartphone className="h-6 w-6" />, title: "온라인 채널 진단", desc: "SNS, 예약, 홈페이지 완성도" },
              { icon: <Tag className="h-6 w-6" />, title: "메뉴/가격 분석", desc: "시그니처 메뉴, 가격 포지셔닝" },
              { icon: <TrendingUp className="h-6 w-6" />, title: "개선 포인트", desc: "점수 올리는 구체적 방법 제시" },
            ].map((card) => (
              <div
                key={card.title}
                className="waide-gradient-border group p-6 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-transparent transition-all duration-300 hover:scale-[1.03]"
              >
                <div className="w-12 h-12 rounded-xl bg-[#10b981]/10 text-[#10b981] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{card.title}</h3>
                <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4: Stats
         ══════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-[#111111]">
        <div className="mx-auto max-w-3xl px-6">
          <div className="grid grid-cols-3 gap-8">
            <StatCounter value="1,247" suffix="+" label="매장 분석 완료" />
            <StatCounter value="6" suffix="개" label="분석 영역" />
            <StatCounter value="30" suffix="초" label="분석 소요 시간" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5: Bottom CTA
         ══════════════════════════════════════════════════════════ */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#10b981]/5 to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            플레이스 무료 점검만 받으셔도,
            <br />
            고퀄리티 홈페이지를 무료로 제작해 드립니다!
          </h2>
          <p className="text-amber-400 font-semibold mb-8">
            (선착순 20개 업체 한정 이벤트)
          </p>
          <HeroUrlInput compact />
        </div>
      </section>
    </>
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
