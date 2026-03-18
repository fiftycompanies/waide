import { brand, footerLinks } from "@/data/remodelia";

function FooterRLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Geometric "R" in white for dark footer */}
      <polygon points="30,10 55,10 55,190 30,190" fill="#FFFFFF" />
      <polygon points="55,10 140,10 140,35 55,35" fill="#FFFFFF" />
      <polygon points="140,10 170,10 170,50 165,55 140,55 140,10" fill="#FFFFFF" />
      <polygon points="165,55 170,50 170,85 140,95 140,55" fill="#FFFFFF" />
      <polygon points="55,80 140,80 140,105 55,105" fill="#FFFFFF" />
      <polygon points="100,105 130,105 170,190 140,190" fill="#FFFFFF" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-[1920px] mx-auto px-5 md:px-10 lg:px-20">
        {/* Top Area: Logo */}
        <div className="pt-14 md:pt-20 pb-10 md:pb-14">
          <FooterRLogo className="w-[60px] h-[60px] md:w-[80px] md:h-[80px] lg:w-[100px] lg:h-[100px]" />
        </div>

        {/* 3-Column Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 md:gap-8 pb-12 md:pb-16">
          {/* Column 1: 정보 */}
          <div>
            <h3 className="text-[12px] tracking-[0.1em] uppercase text-[#B6B6B6] mb-5 font-medium">
              정보
            </h3>
            <ul className="space-y-3">
              {footerLinks.정보.map((link) => (
                <li key={link.label}>
                  {link.href ? (
                    <a
                      href={link.href}
                      className="text-[12px] text-white/80 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <span className="text-[12px] text-white/80 cursor-default">
                      {link.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: 판매 */}
          <div>
            <h3 className="text-[12px] tracking-[0.1em] uppercase text-[#B6B6B6] mb-5 font-medium">
              판매
            </h3>
            <ul className="space-y-3">
              {footerLinks.판매.map((link) => (
                <li key={link.label}>
                  {link.href ? (
                    <a
                      href={link.href}
                      className="text-[12px] text-white/80 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <span className="text-[12px] text-white/80 cursor-default">
                      {link.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: 고객센터 */}
          <div>
            <h3 className="text-[12px] tracking-[0.1em] uppercase text-[#B6B6B6] mb-5 font-medium">
              고객센터
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={`tel:${brand.phone}`}
                  className="text-[14px] text-white font-bold hover:text-white/80 transition-colors"
                >
                  {brand.phone}
                </a>
              </li>
              <li className="text-[12px] text-white/60">
                {brand.operatingHours}
              </li>
              <li>
                <a
                  href={`mailto:${brand.email}`}
                  className="text-[12px] text-white/80 hover:text-white transition-colors"
                >
                  {brand.email}
                </a>
              </li>
              <li>
                <a
                  href={brand.kakaoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-white/80 hover:text-white transition-colors"
                >
                  카카오톡 상담
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* White Divider */}
        <div className="border-t border-white/20" />

        {/* Social Links Row */}
        <div className="flex flex-wrap items-center gap-6 py-6">
          <a
            href={brand.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-white/60 hover:text-white transition-colors"
          >
            Instagram
          </a>
          <a
            href={brand.naverBlog}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-white/60 hover:text-white transition-colors"
          >
            Naver Blog
          </a>
        </div>

        {/* Legal Links */}
        <div className="flex flex-wrap items-center gap-4 pb-4">
          <span className="text-[12px] text-white/60 cursor-default">
            이용약관
          </span>
          <span className="text-[12px] text-white/20">|</span>
          <span className="text-[12px] text-white/60 cursor-default font-medium">
            개인정보처리방침
          </span>
        </div>

        {/* Company Legal Info */}
        <div className="pb-10 md:pb-14">
          <p className="text-[12px] text-[#B6B6B6] font-light leading-[20px]">
            상호: {brand.name} | 대표: {brand.ceo} | 사업자등록번호:{" "}
            {brand.businessNumber}
            <br />
            통신판매업신고: {brand.telecomLicense}
            <br />
            주소: {brand.address}
          </p>
          <p className="text-[12px] text-[#B6B6B6] font-light mt-4">
            2015-2024 All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
