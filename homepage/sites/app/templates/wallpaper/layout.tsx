import type { Metadata } from "next";
import Nav from "@/components/wallpaper-master/Nav";
import Footer from "@/components/wallpaper-master/Footer";
import { brand } from "@/data/wallpaper-master";

export const metadata: Metadata = {
  title: "벽지마스터 | 도배·바닥재 시공 전문",
  description: brand.description,
  openGraph: {
    title: "벽지마스터 | 도배·바닥재 시공 전문",
    description: brand.description,
    type: "website",
    locale: "ko_KR",
    url: brand.url,
    siteName: brand.name,
  },
};

export default function WallpaperMasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-['Noto_Sans_KR',sans-serif] text-[#353535]">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
