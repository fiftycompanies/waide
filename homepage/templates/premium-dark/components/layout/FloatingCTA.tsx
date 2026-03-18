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
          className="flex items-center justify-center w-12 h-12 border border-[#FEE500] bg-[#FEE500]/10 hover:bg-[#FEE500] transition-all duration-300 group"
          aria-label="카카오톡 상담"
        >
          <MessageCircle className="h-5 w-5 text-[#FEE500] group-hover:text-[#3C1E1E]" />
        </a>
      )}
      <a
        href={`tel:${phone}`}
        className="flex items-center justify-center w-12 h-12 border border-primary bg-primary/10 hover:bg-primary transition-all duration-300 group"
        aria-label="전화 상담"
      >
        <Phone className="h-5 w-5 text-primary group-hover:text-bg" />
      </a>
    </div>
  );
}
