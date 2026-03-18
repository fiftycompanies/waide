"use client";

import { useState, useEffect } from "react";
import { ChevronUp, MessageCircle } from "lucide-react";
import { brand } from "@/data/remodelia";

export default function FloatingButtons() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-[50px] right-[18px] z-10 flex flex-col gap-3">
      {/* Scroll to Top */}
      <button
        onClick={scrollToTop}
        className="w-[55px] h-[55px] rounded-full bg-[#13130A] text-white flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.25)] hover:bg-[#2a2a1a] transition-colors"
        aria-label="맨 위로 스크롤"
      >
        <ChevronUp className="w-6 h-6" />
      </button>

      {/* Kakao Chat */}
      <a
        href={brand.kakaoLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-[55px] h-[55px] rounded-full bg-[#FEEB8F] text-[#13130A] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.15)] hover:bg-[#fde46a] transition-colors"
        aria-label="카카오톡 상담"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
}
