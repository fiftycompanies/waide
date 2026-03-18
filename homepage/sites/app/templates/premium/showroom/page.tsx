import { BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "쇼룸 | 디자인랩",
  description: "디자인랩 쇼룸 안내.",
};

export default function ShowroomPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://designlab.kr" },
          { name: "쇼룸", url: "https://designlab.kr/showroom" },
        ]}
      />
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-3xl font-light text-white mb-4">쇼룸</h1>
          <p className="text-[#888] mb-2">
            서울시 성수동 2가 아크밸리 B1
          </p>
          <p className="text-[#888] mb-8">
            평일 10:00 - 19:00 (토요일 예약제)
          </p>
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
