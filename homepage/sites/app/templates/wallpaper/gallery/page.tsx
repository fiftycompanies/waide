import { BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "시공사례 | 벽지마스터",
  description: "벽지마스터의 도배·바닥재 시공 사례를 확인하세요.",
};

export default function GalleryPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://wallpapermaster.kr" },
          { name: "시공사례", url: "https://wallpapermaster.kr/gallery" },
        ]}
      />
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">시공 사례</h1>
          <p className="text-gray-500 mb-8">시공 갤러리를 준비 중입니다.</p>
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
