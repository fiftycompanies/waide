import { BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "포트폴리오 | 디자인랩",
  description: "디자인랩의 프리미엄 인테리어 포트폴리오.",
};

export default function PortfolioPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://designlab.kr" },
          { name: "포트폴리오", url: "https://designlab.kr/portfolio" },
        ]}
      />
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-3xl font-light text-white mb-4">포트폴리오</h1>
          <p className="text-[#888] mb-8">시공 사례를 준비 중입니다.</p>
          <Link
            href="/templates/premium"
            className="inline-block px-6 py-3 bg-[#888] text-white rounded-[0.4rem]"
          >
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    </>
  );
}
