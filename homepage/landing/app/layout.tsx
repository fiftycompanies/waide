import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "와이드와일드(WIDEWILD) - 인테리어 업체 전용 홈페이지·블로그·브랜드 서비스",
  description:
    "프리미엄 홈페이지 제작부터 블로그 포스팅, 브랜드 디자인까지. 사장님은 시공 사진만 보내주시면 됩니다.",
  keywords: [
    "인테리어 홈페이지",
    "인테리어 업체 홈페이지",
    "인테리어 블로그",
    "인테리어 브랜드 디자인",
    "인테리어 SEO",
    "홈페이지 제작",
  ],
  openGraph: {
    title: "와이드와일드(WIDEWILD) - 인테리어 업체 전용 홈페이지·블로그·브랜드 서비스",
    description:
      "프리미엄 홈페이지 제작부터 블로그 포스팅, 브랜드 디자인까지. 사장님은 시공 사진만 보내주시면 됩니다.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
