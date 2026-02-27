import Link from "next/link";
import { 
  ArrowRight, 
  Calendar, 
  BarChart3, 
  MessageSquare, 
  Star,
  Sparkles,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  Instagram,
  FileText,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, LogoIcon } from "@/components/logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/">
              <Logo variant="light" size="md" />
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
                  로그인
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
                  무료로 시작하기
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-500/10 rounded-full blur-3xl" />
        
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-8">
              <Bot className="h-4 w-4" />
              <span>AI 기반 숙박업 경영 자동화</span>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-6 leading-tight">
              사장님,{" "}
              <span className="text-slate-400">골치 아픈</span>
              <br />
              <span className="text-slate-400">예약 관리는</span>{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                  웨이드
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" />
              </span>
              에게
              <br />
              넘기세요.
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              펜션 마케팅부터 고객 응대까지.
              <br />
              <span className="text-white font-medium">24시간 쉬지 않는</span> 당신의 <span className="text-amber-400 font-semibold">AI 지배인</span>, Waide.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/login">
                <Button size="lg" className="h-14 px-8 text-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold shadow-lg shadow-amber-500/25">
                  🎩 웨이드 채용하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/10 text-white hover:bg-white/5">
                  웨이드 이력서 보기
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>설치 5분 컷</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>신용카드 불필요</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>평생 무료 플랜</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 relative border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              혹시 이런 고민 있으신가요?
            </h2>
            <p className="text-lg text-slate-400">
              숙박업 사장님들의 공통된 고민, 웨이드가 해결해 드립니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                emoji: "😩",
                title: "매번 똑같은 SNS 포스팅",
                desc: "올려야 하는 건 아는데... 시간도 없고 뭘 올려야 할지 모르겠어요.",
              },
              {
                emoji: "📱",
                title: "밤낮없는 문의 전화",
                desc: "새벽에도 울리는 전화... 사장님도 잠 좀 자야죠.",
              },
              {
                emoji: "📊",
                title: "감으로 하는 가격 책정",
                desc: "경쟁 숙소는 얼마 받는지, 우리 가격이 맞는 건지 모르겠어요.",
              },
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-2xl bg-slate-800/30 border border-white/5 text-center">
                <div className="text-5xl mb-4">{item.emoji}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section (Waide's Resume) */}
      <section id="features" className="py-24 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-6">
              <FileText className="h-4 w-4" />
              <span>웨이드의 이력서</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              이런 일은 <span className="text-amber-400">웨이드</span>에게 맡기세요
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              호텔 출신 AI가 펜션/풀빌라 경영의 A to Z를 책임집니다.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Viral Content Creator */}
            <div className="group p-8 rounded-2xl bg-gradient-to-b from-rose-500/10 to-slate-900/50 border border-rose-500/20 hover:border-rose-500/40 transition-all duration-300">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 mb-6 group-hover:scale-110 transition-transform">
                <Instagram className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">바이럴 콘텐츠 크리에이터</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                인스타그램, 블로그 포스팅을 자동 생성. 숙소 분위기에 맞는 감성 문구와 해시태그까지.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-rose-400" />
                  인스타그램 캡션 자동 생성
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-rose-400" />
                  블로그 포스트 초안 작성
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-rose-400" />
                  예약 링크 자동 삽입
                </li>
              </ul>
            </div>

            {/* Feature 2: Smart Concierge */}
            <div className="group p-8 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-slate-900/50 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">스마트 컨시어지</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                고객 리뷰 및 문의에 24시간 자동 응대. 사장님 대신 정중하게 답변합니다.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  네이버/야놀자 리뷰 자동 답변
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  FAQ 기반 문의 응대
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  브랜드 톤앤매너 학습
                </li>
              </ul>
            </div>

            {/* Feature 3: Data Analyst */}
            <div className="group p-8 rounded-2xl bg-gradient-to-b from-blue-500/10 to-slate-900/50 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">데이터 애널리스트</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                매출, 예약율, 경쟁사 분석까지. 데이터 기반 경영 리포트를 매주 제공합니다.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  주간/월간 성과 리포트
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  콘텐츠 참여율 분석
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  최적 가격 제안
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              이미 많은 사장님들이 <span className="text-amber-400">웨이드</span>와 함께합니다
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "SNS 포스팅 때문에 스트레스 받았는데, 웨이드가 알아서 해주니까 너무 편해요.",
                author: "가평 풀빌라 사장님",
                rating: 5,
              },
              {
                quote: "새벽 문의에도 자동 응답이 가서 예약 전환율이 30% 올랐습니다.",
                author: "제주 펜션 사장님",
                rating: 5,
              },
              {
                quote: "매출 리포트 보면서 가격 조정했더니 비수기에도 객실이 차요.",
                author: "강릉 숙소 사장님",
                rating: 5,
              },
            ].map((testimonial, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-800/30 border border-white/5">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, j) => (
                    <Star key={j} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-4 leading-relaxed">&quot;{testimonial.quote}&quot;</p>
                <p className="text-sm text-slate-500">— {testimonial.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative p-12 rounded-3xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/20 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/20 mb-6">
                <LogoIcon size={48} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                지금 바로 웨이드를 채용하세요
              </h2>
              <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
                월급도, 4대보험도 필요 없는 AI 지배인.
                <br />
                <span className="text-amber-400 font-semibold">무료 플랜</span>으로 지금 바로 시작하세요.
              </p>
              <Link href="/login">
                <Button size="lg" className="h-14 px-10 text-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold shadow-lg">
                  🎩 웨이드 무료 채용하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo variant="light" size="sm" />
            <p className="text-slate-500 text-sm">
              © 2026 Waide. Powered by WideWild Corp. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
