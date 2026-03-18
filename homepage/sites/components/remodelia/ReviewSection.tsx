import { reviews } from "@/data/remodelia";

export default function ReviewSection() {
  return (
    <section id="contact" className="bg-white">
      <div className="max-w-[1920px] mx-auto px-5 md:px-10 lg:px-20 py-16 md:py-20 lg:py-24">
        {/* Section Heading */}
        <h2 className="text-[20px] md:text-[24px] font-bold text-[#13130A] text-center mb-10 md:mb-14">
          리모델리아와 함께한 분들의 후기
        </h2>

        {/* Review Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-[#e8e8e8] rounded-sm p-6 md:p-8 flex flex-col"
            >
              {/* Quotation Mark */}
              <span
                className="text-[40px] md:text-[48px] leading-none font-bold text-[#13130A] mb-4 select-none"
                aria-hidden="true"
              >
                &ldquo;
              </span>

              {/* Review Content */}
              <p className="text-[14px] leading-[23px] text-[rgba(0,0,0,0.87)] flex-1 mb-6">
                {review.content}
              </p>

              {/* Author Info */}
              <div className="border-t border-[#e8e8e8] pt-4">
                <p className="text-[12px] text-[#808080]">
                  {review.author}
                  <span className="mx-2">|</span>
                  {review.area}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
