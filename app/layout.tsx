import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Waide - AI 매장 마케팅 분석",
  description: "네이버 플레이스 URL만 넣으면 AI가 30초 만에 매장의 온라인 마케팅 현황을 분석해드려요.",
  keywords: ["AI", "매장 분석", "마케팅 자동화", "네이버 플레이스", "블로그 마케팅", "Waide"],
  openGraph: {
    title: "Waide - AI 매장 마케팅 분석",
    description: "네이버 플레이스 URL만 넣으면 AI가 30초 만에 매장의 온라인 마케팅 현황을 분석해드려요.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
