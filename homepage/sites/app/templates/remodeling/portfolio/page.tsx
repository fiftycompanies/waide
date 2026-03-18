import { BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "포트폴리오 | 리모델리아",
  description:
    "리모델리아의 아파트 리모델링 시공 사례를 확인하세요.",
};

export default function PortfolioPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://remodelia.kr" },
          { name: "포트폴리오", url: "https://remodelia.kr/portfolio" },
        ]}
      />
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">포트폴리오</h1>
          <p className="text-gray-500 mb-8">시공 사례를 준비 중입니다.</p>
          <Link
            href="/templates/remodeling"
            className="inline-block px-6 py-3 bg-[#13130A] text-white rounded-full"
          >
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    </>
  );
}
