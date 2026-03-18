import type { Metadata } from "next";
import Footer from "@/components/designlab/Footer";
import FloatingCTA from "@/components/designlab/FloatingCTA";
import { brand } from "@/data/designlab";

export const metadata: Metadata = {
  title: "디자인랩 | 프리미엄 인테리어 디자인 스튜디오",
  description: brand.description,
  openGraph: {
    title: "디자인랩 | 프리미엄 인테리어 디자인 스튜디오",
    description: brand.description,
    url: brand.url,
    siteName: brand.nameEn,
    locale: "ko_KR",
    type: "website",
  },
};

export default function DesignLabLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className="bg-black min-h-screen text-white font-['Pretendard',sans-serif] font-normal"
      style={{ letterSpacing: "-0.02em" }}
    >
      <main>{children}</main>
      <Footer />
      <FloatingCTA />
    </div>
  );
}
