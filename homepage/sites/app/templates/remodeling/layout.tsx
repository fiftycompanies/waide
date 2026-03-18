import type { Metadata } from "next";
import Nav from "@/components/remodelia/Nav";
import Footer from "@/components/remodelia/Footer";
import FloatingButtons from "@/components/remodelia/FloatingButtons";
import { brand } from "@/data/remodelia";

export const metadata: Metadata = {
  title: "리모델리아 | 아파트 리모델링 전문",
  description:
    "기대와 설렘이 가득한 리모델링 경험. 리모델리아는 아파트 리모델링 전문 기업입니다. 모던 미니멀 디자인, 체계적인 시공 프로세스, 투명한 견적으로 고객 만족을 실현합니다.",
  openGraph: {
    title: "리모델리아 | 아파트 리모델링 전문",
    description:
      "기대와 설렘이 가득한 리모델링 경험. 리모델링을 결심한 순간부터 쌓이는 걱정과 고민, 리모델리아가 함께 해결해 드립니다.",
    url: brand.url,
    siteName: brand.nameEn,
    locale: "ko_KR",
    type: "website",
  },
};

export default function RemodeliaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-['Spoqa_Han_Sans_Neo','Pretendard',Arial,sans-serif] leading-[28px] text-[16px]">
      <Nav />
      <main>{children}</main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}
