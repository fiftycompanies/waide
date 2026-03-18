import Image from "next/image";
import { portfolio30, portfolioOld } from "@/data/remodelia";

interface PortfolioItem {
  id: string;
  title: string;
  image: string;
}

function PortfolioSection({
  heading,
  buttonLabel,
  items,
}: {
  heading: string;
  buttonLabel: string;
  items: PortfolioItem[];
}) {
  return (
    <div>
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <h2 className="text-[20px] md:text-[24px] font-bold text-[#13130A] leading-tight">
          {heading}
        </h2>
        <a
          href="#portfolio"
          className="inline-flex items-center justify-center h-[40px] px-4 border border-[#13130A] text-[#13130A] text-[13px] font-medium rounded-full hover:bg-[#13130A] hover:text-white transition-colors shrink-0"
        >
          {buttonLabel}
        </a>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 min-[900px]:grid-cols-3 gap-3 md:gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-[4/3] overflow-hidden rounded-sm cursor-pointer"
          >
            <Image
              src={item.image}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            {/* Title overlay on hover */}
            <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="text-white text-[12px] md:text-[13px] font-medium">
                {item.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioGrid() {
  return (
    <section id="portfolio" className="bg-white">
      <div className="max-w-[1920px] mx-auto px-5 md:px-10 lg:px-20 py-16 md:py-20 lg:py-24">
        {/* Portfolio: 30평대 */}
        <PortfolioSection
          heading="공간 활용도를 높인 30평대 아파트"
          buttonLabel="30평대 아파트 더 보기 >"
          items={portfolio30}
        />

        {/* Spacer between sections */}
        <div className="h-16 md:h-20 lg:h-24" />

        {/* Portfolio: 구축 */}
        <PortfolioSection
          heading="오래도록 아름다운 구축 아파트"
          buttonLabel="구축 아파트 더 보기 >"
          items={portfolioOld}
        />
      </div>
    </section>
  );
}
