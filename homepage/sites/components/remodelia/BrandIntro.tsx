import { brand } from "@/data/remodelia";

function GeometricRLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Architectural geometric "R" shape */}
      {/* Left vertical bar */}
      <polygon points="30,10 55,10 55,190 30,190" fill="#13130A" />
      {/* Top horizontal bar */}
      <polygon points="55,10 140,10 140,35 55,35" fill="#13130A" />
      {/* Right curved portion - top (simplified as angular) */}
      <polygon points="140,10 170,10 170,50 165,55 140,55 140,10" fill="#13130A" />
      {/* Right side down to middle */}
      <polygon points="165,55 170,50 170,85 140,95 140,55" fill="#13130A" />
      {/* Middle horizontal bar */}
      <polygon points="55,80 140,80 140,105 55,105" fill="#13130A" />
      {/* Diagonal leg of R */}
      <polygon points="100,105 130,105 170,190 140,190" fill="#13130A" />
      {/* Small accent triangle */}
      <polygon points="55,35 90,35 90,80 55,80" fill="none" stroke="#13130A" strokeWidth="0" />
    </svg>
  );
}

export default function BrandIntro() {
  return (
    <section id="service" className="bg-[#f5f5f5]">
      <div className="max-w-[1920px] mx-auto px-5 md:px-10 lg:px-20 py-16 md:py-20 lg:py-24">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 lg:gap-24">
          {/* Left: Geometric R Logo */}
          <div className="flex-shrink-0 flex items-center justify-center w-full md:w-1/2">
            <GeometricRLogo className="w-[140px] h-[140px] md:w-[180px] md:h-[180px] lg:w-[200px] lg:h-[200px]" />
          </div>

          {/* Right: Text Content */}
          <div className="w-full md:w-1/2">
            <h2 className="text-[22px] md:text-[24px] leading-[34px] md:leading-[36px] font-bold text-[#13130A] mb-5">
              기대와 설렘이 가득한
              <br />
              리모델링 경험
            </h2>
            <p className="text-[14px] leading-[23px] text-[rgba(0,0,0,0.87)] mb-8 max-w-[420px]">
              {brand.description}
              <br />
              <br />
              리모델리아는 20년 이상의 시공 경험과 전문 인력을 바탕으로, 설계부터
              시공, 사후관리까지 체계적인 원스톱 서비스를 제공합니다. 고객의
              라이프스타일에 맞는 최적의 공간을 만들어 드립니다.
            </p>
            <a
              href="#portfolio"
              className="inline-flex items-center text-[14px] font-semibold text-[#13130A] hover:opacity-60 transition-opacity"
            >
              서비스 알아보기 &gt;
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
