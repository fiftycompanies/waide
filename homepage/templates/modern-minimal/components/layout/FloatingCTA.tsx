"use client";

import { Phone, MessageCircle } from "lucide-react";

export default function FloatingCTA({
  phone,
  kakaoLink,
}: {
  phone: string;
  kakaoLink?: string | null;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      {kakaoLink && (
        <a
          href={kakaoLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-[#FEE500] shadow-lg hover:scale-110 transition-transform"
          aria-label="카카오톡 상담"
        >
          <MessageCircle className="h-6 w-6 text-[#3C1E1E]" />
        </a>
      )}
      <a
        href={`tel:${phone}`}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-primary shadow-lg hover:scale-110 transition-transform"
        aria-label="전화 상담"
      >
        <Phone className="h-6 w-6 text-white" />
      </a>
    </div>
  );
}
