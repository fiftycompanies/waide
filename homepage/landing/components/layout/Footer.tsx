export default function Footer() {
  return (
    <footer className="bg-primary text-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-accent">WIDE</span>
                <span className="text-white">WILD</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-2 max-w-md text-white/50">
              인테리어 업체 전용 마케팅 파트너
            </p>
            <p className="text-sm leading-relaxed mb-4 max-w-md">
              프리미엄 홈페이지 제작부터 블로그 포스팅, 브랜드 디자인까지.
              <br />
              사장님은 시공 사진만 보내주시면 됩니다.
            </p>
            <div className="text-xs space-y-1 text-white/40">
              <p>와이드와일드(WIDEWILD)</p>
              <p>이메일: widewildonline@gmail.com</p>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">바로가기</h4>
            <ul className="space-y-2.5">
              {[
                { href: "#service", label: "서비스 소개" },
                { href: "#why-blog", label: "왜 홈페이지 블로그?" },
                { href: "#process", label: "진행 프로세스" },
                { href: "#pricing", label: "가격" },
                { href: "#faq", label: "자주 묻는 질문" },
                { href: "#contact", label: "상담 신청" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; 2026 와이드와일드(WIDEWILD). All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              이용약관
            </a>
            <a
              href="#"
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              개인정보처리방침
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
