import { BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "상담 문의 | 리모델리아",
  description: "리모델리아 무료 상담 문의.",
};

export default function ContactPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://remodelia.kr" },
          { name: "상담 문의", url: "https://remodelia.kr/contact" },
        ]}
      />
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">상담 문의</h1>
          <p className="text-gray-500 mb-8">
            전화: 02-1234-5678 | 카카오톡 상담 가능
          </p>
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
