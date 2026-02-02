import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Waide - AI Hospitality Aide | 펜션 AI 지배인",
  description: "24시간 쉬지 않는 펜션/풀빌라 AI 지배인. 마케팅부터 고객 응대까지, Waide가 대신합니다.",
  keywords: ["AI", "펜션", "풀빌라", "숙박업", "마케팅 자동화", "예약관리", "AI 지배인", "Waide"],
  openGraph: {
    title: "Waide - 당신의 AI 지배인",
    description: "펜션 마케팅부터 고객 응대까지. 24시간 쉬지 않는 AI 지배인, Waide.",
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
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
