"use client";

import { MessageCircle } from "lucide-react";

export function KakaoFloatingButton() {
  const channelUrl = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL;

  if (!channelUrl) return null;

  return (
    <a
      href={channelUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed z-50 flex items-center gap-2 transition-transform hover:scale-105
        right-4 bottom-20 md:right-6 md:bottom-6"
    >
      {/* 데스크톱: 64px + 텍스트 / 모바일: 48px 원형만 */}
      <span
        className="flex items-center justify-center rounded-full shadow-lg
          h-12 w-12 md:h-16 md:w-16"
        style={{ backgroundColor: "#FEE500" }}
      >
        <MessageCircle className="h-6 w-6 md:h-7 md:w-7 text-[#3C1E1E]" />
      </span>
      <span className="hidden md:block text-sm font-medium text-gray-700 bg-white px-3 py-1.5 rounded-lg shadow-md border">
        카카오톡 문의
      </span>
    </a>
  );
}
