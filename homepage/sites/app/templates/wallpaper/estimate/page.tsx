import { BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "견적 문의 | 벽지마스터",
  description: "벽지마스터 무료 견적 문의.",
};

export default function EstimatePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://wallpapermaster.kr" },
          { name: "견적 문의", url: "https://wallpapermaster.kr/estimate" },
        ]}
      />
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">견적 문의</h1>
          <p className="text-gray-500 mb-8">
            전화: 1588-0000 | 카카오톡 상담 가능
          </p>
          <Link
            href="/templates/wallpaper"
            className="inline-block px-6 py-3 bg-[#3594f2] text-white rounded-[30px]"
          >
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    </>
  );
}
